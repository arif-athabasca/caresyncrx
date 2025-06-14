/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * API endpoint for managing individual schedule slots
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { UserRole } from '@/auth';
import { getSession } from '@/auth/services/utils/session-utils';

/**
 * GET handler for fetching a specific schedule slot
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    
    if (!session || !session.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const slotId = params.id;

    const scheduleSlot = await prisma.scheduleSlot.findUnique({
      where: { id: slotId },
      include: {
        provider: {
          select: {
            id: true,
            email: true,
            role: true,
            specialties: true
          }
        },
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        triage: {
          select: {
            id: true,
            urgencyLevel: true,
            symptoms: true,
            status: true
          }
        }
      }
    });

    if (!scheduleSlot) {
      return NextResponse.json({ error: 'Schedule slot not found' }, { status: 404 });
    }

    // Verify the provider belongs to the same clinic
    if (scheduleSlot.provider.clinicId !== session.user.clinicId) {
      return NextResponse.json({ error: 'Schedule slot not found' }, { status: 404 });
    }

    return NextResponse.json({ data: scheduleSlot });

  } catch (error) {
    console.error('Error fetching schedule slot:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PATCH handler for updating a schedule slot
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    
    if (!session || !session.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const slotId = params.id;
    const body = await request.json();
    const { 
      startTime, 
      endTime, 
      status, 
      description, 
      location, 
      patientId, 
      triageId 
    } = body;

    // Fetch the existing slot
    const existingSlot = await prisma.scheduleSlot.findUnique({
      where: { id: slotId },
      include: {
        provider: true
      }
    });

    if (!existingSlot) {
      return NextResponse.json({ error: 'Schedule slot not found' }, { status: 404 });
    }

    // Verify the provider belongs to the same clinic
    if (existingSlot.provider.clinicId !== session.user.clinicId) {
      return NextResponse.json({ error: 'Schedule slot not found' }, { status: 404 });
    }

    // If changing time, check for conflicts
    if (startTime && endTime) {
      const conflictingSlots = await prisma.scheduleSlot.findMany({
        where: {
          id: { not: slotId }, // Exclude current slot
          providerId: existingSlot.providerId,
          OR: [
            {
              AND: [
                { startTime: { lte: new Date(startTime) } },
                { endTime: { gt: new Date(startTime) } }
              ]
            },
            {
              AND: [
                { startTime: { lt: new Date(endTime) } },
                { endTime: { gte: new Date(endTime) } }
              ]
            }
          ],
          status: { notIn: ['CANCELLED', 'COMPLETED'] }
        }
      });

      if (conflictingSlots.length > 0) {
        return NextResponse.json({ 
          error: 'Schedule conflict detected. Provider is already booked during this time.' 
        }, { status: 409 });
      }
    }

    // Build update data
    const updateData: any = {};
    if (startTime) updateData.startTime = new Date(startTime);
    if (endTime) updateData.endTime = new Date(endTime);
    if (status) updateData.status = status;
    if (description !== undefined) updateData.description = description;
    if (location !== undefined) updateData.location = location;
    if (patientId !== undefined) updateData.patientId = patientId;
    if (triageId !== undefined) updateData.triageId = triageId;

    // Auto-set status based on assignments
    if ((patientId || triageId) && !status) {
      updateData.status = 'BOOKED';
    } else if (patientId === null && triageId === null && !status) {
      updateData.status = 'AVAILABLE';
    }

    // Update the schedule slot
    const updatedSlot = await prisma.scheduleSlot.update({
      where: { id: slotId },
      data: updateData,
      include: {
        provider: {
          select: {
            email: true,
            role: true
          }
        },
        patient: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        triage: {
          select: {
            urgencyLevel: true,
            symptoms: true
          }
        }
      }
    });

    // Update provider workload for the date
    if (startTime) {
      const date = new Date(startTime);
      date.setHours(0, 0, 0, 0);
      await updateProviderWorkload(existingSlot.providerId, date);
    }

    // Log the update
    await prisma.securityAuditLog.create({
      data: {
        eventType: 'SCHEDULE_SLOT_UPDATED',
        severity: 'INFO',
        userId: session.user.id,
        username: session.user.email,
        description: 'Schedule slot updated',
        metadata: JSON.stringify({
          scheduleSlotId: slotId,
          changes: updateData,
          previousValues: {
            status: existingSlot.status,
            startTime: existingSlot.startTime,
            endTime: existingSlot.endTime
          }
        })
      }
    });

    return NextResponse.json({ 
      data: updatedSlot,
      message: 'Schedule slot updated successfully' 
    });

  } catch (error) {
    console.error('Error updating schedule slot:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE handler for cancelling/deleting a schedule slot
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    
    if (!session || !session.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const slotId = params.id;

    // Fetch the existing slot
    const existingSlot = await prisma.scheduleSlot.findUnique({
      where: { id: slotId },
      include: {
        provider: true
      }
    });

    if (!existingSlot) {
      return NextResponse.json({ error: 'Schedule slot not found' }, { status: 404 });
    }

    // Verify the provider belongs to the same clinic
    if (existingSlot.provider.clinicId !== session.user.clinicId) {
      return NextResponse.json({ error: 'Schedule slot not found' }, { status: 404 });
    }

    // Instead of hard delete, mark as cancelled
    const cancelledSlot = await prisma.scheduleSlot.update({
      where: { id: slotId },
      data: {
        status: 'CANCELLED',
        patientId: null,
        triageId: null,
        description: existingSlot.description ? 
          `${existingSlot.description} [CANCELLED]` : 
          '[CANCELLED]'
      }
    });

    // Update provider workload
    const date = new Date(existingSlot.startTime);
    date.setHours(0, 0, 0, 0);
    await updateProviderWorkload(existingSlot.providerId, date);

    // Log the cancellation
    await prisma.securityAuditLog.create({
      data: {
        eventType: 'SCHEDULE_SLOT_CANCELLED',
        severity: 'INFO',
        userId: session.user.id,
        username: session.user.email,
        description: 'Schedule slot cancelled',
        metadata: JSON.stringify({
          scheduleSlotId: slotId,
          providerId: existingSlot.providerId,
          originalStartTime: existingSlot.startTime,
          originalEndTime: existingSlot.endTime
        })
      }
    });

    return NextResponse.json({ 
      data: cancelledSlot,
      message: 'Schedule slot cancelled successfully' 
    });

  } catch (error) {
    console.error('Error cancelling schedule slot:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * Helper function to update provider workload
 */
async function updateProviderWorkload(providerId: string, date: Date) {
  try {
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const daySlots = await prisma.scheduleSlot.findMany({
      where: {
        providerId,
        startTime: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    const totalSlots = daySlots.length;
    const bookedSlots = daySlots.filter(slot => slot.status === 'BOOKED').length;
    const availableSlots = daySlots.filter(slot => slot.status === 'AVAILABLE').length;
    const emergencySlots = daySlots.filter(slot => 
      slot.appointmentType === 'EMERGENCY' && slot.status === 'AVAILABLE'
    ).length;
    const utilizationRate = totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;

    await prisma.providerWorkload.upsert({
      where: {
        providerId_date: {
          providerId,
          date: startOfDay
        }
      },
      update: {
        totalSlots,
        bookedSlots,
        availableSlots,
        emergencySlots,
        utilizationRate
      },
      create: {
        providerId,
        date: startOfDay,
        totalSlots,
        bookedSlots,
        availableSlots,
        emergencySlots,
        utilizationRate
      }
    });
  } catch (error) {
    console.error('Error updating provider workload:', error);
  }
}

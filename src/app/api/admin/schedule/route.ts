/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * API endpoint for schedule management and provider workload tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { UserRole } from '@/auth';
import { getSession } from '@/auth/services/utils/session-utils';

/**
 * GET handler for fetching schedule data and provider workload
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    // Check if user is authenticated and has admin role
    if (!session || !session.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const providerId = searchParams.get('providerId');

    // Parse the date to get start and end of day
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    // Build where clause for providers
    const providerWhere: any = {
      role: { in: [UserRole.DOCTOR, UserRole.NURSE, UserRole.PHARMACIST] },
      clinicId: session.user.clinicId
    };

    if (providerId) {
      providerWhere.id = providerId;
    }

    // Fetch providers with their schedule data
    const providers = await prisma.user.findMany({
      where: providerWhere,
      include: {
        specialties: {
          select: {
            specialty: true,
            expertise: true
          }
        },
        scheduleSlots: {
          where: {
            startTime: {
              gte: startOfDay,
              lte: endOfDay
            }
          },
          include: {
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
                symptoms: true
              }
            }
          },
          orderBy: {
            startTime: 'asc'
          }
        },
        assignedTriages: {
          where: {
            status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
          },
          select: {
            id: true
          }
        }
      }
    });

    // Calculate workload for each provider
    const providersWithWorkload = await Promise.all(
      providers.map(async (provider) => {
        // Get or create workload record for the target date
        let workload = await prisma.providerWorkload.findUnique({
          where: {
            providerId_date: {
              providerId: provider.id,
              date: targetDate
            }
          }
        });

        // Calculate real-time workload if not exists or outdated
        const totalSlots = provider.scheduleSlots.length;
        const bookedSlots = provider.scheduleSlots.filter(slot => slot.status === 'BOOKED').length;
        const availableSlots = provider.scheduleSlots.filter(slot => slot.status === 'AVAILABLE').length;
        const emergencySlots = provider.scheduleSlots.filter(slot => 
          slot.appointmentType === 'EMERGENCY' && slot.status === 'AVAILABLE'
        ).length;
        const utilizationRate = totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;

        // Update or create workload record
        if (!workload || workload.updatedAt < new Date(Date.now() - 30 * 60 * 1000)) { // 30 minutes cache
          workload = await prisma.providerWorkload.upsert({
            where: {
              providerId_date: {
                providerId: provider.id,
                date: targetDate
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
              providerId: provider.id,
              date: targetDate,
              totalSlots,
              bookedSlots,
              availableSlots,
              emergencySlots,
              utilizationRate
            }
          });
        }

        return {
          id: provider.id,
          email: provider.email,
          role: provider.role,
          specialties: provider.specialties,
          scheduleSlots: provider.scheduleSlots,
          workload: {
            totalSlots: workload.totalSlots,
            bookedSlots: workload.bookedSlots,
            availableSlots: workload.availableSlots,
            emergencySlots: workload.emergencySlots,
            utilizationRate: workload.utilizationRate
          },
          currentTriageLoad: provider.assignedTriages.length
        };
      })
    );

    return NextResponse.json({
      data: providersWithWorkload,
      meta: {
        date: date,
        totalProviders: providersWithWorkload.length,
        averageUtilization: providersWithWorkload.length > 0 
          ? providersWithWorkload.reduce((sum, p) => sum + Number(p.workload.utilizationRate), 0) / providersWithWorkload.length
          : 0
      }
    });

  } catch (error) {
    console.error('Error fetching schedule data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST handler for creating new schedule slots
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    // Check if user is authenticated and has admin role
    if (!session || !session.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { 
      providerId, 
      startTime, 
      endTime, 
      appointmentType = 'CONSULTATION',
      description,
      location,
      patientId,
      triageId
    } = body;

    // Validate required fields
    if (!providerId || !startTime || !endTime) {
      return NextResponse.json({ 
        error: 'Provider ID, start time, and end time are required' 
      }, { status: 400 });
    }

    // Validate provider belongs to same clinic
    const provider = await prisma.user.findUnique({
      where: { id: providerId }
    });

    if (!provider || provider.clinicId !== session.user.clinicId) {
      return NextResponse.json({ error: 'Provider not found or not in your clinic' }, { status: 404 });
    }

    // Check for scheduling conflicts
    const conflictingSlots = await prisma.scheduleSlot.findMany({
      where: {
        providerId,
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

    // Determine status based on whether patient/triage is assigned
    const status = patientId || triageId ? 'BOOKED' : 'AVAILABLE';

    // Create the schedule slot
    const scheduleSlot = await prisma.scheduleSlot.create({
      data: {
        providerId,
        patientId,
        triageId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        appointmentType,
        status,
        description,
        location
      },
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

    // Update provider workload
    const date = new Date(startTime);
    date.setHours(0, 0, 0, 0);

    await updateProviderWorkload(providerId, date);

    // Log the schedule creation
    await prisma.securityAuditLog.create({
      data: {
        eventType: 'SCHEDULE_SLOT_CREATED',
        severity: 'INFO',
        userId: session.user.id,
        username: session.user.email,
        description: 'Schedule slot created',
        metadata: JSON.stringify({
          scheduleSlotId: scheduleSlot.id,
          providerId,
          patientId,
          triageId,
          appointmentType,
          startTime,
          endTime
        })
      }
    });

    return NextResponse.json({ 
      data: scheduleSlot,
      message: 'Schedule slot created successfully' 
    });

  } catch (error) {
    console.error('Error creating schedule slot:', error);
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

    // Get all slots for the day
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

    // Update workload record
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

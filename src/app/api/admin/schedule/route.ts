/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * API endpoint for schedule management - retrieve and create schedule slots
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { UserRole } from '@/auth';
import { getSession } from '@/auth/services/utils/session-utils';
import { randomUUID } from 'crypto';

/**
 * GET handler for fetching schedule data with multiple view options
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !session.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');
    const view = searchParams.get('view') || 'calendar';
    const providerId = searchParams.get('providerId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    // Parse date range
    let startDate: Date;
    let endDate: Date;

    if (date) {
      startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Default to today
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    }    // Build where conditions
    const whereConditions: any = {
      startTime: {
        gte: startDate,
        lte: endDate
      },
      User: {
        clinicId: session.user.clinicId
      }
    };

    if (providerId) {
      whereConditions.providerId = providerId;
    }    // Fetch schedule slots with related data
    const scheduleSlots = await prisma.scheduleSlot.findMany({
      where: whereConditions,
      include: {
        User: {
          select: {
            id: true,
            email: true,
            role: true,
            ProviderSpecialty: {
              where: { isCertified: true },
              select: { specialty: true }
            }
          }
        },
        Patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        PatientTriage: {
          select: {
            id: true,
            urgencyLevel: true,
            symptoms: true,
            status: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      },
      take: limit,
      skip: (page - 1) * limit
    });

    // Get total count
    const totalSlots = await prisma.scheduleSlot.count({
      where: whereConditions
    });    // Fetch workload data for the date range
    const clinicIdForWorkload = session.user.clinicId ? session.user.clinicId : undefined;
    const providerIdForWorkload = providerId ? providerId : undefined;
    const workloadData = await getWorkloadData(
      clinicIdForWorkload, 
      startDate, 
      endDate, 
      providerIdForWorkload
    );

    // Build response based on view
    const responseData = {      slots: scheduleSlots.map(slot => ({
        id: slot.id,
        startTime: slot.startTime.toISOString(),
        endTime: slot.endTime.toISOString(),
        status: slot.status,
        appointmentType: slot.appointmentType,
        description: slot.description,
        location: slot.location,
        provider: {
          id: slot.User.id,
          email: slot.User.email,
          role: slot.User.role,
          specialties: slot.User.ProviderSpecialty.map((s: any) => s.specialty)
        },
        patient: slot.Patient ? {
          id: slot.Patient.id,
          firstName: slot.Patient.firstName,
          lastName: slot.Patient.lastName
        } : null,
        triage: slot.PatientTriage ? {
          id: slot.PatientTriage.id,
          urgencyLevel: slot.PatientTriage.urgencyLevel,
          symptoms: slot.PatientTriage.symptoms,
          status: slot.PatientTriage.status
        } : null
      })),
      workload: workloadData,
      total: totalSlots,
      page,
      limit,
      view
    };

    return NextResponse.json({ 
      data: responseData,
      success: true
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
    
    if (!session || !session.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Verify provider exists and belongs to the same clinic
    const provider = await prisma.user.findUnique({
      where: { id: providerId },
      select: { 
        id: true, 
        clinicId: true, 
        email: true, 
        role: true 
      }
    });

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    if (provider.clinicId !== session.user.clinicId) {
      return NextResponse.json({ error: 'Provider not in your clinic' }, { status: 403 });
    }

    // Check for conflicting schedule slots
    const startDateTime = new Date(startTime);
    const endDateTime = new Date(endTime);

    if (startDateTime >= endDateTime) {
      return NextResponse.json({ 
        error: 'Start time must be before end time' 
      }, { status: 400 });
    }

    const conflictingSlots = await prisma.scheduleSlot.findMany({
      where: {
        providerId,
        OR: [
          {
            AND: [
              { startTime: { lte: startDateTime } },
              { endTime: { gt: startDateTime } }
            ]
          },
          {
            AND: [
              { startTime: { lt: endDateTime } },
              { endTime: { gte: endDateTime } }
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

    // Determine initial status
    let status = 'AVAILABLE';
    if (patientId || triageId) {
      status = 'BOOKED';
    }

    // Create the schedule slot
    const newSlot = await prisma.scheduleSlot.create({
      data: {
        id: randomUUID(),
        providerId,
        startTime: startDateTime,
        endTime: endDateTime,
        status,
        appointmentType,
        description,
        location,
        patientId: patientId || null,
        triageId: triageId || null,
        updatedAt: new Date()
      },      include: {
        User: {
          select: {
            id: true,
            email: true,
            role: true
          }
        },
        Patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        PatientTriage: {
          select: {
            id: true,
            urgencyLevel: true,
            symptoms: true,
            status: true
          }
        }
      }
    });

    // Update provider workload for the date
    const slotDate = new Date(startDateTime);
    slotDate.setHours(0, 0, 0, 0);
    await updateProviderWorkload(providerId, slotDate);    // Log the creation
    await prisma.securityAuditLog.create({
      data: {
        id: randomUUID(),
        eventType: 'SCHEDULE_SLOT_CREATED',
        severity: 'INFO',
        userId: session.user.id,
        username: session.user.email,
        description: 'Schedule slot created',
        metadata: JSON.stringify({
          scheduleSlotId: newSlot.id,
          providerId,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          appointmentType,
          status
        })
      }
    });

    return NextResponse.json({ 
      data: newSlot,
      message: 'Schedule slot created successfully' 
    });

  } catch (error) {
    console.error('Error creating schedule slot:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * Helper function to get workload data for providers
 */
async function getWorkloadData(clinicId: string | null | undefined, startDate: Date, endDate: Date, providerId?: string) {
  try {
    if (!clinicId) {
      return [];
    }
    
    const whereConditions: any = {
      date: {
        gte: startDate,
        lte: endDate
      },
      User: {
        clinicId
      }
    };

    if (providerId) {
      whereConditions.providerId = providerId;
    }

    const workloadRecords = await prisma.providerWorkload.findMany({
      where: whereConditions,
      include: {
        User: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        utilizationRate: 'desc'
      }
    });

    return workloadRecords.map(record => ({
      providerId: record.providerId,
      providerEmail: record.User.email,
      providerRole: record.User.role,
      date: record.date.toISOString(),
      totalSlots: record.totalSlots,
      bookedSlots: record.bookedSlots,
      availableSlots: record.availableSlots,
      emergencySlots: record.emergencySlots,
      utilizationRate: record.utilizationRate
    }));

  } catch (error) {
    console.error('Error fetching workload data:', error);
    return [];
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
    const utilizationRate = totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;    await prisma.providerWorkload.upsert({
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
        utilizationRate,
        updatedAt: new Date()
      },
      create: {
        id: randomUUID(),
        providerId,
        date: startOfDay,
        totalSlots,
        bookedSlots,
        availableSlots,
        emergencySlots,
        utilizationRate,
        updatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error updating provider workload:', error);
  }
}
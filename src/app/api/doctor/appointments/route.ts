/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * API endpoint for doctor appointment management with AI scheduling insights
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { UserRole } from '@/auth';
import { getSession } from '@/auth/services/utils/session-utils';
import { randomUUID } from 'crypto';

/**
 * GET handler for fetching doctor's appointments with AI insights
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !session.user || session.user.role !== UserRole.DOCTOR) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const status = searchParams.get('status') || '';
    const timeframe = searchParams.get('timeframe') || 'day'; // day, week, month
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Calculate date range based on timeframe
    let startDate: Date;
    let endDate: Date;

    const baseDate = new Date(date);
    
    switch (timeframe) {
      case 'week':
        startDate = new Date(baseDate);
        startDate.setDate(baseDate.getDate() - baseDate.getDay()); // Start of week
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
        startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
        endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      default: // day
        startDate = new Date(baseDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(baseDate);
        endDate.setHours(23, 59, 59, 999);
    }

    // Build where conditions
    const whereConditions: any = {
      providerId: session.user.id,
      startTime: {
        gte: startDate,
        lte: endDate
      }
    };

    if (status) {
      whereConditions.status = status;
    }

    // Fetch appointments with related data
    const appointments = await prisma.scheduleSlot.findMany({
      where: whereConditions,
      include: {
        Patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            dateOfBirth: true,
            gender: true,
            medicalHistory: true,
            allergies: true,
            currentMedications: true
          }
        },        PatientTriage: {
          select: {
            id: true,
            urgencyLevel: true,
            symptoms: true,
            status: true,
            createdAt: true
          }
        },        ClinicalNote: {
          where: {
            providerId: session.user.id
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            actionType: true,
            status: true,
            notes: true,
            createdAt: true
          }
        }
      },
      orderBy: { startTime: 'asc' },
      skip: (page - 1) * limit,
      take: limit
    });

    // Get total count
    const totalAppointments = await prisma.scheduleSlot.count({
      where: whereConditions
    });

    // Calculate summary statistics
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [todayAppointments, upcomingCount, completedToday] = await Promise.all([
      prisma.scheduleSlot.count({
        where: {
          providerId: session.user.id,
          startTime: { gte: todayStart, lte: todayEnd },
          status: { in: ['BOOKED'] }
        }
      }),
      prisma.scheduleSlot.count({
        where: {
          providerId: session.user.id,
          startTime: { gte: new Date() },
          status: 'BOOKED'
        }
      }),
      prisma.scheduleSlot.count({
        where: {
          providerId: session.user.id,
          startTime: { gte: todayStart, lte: todayEnd },
          status: 'COMPLETED'
        }
      })
    ]);

    // Process appointments data with AI insights
    const processedAppointments = appointments.map(appointment => {      // Calculate appointment status and urgency
      const now = new Date();
      const appointmentTime = new Date(appointment.startTime);
      const timeUntilAppointment = appointmentTime.getTime() - now.getTime();
      const minutesUntil = Math.floor(timeUntilAppointment / (1000 * 60));

      let appointmentStatus = appointment.status;
      if (appointmentStatus === 'BOOKED') {
        if (minutesUntil < 0) {
          appointmentStatus = 'OVERDUE';
        } else if (minutesUntil <= 15) {
          appointmentStatus = 'IMMINENT';
        } else if (minutesUntil <= 60) {
          appointmentStatus = 'UPCOMING';
        }
      }      // Calculate risk level
      const urgencyLevel = appointment.PatientTriage?.urgencyLevel || 'LOW';
      const riskScore = 0;

      return {
        id: appointment.id,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointmentStatus,
        originalStatus: appointment.status,
        appointmentType: appointment.appointmentType,
        description: appointment.description,
        location: appointment.location,        
        // Patient information
        patient: appointment.Patient ? {
          id: appointment.Patient.id,
          name: `${appointment.Patient.firstName} ${appointment.Patient.lastName}`,
          firstName: appointment.Patient.firstName,
          lastName: appointment.Patient.lastName,
          email: appointment.Patient.email,
          phone: appointment.Patient.phone,
          age: appointment.Patient.dateOfBirth ? 
            Math.floor((Date.now() - new Date(appointment.Patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null,
          gender: appointment.Patient.gender,
          medicalHistory: appointment.Patient.medicalHistory,
          allergies: appointment.Patient.allergies,
          currentMedications: appointment.Patient.currentMedications
        } : null,

        // Triage information
        triage: appointment.PatientTriage ? {
          id: appointment.PatientTriage.id,
          urgencyLevel: appointment.PatientTriage.urgencyLevel,
          symptoms: appointment.PatientTriage.symptoms,
          status: appointment.PatientTriage.status,
          createdAt: appointment.PatientTriage.createdAt
        } : null,

        // Clinical notes
        recentNotes: appointment.ClinicalNote.slice(0, 3),

        // Time-based metadata
        timing: {
          minutesUntil,
          isToday: appointmentTime.toDateString() === new Date().toDateString(),
          isOverdue: minutesUntil < 0 && appointment.status === 'BOOKED',
          duration: Math.floor((new Date(appointment.endTime).getTime() - appointmentTime.getTime()) / (1000 * 60))
        },        // Clinical priority
        priority: {
          urgencyLevel,
          riskScore,
          hasAIInsights: false,
          requiresPreparation: appointment.PatientTriage?.urgencyLevel === 'HIGH' || 
                              appointment.PatientTriage?.urgencyLevel === 'CRITICAL'
        }
      };
    });

    // Group appointments for better organization
    const groupedAppointments = {
      overdue: processedAppointments.filter(a => a.timing.isOverdue),
      imminent: processedAppointments.filter(a => a.status === 'IMMINENT'),
      upcoming: processedAppointments.filter(a => a.status === 'UPCOMING'),
      scheduled: processedAppointments.filter(a => a.originalStatus === 'BOOKED' && !a.timing.isOverdue && a.timing.minutesUntil > 60),
      completed: processedAppointments.filter(a => a.originalStatus === 'COMPLETED'),
      other: processedAppointments.filter(a => !['BOOKED', 'COMPLETED'].includes(a.originalStatus))
    };

    return NextResponse.json({
      success: true,
      data: {
        appointments: processedAppointments,
        grouped: groupedAppointments,
        pagination: {
          page,
          limit,
          total: totalAppointments,
          pages: Math.ceil(totalAppointments / limit)
        },
        summary: {
          todayAppointments,
          upcomingCount,
          completedToday,
          overdueCount: groupedAppointments.overdue.length,
          imminentCount: groupedAppointments.imminent.length,
          highPriorityCount: processedAppointments.filter(a => 
            ['HIGH', 'CRITICAL'].includes(a.priority.urgencyLevel)).length
        },
        timeframe: {
          type: timeframe,
          startDate,
          endDate,
          label: formatTimeframeLabel(timeframe, baseDate)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching doctor appointments:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    }, { status: 500 });
  }
}

/**
 * POST handler for creating new appointments or updating existing ones
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !session.user || session.user.role !== UserRole.DOCTOR) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      patientId, 
      startTime, 
      endTime, 
      appointmentType = 'CONSULTATION',
      description,
      location,
      triageId
    } = body;

    // Validate required fields
    if (!patientId || !startTime || !endTime) {
      return NextResponse.json({ 
        error: 'Patient ID, start time, and end time are required' 
      }, { status: 400 });
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, firstName: true, lastName: true }
    });

    if (!patient) {
      return NextResponse.json({ 
        error: 'Patient not found' 
      }, { status: 404 });
    }

    // Check for scheduling conflicts
    const startDateTime = new Date(startTime);
    const endDateTime = new Date(endTime);

    if (startDateTime >= endDateTime) {
      return NextResponse.json({ 
        error: 'Start time must be before end time' 
      }, { status: 400 });
    }

    const conflictingSlots = await prisma.scheduleSlot.findMany({
      where: {
        providerId: session.user.id,
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
        error: 'Schedule conflict detected. You have another appointment during this time.' 
      }, { status: 409 });
    }

    // Create the appointment
    const appointment = await prisma.scheduleSlot.create({
      data: {
        id: randomUUID(),
        providerId: session.user.id,
        patientId,
        startTime: startDateTime,
        endTime: endDateTime,
        status: 'BOOKED',
        appointmentType,
        description,
        location,
        triageId: triageId || null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        Patient: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        PatientTriage: {
          select: {
            urgencyLevel: true,
            symptoms: true
          }
        }
      }
    });

    // If linked to a triage, update the triage status
    if (triageId) {
      await prisma.patientTriage.update({
        where: { id: triageId },
        data: { 
          status: 'IN_PROGRESS',
          updatedAt: new Date()
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: appointment,
      message: 'Appointment created successfully'
    });

  } catch (error) {
    console.error('Error creating appointment:', error);    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    }, { status: 500 });
  }
}

/**
 * Helper function to format timeframe labels
 */
function formatTimeframeLabel(timeframe: string, date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'UTC'
  };

  switch (timeframe) {
    case 'week':
      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - date.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `Week of ${startOfWeek.toLocaleDateString()} - ${endOfWeek.toLocaleDateString()}`;
    case 'month':
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
    default:
      return date.toLocaleDateString(undefined, { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
  }
}

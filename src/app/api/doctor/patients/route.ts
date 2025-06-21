/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * API endpoint for doctor patient management with AI insights and PIPEDA compliance
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { UserRole } from '@/auth';
import { getSession } from '@/auth/services/utils/session-utils';

/**
 * GET handler for fetching assigned patients with AI insights and triage integration
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    // Check if user is authenticated and is a doctor
    if (!session || !session.user || session.user.role !== UserRole.DOCTOR) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const urgencyLevel = searchParams.get('urgencyLevel') || '';
    const patientType = searchParams.get('type') || 'all'; // 'assigned', 'scheduled', 'all'

    // Build where conditions for assigned patients
    const whereConditions: any = {
      clinicId: session.user.clinicId, // Ensure clinic isolation
    };

    // Add patient type filtering
    if (patientType === 'assigned') {
      whereConditions.PatientTriage = {
        some: {
          assignedToId: session.user.id,
          status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
        }
      };
    } else if (patientType === 'scheduled') {
      whereConditions.ScheduleSlot = {
        some: {
          providerId: session.user.id,
          status: { in: ['BOOKED'] },
          startTime: { gte: new Date() }
        }
      };
    } else {
      // All patients (assigned + scheduled)
      whereConditions.OR = [
        {
          PatientTriage: {
            some: {
              assignedToId: session.user.id,
              status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
            }
          }
        },
        {
          ScheduleSlot: {
            some: {
              providerId: session.user.id,
              status: { in: ['BOOKED'] },
              startTime: { gte: new Date() }
            }
          }
        }
      ];
    }

    // Add search filter
    if (search) {
      const searchConditions = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      };

      if (whereConditions.OR) {
        whereConditions.AND = [
          { OR: whereConditions.OR },
          searchConditions
        ];
        delete whereConditions.OR;
      } else {
        whereConditions.AND = [searchConditions];
      }
    }

    // Add urgency level filter
    if (urgencyLevel) {
      const urgencyCondition = {
        PatientTriage: {
          some: {
            urgencyLevel: urgencyLevel,
            assignedToId: session.user.id
          }
        }
      };

      if (whereConditions.AND) {
        whereConditions.AND.push(urgencyCondition);
      } else {
        whereConditions.AND = [urgencyCondition];
      }
    }

    // Fetch patients with related data
    const patients = await prisma.patient.findMany({
      where: whereConditions,
      include: {
        // Active triage assignments
        PatientTriage: {
          where: {
            assignedToId: session.user.id,
            status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
          },
          orderBy: { createdAt: 'desc' },
          take: 3
        },
        // Upcoming appointments
        ScheduleSlot: {
          where: {
            providerId: session.user.id,
            status: 'BOOKED',
            startTime: { gte: new Date() }
          },
          orderBy: { startTime: 'asc' },
          take: 5
        },
        // Patient consent records for PIPEDA compliance
        consent: {
          select: {
            id: true,
            basicCare: true,
            aiAnalysis: true,
            dataSharing: true,
            consentGivenAt: true,
            consentExpiresAt: true
          }
        }
      },
      orderBy: [
        { updatedAt: 'desc' }
      ],
      skip: (page - 1) * limit,
      take: limit
    });

    // Get total count
    const totalPatients = await prisma.patient.count({
      where: whereConditions
    });

    // Calculate summary statistics
    const totalActiveTriages = await prisma.patientTriage.count({
      where: {
        assignedToId: session.user.id,
        status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
      }
    });

    const upcomingAppointments = await prisma.scheduleSlot.count({
      where: {
        providerId: session.user.id,
        status: 'BOOKED',
        startTime: { 
          gte: new Date(),
          lte: new Date(Date.now() + 24 * 60 * 60 * 1000) // Next 24 hours
        }
      }
    });

    // Process patients data to include AI insights and consent status
    const processedPatients = patients.map(patient => {
      // Check consent compliance
      const hasValidConsent = patient.consent && patient.consent.basicCare && 
        (!patient.consent.consentExpiresAt || new Date(patient.consent.consentExpiresAt) > new Date());

      // Get risk level from triage
      const highestUrgency = patient.PatientTriage.reduce((highest, triage) => {
        const urgencyValues = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4 };
        const currentValue = urgencyValues[triage.urgencyLevel as keyof typeof urgencyValues] || 0;
        return currentValue > highest ? currentValue : highest;
      }, 0);

      const urgencyLabels = ['', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      const riskLevel = urgencyLabels[highestUrgency] || 'LOW';

      return {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        phone: patient.phone,
        address: patient.address,
        emergencyContact: patient.emergencyContact,
        medicalHistory: patient.medicalHistory,
        allergies: patient.allergies,
        currentMedications: patient.currentMedications,
        lastVisit: patient.updatedAt,
        
        // Compliance Status
        compliance: {
          hasValidConsent,
          aiAnalysisConsent: patient.consent?.aiAnalysis || false,
          dataSharing: patient.consent?.dataSharing || false
        },

        // Clinical Status
        clinicalStatus: {
          riskLevel,
          activeTriages: patient.PatientTriage.length,
          upcomingAppointments: patient.ScheduleSlot.length
        },

        // Recent activity
        recentTriages: patient.PatientTriage.map(triage => ({
          id: triage.id,
          urgencyLevel: triage.urgencyLevel,
          status: triage.status,
          symptoms: triage.symptoms,
          createdAt: triage.createdAt
        })),

        nextAppointment: patient.ScheduleSlot[0] ? {
          id: patient.ScheduleSlot[0].id,
          startTime: patient.ScheduleSlot[0].startTime,
          appointmentType: patient.ScheduleSlot[0].appointmentType,
          status: patient.ScheduleSlot[0].status
        } : null
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        patients: processedPatients,
        pagination: {
          page,
          limit,
          total: totalPatients,
          pages: Math.ceil(totalPatients / limit)
        },
        summary: {
          totalPatients,
          activeTriages: totalActiveTriages,
          upcomingAppointments,
          consentCompliance: processedPatients.filter(p => p.compliance.hasValidConsent).length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching doctor patients:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, { status: 500 });
  }
}

/**
 * PATCH handler for updating patient status or adding care notes
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !session.user || session.user.role !== UserRole.DOCTOR) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { patientId, action, data } = body;

    // Validate required fields
    if (!patientId || !action) {
      return NextResponse.json({ 
        error: 'Patient ID and action are required' 
      }, { status: 400 });
    }

    // Verify patient exists and doctor has access
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        OR: [
          {
            PatientTriage: {
              some: {
                assignedToId: session.user.id
              }
            }
          },
          {
            ScheduleSlot: {
              some: {
                providerId: session.user.id
              }
            }
          }
        ]
      }
    });

    if (!patient) {
      return NextResponse.json({ 
        error: 'Patient not found or access denied' 
      }, { status: 404 });
    }

    let result;

    switch (action) {
      case 'update_triage_status':
        result = await prisma.patientTriage.updateMany({
          where: {
            patientId,
            assignedToId: session.user.id,
            status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
          },
          data: {
            status: data.status,
            notes: data.notes,
            updatedAt: new Date()
          }
        });
        break;

      case 'add_vital_signs':
        // Store vital signs in patient's medical history
        result = await prisma.patient.update({
          where: { id: patientId },
          data: {
            medicalHistory: {
              push: `Vital Signs (${new Date().toISOString()}): ${JSON.stringify(data.vitals)}`
            },
            updatedAt: new Date()
          }
        });
        break;

      case 'complete_consultation':
        // Update triage status to completed
        await prisma.patientTriage.updateMany({
          where: {
            patientId,
            assignedToId: session.user.id,
            status: 'IN_PROGRESS'
          },
          data: {
            status: 'COMPLETED',
            notes: data.notes,
            updatedAt: new Date()
          }
        });

        // Update appointment status if exists
        await prisma.scheduleSlot.updateMany({
          where: {
            patientId,
            providerId: session.user.id,
            status: 'BOOKED'
          },
          data: {
            status: 'COMPLETED'
          }
        });

        result = { success: true, message: 'Consultation completed' };
        break;

      default:
        return NextResponse.json({ 
          error: 'Invalid action' 
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error updating patient:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, { status: 500 });
  }
}

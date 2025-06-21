/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * API endpoint for signing clinical documentation
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { UserRole } from '@/auth';
import { getSession } from '@/auth/services/utils/session-utils';
import { randomUUID } from 'crypto';

/**
 * POST handler for electronically signing clinical documentation
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !session.user || session.user.role !== UserRole.DOCTOR) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      noteId, 
      patientId, 
      content, 
      type, 
      signature = 'electronic', 
      timestamp = new Date().toISOString() 
    } = body;

    // Validate required fields
    if (!noteId && (!patientId || !content)) {
      return NextResponse.json({ 
        error: 'Either noteId or (patientId and content) are required' 
      }, { status: 400 });
    }

    let clinicalNote;

    if (noteId) {
      // Sign existing note
      clinicalNote = await prisma.clinicalNote.findFirst({
        where: {
          id: noteId,
          providerId: session.user.id
        },
        include: {
          Patient: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      if (!clinicalNote) {
        return NextResponse.json({ 
          error: 'Clinical note not found or access denied' 
        }, { status: 404 });
      }      // Update note with signature
      clinicalNote = await prisma.clinicalNote.update({
        where: { id: noteId },
        data: {
          status: 'SIGNED',
          updatedAt: new Date()
        },
        include: {
          Patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });
    } else {
      // Create and sign new note
      const patient = await prisma.patient.findFirst({
        where: {
          id: patientId,
          OR: [
            { PatientTriage: { some: { assignedToId: session.user.id } } },
            { ScheduleSlot: { some: { providerId: session.user.id } } }
          ]
        },
        select: { id: true, firstName: true, lastName: true, email: true }
      });

      if (!patient) {
        return NextResponse.json({ 
          error: 'Patient not found or access denied' 
        }, { status: 404 });
      }      clinicalNote = await prisma.clinicalNote.create({
        data: {
          id: randomUUID(),
          patientId,
          providerId: session.user.id,
          title: `${type || 'Clinical'} Note - ${new Date().toLocaleDateString()}`,
          noteType: type || 'clinical_note',
          content,
          status: 'SIGNED',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        include: {
          Patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });
    }    // Create audit log for signature
    await prisma.auditLog.create({
      data: {
        id: randomUUID(),
        userId: session.user.id,
        action: 'SIGN_CLINICAL_NOTE',
        details: {
          noteId: clinicalNote.id,
          patientId: clinicalNote.patientId,
          noteType: clinicalNote.noteType,
          signatureType: signature,
          timestamp,
          wordCount: clinicalNote.content ? clinicalNote.content.split(/\s+/).length : 0
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date()
      }
    });

    // Create billing record if this is a completed encounter
    if (type && ['soap', 'consultation', 'procedure'].includes(type)) {
      try {        const billingRecord = await prisma.billingRecord.create({
          data: {
            id: randomUUID(),
            patientId: clinicalNote.patientId,
            providerId: session.user.id,
            serviceDate: new Date(),
            serviceCode: getBillingCode(type),
            description: `${type} consultation and documentation`,
            amount: getBillingAmount(type),
            status: 'PENDING',
            notes: JSON.stringify({
              noteId: clinicalNote.id,
              noteType: type,
              documentationComplete: true,
              signedAt: timestamp
            }),
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      } catch (billingError) {
        console.warn('Failed to create billing record:', billingError);
        // Continue execution - billing failure shouldn't block signing
      }
    }    return NextResponse.json({
      success: true,
      data: {
        note: {
          id: clinicalNote.id,
          title: clinicalNote.title,
          noteType: clinicalNote.noteType,
          content: clinicalNote.content,
          status: clinicalNote.status,
          signedAt: timestamp,
          signatureType: signature,
          patient: {
            id: clinicalNote.Patient.id,
            name: `${clinicalNote.Patient.firstName} ${clinicalNote.Patient.lastName}`,
            email: clinicalNote.Patient.email
          }
        }
      },
      message: 'Clinical note signed successfully'
    });
  } catch (error) {
    console.error('Error signing clinical note:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    }, { status: 500 });
  }
}

/**
 * Helper function to determine billing code based on note type
 */
function getBillingCode(noteType: string): string {
  const codeMap = {
    'soap': '99214',      // Standard office visit
    'consultation': '99244', // Consultation
    'procedure': '99213',    // Procedure visit
    'progress': '99213',     // Progress note visit
    'discharge': '99238'     // Discharge management
  };
  
  return codeMap[noteType as keyof typeof codeMap] || '99214';
}

/**
 * Helper function to determine billing amount based on note type
 */
function getBillingAmount(noteType: string): number {
  const billingMap = {
    'soap': 150.00,           // Standard SOAP note consultation
    'consultation': 200.00,   // Specialist consultation
    'procedure': 300.00,      // Procedure note
    'progress': 100.00,       // Progress note
    'discharge': 125.00       // Discharge summary
  };
  
  return billingMap[noteType as keyof typeof billingMap] || 150.00;
}

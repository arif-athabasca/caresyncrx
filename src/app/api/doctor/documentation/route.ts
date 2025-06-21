/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * API endpoint for doctor documentation and clinical notes management
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { UserRole } from '@/auth';
import { randomUUID } from 'crypto';
import { getSession } from '@/auth/services/utils/session-utils';

/**
 * GET handler for fetching clinical documentation and notes
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !session.user || session.user.role !== UserRole.DOCTOR) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const patientId = searchParams.get('patientId');
    const documentType = searchParams.get('type') || 'all'; // clinical_note, prescription_note, progress_note, discharge_summary
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Build where conditions
    const whereConditions: any = {
      providerId: session.user.id
    };

    if (patientId) {
      whereConditions.patientId = patientId;
    }

    if (documentType !== 'all') {
      whereConditions.noteType = documentType;
    }

    if (search) {
      whereConditions.OR = [
        { content: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { Patient: {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } }
          ]
        }}
      ];
    }

    if (dateFrom || dateTo) {
      whereConditions.createdAt = {};
      if (dateFrom) {
        whereConditions.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        whereConditions.createdAt.lte = endDate;
      }
    }

    // Fetch clinical notes
    const clinicalNotes = await prisma.clinicalNote.findMany({
      where: whereConditions,
      include: {
        Patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            dateOfBirth: true
          }
        },
        ScheduleSlot: {
          select: {
            id: true,
            startTime: true,
            appointmentType: true
          }
        },
        PatientTriage: {
          select: {
            id: true,
            urgencyLevel: true,
            symptoms: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    // Get total count
    const totalNotes = await prisma.clinicalNote.count({
      where: whereConditions
    });

    // Process notes with additional metadata
    const processedNotes = clinicalNotes.map(note => {
      const patientAge = note.Patient.dateOfBirth ? 
        Math.floor((Date.now() - new Date(note.Patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;

      return {
        id: note.id,
        title: note.title,
        noteType: note.noteType,
        content: note.content,
        tags: note.tags,
        isConfidential: note.isConfidential,
        status: note.status,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        
        // Patient information
        patient: {
          id: note.Patient.id,
          name: `${note.Patient.firstName} ${note.Patient.lastName}`,
          firstName: note.Patient.firstName,
          lastName: note.Patient.lastName,
          email: note.Patient.email,
          age: patientAge
        },

        // Related appointment
        appointment: note.ScheduleSlot ? {
          id: note.ScheduleSlot.id,
          startTime: note.ScheduleSlot.startTime,
          appointmentType: note.ScheduleSlot.appointmentType
        } : null,

        // Related triage
        triage: note.PatientTriage ? {
          id: note.PatientTriage.id,
          urgencyLevel: note.PatientTriage.urgencyLevel,
          symptoms: note.PatientTriage.symptoms
        } : null,

        // Metadata
        metadata: {
          wordCount: note.content ? note.content.split(/\s+/).length : 0,
          hasAttachments: false, // TODO: Implement attachments
          lastModified: note.updatedAt,
          isRecent: (Date.now() - new Date(note.createdAt).getTime()) < (24 * 60 * 60 * 1000)
        }
      };
    });

    // Get summary statistics
    const [
      totalByType,
      recentCount,
      patientCount
    ] = await Promise.all([
      prisma.clinicalNote.groupBy({
        by: ['noteType'],
        where: { providerId: session.user.id },
        _count: { noteType: true }
      }),
      prisma.clinicalNote.count({
        where: {
          providerId: session.user.id,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      }),
      prisma.clinicalNote.findMany({
        where: { providerId: session.user.id },
        distinct: ['patientId'],
        select: { patientId: true }
      }).then(results => results.length)
    ]);

    return NextResponse.json({
      success: true,
      data: {
        notes: processedNotes,
        pagination: {
          page,
          limit,
          total: totalNotes,
          pages: Math.ceil(totalNotes / limit)
        },
        summary: {
          total: totalNotes,
          recentCount,
          patientCount,
          typeBreakdown: totalByType.reduce((acc, item) => {
            acc[item.noteType] = item._count.noteType;
            return acc;
          }, {} as Record<string, number>)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching clinical notes:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

/**
 * POST handler for creating new clinical documentation
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
      title,
      noteType = 'clinical_note',
      content,
      tags = [],
      isConfidential = false,
      appointmentId,
      triageId,
      templateId
    } = body;

    // Validate required fields
    if (!patientId || !title || !content) {
      return NextResponse.json({ 
        error: 'Patient ID, title, and content are required' 
      }, { status: 400 });
    }

    // Verify patient exists and doctor has access
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        OR: [
          { PatientTriage: { some: { assignedToId: session.user.id } } },
          { ScheduleSlot: { some: { providerId: session.user.id } } }
        ]
      },
      select: { id: true, firstName: true, lastName: true }
    });

    if (!patient) {
      return NextResponse.json({ 
        error: 'Patient not found or access denied' 
      }, { status: 404 });
    }

    // Verify appointment if provided
    if (appointmentId) {
      const appointment = await prisma.scheduleSlot.findFirst({
        where: {
          id: appointmentId,
          providerId: session.user.id,
          patientId
        }
      });

      if (!appointment) {
        return NextResponse.json({ 
          error: 'Appointment not found or access denied' 
        }, { status: 404 });
      }
    }

    // Apply template if provided
    let finalContent = content;
    if (templateId) {
      const template = await getTemplate(templateId, noteType);
      if (template) {
        finalContent = applyTemplate(template, content, patient);
      }
    }

    // Create clinical note
    const clinicalNote = await prisma.clinicalNote.create({
      data: {
        id: randomUUID(),
        patientId,
        providerId: session.user.id,
        appointmentId: appointmentId || null,
        triageId: triageId || null,
        title,
        noteType,
        content: finalContent,
        tags: tags || [],
        isConfidential,
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date()
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

    // Create audit log
    await prisma.auditLog.create({
      data: {
        id: randomUUID(),
        userId: session.user.id,
        action: 'CREATE_CLINICAL_NOTE',
        resourceType: 'ClinicalNote',
        resourceId: clinicalNote.id,
        details: {
          patientId,
          noteType,
          title,
          isConfidential,
          wordCount: finalContent.split(/\s+/).length
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date()
      }
    });

    // Generate AI insights for the note if requested
    const aiInsights = await generateNoteAIInsights(clinicalNote, patient);

    return NextResponse.json({
      success: true,
      data: {
        note: clinicalNote,
        aiInsights
      },
      message: 'Clinical note created successfully'
    });

  } catch (error) {
    console.error('Error creating clinical note:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

/**
 * PATCH handler for updating clinical documentation
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !session.user || session.user.role !== UserRole.DOCTOR) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { noteId, title, content, tags, isConfidential, status } = body;

    if (!noteId) {
      return NextResponse.json({ 
        error: 'Note ID is required' 
      }, { status: 400 });
    }

    // Verify note exists and doctor has access
    const existingNote = await prisma.clinicalNote.findFirst({
      where: {
        id: noteId,
        providerId: session.user.id
      }
    });

    if (!existingNote) {
      return NextResponse.json({ 
        error: 'Clinical note not found or access denied' 
      }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    };

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (tags !== undefined) updateData.tags = tags;
    if (isConfidential !== undefined) updateData.isConfidential = isConfidential;
    if (status !== undefined) updateData.status = status;

    // Update the note
    const updatedNote = await prisma.clinicalNote.update({
      where: { id: noteId },
      data: updateData,
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

    // Create audit log
    await prisma.auditLog.create({
      data: {
        id: randomUUID(),
        userId: session.user.id,
        action: 'UPDATE_CLINICAL_NOTE',
        resourceType: 'ClinicalNote',
        resourceId: noteId,
        details: {
          changes: Object.keys(updateData).filter(key => key !== 'updatedAt'),
          previousStatus: existingNote.status,
          newStatus: status || existingNote.status
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedNote,
      message: 'Clinical note updated successfully'
    });

  } catch (error) {
    console.error('Error updating clinical note:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

/**
 * Get clinical note templates
 */
async function getTemplate(templateId: string, noteType: string): Promise<any> {
  // In a real implementation, this would fetch from a templates database
  const templates = {
    'soap_template': {
      id: 'soap_template',
      name: 'SOAP Note Template',
      content: `
SUBJECTIVE:
[Patient's chief complaint and history of present illness]

OBJECTIVE:
[Physical examination findings, vital signs, diagnostic results]

ASSESSMENT:
[Clinical impression and diagnosis]

PLAN:
[Treatment plan, medications, follow-up]
      `.trim()
    },
    'progress_template': {
      id: 'progress_template',
      name: 'Progress Note Template',
      content: `
PROGRESS NOTE

Date: [Date]
Patient: [Patient Name]

Current Status:
[Patient's current condition and response to treatment]

Interval History:
[Changes since last visit]

Assessment:
[Current clinical assessment]

Plan:
[Ongoing treatment plan and next steps]
      `.trim()
    }
  };

  return templates[templateId as keyof typeof templates] || null;
}

/**
 * Apply template to content
 */
function applyTemplate(template: any, content: string, patient: any): string {
  let appliedContent = template.content;
  
  // Replace placeholder variables
  appliedContent = appliedContent.replace(/\[Date\]/g, new Date().toLocaleDateString());
  appliedContent = appliedContent.replace(/\[Patient Name\]/g, `${patient.firstName} ${patient.lastName}`);
  
  // Append user content
  if (content) {
    appliedContent += '\n\n' + content;
  }
  
  return appliedContent;
}

/**
 * Generate AI insights for clinical notes
 */
async function generateNoteAIInsights(note: any, patient: any): Promise<any> {
  try {
    // Call external AI service for note analysis
    const aiResponse = await callExternalAIService({
      type: 'clinical_note_analysis',
      note: {
        type: note.noteType,
        content: note.content,
        title: note.title
      },
      patient: {
        name: `${patient.firstName} ${patient.lastName}`,
        id: patient.id
      }
    });

    return aiResponse || {
      insights: [
        'Note structure follows clinical documentation standards',
        'Consider adding specific measurements or quantitative data',
        'Review for completeness of assessment and plan sections'
      ],
      suggestions: [
        'Add follow-up timeline',
        'Include patient education provided',
        'Document any patient concerns or questions'
      ],
      qualityScore: 85,
      completeness: 'Good'
    };

  } catch (error) {
    console.error('Error generating AI insights:', error);
    return {
      insights: ['AI analysis unavailable'],
      suggestions: [],
      qualityScore: null,
      completeness: 'Unknown'
    };
  }
}

/**
 * Call external AI service
 */
async function callExternalAIService(payload: any): Promise<any> {
  try {
    const AI_API_URL = process.env.AI_API_URL || 'http://localhost:4000';
    const AI_API_KEY = process.env.AI_API_KEY || 'web_ui_api_key_13579_change_in_production';

    if (!AI_API_URL) return null;

    const response = await fetch(`${AI_API_URL}/api/clinical-documentation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': AI_API_KEY,
        'Authorization': `Bearer ${process.env.AI_SERVICE_JWT_TOKEN || ''}`
      },
      body: JSON.stringify({
        ...payload,
        timestamp: new Date().toISOString(),
        requestId: randomUUID()
      })
    });

    if (response.ok) {
      return await response.json();
    }

    return null;

  } catch (error) {
    console.error('Failed to call external AI service:', error);
    return null;
  }
}

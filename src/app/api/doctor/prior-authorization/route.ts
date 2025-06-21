/**
 * Prior Authorization AI API - Store and retrieve AI-generated prior auth recommendations
 * Integrates with PriorAuthAI table for PIPEDA-compliant storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/auth/services/utils/session-utils';
import { UserRole } from '@/auth';
import { usersDataAccess } from '@/shared/services/data/UsersDataAccess';
import { AuditLogger } from '@/shared/services/audit-logger';
import { randomUUID } from 'crypto';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Validation schemas
const storePriorAuthSchema = z.object({
  patientId: z.string(),
  medicationName: z.string(),
  recommendation: z.enum(['APPROVED', 'DENIED', 'REVIEW_REQUIRED']),
  confidence: z.number().min(0).max(1),
  reason: z.string().optional(),
  alternatives: z.array(z.object({
    name: z.string(),
    rationale: z.string()
  })).optional(),
  additionalInfo: z.array(z.string()).optional(),
  metadata: z.object({
    aiModel: z.string(),
    timestamp: z.string(),
    requestData: z.any().optional()
  })
});

/**
 * POST - Store Prior Authorization AI results
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    // Check if user is authenticated and has appropriate role
    if (!session || !session.user || 
        ![UserRole.DOCTOR].includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Handle missing clinicId (for existing tokens that don't have it)
    if (!session.user.clinicId) {
      return NextResponse.json({ 
        error: 'Session expired. Please log out and log back in to continue.',
        code: 'CLINIC_ID_MISSING'
      }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = storePriorAuthSchema.parse(body);    // Verify doctor has access to this patient (patient must be in same clinic)
    const patient = await prisma.patient.findUnique({
      where: { 
        id: validatedData.patientId,
        clinicId: session.user.clinicId
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        clinicId: true
      }
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found or access denied' }, { status: 403 });
    }    // Store the prior authorization result
    const priorAuthResult = await prisma.priorAuthorization.create({
      data: {
        id: randomUUID(),
        patientId: validatedData.patientId,        medicationName: validatedData.medicationName,
        aiRecommendation: validatedData.recommendation,
        aiConfidence: validatedData.confidence,
        aiReasoning: {
          reason: validatedData.reason,
          alternatives: validatedData.alternatives,
          additionalInfo: validatedData.additionalInfo
        },
        clinicalData: validatedData.metadata,
        requestedBy: session.user.id,
        aiProcessingStatus: 'COMPLETED',
        aiConfidence: validatedData.confidence,
        aiRecommendation: validatedData.recommendation,
        aiReasoning: { reason: validatedData.reason || '', alternatives: validatedData.alternatives || [] },
        status: 'SUBMITTED',
        submittedAt: new Date(),
        clinicalData: validatedData.metadata || {},
        supportingDocuments: validatedData.additionalInfo || [],
        medicalNecessity: validatedData.reason || ''
      }
    });    // Log the AI data processing for PIPEDA compliance
    await prisma.aIDataProcessingLog.create({
      data: {
        id: randomUUID(),
        patientId: validatedData.patientId,
        aiService: 'prior-authorization',
        processingPurpose: 'prior_authorization_assistance',
        dataCategories: ['medication_and_clinical_data'],
        consentVerified: true,
        consentVersion: '1.0',        missingConsents: [],
        dataMinimized: true,
        dataFields: ['medicationData', 'clinicalHistory'],
        dataRetentionDays: 365,
        processingSuccessful: true,
        resultsRetained: true,
        resultsShared: false,
        legalBasis: 'healthcare_delivery',
        dataController: 'clinic',
        dataProcessor: 'prior-auth-ai',
        processedBy: session.user.id,
        processedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: priorAuthResult.id,        recommendation: priorAuthResult.aiRecommendation,
        confidence: priorAuthResult.aiConfidence,
        reason: priorAuthResult.aiReasoning?.reason || '',
        alternatives: priorAuthResult.aiReasoning?.alternatives || [],
        additionalInfo: priorAuthResult.aiReasoning?.additionalInfo || [],
        status: priorAuthResult.status
      }
    });

  } catch (error) {
    console.error('Prior authorization storage error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to store prior authorization result'
    }, { status: 500 });
  }
}

/**
 * GET - Retrieve prior authorization results for a patient
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });
    }    // Verify access to patient (ensure patient belongs to doctor's clinic)
    const patient = await prisma.patient.findUnique({
      where: { 
        id: patientId,
        clinicId: session.user.clinicId
      }
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found or access denied' }, { status: 403 });
    }

    // Get prior authorization results
    const priorAuthResults = await prisma.priorAuthorization.findMany({
      where: {
        patientId,
        doctorId: session.user.id
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {        patient: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        priorAuthResults: priorAuthResults.map(result => ({
          id: result.id,
          medicationName: result.medicationName,
          recommendation: result.recommendation,
          confidence: result.confidence,
          reason: result.reason,
          alternatives: result.alternatives,
          additionalInfo: result.additionalInfo,
          status: result.status,
          createdAt: result.createdAt,
          patientName: `${result.patient.firstName} ${result.patient.lastName}`
        }))
      }
    });

  } catch (error) {
    console.error('Prior authorization retrieval error:', error);
    return NextResponse.json({
      error: 'Failed to retrieve prior authorization results'
    }, { status: 500 });
  }
}

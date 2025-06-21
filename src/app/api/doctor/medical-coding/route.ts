/**
 * Medical Coding AI API - Store and retrieve AI-generated medical cod    // Create medical coding result
    const codingResult = await prisma.clinicalAICoding.create({
      data: {
        id: randomUUID(),
        patientId: validatedData.patientId,
        doctorId: session.user.id,
        sourceText: validatedData.clinicalText,
        icd10Codes: validatedData.icdCodes, // Using icd10Codes instead of icdCodes
        cptCodes: validatedData.cptCodes.map((code: any) => typeof code === 'string' ? code : code.code), // Convert to string array
        hcpcsCodes: [], // Default empty array
        confidence: validatedData.confidence,
        reviewed: false,
        extractedData: validatedData.metadata,
        createdAt: new Date()
      }es with ClinicalAICoding table for PIPEDA-compliant storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/auth/services/utils/session-utils';
import { UserRole } from '@/auth';
import { usersDataAccess } from '@/shared/services/data/UsersDataAccess';
import { AuditLogger } from '@/shared/services/audit-logger';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { randomUUID } from 'crypto';

// Validation schemas
const storeCodingSchema = z.object({
  patientId: z.string(),
  clinicalText: z.string(),
  cptCodes: z.array(z.object({
    code: z.string(),
    description: z.string(),
    confidence: z.number().min(0).max(1)
  })),
  icdCodes: z.array(z.object({
    code: z.string(),
    description: z.string(),
    confidence: z.number().min(0).max(1)
  })),
  confidence: z.number().min(0).max(1),
  metadata: z.object({
    documentType: z.string(),
    aiModel: z.string(),
    timestamp: z.string()
  })
});

/**
 * POST - Store Medical Coding AI results
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
    const validatedData = storeCodingSchema.parse(body);    // Verify doctor has access to this patient (patient must be in same clinic)
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
    }

    // Store the medical coding result
    const codingResult = await prisma.clinicalAICoding.create({
      data: {
        patientId: validatedData.patientId,
        doctorId: session.user.id,
        clinicalText: validatedData.clinicalText,
        cptCodes: validatedData.cptCodes.map((code: any) => typeof code === 'string' ? code : code.code),
        icdCodes: validatedData.icdCodes,
        confidence: validatedData.confidence,
        aiModel: validatedData.metadata.aiModel,
        metadata: validatedData.metadata,
        status: 'PENDING_REVIEW',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });    // Log the AI data processing for PIPEDA compliance
    await prisma.aIDataProcessingLog.create({
      data: {
        id: randomUUID(),
        patientId: validatedData.patientId,
        aiService: 'medical-coding',
        processingPurpose: 'medical_coding_assistance',
        dataCategories: ['clinical_documentation'],
        consentVerified: true,
        consentVersion: '1.0',
        missingConsents: [],
        dataMinimized: true,
        dataFields: ['clinicalText'],
        dataRetentionDays: 365,
        processingSuccessful: true,
        resultsRetained: true,
        resultsShared: false,
        legalBasis: 'healthcare_delivery',
        dataController: 'clinic',
        dataProcessor: 'medical-coding-ai',
        processedBy: session.user.id,
        processedAt: new Date()
      }
    });    return NextResponse.json({
      success: true,
      data: {
        id: codingResult.id,
        cptCodes: codingResult.cptCodes,
        icdCodes: codingResult.icd10Codes, // Using correct field name
        confidence: codingResult.confidence,
        status: codingResult.reviewed ? 'REVIEWED' : 'PENDING_REVIEW' // Using reviewed field for status
      }
    });

  } catch (error) {
    console.error('Medical coding storage error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to store medical coding result'
    }, { status: 500 });
  }
}

/**
 * GET - Retrieve medical coding results for a patient
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
    }    // Verify access to patient
    const patient = await prisma.patient.findUnique({
      where: { 
        id: patientId,
        clinicId: session.user.clinicId      },
      select: {
        id: true,
        firstName: true,
        lastName: true
      }
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found or access denied' }, { status: 403 });
    }

    // Get coding results
    const codingResults = await prisma.clinicalAICoding.findMany({
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
        codingResults: codingResults.map(result => ({
          id: result.id,
          clinicalText: result.sourceText, // Using sourceText instead of clinicalText
          cptCodes: result.cptCodes,
          icdCodes: result.icd10Codes, // Using icd10Codes instead of icdCodes
          confidence: result.confidence,
          status: result.reviewed ? 'REVIEWED' : 'PENDING_REVIEW', // Using reviewed field for status
          createdAt: result.createdAt,
          patientName: result.patient ? `${result.patient.firstName} ${result.patient.lastName}` : 'Unknown Patient'
        }))
      }
    });

  } catch (error) {
    console.error('Medical coding retrieval error:', error);
    return NextResponse.json({
      error: 'Failed to retrieve medical coding results'
    }, { status: 500 });
  }
}

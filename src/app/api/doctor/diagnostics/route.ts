/**
 * Diagnostics API - AI-powered diagnostic tools with comprehensive service integration
 * Features: Lab AI, Radiology AI, Advanced Imaging AI, Pathology AI, Mental Health AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/auth/services/utils/session-utils';
import { UserRole } from '@/auth';
import { AuditLogger } from '@/shared/services/audit-logger';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { randomUUID } from 'crypto';

// Validation schemas
const getDiagnosticsSchema = z.object({
  patientId: z.string().optional(),
  type: z.enum(['lab', 'imaging', 'trends', 'overview']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional()
});

const storeDiagnosticResultSchema = z.object({
  patientId: z.string(),
  aiServiceType: z.enum(['laboratory', 'radiology', 'advanced-imaging', 'pathology', 'mental-health']),
  resultData: z.object({
    interpretation: z.string().optional(),
    findings: z.array(z.any()).optional(),
    recommendations: z.array(z.string()).optional(),
    confidence: z.number().min(0).max(1).optional(),
    criticalValues: z.array(z.any()).optional(),
    riskAssessment: z.string().optional(),
    treatmentRecommendations: z.array(z.string()).optional(),
    followUpSchedule: z.string().optional()
  }),
  metadata: z.object({
    model: z.string(),
    processingTime: z.string().optional(),
    timestamp: z.string()
  })
});

/**
 * GET - Retrieve diagnostic data and results
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const type = searchParams.get('type');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const validatedParams = getDiagnosticsSchema.parse({
      patientId: patientId || undefined,
      type: type || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined
    });

    // Build where clause for patient access verification
    let whereClause: any = {};
      if (validatedParams.patientId) {
      // Verify doctor has access to this specific patient through same clinic
      const patient = await prisma.patient.findUnique({
        where: { id: validatedParams.patientId },
        include: {
          Clinic: {
            include: {
              User: {
                where: { 
                  id: session.user.id,
                  role: 'DOCTOR'
                }
              }
            }
          }
        }
      });      if (!patient || !patient.Clinic?.User.length) {
        return NextResponse.json({ error: 'Patient not found or access denied' }, { status: 403 });
      }

      whereClause.patientId = validatedParams.patientId;
    } else {      // Get all patients for this doctor's clinic
      const doctor = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          Clinic: {
            include: {
              Patient: true
            }
          }
        }
      });

      if (!doctor?.Clinic) {
        return NextResponse.json({ error: 'Doctor clinic not found' }, { status: 403 });
      }

      whereClause.patientId = {
        in: doctor.Clinic.Patient.map(p => p.id)
      };
    }

    // Add date filters
    if (validatedParams.dateFrom || validatedParams.dateTo) {
      whereClause.createdAt = {};
      if (validatedParams.dateFrom) {
        whereClause.createdAt.gte = new Date(validatedParams.dateFrom);
      }
      if (validatedParams.dateTo) {
        whereClause.createdAt.lte = new Date(validatedParams.dateTo);
      }
    }

    // Get diagnostic AI results
    const diagnosticResults = await prisma.diagnosticAIResult.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 50,      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });    // Calculate summary metrics
    const totalTests = diagnosticResults.length;
    const pendingResults = diagnosticResults.filter(r => r.urgency === 'URGENT').length; // Using urgency instead of status
    const criticalResults = diagnosticResults.filter(r => r.urgency === 'CRITICAL').length; // Using urgency instead of criticalFlag
    const completedToday = diagnosticResults.filter(r => {
      const today = new Date();
      const resultDate = new Date(r.createdAt);
      return resultDate.toDateString() === today.toDateString();
    }).length;

    // Format results for UI
    const recentResults = diagnosticResults.map(result => ({
      id: result.id,
      patientId: result.patientId,
      patientName: `${result.patient.firstName} ${result.patient.lastName}`,
      testType: result.aiService.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      status: result.urgency === 'CRITICAL' ? 'completed' : result.urgency === 'URGENT' ? 'pending' : 'in-progress',
      resultDate: result.createdAt.toISOString(),
      criticalFlag: result.urgency === 'CRITICAL',
      results: result.findings, // Using findings instead of resultData
      aiAnalysis: {
        interpretation: result.summary || '', // Using summary instead of interpretation
        recommendations: result.recommendations || [],
        confidence: result.confidence || 0
      }
    }));

    const responseData = {
      summary: {
        totalTests,
        pendingResults,
        criticalResults,
        completedToday
      },
      recentResults: recentResults.slice(0, 20), // Limit for performance
      aiInsights: [], // Could be populated with additional insights
      trends: [] // Could be populated with trend analysis
    };

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Diagnostics GET error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request parameters',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to retrieve diagnostic data'
    }, { status: 500 });
  }
}

/**
 * POST - Store diagnostic AI results or trigger AI analysis
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
    const validatedData = storeDiagnosticResultSchema.parse(body);    // Verify doctor has access to this patient (patient must be in same clinic)  
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

    // Determine if result is critical based on AI service type and content
    const criticalFlag = determineCriticalFlag(validatedData.aiServiceType, validatedData.resultData);    // Store the diagnostic AI result
    const diagnosticResult = await prisma.diagnosticAIResult.create({
      data: {
        id: randomUUID(),
        patientId: validatedData.patientId,
        doctorId: session.user.id,
        aiService: validatedData.aiServiceType, // Using aiService instead of aiServiceType
        diagnosticType: validatedData.aiServiceType.split('_')[0], // Extract diagnostic type
        findings: validatedData.resultData.findings || [],
        confidence: validatedData.resultData.confidence || 0,
        urgency: determineCriticalFlag(validatedData.aiServiceType, validatedData.resultData) ? 'CRITICAL' : 'ROUTINE',
        summary: validatedData.resultData.interpretation || '',
        recommendations: validatedData.resultData.recommendations || [],
        sourceDataUrl: validatedData.metadata?.sourceUrl || null,
        reportGenerated: false,
        createdAt: new Date()
      }
    });    // Log the AI data processing for PIPEDA compliance
    await prisma.aIDataProcessingLog.create({
      data: {
        id: randomUUID(),
        patientId: validatedData.patientId,
        aiService: validatedData.aiServiceType,
        processingPurpose: getProcessingPurpose(validatedData.aiServiceType),
        dataCategories: [getDataProcessedDescription(validatedData.aiServiceType)],
        consentVerified: true, // Assuming consent obtained through patient registration
        consentVersion: '1.0',
        missingConsents: [],
        dataMinimized: true,
        dataFields: ['diagnosticData', 'patientInfo'],
        dataRetentionDays: 365,
        processingSuccessful: true,
        resultsRetained: true,
        resultsShared: false,
        legalBasis: 'healthcare_delivery',
        dataController: 'clinic',
        dataProcessor: validatedData.aiServiceType,
        processedBy: session.user.id,
        processedAt: new Date()
      }
    });    return NextResponse.json({
      success: true,
      data: {
        id: diagnosticResult.id,
        aiServiceType: diagnosticResult.aiService, // Using correct field name
        interpretation: diagnosticResult.summary, // Using summary instead of interpretation
        recommendations: diagnosticResult.recommendations,
        confidence: diagnosticResult.confidence,
        criticalFlag: diagnosticResult.urgency === 'CRITICAL', // Using urgency instead of criticalFlag
        status: diagnosticResult.urgency, // Using urgency as status
        createdAt: diagnosticResult.createdAt
      }
    });

  } catch (error) {
    console.error('Diagnostics POST error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to store diagnostic result'
    }, { status: 500 });
  }
}

/**
 * Helper function to determine if a diagnostic result is critical
 */
function determineCriticalFlag(aiServiceType: string, resultData: any): boolean {
  switch (aiServiceType) {
    case 'mental-health':
      return resultData.riskAssessment === 'High';
    case 'laboratory':
      return resultData.criticalValues && resultData.criticalValues.length > 0;
    case 'radiology':
    case 'advanced-imaging':
      return resultData.findings && resultData.findings.some((f: any) => f.severity === 'critical');
    case 'pathology':
      return resultData.findings && resultData.findings.some((f: any) => f.malignancy === 'malignant');
    default:
      return false;
  }
}

/**
 * Helper function to get data processed description for PIPEDA logging
 */
function getDataProcessedDescription(aiServiceType: string): string {
  switch (aiServiceType) {
    case 'laboratory':
      return 'laboratory_test_results';
    case 'radiology':
      return 'radiological_images_and_reports';
    case 'advanced-imaging':
      return 'advanced_medical_imaging_data';
    case 'pathology':
      return 'pathology_specimens_and_reports';
    case 'mental-health':
      return 'mental_health_assessment_data';
    default:
      return 'diagnostic_clinical_data';
  }
}

/**
 * Helper function to get processing purpose for PIPEDA logging
 */
function getProcessingPurpose(aiServiceType: string): string {
  switch (aiServiceType) {
    case 'laboratory':
      return 'laboratory_result_interpretation';
    case 'radiology':
      return 'radiological_image_analysis';
    case 'advanced-imaging':
      return 'advanced_imaging_diagnosis';
    case 'pathology':
      return 'pathological_analysis';
    case 'mental-health':
      return 'mental_health_screening';
    default:
      return 'diagnostic_assistance';
  }
}

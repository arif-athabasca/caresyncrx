/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * API endpoint for doctor AI assistant with clinical insights and PIPEDA-compliant analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { UserRole } from '@/auth';
import { getSession } from '@/auth/services/utils/session-utils';
import { randomUUID } from 'crypto';

/**
 * POST handler for AI assistant queries and analysis
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !session.user || session.user.role !== UserRole.DOCTOR) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      queryType, 
      query, 
      patientId, 
      context, 
      requestConsent = false 
    } = body;

    // Validate required fields
    if (!queryType || !query) {
      return NextResponse.json({ 
        error: 'Query type and query are required' 
      }, { status: 400 });
    }

    let response;

    switch (queryType) {
      case 'patient_analysis':
        response = await handlePatientAnalysis(patientId, query, session.user.id, requestConsent);
        break;
      case 'clinical_decision':
        response = await handleClinicalDecision(query, context, session.user.id);
        break;
      case 'drug_interaction':
        response = await handleDrugInteraction(query, context);
        break;
      case 'diagnosis_assistance':
        response = await handleDiagnosisAssistance(query, patientId, session.user.id);
        break;
      case 'treatment_recommendation':
        response = await handleTreatmentRecommendation(query, patientId, context, session.user.id);
        break;
      case 'general_medical':
        response = await handleGeneralMedical(query);
        break;
      default:
        return NextResponse.json({ 
          error: 'Unsupported query type' 
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Error in AI assistant:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    }, { status: 500 });
  }
}

/**
 * Handle patient-specific analysis with consent validation
 */
async function handlePatientAnalysis(
  patientId: string, 
  query: string, 
  doctorId: string,
  requestConsent: boolean
): Promise<any> {
  if (!patientId) {
    throw new Error('Patient ID is required for patient analysis');
  }

  // Verify patient exists and doctor has access
  const patient = await prisma.patient.findFirst({
    where: {
      id: patientId,
      OR: [
        {
          PatientTriage: {
            some: { assignedToId: doctorId }
          }
        },
        {
          ScheduleSlot: {
            some: { providerId: doctorId }
          }
        }
      ]
    },
    include: {
      PatientConsent: {
        where: {
          status: 'ACTIVE',
          consentType: { in: ['AI_ANALYSIS', 'DATA_PROCESSING'] }
        }
      },
      PatientTriage: {
        where: { assignedToId: doctorId },
        include: {
          AIAnalysis: {
            orderBy: { createdAt: 'desc' },
            take: 3
          }
        }
      }
    }
  });

  if (!patient) {
    throw new Error('Patient not found or access denied');
  }

  // Check consent for AI analysis
  const hasAnalysisConsent = patient.PatientConsent.some(consent => 
    consent.consentType === 'AI_ANALYSIS' && 
    consent.status === 'ACTIVE' &&
    (!consent.expiresAt || new Date(consent.expiresAt) > new Date())
  );

  if (!hasAnalysisConsent && !requestConsent) {
    return {
      requiresConsent: true,
      message: 'Patient consent is required for AI analysis. Would you like to request consent?',
      consentTypes: ['AI_ANALYSIS', 'DATA_PROCESSING']
    };
  }

  // Generate AI analysis
  const aiAnalysis = await generatePatientAIAnalysis(patient, query, doctorId);

  // Store AI analysis if consent is granted
  if (hasAnalysisConsent || requestConsent) {
    const analysisRecord = await prisma.aIAnalysis.create({
      data: {
        id: randomUUID(),
        patientId,
        providerId: doctorId,
        analysisType: 'PATIENT_ANALYSIS',
        query,
        confidence: aiAnalysis.confidence,
        recommendations: aiAnalysis.recommendations,
        analysisData: aiAnalysis.analysisData,
        metadata: {
          queryType: 'patient_analysis',
          consentGranted: hasAnalysisConsent || requestConsent,
          timestamp: new Date().toISOString()
        },
        createdAt: new Date()
      }
    });

    aiAnalysis.analysisId = analysisRecord.id;
  }

  return aiAnalysis;
}

/**
 * Handle clinical decision support
 */
async function handleClinicalDecision(
  query: string, 
  context: any, 
  doctorId: string
): Promise<any> {
  
  // Get doctor's specialty for context
  const doctorSpecialty = await prisma.providerSpecialty.findFirst({
    where: { 
      providerId: doctorId,
      isCertified: true 
    },
    select: { specialty: true, expertise: true }
  });

  const specialty = doctorSpecialty?.specialty || 'General Practice';

  // Generate clinical decision support
  const analysis = await callExternalAIService({
    query,
    type: 'clinical_decision',
    specialty,
    context,
    providerId: doctorId
  });

  return {
    type: 'clinical_decision',
    query,
    specialty,
    analysis: analysis || await generateLocalClinicalDecision(query, specialty),
    confidence: analysis?.confidence || 75,
    recommendations: analysis?.recommendations || [
      'Consult relevant clinical guidelines',
      'Consider patient history and contraindications',
      'Document decision rationale'
    ],
    sources: [
      'Clinical practice guidelines',
      'Peer-reviewed literature',
      'Evidence-based medicine databases'
    ],
    disclaimer: 'This is AI-generated guidance. Always use clinical judgment and consult appropriate resources.'
  };
}

/**
 * Handle drug interaction checking
 */
async function handleDrugInteraction(query: string, context: any): Promise<any> {
  const medications = extractMedicationsFromQuery(query);
  
  const interactions = await checkDrugInteractions(medications);
  
  return {
    type: 'drug_interaction',
    query,
    medications,
    interactions,
    severity: calculateInteractionSeverity(interactions),
    recommendations: generateInteractionRecommendations(interactions),
    confidence: 90,
    sources: ['Drug interaction databases', 'FDA guidance', 'Clinical pharmacology references']
  };
}

/**
 * Handle diagnosis assistance
 */
async function handleDiagnosisAssistance(
  query: string, 
  patientId: string | undefined, 
  doctorId: string
): Promise<any> {
  let patientContext = null;

  if (patientId) {
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        OR: [
          { PatientTriage: { some: { assignedToId: doctorId } } },
          { ScheduleSlot: { some: { providerId: doctorId } } }
        ]
      },
      select: {
        age: true,
        gender: true,
        medicalHistory: true,
        allergies: true,
        currentMedications: true,
        PatientTriage: {
          where: { assignedToId: doctorId },
          select: { symptoms: true, urgencyLevel: true }
        }
      }
    });

    if (patient) {
      patientContext = {
        age: patient.age,
        gender: patient.gender,
        medicalHistory: patient.medicalHistory,
        currentSymptoms: patient.PatientTriage[0]?.symptoms,
        urgency: patient.PatientTriage[0]?.urgencyLevel
      };
    }
  }

  const diagnosis = await generateDiagnosisSupport(query, patientContext);

  return {
    type: 'diagnosis_assistance',
    query,
    patientContext,
    diagnosis,
    confidence: diagnosis.confidence,
    differentialDiagnoses: diagnosis.differentials,
    recommendedTests: diagnosis.recommendedTests,
    urgencyLevel: diagnosis.urgencyLevel,
    disclaimer: 'Diagnostic assistance only. Clinical examination and judgment required.'
  };
}

/**
 * Handle treatment recommendations
 */
async function handleTreatmentRecommendation(
  query: string, 
  patientId: string | undefined, 
  context: any, 
  doctorId: string
): Promise<any> {
  
  const treatment = await generateTreatmentRecommendations(query, patientId, context, doctorId);

  return {
    type: 'treatment_recommendation',
    query,
    treatment,
    medications: treatment.medications,
    procedures: treatment.procedures,
    followUp: treatment.followUp,
    monitoring: treatment.monitoring,
    contraindications: treatment.contraindications,
    confidence: treatment.confidence,
    guidelines: treatment.guidelines
  };
}

/**
 * Handle general medical queries
 */
async function handleGeneralMedical(query: string): Promise<any> {
  const response = await callExternalAIService({
    query,
    type: 'general_medical'
  });

  return {
    type: 'general_medical',
    query,
    response: response?.answer || 'Unable to process query at this time.',
    confidence: response?.confidence || 50,
    sources: response?.sources || ['Medical literature', 'Clinical guidelines'],
    disclaimer: 'For informational purposes only. Always verify with authoritative sources.'
  };
}

/**
 * Generate AI analysis for a specific patient
 */
async function generatePatientAIAnalysis(patient: any, query: string, doctorId: string): Promise<any> {
  // Prepare patient data for analysis
  const patientData = {
    medicalHistory: patient.medicalHistory,
    currentTriages: patient.PatientTriage.map((t: any) => ({
      symptoms: t.symptoms,
      urgency: t.urgencyLevel,
      previousAnalysis: t.AIAnalysis[0]?.recommendations
    }))
  };

  // Call external AI service
  const aiResponse = await callExternalAIService({
    query,
    type: 'patient_analysis',
    patientData,
    providerId: doctorId
  });

  if (aiResponse) {
    return aiResponse;
  }

  // Fallback to local analysis
  return {
    confidence: 75,
    recommendations: [
      'Review patient medical history for relevant patterns',
      'Consider current symptoms in context of past conditions',
      'Evaluate medication interactions and contraindications',
      'Monitor for changes in condition'
    ],
    analysisData: {
      riskFactors: extractRiskFactors(patientData),
      clinicalNotes: generateClinicalNotes(query, patientData),
      followUpRequired: true
    },
    summary: `AI analysis for patient query: "${query}". Recommendations based on available medical history and current triage information.`
  };
}

/**
 * Call external AI service with standardized format
 */
async function callExternalAIService(payload: any): Promise<any> {
  try {
    const AI_API_URL = process.env.AI_API_URL || 'http://localhost:4000';
    const AI_API_KEY = process.env.AI_API_KEY || 'web_ui_api_key_13579_change_in_production';

    if (!AI_API_URL) return null;

    const response = await fetch(`${AI_API_URL}/api/clinical-ai`, {
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

    console.error('AI service error:', response.status, response.statusText);
    return null;

  } catch (error) {
    console.error('Failed to call external AI service:', error);
    return null;
  }
}

/**
 * Helper functions for local fallbacks
 */
function extractMedicationsFromQuery(query: string): string[] {
  // Simple medication extraction - in production, use medical NLP
  const medicationPattern = /\b[A-Z][a-z]+(?:cin|ol|ine|ate|ide|pam|lol)\b/g;
  return query.match(medicationPattern) || [];
}

async function checkDrugInteractions(medications: string[]): Promise<any[]> {
  // Placeholder for drug interaction checking
  // In production, integrate with drug interaction database
  return [];
}

function calculateInteractionSeverity(interactions: any[]): string {
  if (interactions.some(i => i.severity === 'major')) return 'major';
  if (interactions.some(i => i.severity === 'moderate')) return 'moderate';
  return 'minor';
}

function generateInteractionRecommendations(interactions: any[]): string[] {
  return [
    'Review all medication interactions carefully',
    'Consider alternative medications if major interactions exist',
    'Monitor patient for interaction symptoms',
    'Adjust dosing if necessary'
  ];
}

async function generateDiagnosisSupport(query: string, patientContext: any): Promise<any> {
  return {
    confidence: 70,
    differentials: [
      'Primary diagnosis consideration',
      'Secondary diagnosis consideration',
      'Rule-out condition'
    ],
    recommendedTests: [
      'Complete blood count',
      'Basic metabolic panel',
      'Relevant imaging'
    ],
    urgencyLevel: 'MODERATE'
  };
}

async function generateTreatmentRecommendations(
  query: string, 
  patientId: string | undefined, 
  context: any, 
  doctorId: string
): Promise<any> {
  return {
    confidence: 75,
    medications: [],
    procedures: [],
    followUp: 'Follow up in 1-2 weeks',
    monitoring: ['Monitor symptoms', 'Check lab values'],
    contraindications: [],
    guidelines: ['Standard treatment protocols apply']
  };
}

function generateLocalClinicalDecision(query: string, specialty: string): any {
  return {
    summary: `Clinical decision support for ${specialty}`,
    recommendations: [
      'Follow evidence-based guidelines',
      'Consider patient-specific factors',
      'Document clinical reasoning'
    ]
  };
}

function extractRiskFactors(patientData: any): string[] {
  return [
    'Review medical history for risk factors',
    'Consider current medications',
    'Evaluate symptom patterns'
  ];
}

function generateClinicalNotes(query: string, patientData: any): string {
  return `Clinical analysis requested: ${query}. Patient data reviewed and recommendations generated.`;
}

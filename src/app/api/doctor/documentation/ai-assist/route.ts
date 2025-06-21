/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * API endpoint for AI-powered documentation generation and assistance
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { UserRole } from '@/auth';
import { getSession } from '@/auth/services/utils/session-utils';

/**
 * POST handler for AI documentation assistance
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !session.user || session.user.role !== UserRole.DOCTOR) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      action, 
      content, 
      patientId, 
      noteType = 'soap',
      template,
      voiceTranscript,
      medicalContext 
    } = body;

    switch (action) {
      case 'generate_structured_note':
        return await generateStructuredNote(content, patientId, noteType, session.user.id);
      
      case 'generate_from_voice':
        return await generateFromVoiceTranscript(voiceTranscript, patientId, noteType, session.user.id);
      
      case 'suggest_medical_codes':
        return await suggestMedicalCodes(content, noteType);
      
      case 'check_drug_interactions':
        return await checkDrugInteractions(content, patientId);
      
      case 'generate_patient_education':
        return await generatePatientEducation(content, patientId);
      
      case 'validate_documentation':
        return await validateDocumentation(content, noteType);
      
      default:
        return NextResponse.json({ 
          error: 'Invalid action specified' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in AI documentation assistance:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    }, { status: 500 });
  }
}

/**
 * Generate structured clinical note from free-form content
 */
async function generateStructuredNote(content: string, patientId: string, noteType: string, providerId: string) {
  // Get patient context
  const patient = await prisma.patient.findFirst({
    where: { id: patientId }
  });

  if (!patient) {
    throw new Error('Patient not found');
  }

  // Get patient's recent triage
  const recentTriage = await prisma.patientTriage.findFirst({
    where: { 
      patientId,
      assignedToId: providerId 
    },
    orderBy: { createdAt: 'desc' },
    select: {
      symptoms: true,
      urgencyLevel: true,
      notes: true
    }
  });

  // Simulate AI processing - in production, this would call actual AI service
  const structuredContent = await processWithAI(content, {
    currentTriage: recentTriage,
    noteType,
    patientAge: patient.dateOfBirth ? 
      Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null
  });

  const aiInsights = generateAIInsights(structuredContent, patient);

  return NextResponse.json({
    success: true,
    data: {
      structuredNote: structuredContent,
      insights: aiInsights,
      suggestions: generateSuggestions(structuredContent),
      medicalCodes: await generateMedicalCodes(structuredContent, noteType)
    }
  });
}

/**
 * Generate note from voice transcript
 */
async function generateFromVoiceTranscript(transcript: string, patientId: string, noteType: string, providerId: string) {
  // Process voice transcript into structured format
  const processedTranscript = await processVoiceTranscript(transcript);
  
  return await generateStructuredNote(processedTranscript, patientId, noteType, providerId);
}

/**
 * Suggest medical codes for billing
 */
async function suggestMedicalCodes(content: string, noteType: string) {
  const codes = await generateMedicalCodes(content, noteType);
  
  return NextResponse.json({
    success: true,
    data: { codes }
  });
}

/**
 * Check for drug interactions
 */
async function checkDrugInteractions(content: string, patientId: string) {
  // Extract medications from content
  const medications = extractMedications(content);
    // Get patient's current medications
  const currentMeds = await prisma.prescription.findMany({
    where: {
      patientId,
      status: 'ACTIVE'
    },
    select: {
      drugName: true,
      dosage: true
    }
  });

  const interactions = checkForInteractions([...medications, ...currentMeds.map(m => m.drugName)]);

  return NextResponse.json({
    success: true,
    data: {
      interactions,
      recommendations: generateInteractionRecommendations(interactions)
    }
  });
}

/**
 * Generate patient education materials
 */
async function generatePatientEducation(content: string, patientId: string) {
  const diagnoses = extractDiagnoses(content);
  const procedures = extractProcedures(content);
  
  const educationMaterials = await generateEducationContent(diagnoses, procedures);

  return NextResponse.json({
    success: true,
    data: { educationMaterials }
  });
}

/**
 * Validate documentation completeness
 */
async function validateDocumentation(content: string, noteType: string) {
  const validation = validateNoteCompleteness(content, noteType);
  
  return NextResponse.json({
    success: true,
    data: {
      isValid: validation.isValid,
      issues: validation.issues,
      suggestions: validation.suggestions,
      completenessScore: validation.score
    }
  });
}

// Helper functions for AI processing (simulated)

async function processWithAI(content: string, context: any): Promise<string> {
  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const sections: Record<string, string> = {
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  };
  
  // Basic keyword-based sectioning (placeholder for actual AI)
  const lines = content.split('\n').filter(line => line.trim());
  let currentSection = 'subjective';
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    if (lowerLine.includes('history') || lowerLine.includes('complaint') || lowerLine.includes('symptom') || lowerLine.includes('pain')) {
      currentSection = 'subjective';
    } else if (lowerLine.includes('exam') || lowerLine.includes('physical') || lowerLine.includes('vital') || lowerLine.includes('bp') || lowerLine.includes('hr')) {
      currentSection = 'objective';
    } else if (lowerLine.includes('assessment') || lowerLine.includes('diagnosis') || lowerLine.includes('impression') || lowerLine.includes('condition')) {
      currentSection = 'assessment';
    } else if (lowerLine.includes('plan') || lowerLine.includes('treatment') || lowerLine.includes('medication') || lowerLine.includes('follow')) {
      currentSection = 'plan';
    }
    
    if (line.trim()) {
      sections[currentSection] += (sections[currentSection] ? '\n' : '') + line;
    }
  }
    // Add context-based enhancements
  if (context.currentTriage?.symptoms) {
    sections.subjective = `Symptoms: ${context.currentTriage.symptoms}\n\n` + sections.subjective;
  }
  
  if (context.currentTriage?.notes) {
    sections.objective = `Triage Notes: ${context.currentTriage.notes}\n\n` + sections.objective;
  }

  return `SUBJECTIVE:
${sections.subjective || 'Patient presents with chief complaint as documented above.'}

OBJECTIVE:
${sections.objective || 'Physical examination findings as documented.'}

ASSESSMENT:
${sections.assessment || 'Clinical assessment based on history and examination.'}

PLAN:
${sections.plan || 'Treatment plan to be determined based on assessment.'}

---
Generated with AI assistance on ${new Date().toLocaleString()}`;
}

function generateAIInsights(content: string, patient: any): string[] {
  const insights = [];
  
  if (content.toLowerCase().includes('pain') && !content.toLowerCase().includes('scale')) {
    insights.push('Consider documenting pain severity using 1-10 scale');
  }
  
  if (content.toLowerCase().includes('medication') && !content.toLowerCase().includes('allerg')) {
    insights.push('Verify medication allergies before prescribing');
  }
  
  if (patient.urgencyLevel === 'HIGH') {
    insights.push('High-urgency patient - ensure appropriate follow-up is scheduled');
  }
  
  return insights;
}

function generateSuggestions(content: string): string[] {
  const suggestions = [];
  
  if (!content.toLowerCase().includes('follow')) {
    suggestions.push('Consider adding follow-up instructions');
  }
  
  if (!content.toLowerCase().includes('education')) {
    suggestions.push('Consider patient education documentation');
  }
  
  return suggestions;
}

async function generateMedicalCodes(content: string, noteType: string) {
  // Simulate medical coding AI
  const codes = [];
  
  if (noteType === 'soap') {
    codes.push({
      type: 'CPT',
      code: '99214',
      description: 'Office visit, established patient, 30-39 minutes',
      confidence: 0.85
    });
  }
  
  if (content.toLowerCase().includes('diabetes')) {
    codes.push({
      type: 'ICD-10',
      code: 'E11.9',
      description: 'Type 2 diabetes mellitus without complications',
      confidence: 0.90
    });
  }
  
  if (content.toLowerCase().includes('hypertension') || content.toLowerCase().includes('high blood pressure')) {
    codes.push({
      type: 'ICD-10',
      code: 'I10',
      description: 'Essential hypertension',
      confidence: 0.85
    });
  }
  
  return codes;
}

async function processVoiceTranscript(transcript: string): Promise<string> {
  // Clean up transcript and format for medical documentation
  return transcript
    .replace(/\buh\b/gi, '')
    .replace(/\bum\b/gi, '')
    .replace(/\ber\b/gi, '')
    .trim();
}

function extractMedications(content: string): string[] {
  // Simple medication extraction (in production, use medical NLP)
  const medRegex = /(metformin|lisinopril|amlodipine|atorvastatin|metoprolol|omeprazole|aspirin|warfarin|insulin)/gi;
  return content.match(medRegex) || [];
}

function extractDiagnoses(content: string): string[] {
  // Simple diagnosis extraction
  const diagnosisTerms = ['diabetes', 'hypertension', 'arthritis', 'copd', 'asthma', 'depression', 'anxiety'];
  return diagnosisTerms.filter(term => content.toLowerCase().includes(term));
}

function extractProcedures(content: string): string[] {
  // Simple procedure extraction
  const procedureTerms = ['injection', 'biopsy', 'x-ray', 'ultrasound', 'ecg', 'blood draw'];
  return procedureTerms.filter(term => content.toLowerCase().includes(term));
}

function checkForInteractions(medications: string[]): any[] {
  // Simplified interaction checking
  const interactions = [];
  
  if (medications.includes('warfarin') && medications.includes('aspirin')) {
    interactions.push({
      severity: 'HIGH',
      medications: ['warfarin', 'aspirin'],
      description: 'Increased bleeding risk',
      recommendation: 'Monitor INR closely, consider alternative'
    });
  }
  
  return interactions;
}

function generateInteractionRecommendations(interactions: any[]): string[] {
  return interactions.map(interaction => interaction.recommendation);
}

async function generateEducationContent(diagnoses: string[], procedures: string[]) {
  const materials = [];
  
  for (const diagnosis of diagnoses) {
    materials.push({
      topic: diagnosis,
      content: `Patient education materials for ${diagnosis}`,
      type: 'diagnosis_education'
    });
  }
  
  return materials;
}

function validateNoteCompleteness(content: string, noteType: string) {
  const issues = [];
  let score = 100;
  
  if (noteType === 'soap') {
    if (!content.toLowerCase().includes('subjective')) {
      issues.push('Missing subjective section');
      score -= 25;
    }
    if (!content.toLowerCase().includes('objective')) {
      issues.push('Missing objective section');
      score -= 25;
    }
    if (!content.toLowerCase().includes('assessment')) {
      issues.push('Missing assessment section');
      score -= 25;
    }
    if (!content.toLowerCase().includes('plan')) {
      issues.push('Missing plan section');
      score -= 25;
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    suggestions: issues.map(issue => `Consider adding ${issue.toLowerCase().replace('missing ', '')}`),
    score: Math.max(0, score)
  };
}

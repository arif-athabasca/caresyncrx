/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * AI-Powered Triage Suggestion API endpoint
 * Generates provider recommendations based on patient symptoms
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/auth/services/utils/session-utils';
import { UserRole } from '@/auth';
import { usersDataAccess } from '@/shared/services/data/UsersDataAccess';
import { AuditLogger } from '@/shared/services/audit-logger';

/**
 * AI Triage suggestion algorithm configuration
 */
const ALGORITHM_CONFIG = {
  baseConfidence: 50,
  maxConfidence: 95,
  minConfidence: 20,
  workloadPenalty: { high: -20, medium: -10, low: 10 },
  specialtyBonus: { strong: 40, good: 25, general: 15 },
  roleAdjustments: {
    DOCTOR: { base: 15, highUrgency: 10 },
    NURSE: { base: 5, mediumUrgency: 10 },
    PHARMACIST: { medication: 25, other: -10 }
  }
};

/**
 * External AI service integration
 */
async function callExternalAIService(symptoms: string) {
  try {
    const aiServiceUrl = process.env.AI_TRIAGE_SERVICE_URL;
    const apiKey = process.env.AI_SERVICE_API_KEY;

    if (!aiServiceUrl) {
      console.log('External AI service not configured, using local analysis');
      return null;
    }

    const response = await fetch(aiServiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ symptoms }),
    });

    if (!response.ok) {
      console.log('External AI service failed, falling back to local analysis');
      return null;
    }

    const result = await response.json();
    return {
      severity: result.severity || 'Moderate',
      recommendedProvider: result.recommended_provider || 'Nurse Practitioner',
      reasoning: result.reasoning || 'Medical evaluation needed.'
    };
  } catch (error) {
    console.error('External AI service error:', error);
    return null;
  }
}

/**
 * Local symptom analysis fallback
 */
function localSymptomAnalysis(symptoms: string) {
  const symptomsLower = symptoms.toLowerCase();
  
  // High urgency keywords
  const highUrgencyKeywords = [
    'chest pain', 'shortness of breath', 'difficulty breathing', 'severe', 
    'extreme', 'intense', 'dizzy', 'cannot breathe', 'breathing problems'
  ];
  
  // Medium urgency keywords
  const mediumUrgencyKeywords = [
    'fever', 'cough', 'persistent', 'headache', 'nausea', 'vomiting', 
    'breathing issues', 'mild shortness'
  ];
  
  // Specialty keywords
  const cardiacKeywords = ['chest pain', 'heart', 'cardiac', 'palpitations'];
  const respiratoryKeywords = ['breathing', 'cough', 'lung', 'respiratory'];
  const neurologicalKeywords = ['headache', 'dizziness', 'numbness', 'neurological'];
  const medicationKeywords = ['medication', 'drug', 'prescription', 'side effect'];

  // Determine urgency
  let urgency = 'LOW';
  if (highUrgencyKeywords.some(keyword => symptomsLower.includes(keyword))) {
    urgency = 'HIGH';
  } else if (mediumUrgencyKeywords.some(keyword => symptomsLower.includes(keyword))) {
    urgency = 'MEDIUM';
  }

  // Determine recommended provider type
  let recommendedProvider = 'Nurse Practitioner';
  if (cardiacKeywords.some(keyword => symptomsLower.includes(keyword))) {
    recommendedProvider = 'Physician';
  } else if (medicationKeywords.some(keyword => symptomsLower.includes(keyword))) {
    recommendedProvider = 'Pharmacist';
  }

  return {
    severity: urgency === 'HIGH' ? 'Severe' : urgency === 'MEDIUM' ? 'Moderate' : 'Minor',
    recommendedProvider,
    reasoning: `Based on symptom analysis: ${urgency.toLowerCase()} urgency case requiring ${recommendedProvider.toLowerCase()} evaluation.`
  };
}

/**
 * Calculate specialty match score for a provider
 */
function calculateSpecialtyMatch(provider: any, symptoms: string, aiSuggestion: any): number {
  let score = 0;
  const symptomsLower = symptoms.toLowerCase();
  
  if (!provider.specialties || provider.specialties.length === 0) {
    return ALGORITHM_CONFIG.specialtyBonus.general; // General practice bonus
  }

  for (const specialty of provider.specialties) {
    const specialtyLower = specialty.specialty.toLowerCase();
    
    // Strong matches
    if (
      (specialtyLower.includes('cardiology') && (symptomsLower.includes('chest') || symptomsLower.includes('heart'))) ||
      (specialtyLower.includes('pulmonary') && (symptomsLower.includes('breathing') || symptomsLower.includes('lung'))) ||
      (specialtyLower.includes('neurology') && (symptomsLower.includes('headache') || symptomsLower.includes('dizziness'))) ||
      (specialtyLower.includes('emergency') && aiSuggestion?.severity === 'Severe')
    ) {
      score = Math.max(score, ALGORITHM_CONFIG.specialtyBonus.strong);
    }
    // Good matches
    else if (
      specialtyLower.includes('general') ||
      specialtyLower.includes('family') ||
      specialtyLower.includes('internal')
    ) {
      score = Math.max(score, ALGORITHM_CONFIG.specialtyBonus.good);
    }
    // General match
    else {
      score = Math.max(score, ALGORITHM_CONFIG.specialtyBonus.general);
    }
  }

  return score;
}

/**
 * Calculate workload-based confidence adjustment
 */
function calculateWorkloadAdjustment(provider: any): number {
  const workloadRatio = provider.workload.assignedTriages / 10; // Default max workload of 10
  
  if (workloadRatio > 0.8) {
    return ALGORITHM_CONFIG.workloadPenalty.high;
  } else if (workloadRatio > 0.5) {
    return ALGORITHM_CONFIG.workloadPenalty.medium;
  } else {
    return ALGORITHM_CONFIG.workloadPenalty.low;
  }
}

/**
 * Calculate role-based adjustments
 */
function calculateRoleAdjustment(provider: any, urgency: string, symptoms: string): number {
  const role = provider.role;
  const symptomsLower = symptoms.toLowerCase();
  
  switch (role) {
    case 'DOCTOR':
      let doctorBonus = ALGORITHM_CONFIG.roleAdjustments.DOCTOR.base;
      if (urgency === 'HIGH') {
        doctorBonus += ALGORITHM_CONFIG.roleAdjustments.DOCTOR.highUrgency;
      }
      return doctorBonus;
      
    case 'NURSE':
      let nurseBonus = ALGORITHM_CONFIG.roleAdjustments.NURSE.base;
      if (urgency === 'MEDIUM' || urgency === 'LOW') {
        nurseBonus += ALGORITHM_CONFIG.roleAdjustments.NURSE.mediumUrgency;
      }
      return nurseBonus;
      
    case 'PHARMACIST':
      if (symptomsLower.includes('medication') || symptomsLower.includes('drug')) {
        return ALGORITHM_CONFIG.roleAdjustments.PHARMACIST.medication;
      } else {
        return ALGORITHM_CONFIG.roleAdjustments.PHARMACIST.other;
      }
      
    default:
      return 0;
  }
}

/**
 * Calculate next available appointment time
 */
function calculateNextAvailable(provider: any): Date {
  // Simple calculation - if has available slots, next available is tomorrow
  // Otherwise, find next available day based on provider schedule
  const now = new Date();
  
  if (provider.workload.availableSlots > 0) {
    // Has available slots - next available tomorrow
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0); // 9 AM
    return tomorrow;
  } else {
    // No available slots - next available in 2-3 days
    const nextAvailable = new Date(now);
    nextAvailable.setDate(nextAvailable.getDate() + Math.ceil(Math.random() * 3) + 2);
    nextAvailable.setHours(9, 0, 0, 0);
    return nextAvailable;
  }
}

/**
 * Generate provider recommendations using AI algorithm
 */
function generateProviderRecommendations(providers: any[], symptoms: string, aiSuggestion: any) {
  const recommendations = providers.map(provider => {
    // Start with base confidence
    let confidence = ALGORITHM_CONFIG.baseConfidence;
    
    // Workload adjustment
    confidence += calculateWorkloadAdjustment(provider);
    
    // Availability scoring
    if (provider.workload.availableSlots > 0) {
      confidence += 15; // Available slots bonus
    } else {
      confidence -= 15; // No slots penalty
    }
    
    // Specialty matching
    confidence += calculateSpecialtyMatch(provider, symptoms, aiSuggestion);
    
    // Role-based adjustments
    const urgency = aiSuggestion?.severity === 'Severe' ? 'HIGH' : 
                   aiSuggestion?.severity === 'Moderate' ? 'MEDIUM' : 'LOW';
    confidence += calculateRoleAdjustment(provider, urgency, symptoms);
    
    // Utilization rate balancing
    const utilizationRate = provider.workload.utilizationRate || 0;
    if (utilizationRate < 30) {
      confidence += 15; // Excellent availability
    } else if (utilizationRate < 60) {
      confidence += 8; // Good availability
    } else if (utilizationRate < 80) {
      confidence -= 5; // Moderate availability
    } else {
      confidence -= 15; // Limited availability
    }
    
    // Calculate next available time
    const nextAvailable = calculateNextAvailable(provider);
    const hoursUntilAvailable = (nextAvailable.getTime() - Date.now()) / (1000 * 60 * 60);
    
    // Time-sensitive bonus
    if (hoursUntilAvailable < 2) {
      confidence += 10;
    } else if (hoursUntilAvailable < 24) {
      confidence += 5;
    }
    
    // Normalize confidence to bounds
    confidence = Math.min(ALGORITHM_CONFIG.maxConfidence, Math.max(ALGORITHM_CONFIG.minConfidence, confidence));
    
    // Generate reason
    let reason = '';
    const specialty = provider.specialties?.[0]?.specialty || 'General Practice';
    
    if (confidence > 80) {
      reason = `Strong match: ${specialty} specialty and excellent availability. ${provider.role} recommended for this case.`;
    } else if (confidence > 60) {
      reason = `Good match: ${specialty} specialty with good availability. Suitable ${provider.role} for this case.`;
    } else {
      reason = `Available option: ${specialty} provider with current availability.`;
    }
    
    return {
      id: provider.id,
      name: `${provider.firstName} ${provider.lastName}`,
      role: provider.role,
      specialty: specialty,
      confidence: Math.round(confidence),
      reason,
      nextAvailable: nextAvailable.toISOString(),
      currentWorkload: provider.workload.assignedTriages,
      availableSlots: provider.workload.availableSlots
    };
  });
  
  // Sort by confidence (descending) and return top 3
  return recommendations
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}

/**
 * Generate analysis text based on urgency and recommendations
 */
function generateAnalysis(symptoms: string, aiSuggestion: any, topRecommendations: any[]): string {
  const urgency = aiSuggestion?.severity === 'Severe' ? 'HIGH' : 
                 aiSuggestion?.severity === 'Moderate' ? 'MEDIUM' : 'LOW';
  
  let urgencyText = '';
  switch (urgency) {
    case 'HIGH':
      urgencyText = 'This appears to be a situation requiring prompt medical attention.';
      break;
    case 'MEDIUM':
      urgencyText = 'This requires medical evaluation but is not immediately urgent.';
      break;
    case 'LOW':
      urgencyText = 'This appears to be a minor concern that should be addressed at your convenience.';
      break;
  }
  
  const topProvider = topRecommendations[0];
  let providerText = '';
  
  if (topProvider) {
    providerText = ` Based on provider expertise and availability, ${topProvider.name} (${topProvider.specialty}) appears to be the most suitable provider for this case.`;
  }
  
  return `Based on the symptoms provided, ${urgencyText.toLowerCase()}${providerText}`;
}

/**
 * POST handler for generating AI triage suggestions
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    // Check authentication and authorization
    if (!session || !session.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { patientId, symptoms } = body;

    // Validate required fields
    if (!symptoms || typeof symptoms !== 'string' || symptoms.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Symptoms are required and must be a non-empty string' 
      }, { status: 400 });
    }

    console.log(`[AI Triage] Starting suggestion generation for ${symptoms.length} characters of symptoms`);

    // Step 1: Try external AI service, fallback to local analysis
    const aiSuggestion = await callExternalAIService(symptoms) || localSymptomAnalysis(symptoms);
    
    console.log(`[AI Triage] AI analysis result:`, {
      severity: aiSuggestion.severity,
      recommendedProvider: aiSuggestion.recommendedProvider
    });

    // Step 2: Get available providers for the clinic
    const providers = await usersDataAccess.getProvidersForTriage({
      clinicId: session.user.clinicId!,
      roles: [UserRole.DOCTOR, UserRole.NURSE, UserRole.PHARMACIST]
    });

    console.log(`[AI Triage] Found ${providers.length} available providers`);

    if (providers.length === 0) {
      return NextResponse.json({
        error: 'No available providers found for your clinic'
      }, { status: 404 });
    }

    // Step 3: Generate provider recommendations
    const topRecommendations = generateProviderRecommendations(providers, symptoms, aiSuggestion);
    
    console.log(`[AI Triage] Generated ${topRecommendations.length} recommendations`);

    // Step 4: Determine suggested urgency
    const suggestedUrgency = aiSuggestion.severity === 'Severe' ? 'HIGH' : 
                           aiSuggestion.severity === 'Moderate' ? 'MEDIUM' : 'LOW';

    // Step 5: Generate analysis
    const analysis = generateAnalysis(symptoms, aiSuggestion, topRecommendations);

    // Step 6: Log the AI suggestion for audit purposes
    await AuditLogger.log({
      userId: session.user.id,
      action: 'AI_TRIAGE_SUGGESTION',
      details: {
        patientId: patientId || null,
        symptomsLength: symptoms.length,
        suggestedUrgency,
        providerCount: topRecommendations.length,
        topProviderId: topRecommendations[0]?.id,
        topProviderConfidence: topRecommendations[0]?.confidence,
        aiServiceUsed: !!process.env.AI_TRIAGE_SERVICE_URL,
        resourceType: 'TRIAGE_SUGGESTION'
      }
    });

    console.log(`[AI Triage] Suggestion generation completed successfully`);

    // Step 7: Return the response
    return NextResponse.json({
      data: {
        providers: topRecommendations,
        suggestedUrgency,
        analysis
      }
    });

  } catch (error) {
    console.error('[AI Triage] Error generating suggestions:', error);
    return NextResponse.json({ 
      error: 'Failed to generate AI suggestions. Please try again.' 
    }, { status: 500 });
  }
}
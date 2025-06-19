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
import prisma from '@/lib/prisma';

/**
 * AI Triage suggestion algorithm configuration
 */
const ALGORITHM_CONFIG = {  baseConfidence: 50,
  maxConfidence: 95,   // Leave room for differentiation at the top
  minConfidence: 20,
  workloadPenalty: { high: -20, medium: -10, low: 10 },
  specialtyBonus: { 
    perfect: 80,    // Perfect specialty match with emergency symptoms
    excellent: 60,  // Excellent specialty match 
    strong: 40,     // Strong specialty match
    good: 25,       // Good specialty match
    general: 15,    // General practice bonus
    weak: 5         // Weak/tangential match
  },
  roleAdjustments: {
    DOCTOR: { base: 15, highUrgency: 15, criticalUrgency: 25 },
    NURSE: { base: 5, mediumUrgency: 10, routine: 15 },
    PHARMACIST: { medication: 30, drugInteraction: 40, other: -10 }
  },
  urgencyMultipliers: {
    CRITICAL: 1.15,  // Reduced to prevent over-inflation
    HIGH: 1.1,       // Reduced to prevent over-inflation
    MEDIUM: 1.0,
    LOW: 0.95
  }
};

/**
 * Comprehensive medical specialty and symptom mapping
 */
const MEDICAL_KNOWLEDGE_BASE = {
  // Cardiovascular/Cardiac
  cardiology: {
    keywords: [
      'chest pain', 'chest pressure', 'crushing chest', 'squeezing chest', 'heart pain',
      'radiating pain', 'left arm pain', 'jaw pain', 'radiating to arm', 'radiating to jaw',
      'heart attack', 'myocardial', 'angina', 'cardiac', 'heart', 'palpitations',
      'irregular heartbeat', 'arrhythmia', 'rapid heart rate', 'slow heart rate',
      'heart failure', 'shortness of breath', 'dyspnea', 'syncope', 'fainting',
      'dizziness', 'lightheaded', 'edema', 'swelling', 'peripheral edema'
    ],
    emergencyPatterns: [
      ['chest pain', 'radiating'],
      ['chest pain', 'nausea'],
      ['chest pain', 'sweating'],
      ['chest pressure', 'left arm'],
      ['heart attack'],
      ['cardiac arrest']
    ],
    urgencyIndicators: ['sudden', 'severe', 'crushing', 'worst ever', 'acute']
  },

  // Respiratory/Pulmonary
  pulmonology: {
    keywords: [
      'breathing', 'breath', 'respiratory', 'lung', 'pulmonary', 'pneumonia',
      'shortness of breath', 'difficulty breathing', 'dyspnea', 'wheezing',
      'cough', 'coughing', 'sputum', 'hemoptysis', 'blood in sputum',
      'chest tightness', 'asthma', 'bronchitis', 'copd', 'emphysema',
      'pneumothorax', 'pleural', 'oxygen', 'hypoxia', 'cyanosis'
    ],
    emergencyPatterns: [
      ['cannot breathe'],
      ['severe shortness of breath'],
      ['respiratory distress'],
      ['blue lips', 'cyanosis'],
      ['pneumothorax']
    ],
    urgencyIndicators: ['cannot breathe', 'gasping', 'severe dyspnea', 'respiratory failure']
  },

  // Neurological
  neurology: {
    keywords: [
      'headache', 'migraine', 'head pain', 'neurological', 'neuro',
      'dizziness', 'vertigo', 'balance', 'coordination', 'ataxia',
      'numbness', 'tingling', 'weakness', 'paralysis', 'hemiparesis',
      'seizure', 'epilepsy', 'convulsion', 'tremor', 'parkinson',
      'memory', 'confusion', 'cognitive', 'dementia', 'alzheimer',
      'speech', 'slurred speech', 'aphasia', 'vision changes', 'diplopia',
      'facial drooping', 'bell\'s palsy', 'neuropathy', 'sciatica'
    ],
    emergencyPatterns: [
      ['sudden headache', 'worst headache'],
      ['facial drooping'],
      ['slurred speech'],
      ['sudden weakness'],
      ['sudden numbness'],
      ['stroke'],
      ['seizure']
    ],
    urgencyIndicators: ['sudden onset', 'worst headache of life', 'thunderclap', 'stroke symptoms']
  },

  // Gastrointestinal
  gastroenterology: {
    keywords: [
      'abdominal pain', 'stomach pain', 'belly pain', 'gastric', 'intestinal',
      'nausea', 'vomiting', 'diarrhea', 'constipation', 'bowel', 'gi',
      'heartburn', 'reflux', 'gerd', 'ulcer', 'gastritis', 'colitis',
      'appendicitis', 'gallbladder', 'cholecystitis', 'pancreatitis',
      'liver', 'hepatitis', 'jaundice', 'yellow skin', 'yellow eyes',
      'bloody stool', 'melena', 'rectal bleeding', 'hemorrhoids'
    ],
    emergencyPatterns: [
      ['severe abdominal pain'],
      ['appendicitis'],
      ['bloody vomit'],
      ['severe vomiting'],
      ['pancreatitis'],
      ['bowel obstruction']
    ],
    urgencyIndicators: ['severe pain', 'rebound tenderness', 'rigid abdomen', 'guarding']
  },

  // Orthopedic/Musculoskeletal
  orthopedics: {
    keywords: [
      'bone', 'fracture', 'break', 'joint', 'muscle', 'tendon', 'ligament',
      'back pain', 'neck pain', 'shoulder pain', 'knee pain', 'hip pain',
      'ankle pain', 'wrist pain', 'elbow pain', 'arthritis', 'osteoarthritis',
      'rheumatoid', 'sprain', 'strain', 'dislocation', 'torn', 'rupture',
      'spine', 'spinal', 'disc', 'herniated disc', 'sciatica'
    ],
    emergencyPatterns: [
      ['compound fracture'],
      ['open fracture'],
      ['severe trauma'],
      ['cannot move'],
      ['severe back pain', 'legs']
    ],
    urgencyIndicators: ['compound', 'open wound', 'deformity', 'cannot bear weight']
  },

  // Emergency Medicine
  emergency: {
    keywords: [
      'trauma', 'accident', 'injury', 'wound', 'bleeding', 'hemorrhage',
      'unconscious', 'unresponsive', 'collapse', 'shock', 'severe',
      'critical', 'life threatening', 'emergency', 'urgent', 'acute',
      'sudden onset', 'severe pain', 'cannot walk', 'cannot move'
    ],
    emergencyPatterns: [
      ['unconscious'],
      ['unresponsive'],
      ['severe bleeding'],
      ['shock'],
      ['trauma']
    ],
    urgencyIndicators: ['life threatening', 'critical', 'severe trauma', 'massive bleeding']
  },

  // Dermatology
  dermatology: {
    keywords: [
      'skin', 'rash', 'itch', 'dermatitis', 'eczema', 'psoriasis',
      'acne', 'mole', 'lesion', 'bump', 'growth', 'melanoma',
      'hives', 'allergic reaction', 'burn', 'wound', 'cut', 'laceration'
    ],
    emergencyPatterns: [
      ['severe allergic reaction'],
      ['anaphylaxis'],
      ['severe burn'],
      ['rapidly spreading rash']
    ],
    urgencyIndicators: ['spreading rapidly', 'difficulty breathing with rash', 'severe burn']
  },

  // Ophthalmology
  ophthalmology: {
    keywords: [
      'eye', 'vision', 'sight', 'blind', 'blurred vision', 'double vision',
      'eye pain', 'red eye', 'discharge', 'conjunctivitis', 'glaucoma',
      'retinal', 'macular', 'cataract', 'floaters', 'flashing lights'
    ],
    emergencyPatterns: [
      ['sudden vision loss'],
      ['severe eye pain'],
      ['eye trauma'],
      ['flashing lights', 'floaters']
    ],
    urgencyIndicators: ['sudden onset', 'severe pain', 'vision loss', 'trauma']
  },

  // ENT (Ear, Nose, Throat)
  ent: {
    keywords: [
      'ear', 'hearing', 'deaf', 'ear pain', 'earache', 'tinnitus',
      'nose', 'sinus', 'sinusitis', 'congestion', 'nosebleed',
      'throat', 'sore throat', 'hoarse', 'voice', 'laryngitis',
      'tonsils', 'tonsillitis', 'swallowing', 'difficulty swallowing'
    ],
    emergencyPatterns: [
      ['severe sore throat', 'difficulty swallowing'],
      ['severe nosebleed'],
      ['sudden hearing loss']
    ],
    urgencyIndicators: ['cannot swallow', 'severe bleeding', 'sudden onset']
  },

  // Urology
  urology: {
    keywords: [
      'kidney', 'bladder', 'urinary', 'urine', 'pee', 'urination',
      'kidney stone', 'uti', 'urinary tract infection', 'blood in urine',
      'hematuria', 'prostate', 'testicular', 'groin pain'
    ],
    emergencyPatterns: [
      ['kidney stone', 'severe pain'],
      ['cannot urinate'],
      ['blood in urine', 'severe']
    ],
    urgencyIndicators: ['severe flank pain', 'unable to urinate', 'acute retention']
  },

  // Gynecology
  gynecology: {
    keywords: [
      'menstrual', 'period', 'vaginal', 'pelvic pain', 'ovarian',
      'uterine', 'pregnancy', 'pregnant', 'bleeding', 'discharge'
    ],
    emergencyPatterns: [
      ['severe pelvic pain'],
      ['heavy bleeding'],
      ['pregnancy', 'bleeding']
    ],
    urgencyIndicators: ['severe pain', 'heavy bleeding', 'pregnancy complications']
  },

  // Psychiatry/Mental Health
  psychiatry: {
    keywords: [
      'depression', 'anxiety', 'panic', 'suicidal', 'suicide', 'self harm',
      'mental health', 'psychiatric', 'bipolar', 'schizophrenia',
      'hallucination', 'delusion', 'manic', 'psychotic'
    ],
    emergencyPatterns: [
      ['suicidal'],
      ['self harm'],
      ['homicidal'],
      ['psychotic break']
    ],
    urgencyIndicators: ['suicidal ideation', 'homicidal ideation', 'acute psychosis']
  },

  // Endocrinology
  endocrinology: {
    keywords: [
      'diabetes', 'diabetic', 'blood sugar', 'glucose', 'insulin',
      'thyroid', 'hyperthyroid', 'hypothyroid', 'hormone', 'endocrine'
    ],
    emergencyPatterns: [
      ['diabetic ketoacidosis'],
      ['severe hypoglycemia'],
      ['thyroid storm']
    ],
    urgencyIndicators: ['ketoacidosis', 'severe hypoglycemia', 'thyroid crisis']
  },

  // Pediatrics (age-specific)
  pediatrics: {
    keywords: [
      'child', 'infant', 'baby', 'toddler', 'pediatric', 'fever in child',
      'vaccination', 'immunization', 'growth', 'development'
    ],
    emergencyPatterns: [
      ['high fever', 'child'],
      ['seizure', 'child'],
      ['difficulty breathing', 'child']
    ],
    urgencyIndicators: ['high fever in infant', 'febrile seizure', 'respiratory distress']
  },

  // Infectious Disease
  infectious: {
    keywords: [
      'infection', 'sepsis', 'fever', 'chills', 'flu', 'covid',
      'pneumonia', 'bronchitis', 'abscess', 'cellulitis'
    ],
    emergencyPatterns: [
      ['sepsis'],
      ['high fever', 'altered mental status'],
      ['severe infection']
    ],
    urgencyIndicators: ['sepsis', 'septic shock', 'severe systemic infection']
  }
};

/**
 * External AI/ML service integration
 */
async function callExternalAIService(symptoms: string, patientAge?: number, urgency?: string, medicalHistory?: string[], patientGender?: string) {
  try {
    const AI_API_URL = process.env.AI_API_URL || 'http://localhost:4000';
    const AI_API_KEY = process.env.AI_API_KEY || 'web_ui_api_key_13579_change_in_production';    if (!AI_API_URL) {
      return null;
    }

    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': AI_API_KEY,
      'Authorization': `Bearer ${process.env.AI_SERVICE_JWT_TOKEN || ''}` // Server-side JWT token
    };    // Prepare payload - only include fields that have valid values
    const payload: any = {
      symptoms,
      medicalHistory: medicalHistory || []
    };

    // Only include urgency if it's provided and valid
    if (urgency && ['low', 'moderate', 'high', 'critical'].includes(urgency.toLowerCase())) {
      payload.urgency = urgency.toLowerCase();
    }

    // Only include patientAge if it's a valid number
    if (patientAge && patientAge > 0 && patientAge <= 150) {
      payload.patientAge = patientAge;
    }

    // Only include patientGender if it's a valid value
    if (patientGender && ['male', 'female', 'other', 'prefer_not_to_say'].includes(patientGender.toLowerCase())) {
      payload.patientGender = patientGender.toLowerCase();
    }

    const response = await fetch(`${AI_API_URL}/api/v1/healthcare/triage`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    
    // Transform AI/ML API response to match expected format
    // Map the actual response structure from your AI service
    return {
      severity: result.data?.urgency?.charAt(0).toUpperCase() + result.data?.urgency?.slice(1) || 'Moderate',
      recommendedProvider: result.data?.recommended_provider?.charAt(0).toUpperCase() + result.data?.recommended_provider?.slice(1) || 'Nurse Practitioner',
      reasoning: result.data?.reasoning || 'AI analysis completed successfully.'
    };
  } catch (error) {
    console.error('AI/ML API service error:', error);
    return null;
  }
}

/**
 * Advanced local symptom analysis fallback using comprehensive medical knowledge base
 * This provides sophisticated analysis when external AI service is unavailable
 */
function localSymptomAnalysis(symptoms: string) {
  const symptomsLower = symptoms.toLowerCase();
  
  // Determine urgency using the advanced algorithm
  const urgency = determineUrgencyLevel(symptoms);
    // Analyze symptoms against all medical specialties to find best match
  let bestSpecialtyMatch: {
    specialty: string;
    score: number;
    matchDetails: any;
  } = {
    specialty: 'General Practice',
    score: 0,
    matchDetails: null
  };
  
  // Check each specialty in the knowledge base
  Object.entries(MEDICAL_KNOWLEDGE_BASE).forEach(([specialtyKey, knowledgeBase]) => {
    let specialtyScore = 0;
    let matchDetails = {
      keywordMatches: 0,
      emergencyPatternMatches: 0,
      urgencyIndicatorMatches: 0
    };
    
    // Count keyword matches
    matchDetails.keywordMatches = knowledgeBase.keywords.filter(keyword => 
      symptomsLower.includes(keyword)
    ).length;
    
    // Check for emergency patterns
    matchDetails.emergencyPatternMatches = knowledgeBase.emergencyPatterns.filter(pattern => 
      pattern.every(symptom => symptomsLower.includes(symptom))
    ).length;
    
    // Check for urgency indicators
    matchDetails.urgencyIndicatorMatches = knowledgeBase.urgencyIndicators.filter(indicator => 
      symptomsLower.includes(indicator)
    ).length;
    
    // Calculate specialty score
    if (matchDetails.emergencyPatternMatches > 0) {
      specialtyScore = 100; // Perfect emergency pattern match
    } else if (matchDetails.keywordMatches >= 3 && matchDetails.urgencyIndicatorMatches > 0) {
      specialtyScore = 85; // Excellent match with urgency
    } else if (matchDetails.keywordMatches >= 3) {
      specialtyScore = 70; // Strong keyword match
    } else if (matchDetails.keywordMatches >= 2) {
      specialtyScore = 50; // Good keyword match
    } else if (matchDetails.keywordMatches >= 1) {
      specialtyScore = 25; // Basic match
    }
    
    // Update best match if this specialty scores higher
    if (specialtyScore > bestSpecialtyMatch.score) {
      bestSpecialtyMatch = {
        specialty: getSpecialtyDisplayName(specialtyKey),
        score: specialtyScore,
        matchDetails
      };
    }
  });
  
  // Determine recommended provider based on best specialty match and urgency
  let recommendedProvider = determineRecommendedProvider(bestSpecialtyMatch.specialty, urgency, symptoms);
  
  // Generate detailed reasoning
  const reasoning = generateLocalAnalysisReasoning(symptoms, urgency, bestSpecialtyMatch, recommendedProvider);
  
  return {
    severity: urgency === 'HIGH' ? 'High' : urgency === 'MEDIUM' ? 'Medium' : 'Low',
    recommendedProvider,
    reasoning
  };
}

/**
 * Convert specialty key to display name
 */
function getSpecialtyDisplayName(specialtyKey: string): string {
  const displayNames: { [key: string]: string } = {
    'cardiology': 'Cardiology',
    'pulmonology': 'Pulmonology', 
    'neurology': 'Neurology',
    'gastroenterology': 'Gastroenterology',
    'orthopedics': 'Orthopedics',
    'emergency': 'Emergency Medicine',
    'dermatology': 'Dermatology',
    'ophthalmology': 'Ophthalmology',
    'ent': 'ENT (Ear, Nose, Throat)',
    'urology': 'Urology',
    'gynecology': 'Gynecology',
    'psychiatry': 'Psychiatry',
    'endocrinology': 'Endocrinology',
    'pediatrics': 'Pediatrics',
    'infectious': 'Infectious Disease'
  };
  
  return displayNames[specialtyKey] || 'General Practice';
}

/**
 * Determine recommended provider type based on specialty and urgency
 */
function determineRecommendedProvider(specialty: string, urgency: string, symptoms: string): string {
  const symptomsLower = symptoms.toLowerCase();
  
  // Check for medication-related symptoms first
  const medicationKeywords = [
    'medication', 'drug', 'prescription', 'side effect', 'drug interaction',
    'overdose', 'dosage', 'pharmacy', 'pill', 'tablet'
  ];
  
  if (medicationKeywords.some(keyword => symptomsLower.includes(keyword))) {
    return 'Pharmacist';
  }
  
  // High urgency cases typically need doctors
  if (urgency === 'HIGH') {
    // Emergency conditions need emergency physicians or specialists
    if (specialty.includes('Emergency') || 
        symptomsLower.includes('unconscious') || 
        symptomsLower.includes('severe bleeding') ||
        symptomsLower.includes('cannot breathe')) {
      return 'Emergency Physician';
    }
    
    // Specialty-specific high urgency cases
    if (specialty.includes('Cardiology')) return 'Cardiologist';
    if (specialty.includes('Neurology')) return 'Neurologist';
    if (specialty.includes('Pulmonology')) return 'Pulmonologist';
    
    return 'Physician'; // General physician for other high urgency
  }
  
  // Medium urgency - can often be handled by nurse practitioners or specialists
  if (urgency === 'MEDIUM') {
    // Specialty cases that need specialists even at medium urgency
    if (specialty.includes('Cardiology')) return 'Cardiologist';
    if (specialty.includes('Neurology')) return 'Neurologist';
    if (specialty.includes('Ophthalmology')) return 'Ophthalmologist';
    if (specialty.includes('ENT')) return 'ENT Specialist';
    if (specialty.includes('Urology')) return 'Urologist';
    if (specialty.includes('Gynecology')) return 'Gynecologist';
    if (specialty.includes('Dermatology')) return 'Dermatologist';
    
    // General medical conditions can be handled by nurse practitioners
    return 'Nurse Practitioner';
  }
  
  // Low urgency - often appropriate for nurse practitioners
  if (urgency === 'LOW') {
    // Some specialty conditions still need specialists even at low urgency
    if (specialty.includes('Ophthalmology')) return 'Ophthalmologist';
    if (specialty.includes('ENT')) return 'ENT Specialist';
    if (specialty.includes('Dermatology')) return 'Dermatologist';
    
    // Most low urgency cases can be handled by nurse practitioners
    return 'Nurse Practitioner';
  }
  
  return 'Nurse Practitioner'; // Default fallback
}

/**
 * Generate detailed reasoning for local analysis
 */
function generateLocalAnalysisReasoning(symptoms: string, urgency: string, bestMatch: any, recommendedProvider: string): string {
  let reasoning = '';
  
  if (bestMatch.score === 0) {
    reasoning = `Based on general symptom analysis, this appears to be a ${urgency.toLowerCase()} urgency case. `;
  } else if (bestMatch.matchDetails.emergencyPatternMatches > 0) {
    reasoning = `Critical ${bestMatch.specialty.toLowerCase()} emergency pattern detected. `;
  } else if (bestMatch.score >= 70) {
    reasoning = `Strong ${bestMatch.specialty.toLowerCase()} symptom pattern identified (${bestMatch.matchDetails.keywordMatches} matching indicators). `;
  } else if (bestMatch.score >= 50) {
    reasoning = `Moderate ${bestMatch.specialty.toLowerCase()} symptom pattern detected. `;
  } else {
    reasoning = `Basic ${bestMatch.specialty.toLowerCase()} symptoms identified. `;
  }
  
  // Add urgency context
  if (urgency === 'HIGH') {
    reasoning += 'High urgency classification due to potentially serious symptoms requiring immediate medical attention. ';
  } else if (urgency === 'MEDIUM') {
    reasoning += 'Medium urgency classification - medical evaluation recommended but not immediately critical. ';
  } else {
    reasoning += 'Low urgency classification - routine medical care appropriate. ';
  }
  
  // Add provider recommendation reasoning
  reasoning += `${recommendedProvider} recommended based on symptom analysis and clinical appropriateness.`;
  
  return reasoning;
}

/**
 * Advanced medical specialty matching algorithm
 * Analyzes symptoms against comprehensive medical knowledge base
 */
function calculateSpecialtyMatch(provider: any, symptoms: string, aiSuggestion: any): number {
  const symptomsLower = symptoms.toLowerCase();
  let bestScore = 0;
  let matchedSpecialty = null;
  
  if (!provider.specialties || provider.specialties.length === 0) {
    return ALGORITHM_CONFIG.specialtyBonus.general;
  }

  // Analyze each provider specialty against symptoms
  for (const specialty of provider.specialties) {
    const specialtyLower = specialty.specialty.toLowerCase();
    let specialtyScore = 0;
    let matchDetails = {
      keywordMatches: 0,
      emergencyPatternMatches: 0,
      urgencyIndicatorMatches: 0,
      directSpecialtyMatch: false
    };

    // Map provider specialty to knowledge base
    let knowledgeBase = null;
    if (specialtyLower.includes('cardiology') || specialtyLower.includes('cardiac')) {
      knowledgeBase = MEDICAL_KNOWLEDGE_BASE.cardiology;
      matchDetails.directSpecialtyMatch = true;
    } else if (specialtyLower.includes('pulmonary') || specialtyLower.includes('respiratory')) {
      knowledgeBase = MEDICAL_KNOWLEDGE_BASE.pulmonology;
      matchDetails.directSpecialtyMatch = true;
    } else if (specialtyLower.includes('neurology') || specialtyLower.includes('neurological')) {
      knowledgeBase = MEDICAL_KNOWLEDGE_BASE.neurology;
      matchDetails.directSpecialtyMatch = true;
    } else if (specialtyLower.includes('gastro') || specialtyLower.includes('gi')) {
      knowledgeBase = MEDICAL_KNOWLEDGE_BASE.gastroenterology;
      matchDetails.directSpecialtyMatch = true;
    } else if (specialtyLower.includes('orthopedic') || specialtyLower.includes('orthopedics')) {
      knowledgeBase = MEDICAL_KNOWLEDGE_BASE.orthopedics;
      matchDetails.directSpecialtyMatch = true;
    } else if (specialtyLower.includes('emergency')) {
      knowledgeBase = MEDICAL_KNOWLEDGE_BASE.emergency;
      matchDetails.directSpecialtyMatch = true;
    } else if (specialtyLower.includes('dermatology') || specialtyLower.includes('skin')) {
      knowledgeBase = MEDICAL_KNOWLEDGE_BASE.dermatology;
      matchDetails.directSpecialtyMatch = true;
    } else if (specialtyLower.includes('ophthalmology') || specialtyLower.includes('eye')) {
      knowledgeBase = MEDICAL_KNOWLEDGE_BASE.ophthalmology;
      matchDetails.directSpecialtyMatch = true;
    } else if (specialtyLower.includes('ent') || specialtyLower.includes('otolaryngology')) {
      knowledgeBase = MEDICAL_KNOWLEDGE_BASE.ent;
      matchDetails.directSpecialtyMatch = true;
    } else if (specialtyLower.includes('urology') || specialtyLower.includes('urological')) {
      knowledgeBase = MEDICAL_KNOWLEDGE_BASE.urology;
      matchDetails.directSpecialtyMatch = true;
    } else if (specialtyLower.includes('gynecology') || specialtyLower.includes('womens health')) {
      knowledgeBase = MEDICAL_KNOWLEDGE_BASE.gynecology;
      matchDetails.directSpecialtyMatch = true;
    } else if (specialtyLower.includes('psychiatry') || specialtyLower.includes('mental health')) {
      knowledgeBase = MEDICAL_KNOWLEDGE_BASE.psychiatry;
      matchDetails.directSpecialtyMatch = true;
    } else if (specialtyLower.includes('endocrinology') || specialtyLower.includes('diabetes')) {
      knowledgeBase = MEDICAL_KNOWLEDGE_BASE.endocrinology;
      matchDetails.directSpecialtyMatch = true;
    } else if (specialtyLower.includes('pediatric') || specialtyLower.includes('pediatrics')) {
      knowledgeBase = MEDICAL_KNOWLEDGE_BASE.pediatrics;
      matchDetails.directSpecialtyMatch = true;
    } else if (specialtyLower.includes('infectious') || specialtyLower.includes('infection')) {
      knowledgeBase = MEDICAL_KNOWLEDGE_BASE.infectious;
      matchDetails.directSpecialtyMatch = true;
    }

    // If direct specialty match found, analyze against knowledge base
    if (knowledgeBase) {
      // Count keyword matches
      matchDetails.keywordMatches = knowledgeBase.keywords.filter(keyword => 
        symptomsLower.includes(keyword)
      ).length;

      // Check for emergency patterns (combinations of symptoms)
      matchDetails.emergencyPatternMatches = knowledgeBase.emergencyPatterns.filter(pattern => 
        pattern.every(symptom => symptomsLower.includes(symptom))
      ).length;

      // Check for urgency indicators
      matchDetails.urgencyIndicatorMatches = knowledgeBase.urgencyIndicators.filter(indicator => 
        symptomsLower.includes(indicator)
      ).length;

      // Calculate specialty score based on matches
      if (matchDetails.emergencyPatternMatches > 0) {
        specialtyScore = ALGORITHM_CONFIG.specialtyBonus.perfect; // Emergency pattern match
      } else if (matchDetails.keywordMatches >= 3 && matchDetails.urgencyIndicatorMatches > 0) {
        specialtyScore = ALGORITHM_CONFIG.specialtyBonus.excellent; // Strong match with urgency
      } else if (matchDetails.keywordMatches >= 3) {
        specialtyScore = ALGORITHM_CONFIG.specialtyBonus.strong; // Strong keyword match
      } else if (matchDetails.keywordMatches >= 2) {
        specialtyScore = ALGORITHM_CONFIG.specialtyBonus.good; // Good keyword match
      } else if (matchDetails.keywordMatches >= 1) {
        specialtyScore = ALGORITHM_CONFIG.specialtyBonus.general; // Basic match
      }      // Log detailed matching for debugging
      // (Debug logging removed for production)
    }
    // Handle general specialties
    else if (specialtyLower.includes('internal medicine') || specialtyLower.includes('internal')) {
      // Internal medicine can handle most conditions moderately well
      const generalKeywords = Object.values(MEDICAL_KNOWLEDGE_BASE)
        .flatMap(kb => kb.keywords.slice(0, 5)); // Take top keywords from each specialty
      const generalMatches = generalKeywords.filter(keyword => symptomsLower.includes(keyword)).length;
      
      if (generalMatches >= 2) {
        specialtyScore = ALGORITHM_CONFIG.specialtyBonus.good + 5; // Internal medicine bonus
      } else if (generalMatches >= 1) {
        specialtyScore = ALGORITHM_CONFIG.specialtyBonus.good;
      } else {
        specialtyScore = ALGORITHM_CONFIG.specialtyBonus.general;
      }
    }
    else if (specialtyLower.includes('family') || specialtyLower.includes('general practice')) {
      // Family practice can handle most routine conditions
      const generalKeywords = Object.values(MEDICAL_KNOWLEDGE_BASE)
        .flatMap(kb => kb.keywords.slice(0, 3)); // Take fewer keywords
      const generalMatches = generalKeywords.filter(keyword => symptomsLower.includes(keyword)).length;
      
      if (generalMatches >= 1) {
        specialtyScore = ALGORITHM_CONFIG.specialtyBonus.good;
      } else {
        specialtyScore = ALGORITHM_CONFIG.specialtyBonus.general;
      }
    }
    else {
      // Unknown specialty gets basic score
      specialtyScore = ALGORITHM_CONFIG.specialtyBonus.weak;
    }

    // Track the best matching specialty for this provider
    if (specialtyScore > bestScore) {
      bestScore = specialtyScore;
      matchedSpecialty = specialty.specialty;
    }
  }

  // Cross-specialty emergency detection
  // Some symptoms require immediate attention regardless of specialty
  const emergencyKeywords = [
    'unconscious', 'unresponsive', 'severe bleeding', 'cannot breathe',
    'chest pain', 'stroke', 'heart attack', 'seizure', 'anaphylaxis'
  ];
  
  const hasEmergencySymptoms = emergencyKeywords.some(keyword => 
    symptomsLower.includes(keyword)
  );

  // Boost emergency medicine and relevant specialists for emergency symptoms
  if (hasEmergencySymptoms) {
    const specialty = provider.specialties?.[0]?.specialty?.toLowerCase() || '';
    if (specialty.includes('emergency')) {
      bestScore = Math.max(bestScore, ALGORITHM_CONFIG.specialtyBonus.excellent);
    } else if (specialty.includes('cardiology') && (symptomsLower.includes('chest pain') || symptomsLower.includes('heart attack'))) {
      bestScore = Math.max(bestScore, ALGORITHM_CONFIG.specialtyBonus.perfect);
    } else if (specialty.includes('neurology') && (symptomsLower.includes('stroke') || symptomsLower.includes('seizure'))) {
      bestScore = Math.max(bestScore, ALGORITHM_CONFIG.specialtyBonus.perfect);
    }
  }
  return bestScore;
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
 * Calculate role-based adjustments with enhanced urgency handling
 */
function calculateRoleAdjustment(provider: any, urgency: string, symptoms: string): number {
  const role = provider.role;
  const symptomsLower = symptoms.toLowerCase();
  
  // Check for medication-related symptoms
  const medicationKeywords = [
    'medication', 'drug', 'prescription', 'side effect', 'drug interaction',
    'overdose', 'dosage', 'pharmacy', 'pill', 'tablet', 'capsule'
  ];
  const hasMedicationSymptoms = medicationKeywords.some(keyword => 
    symptomsLower.includes(keyword)
  );

  // Check for critical/life-threatening symptoms
  const criticalKeywords = [
    'unconscious', 'unresponsive', 'cardiac arrest', 'respiratory arrest',
    'severe bleeding', 'massive trauma', 'anaphylaxis', 'stroke'
  ];
  const hasCriticalSymptoms = criticalKeywords.some(keyword => 
    symptomsLower.includes(keyword)
  );
  
  switch (role) {
    case 'DOCTOR':
      let doctorBonus = ALGORITHM_CONFIG.roleAdjustments.DOCTOR.base;
      if (hasCriticalSymptoms) {
        doctorBonus += ALGORITHM_CONFIG.roleAdjustments.DOCTOR.criticalUrgency;
      } else if (urgency === 'HIGH') {
        doctorBonus += ALGORITHM_CONFIG.roleAdjustments.DOCTOR.highUrgency;
      }
      return doctorBonus;
      
    case 'NURSE':
      let nurseBonus = ALGORITHM_CONFIG.roleAdjustments.NURSE.base;
      // Nurses excel at routine care and moderate urgency cases
      if (urgency === 'MEDIUM' || urgency === 'LOW') {
        nurseBonus += ALGORITHM_CONFIG.roleAdjustments.NURSE.mediumUrgency;
      }
      // Additional bonus for routine/preventive care
      if (symptomsLower.includes('routine') || symptomsLower.includes('check') || 
          symptomsLower.includes('follow up') || symptomsLower.includes('prevention')) {
        nurseBonus += ALGORITHM_CONFIG.roleAdjustments.NURSE.routine;
      }
      return nurseBonus;
      
    case 'PHARMACIST':
      if (hasMedicationSymptoms) {
        // Check for drug interaction symptoms
        if (symptomsLower.includes('interaction') || symptomsLower.includes('multiple medications')) {
          return ALGORITHM_CONFIG.roleAdjustments.PHARMACIST.drugInteraction;
        } else {
          return ALGORITHM_CONFIG.roleAdjustments.PHARMACIST.medication;
        }
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
 * Revolutionary Provider Recommendation Algorithm v2.0
 * Uses urgency-adaptive scoring matrices to intelligently balance AI recommendations,
 * specialty matching, availability, and workload based on urgency level.
 */
function generateProviderRecommendations(providers: any[], symptoms: string, aiSuggestion: any, urgency?: string) {
  // Determine urgency level with multiple sources
  const detectedUrgency = urgency ? urgency.toUpperCase() : 
    (aiSuggestion?.severity === 'High' ? 'HIGH' : 
     aiSuggestion?.severity === 'Medium' ? 'MEDIUM' : 'LOW');
  // Revolutionary Algorithm: Urgency-Adaptive Scoring Matrix
  // This is the key innovation - weights change dramatically based on urgency
  const URGENCY_MATRICES: Record<string, {
    specialty: number;
    aiRecommendation: number;
    availability: number;
    workload: number;
    continuity: number;
  }> = {
    'CRITICAL': {
      specialty: 0.50,      // 50% - Expertise is critical
      aiRecommendation: 0.20, // 20% - AI guidance important
      availability: 0.15,    // 15% - Must be available
      workload: 0.10,       // 10% - Secondary concern
      continuity: 0.05      // 5% - Less important in crisis
    },
    'HIGH': {
      specialty: 0.40,      // 40% - Expertise very important
      aiRecommendation: 0.25, // 25% - AI guidance significant
      availability: 0.20,    // 20% - Availability important
      workload: 0.10,       // 10% - Moderate concern
      continuity: 0.05      // 5% - Secondary
    },
    'MEDIUM': {
      specialty: 0.25,      // 25% - Expertise moderately important
      aiRecommendation: 0.35, // 35% - AI guidance is primary
      availability: 0.25,    // 25% - Availability very important
      workload: 0.10,       // 10% - Balanced workload
      continuity: 0.05      // 5% - Some consideration
    },
    'LOW': {
      specialty: 0.15,      // 15% - Basic competency sufficient
      aiRecommendation: 0.45, // 45% - AI guidance dominates ⭐ THIS IS THE KEY!
      availability: 0.30,    // 30% - Convenience is key
      workload: 0.05,       // 5% - Less concern
      continuity: 0.05      // 5% - Relationship building
    }
  };
  const matrix = URGENCY_MATRICES[detectedUrgency] || URGENCY_MATRICES['MEDIUM'];

  const recommendations = providers.map(provider => {
    
    // === DIMENSION 1: AI RECOMMENDATION SCORE (0-100) ===
    let aiScore = 50; // Base AI alignment score
    if (aiSuggestion?.recommendedProvider) {
      const aiRecommendedType = aiSuggestion.recommendedProvider.toLowerCase();
      const providerRole = provider.role.toLowerCase();
      
      if (
        (aiRecommendedType.includes('nurse') && providerRole === 'nurse') ||
        (aiRecommendedType.includes('doctor') && providerRole === 'doctor') ||
        (aiRecommendedType.includes('pharmacist') && providerRole === 'pharmacist')
      ) {        // Perfect AI match - scale based on AI confidence if available
        const aiConfidence = aiSuggestion?.analysis?.confidence || 0.75;
        aiScore = 60 + (aiConfidence * 40); // 60-100 based on AI confidence
      } else if (
        // Partial matches (e.g., AI says "nurse practitioner" for any nurse)
        (aiRecommendedType.includes('practitioner') && providerRole === 'nurse') ||
        (aiRecommendedType.includes('physician') && providerRole === 'doctor')      ) {
        aiScore = 75; // Good partial match      } else {
        aiScore = 30; // AI recommended different type
      }
    }    // === DIMENSION 2: SPECIALTY EXPERTISE SCORE (0-100) ===
    let specialtyScore = calculateSpecialtyMatchScore(provider, symptoms, aiSuggestion);

    // === DIMENSION 3: AVAILABILITY SCORE (0-100) ===
    let availabilityScore = calculateAvailabilityScore(provider);

    // === DIMENSION 4: WORKLOAD OPTIMIZATION SCORE (0-100) ===
    let workloadScore = calculateWorkloadScore(provider);

    // === DIMENSION 5: CONTINUITY OF CARE SCORE (0-100) ===
    let continuityScore = 50; // Base continuity (no prior history available yet)
      // === REVOLUTIONARY WEIGHTED CALCULATION ===
    const finalScore = 
      (aiScore * matrix.aiRecommendation) +
      (specialtyScore * matrix.specialty) +
      (availabilityScore * matrix.availability) +
      (workloadScore * matrix.workload) +
      (continuityScore * matrix.continuity);

    return {
      id: provider.id,
      name: `${provider.firstName} ${provider.lastName}`,
      role: provider.role,
      specialty: provider.specialties?.[0]?.specialty || 'General Practice',
      confidence: Math.round(finalScore),
      reason: generateProviderReason(provider, Math.round(finalScore), aiSuggestion),
      nextAvailable: calculateNextAvailable(provider).toISOString(),
      currentWorkload: provider.workload.assignedTriages,
      availableSlots: provider.workload.availableSlots,
      scores: {
        ai: Math.round(aiScore),
        specialty: Math.round(specialtyScore),
        availability: Math.round(availabilityScore),
        workload: Math.round(workloadScore),
        continuity: Math.round(continuityScore),
        matrix: detectedUrgency
      }
    };
  });
  // Sort by confidence and return top 3
  const sorted = recommendations
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
  
  return sorted;
}

/**
 * Calculate specialty expertise score (0-100)
 */
function calculateSpecialtyMatchScore(provider: any, symptoms: string, aiSuggestion: any): number {
  let specialtyScore = 40; // Base competency
  
  const specialty = provider.specialties?.[0]?.specialty || 'General Practice';
  const specialtyLower = specialty.toLowerCase();
  const symptomsLower = symptoms.toLowerCase();
  
  // Enhanced symptom pattern matching
  const respiratoryKeywords = ['cough', 'shortness of breath', 'breathing', 'respiratory', 'lung', 'chest', 'oxygen'];
  const cardiacKeywords = ['chest pain', 'heart', 'cardiac', 'palpitations', 'blood pressure'];
  const neurologicalKeywords = ['headache', 'seizure', 'numbness', 'weakness', 'confusion', 'memory'];
  const dermatologyKeywords = ['rash', 'skin', 'itching', 'mole', 'burn', 'wound'];
  
  const respiratoryMatches = respiratoryKeywords.filter(keyword => symptomsLower.includes(keyword)).length;
  const cardiacMatches = cardiacKeywords.filter(keyword => symptomsLower.includes(keyword)).length;
  const neurologicalMatches = neurologicalKeywords.filter(keyword => symptomsLower.includes(keyword)).length;
  const dermatologyMatches = dermatologyKeywords.filter(keyword => symptomsLower.includes(keyword)).length;
  
  // Specialty-specific scoring
  if (specialtyLower.includes('pulmonary') || specialtyLower.includes('respiratory')) {
    if (respiratoryMatches >= 2) specialtyScore = 90;
    else if (respiratoryMatches >= 1) specialtyScore = 80;
  } else if (specialtyLower.includes('cardiology') || specialtyLower.includes('cardiac')) {
    if (cardiacMatches >= 2) specialtyScore = 90;
    else if (cardiacMatches >= 1) specialtyScore = 80;
  } else if (specialtyLower.includes('neurology') || specialtyLower.includes('neurological')) {
    if (neurologicalMatches >= 2) specialtyScore = 90;
    else if (neurologicalMatches >= 1) specialtyScore = 80;
  } else if (specialtyLower.includes('dermatology')) {
    if (dermatologyMatches >= 2) specialtyScore = 90;
    else if (dermatologyMatches >= 1) specialtyScore = 80;
  } else if (specialtyLower.includes('internal') && (respiratoryMatches >= 1 || cardiacMatches >= 1)) {
    specialtyScore = 75; // Internal medicine handles many conditions well
  } else if (specialtyLower.includes('family') || specialtyLower.includes('general')) {
    specialtyScore = 65; // General practice competency
  } else if (specialtyLower.includes('emergency')) {
    specialtyScore = 70; // Emergency can handle many conditions
  } else if (specialtyLower.includes('nursing')) {
    specialtyScore = 60; // Nursing general competency
  }
  
  return specialtyScore;
}

/**
 * Calculate availability score (0-100)
 */
function calculateAvailabilityScore(provider: any): number {
  let availabilityScore = 50;
  
  const hasAvailableSlots = provider.workload.availableSlots > 0;
  const nextAvailable = calculateNextAvailable(provider);
  const hoursUntilAvailable = (nextAvailable.getTime() - Date.now()) / (1000 * 60 * 60);
  
  if (hasAvailableSlots) {
    if (hoursUntilAvailable < 1) availabilityScore = 100; // Immediate
    else if (hoursUntilAvailable < 4) availabilityScore = 90; // Same day
    else if (hoursUntilAvailable < 24) availabilityScore = 75; // Next day
    else availabilityScore = 60; // Within week
  } else {
    availabilityScore = 20; // No slots available
  }
  
  return availabilityScore;
}

/**
 * Calculate workload optimization score (0-100)
 */
function calculateWorkloadScore(provider: any): number {
  let workloadScore = 70; // Base workload score
  
  const utilizationRate = provider.workload.utilizationRate || 0;
  
  if (utilizationRate < 30) workloadScore = 95; // Excellent capacity
  else if (utilizationRate < 50) workloadScore = 85; // Good capacity
  else if (utilizationRate < 70) workloadScore = 70; // Moderate capacity
  else if (utilizationRate < 90) workloadScore = 50; // High utilization
  else workloadScore = 25; // Overloaded
  
  return workloadScore;
}

/**
 * Generate provider recommendation reason
 */
function generateProviderReason(provider: any, confidence: number, aiSuggestion: any): string {
  const primarySpecialty = provider.specialties?.[0]?.specialty || 'General Practice';
  const isAIRecommended = aiSuggestion?.recommendedProvider && 
    aiSuggestion.recommendedProvider.toLowerCase().includes(provider.role.toLowerCase());
  
  if (confidence > 80) {
    let reason = `Strong match: ${primarySpecialty} expertise with excellent availability.`;
    if (isAIRecommended) {
      reason += ` AI specifically recommends ${provider.role} for these symptoms.`;
    }
    return reason;
  } else if (confidence > 60) {
    let reason = `Good match: ${primarySpecialty} specialty with good availability.`;
    if (isAIRecommended) {
      reason += ` Matches AI recommendation for ${provider.role}.`;
    }
    return reason;
  } else {
    let reason = `Available option: ${primarySpecialty} provider currently available.`;
    if (isAIRecommended) {
      reason += ` AI suggested ${provider.role} type.`;
    }
    return reason;
  }
}/**
 * Generate analysis text based on urgency and recommendations
 */
function generateAnalysis(symptoms: string, aiSuggestion: any, topRecommendations: any[]): string {
  const urgency = aiSuggestion?.severity === 'High' ? 'HIGH' : 
                 aiSuggestion?.severity === 'Medium' ? 'MEDIUM' : 'LOW';
  
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
 * Determine urgency level based on symptom keywords
 */
/**
 * Advanced urgency level determination using comprehensive medical knowledge
 */
function determineUrgencyLevel(symptoms: string): 'LOW' | 'MEDIUM' | 'HIGH' {
  const symptomsLower = symptoms.toLowerCase();
  
  // CRITICAL/HIGH urgency - life-threatening conditions
  const criticalPatterns = [
    // Cardiac emergencies
    ['chest pain', 'radiating'],
    ['chest pain', 'left arm'],
    ['chest pain', 'jaw'],
    ['chest pain', 'nausea'],
    ['chest pain', 'sweating'],
    ['heart attack'],
    ['cardiac arrest'],
    
    // Neurological emergencies
    ['stroke'],
    ['sudden weakness'],
    ['facial drooping'],
    ['slurred speech'],
    ['worst headache'],
    ['thunderclap headache'],
    ['seizure'],
    
    // Respiratory emergencies
    ['cannot breathe'],
    ['respiratory distress'],
    ['severe shortness of breath'],
    
    // Trauma/bleeding
    ['severe bleeding'],
    ['massive bleeding'],
    ['unconscious'],
    ['unresponsive'],
    
    // Anaphylaxis
    ['anaphylaxis'],
    ['severe allergic reaction', 'breathing'],
    
    // Other critical conditions
    ['appendicitis'],
    ['pancreatitis'],
    ['kidney stone', 'severe pain']
  ];
  
  // Check for critical patterns first
  const hasCriticalPattern = criticalPatterns.some(pattern =>
    pattern.every(symptom => symptomsLower.includes(symptom))
  );
  
  if (hasCriticalPattern) {
    return 'HIGH';
  }
  
  // Individual critical keywords
  const criticalKeywords = [
    'unconscious', 'unresponsive', 'collapse', 'cardiac arrest',
    'respiratory arrest', 'anaphylaxis', 'stroke', 'heart attack',
    'severe bleeding', 'massive trauma', 'cannot breathe',
    'worst headache of life', 'thunderclap', 'sudden onset',
    'severe', 'extreme', 'unbearable', 'life threatening'
  ];
  
  if (criticalKeywords.some(keyword => symptomsLower.includes(keyword))) {
    return 'HIGH';
  }
  
  // HIGH urgency single symptoms
  const highUrgencyKeywords = [
    'chest pain', 'shortness of breath', 'difficulty breathing',
    'severe pain', 'intense pain', 'crushing pain',
    'palpitations', 'irregular heartbeat', 'rapid heart rate',
    'dizziness', 'fainting', 'syncope', 'seizure',
    'severe headache', 'sudden headache', 'blood in urine',
    'blood in stool', 'severe vomiting', 'severe nausea',
    'high fever', 'severe fever', 'unable to urinate',
    'severe abdominal pain', 'kidney stone'
  ];
  
  if (highUrgencyKeywords.some(keyword => symptomsLower.includes(keyword))) {
    return 'HIGH';
  }
  
  // MEDIUM urgency keywords
  const mediumUrgencyKeywords = [
    'fever', 'cough', 'persistent cough', 'headache', 'nausea',
    'vomiting', 'diarrhea', 'abdominal pain', 'back pain',
    'joint pain', 'muscle pain', 'sore throat', 'ear pain',
    'eye pain', 'breathing issues', 'mild shortness',
    'fatigue', 'weakness', 'rash', 'swelling', 'infection'
  ];

  if (mediumUrgencyKeywords.some(keyword => symptomsLower.includes(keyword))) {
    return 'MEDIUM';
  }
  
  // Default to LOW for routine/minor symptoms
  return 'LOW';
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
    }    // Parse request body
    const body = await request.json();
    const { patientId, symptoms, urgency } = body;

    // Validate required fields
    if (!symptoms || typeof symptoms !== 'string' || symptoms.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Symptoms are required and must be a non-empty string' 
      }, { status: 400 });    }

    // Step 1: Try external AI/ML service, fallback to local analysis
    const aiSuggestion = await callExternalAIService(
      symptoms,
      undefined, // patientAge - to be fetched from patient record
      urgency,   // urgency from dropdown selection
      [],        // medicalHistory - to be fetched from patient record  
      undefined  // patientGender - to be fetched from patient record
    ) || localSymptomAnalysis(symptoms);

    // Step 2: Get available providers for the clinic// Get clinicId from session (now properly included after TokenUtil fix)
    const clinicId = session.user.clinicId;
    
    if (!clinicId) {
      return NextResponse.json({
        error: 'User has no assigned clinic. Please contact support.'
      }, { status: 400 });
    }
      const providers = await usersDataAccess.getProvidersForTriage({
      clinicId: clinicId,
      roles: [UserRole.DOCTOR, UserRole.NURSE, UserRole.PHARMACIST]
    });

    if (providers.length === 0) {
      return NextResponse.json({
        error: 'No available providers found for your clinic'
      }, { status: 404 });
    }

    // Step 3: Generate provider recommendations
    const topRecommendations = generateProviderRecommendations(providers, symptoms, aiSuggestion, urgency);

    // Step 4: Determine suggested urgency
    const suggestedUrgency = aiSuggestion.severity === 'High' ? 'HIGH' : 
                           aiSuggestion.severity === 'Medium' ? 'MEDIUM' : 'LOW';

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
      }    });

    // Prepare response data
    const responseData = {
      data: {
        providers: topRecommendations,        suggestedUrgency,
        analysis
      }
    };

    // Step 7: Return the response
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('[AI Triage] Error generating suggestions:', error);
    return NextResponse.json({ 
      error: 'Failed to generate AI suggestions. Please try again.'
    }, { status: 500 });
  }
}
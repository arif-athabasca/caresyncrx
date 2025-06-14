/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * API endpoint for generating AI-based triage suggestions
 * This endpoint analyzes symptoms and returns recommended providers
 * based on expertise, availability, and patient needs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@/enums';
import { getSession } from '@/auth/services/utils/session-utils';
import { usersDataAccess } from '@/shared/services/data/UsersDataAccess';

/**
 * Call external AI triage service
 */
async function callExternalAIService(symptoms: string): Promise<{
  severity: string;
  recommendedProvider: string;
  reasoning: string;
}> {
  try {
    // Replace with your actual AI service endpoint
    const AI_SERVICE_URL = process.env.AI_TRIAGE_SERVICE_URL || 'http://localhost:8080/api/triage/analyze';
    
    const response = await fetch(AI_SERVICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AI_SERVICE_API_KEY}`,
      },
      body: JSON.stringify({ symptoms }),
    });
    
    if (!response.ok) {
      throw new Error(`AI service responded with status: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Parse the AI response - adjust based on your AI service format
    return {
      severity: result.severity || 'Moderate',
      recommendedProvider: result.recommended_provider || 'Nurse Practitioner',
      reasoning: result.reasoning || 'The symptoms require medical evaluation.'
    };
  } catch (error) {
    console.error('Error calling AI service:', error);
    // Fallback to local analysis if AI service fails
    return localSymptomAnalysis(symptoms);
  }
}

/**
 * Local fallback analysis
 */
function localSymptomAnalysis(symptoms: string): {
  severity: string;
  recommendedProvider: string;
  reasoning: string;
} {
  const symptomsLower = symptoms.toLowerCase();
  
  if (symptomsLower.includes('chest pain') || symptomsLower.includes('difficulty breathing') || 
      symptomsLower.includes('severe') || symptomsLower.includes('emergency')) {
    return {
      severity: 'Severe',
      recommendedProvider: 'Physician',
      reasoning: 'The symptoms suggest a potentially serious condition needing immediate care.'
    };
  } else if (symptomsLower.includes('fever') || symptomsLower.includes('infection') || 
             symptomsLower.includes('moderate') || symptomsLower.includes('persistent')) {
    return {
      severity: 'Moderate',
      recommendedProvider: 'Nurse Practitioner',
      reasoning: 'The symptoms suggest a condition that may need prescription medication.'
    };
  } else {
    return {
      severity: 'Minor',
      recommendedProvider: 'Pharmacist',
      reasoning: 'The symptoms appear mild and can likely be managed over-the-counter.'
    };
  }
}

/**
 * POST handler for generating AI suggestions for triage
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    // Check if user is authenticated and has appropriate role
    if (!session || !session.user || 
        ![UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.DOCTOR].includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const body = await request.json();
    const { patientId, symptoms } = body;
    
    // Validate required fields
    if (!symptoms || symptoms.length < 10) {
      return NextResponse.json({ error: 'Please provide detailed symptoms' }, { status: 400 });
    }

    // Call AI service for analysis
    const aiAnalysis = await callExternalAIService(symptoms);
    
    console.log(`🧠 AI Analysis result:`, aiAnalysis);
    console.log(`🔍 Searching for symptoms: "${symptoms}"`);
    console.log(`📍 Clinic ID: ${session.user.clinicId}`);
    
    // Get patient info if patientId provided
    let patientInfo = null;
    if (patientId) {
      patientInfo = await prisma.patient.findUnique({
        where: { id: patientId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true
        }
      });
      console.log(`👤 Patient info:`, patientInfo);
    }

    // Get available providers with their specialties and current workload using optimized data access
    const providers = await usersDataAccess.getProvidersForTriage({
      clinicId: session.user.clinicId,
      roles: [UserRole.DOCTOR, UserRole.NURSE, UserRole.PHARMACIST] // Exclude CAREGIVER role
    });
    
    console.log(`👥 Found ${providers.length} providers in clinic ${session.user.clinicId}`);
    
    // Parse symptoms and determine keyword matches
    const symptomLowerCase = symptoms.toLowerCase();
    
    // Enhanced keyword matching for better accuracy
    const urgencies = {
      high: ['chest pain', 'shortness of breath', 'difficulty breathing', 'severe', 'extreme', 'intense', 'dizzy', 'cannot breathe', 'breathing problems'],
      medium: ['fever', 'cough', 'persistent', 'headache', 'nausea', 'vomiting', 'breathing issues', 'mild shortness'],
      low: ['mild', 'slight', 'occasional', 'minor']
    };
    
    const specialties = {
      cardiology: ['chest pain', 'heart', 'palpitation', 'blood pressure', 'cardiac'],
      pulmonary: ['cough', 'breathing', 'lung', 'respiratory', 'shortness of breath', 'difficulty breathing', 'breath'],
      emergency: ['severe', 'extreme', 'emergency', 'urgent', 'critical', 'acute'],
      neurology: ['headache', 'migraine', 'dizziness', 'numbness'],
      general: ['fever', 'cold', 'flu']
    };

    // Determine urgency based on keywords
    let suggestedUrgency = 'MEDIUM'; // default
    
    const hasHighUrgencyKeywords = urgencies.high.some(keyword => symptomLowerCase.includes(keyword));
    const hasLowUrgencyKeywords = urgencies.low.some(keyword => symptomLowerCase.includes(keyword));
    const hasMediumUrgencyKeywords = urgencies.medium.some(keyword => symptomLowerCase.includes(keyword));
    
    if (hasHighUrgencyKeywords) {
      suggestedUrgency = 'HIGH';
    } else if (hasLowUrgencyKeywords && !hasMediumUrgencyKeywords) {
      suggestedUrgency = 'LOW';
    } else {
      suggestedUrgency = 'MEDIUM';
    }    // IMPROVED SCORING ALGORITHM - Uses multiplicative factors instead of additive
    const providerRecommendations = providers.map(provider => {
      console.log(`\n🔍 Evaluating provider: ${provider.firstName} ${provider.lastName} (${provider.role})`);
      
      // Start with base scoring components
      let baseScore = 30; // Lower base to prevent inflation
      let specialtyMultiplier = 1.0;
      let roleMultiplier = 1.0;
      let availabilityMultiplier = 1.0;
      let workloadMultiplier = 1.0;
      let matchReason = '';
      
      console.log(`   📊 Starting base score: ${baseScore}%`);
      
      // === WORKLOAD ANALYSIS ===
      const currentWorkload = provider.workload.assignedTriages;
      const utilizationRate = provider.workload.utilizationRate; // Already a percentage (0-100)
      const availableSlots = provider.workload.availableSlots;
      
      console.log(`   👥 Workload: ${currentWorkload} triages, ${utilizationRate}% utilization, ${availableSlots} slots`);
      
      // Workload multiplier (lower utilization = higher score)
      if (utilizationRate > 80) {
        workloadMultiplier = 0.6; // Major penalty for overworked providers
        matchReason += 'Provider has very high workload. ';
      } else if (utilizationRate > 60) {
        workloadMultiplier = 0.75;
        matchReason += 'Provider has high workload. ';
      } else if (utilizationRate > 40) {
        workloadMultiplier = 0.9;
        matchReason += 'Provider has moderate workload. ';
      } else if (utilizationRate > 20) {
        workloadMultiplier = 1.1;
        matchReason += 'Provider has good availability. ';
      } else {
        workloadMultiplier = 1.3;
        matchReason += 'Provider has excellent availability. ';
      }
      
      // Availability slots bonus
      if (availableSlots > 5) {
        availabilityMultiplier = 1.2;
        matchReason += 'Many available slots. ';
      } else if (availableSlots > 2) {
        availabilityMultiplier = 1.1;
        matchReason += 'Available slots today. ';
      } else if (availableSlots > 0) {
        availabilityMultiplier = 1.05;
        matchReason += 'Limited slots available. ';
      } else {
        availabilityMultiplier = 0.8;
        matchReason += 'No immediate slots. ';
      }
      
      // === SPECIALTY MATCHING ===
      let hasSpecialtyMatch = false;
      if (provider.specialties && provider.specialties.length > 0) {
        for (const specialty of provider.specialties) {
          const specialtyLower = specialty.specialty.toLowerCase();
          
          // Cardiology matching
          if (specialtyLower.includes('cardiology') || specialtyLower.includes('cardiac')) {
            if (symptomLowerCase.includes('chest pain') || 
                symptomLowerCase.includes('heart') || 
                symptomLowerCase.includes('palpitation')) {
              specialtyMultiplier = Math.max(specialtyMultiplier, 1.8); // Strong match
              matchReason += `Excellent match: ${specialty.specialty} for cardiac symptoms. `;
              hasSpecialtyMatch = true;
            } else {
              specialtyMultiplier = Math.max(specialtyMultiplier, 1.2);
              matchReason += `${specialty.specialty} specialist available. `;
            }
          }
          
          // Pulmonary/Respiratory matching
          else if (specialtyLower.includes('pulmonary') || specialtyLower.includes('respiratory')) {
            if (symptomLowerCase.includes('cough') || 
                symptomLowerCase.includes('breathing') || 
                symptomLowerCase.includes('shortness of breath') ||
                symptomLowerCase.includes('lung')) {
              specialtyMultiplier = Math.max(specialtyMultiplier, 1.7);
              matchReason += `Excellent match: ${specialty.specialty} for respiratory symptoms. `;
              hasSpecialtyMatch = true;
            } else {
              specialtyMultiplier = Math.max(specialtyMultiplier, 1.2);
              matchReason += `${specialty.specialty} specialist available. `;
            }
          }
          
          // General Medicine
          else if (specialtyLower.includes('general medicine') || specialtyLower.includes('family practice')) {
            if (symptomLowerCase.includes('shortness of breath') || 
                symptomLowerCase.includes('breathing') ||
                symptomLowerCase.includes('cough')) {
              specialtyMultiplier = Math.max(specialtyMultiplier, 1.4);
              matchReason += `Good match: ${specialty.specialty} can handle these symptoms. `;
              hasSpecialtyMatch = true;
            } else {
              specialtyMultiplier = Math.max(specialtyMultiplier, 1.3);
              matchReason += `${specialty.specialty} provides broad coverage. `;
            }
          }
          
          // Emergency Medicine
          else if (specialtyLower.includes('emergency') || specialtyLower.includes('urgent')) {
            if (suggestedUrgency === 'HIGH') {
              specialtyMultiplier = Math.max(specialtyMultiplier, 1.9);
              matchReason += `Perfect for high-urgency cases. `;
              hasSpecialtyMatch = true;
            } else {
              specialtyMultiplier = Math.max(specialtyMultiplier, 1.3);
              matchReason += `Emergency expertise available. `;
            }
          }
          
          // Other specialties
          else {
            specialtyMultiplier = Math.max(specialtyMultiplier, 1.1);
            matchReason += `${specialty.specialty} specialist. `;
          }
          
          // Check specific expertise
          if (specialty.expertise && specialty.expertise.length > 0) {
            for (const expertise of specialty.expertise) {
              const expertiseLower = expertise.toLowerCase();
              
              if ((expertiseLower.includes('respiratory') || expertiseLower.includes('breathing')) &&
                  (symptomLowerCase.includes('shortness of breath') || 
                   symptomLowerCase.includes('breathing') ||
                   symptomLowerCase.includes('breath'))) {
                specialtyMultiplier = Math.max(specialtyMultiplier, 1.6);
                matchReason += `Specific expertise in ${expertise}. `;
                hasSpecialtyMatch = true;
              } else if (symptomLowerCase.includes(expertiseLower)) {
                specialtyMultiplier = Math.max(specialtyMultiplier, 1.4);
                matchReason += `Expert in ${expertise}. `;
                hasSpecialtyMatch = true;
              }
            }
          }
        }
      } else {
        matchReason += 'General practitioner. ';
      }
      
      // === ROLE-BASED SCORING ===
      switch (provider.role) {
        case UserRole.DOCTOR:
          roleMultiplier = 1.4;
          if (suggestedUrgency === 'HIGH') {
            roleMultiplier = 1.6;
            matchReason += 'Doctor ideal for high-urgency cases. ';
          } else {
            matchReason += 'Doctor provides comprehensive care. ';
          }
          break;
          
        case UserRole.NURSE:
          roleMultiplier = 1.1;
          if (suggestedUrgency === 'MEDIUM' || suggestedUrgency === 'LOW') {
            roleMultiplier = 1.3;
            matchReason += 'Nurse practitioner suitable for routine cases. ';
          } else {
            matchReason += 'Nurse practitioner available. ';
          }
          break;
          
        case UserRole.PHARMACIST:
          // Check for medication-related keywords
          if (symptomLowerCase.includes('medication') || 
              symptomLowerCase.includes('drug') || 
              symptomLowerCase.includes('prescription') ||
              symptomLowerCase.includes('side effect') ||
              symptomLowerCase.includes('dosage') ||
              symptomLowerCase.includes('interaction')) {
            roleMultiplier = 1.8; // High bonus for medication queries
            matchReason += 'Pharmacist perfect for medication concerns. ';
          } else {
            roleMultiplier = 0.7; // Lower for non-medication issues
            matchReason += 'Pharmacist available for consultation. ';
          }
          break;
      }
      
      // Calculate final score using multiplicative approach
      let finalScore = baseScore * specialtyMultiplier * roleMultiplier * availabilityMultiplier * workloadMultiplier;
      
      // Apply urgency bonuses
      if (suggestedUrgency === 'HIGH' && provider.role === UserRole.DOCTOR) {
        finalScore *= 1.2;
      } else if (suggestedUrgency === 'LOW' && provider.role === UserRole.NURSE) {
        finalScore *= 1.1;
      }
      
      // Cap the score at a reasonable maximum (85% instead of 95% to allow for differentiation)
      finalScore = Math.min(85, Math.max(15, finalScore));
      
      console.log(`   🎯 Final calculation: ${baseScore} × ${specialtyMultiplier.toFixed(2)} × ${roleMultiplier.toFixed(2)} × ${availabilityMultiplier.toFixed(2)} × ${workloadMultiplier.toFixed(2)} = ${finalScore.toFixed(1)}%`);
      
      // Calculate next available appointment
      let nextAvailable = null;
      if (availableSlots > 0) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        nextAvailable = tomorrow;
      } else {
        // Find next available day based on provider availability
        const today = new Date();
        const dayOfWeek = today.getDay();
        const nextDays = Array.from({length: 7}, (_, i) => (dayOfWeek + i + 1) % 7);
        const nextAvailableDay = nextDays.find(day => 
          provider.availability.some(avail => avail.dayOfWeek === day && avail.isAvailable)
        );
        
        if (nextAvailableDay !== undefined) {
          const daysToAdd = nextAvailableDay > dayOfWeek ? 
            nextAvailableDay - dayOfWeek : 
            7 - dayOfWeek + nextAvailableDay;
          const nextDate = new Date(today);
          nextDate.setDate(today.getDate() + daysToAdd);
          nextAvailable = nextDate;
        }
      }
        return {
        id: provider.id,
        name: `${provider.firstName} ${provider.lastName}`,
        role: provider.role,
        specialty: provider.specialties && provider.specialties[0] 
          ? provider.specialties[0].specialty 
          : 'General Practice',
        confidence: Math.round(finalScore),
        reason: matchReason.trim(),
        nextAvailable: nextAvailable ? nextAvailable.toISOString() : null,
        currentWorkload: currentWorkload,
        availableSlots: availableSlots,
        // Additional debugging info
        _debug: {
          baseScore,
          specialtyMultiplier,
          roleMultiplier,
          availabilityMultiplier,
          workloadMultiplier,
          hasSpecialtyMatch
        }
      };
    });
    
    // Sort by confidence score descending
    providerRecommendations.sort((a, b) => b.confidence - a.confidence);
    
    // Take top 3 recommendations
    const topRecommendations = providerRecommendations.slice(0, 3);
    
    console.log(`\n📋 Final recommendations (top 3):`);
    topRecommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec.name} (${rec.role}) - ${rec.confidence}% confidence`);
      console.log(`   Specialty: ${rec.specialty}`);
      console.log(`   Reason: ${rec.reason}`);
      console.log(`   Workload: ${rec.currentWorkload}, Slots: ${rec.availableSlots}`);
    });
    
    console.log(`\n🎯 Suggested urgency: ${suggestedUrgency}`);
    
    // Generate analysis text
    let analysis = 'Based on the symptoms provided, ';
    if (suggestedUrgency === 'HIGH') {
      analysis += 'this appears to be a situation requiring prompt medical attention. ';
    } else if (suggestedUrgency === 'MEDIUM') {
      analysis += 'this requires medical evaluation but is not immediately urgent. ';
    } else {
      analysis += 'this appears to be a minor concern that should be addressed at your convenience. ';
    }
    
    // Add symptom analysis based on keywords found
    if (symptomLowerCase.includes('chest pain') || symptomLowerCase.includes('shortness of breath')) {
      analysis += 'The chest pain and breathing difficulties could indicate cardiovascular issues. ';
    } else if (symptomLowerCase.includes('headache') || symptomLowerCase.includes('dizzy')) {
      analysis += 'The headache and dizziness symptoms might suggest neurological concerns. ';
    } else if (symptomLowerCase.includes('cough') || symptomLowerCase.includes('fever')) {
      analysis += 'The cough and fever symptoms could indicate a respiratory infection. ';
    }
    
    // Add recommendation summary
    if (topRecommendations.length > 0) {
      analysis += `Based on provider expertise and availability, ${topRecommendations[0].name} (${topRecommendations[0].specialty}) appears to be the most suitable provider for this case.`;
    }
    
    // Construct the response
    const aiSuggestion = {
      providers: topRecommendations.map(rec => {
        // Remove debug info from response
        const { _debug, ...cleanRec } = rec;
        return cleanRec;
      }),
      suggestedUrgency,
      analysis
    };
      // Log this AI suggestion
    await prisma.securityAuditLog.create({
      data: {
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        eventType: 'AI_TRIAGE_SUGGESTION',
        severity: 'INFO',
        userId: session.user.id,
        username: session.user.email,
        description: 'AI triage suggestion generated',
        metadata: JSON.stringify({
          patientId,
          symptomsLength: symptoms.length,
          suggestedUrgency,
          providerCount: topRecommendations.length
        })
      }
    });
    
    return NextResponse.json({ data: aiSuggestion });
  } catch (error) {
    console.error('Error generating AI triage suggestion:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

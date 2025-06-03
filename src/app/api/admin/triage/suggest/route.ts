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
import { UserRole } from '@/auth';
import { getSession } from '@/auth/services/utils/session-utils';

/**
 * POST handler for generating AI suggestions for triage
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    // Check if user is authenticated and has admin role
    if (!session || !session.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const body = await request.json();
    const { patientId, symptoms } = body;
    
    // Validate required fields
    if (!symptoms || symptoms.length < 10) {
      return NextResponse.json({ error: 'Please provide detailed symptoms' }, { status: 400 });
    }
    
    // In a real implementation, this would call an AI service
    // For now, we simulate a delay and return mock data
    await new Promise(resolve => setTimeout(resolve, 1500));
    
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
    }
    
    // Get available providers with their specialties
    const providers = await prisma.user.findMany({      where: {
        role: { in: [UserRole.DOCTOR, UserRole.NURSE, UserRole.PHARMACIST] },
        clinicId: session.user.clinicId
      },
      include: {
        specialties: true
      }
    });
    
    // Parse symptoms and determine keyword matches
    // In a real implementation, this would use natural language processing and medical knowledge
    const symptomLowerCase = symptoms.toLowerCase();
    
    // Simple keyword matching for demo purposes
    const urgencies = {
      high: ['chest pain', 'shortness of breath', 'difficulty breathing', 'severe', 'extreme', 'intense', 'dizzy'],
      medium: ['fever', 'cough', 'persistent', 'headache', 'nausea', 'vomiting'],
      low: ['mild', 'slight', 'occasional', 'minor']
    };
    
    const specialties = {
      cardiology: ['chest pain', 'heart', 'palpitation', 'blood pressure'],
      pulmonary: ['cough', 'breathing', 'lung', 'respiratory'],
      neurology: ['headache', 'migraine', 'dizziness', 'numbness'],
      general: ['fever', 'cold', 'flu']
    };
    
    // Determine urgency based on keywords
    let suggestedUrgency = 'MEDIUM'; // default
    if (Object.entries(urgencies.high).some(keyword => symptomLowerCase.includes(keyword))) {
      suggestedUrgency = 'HIGH';
    } else if (Object.entries(urgencies.low).every(keyword => !symptomLowerCase.includes(keyword)) && 
              Object.entries(urgencies.medium).some(keyword => symptomLowerCase.includes(keyword))) {
      suggestedUrgency = 'MEDIUM';
    } else {
      suggestedUrgency = 'LOW';
    }
    
    // Generate provider recommendations
    const providerRecommendations = providers.map(provider => {
      // Calculate a confidence score based on specialty match
      let confidence = 50; // base confidence
      let matchReason = '';
        // Check specialties against symptoms
      if (provider.specialties && provider.specialties.length > 0) {
        for (const specialty of provider.specialties) {
          const specialtyLower = specialty.specialty.toLowerCase();
          
          // Boost confidence based on specialty match
          if (specialtyLower === 'cardiology' && 
              Object.entries(specialties.cardiology).some(keyword => symptomLowerCase.includes(keyword))) {
            confidence += 40;
            matchReason = 'Symptoms suggest possible cardiovascular issue matching provider specialty';
          } else if (specialtyLower === 'pulmonary' && 
                    Object.entries(specialties.pulmonary).some(keyword => symptomLowerCase.includes(keyword))) {
            confidence += 35;
            matchReason = 'Respiratory symptoms detected matching provider expertise';
          } else if (specialtyLower === 'neurology' && 
                    Object.entries(specialties.neurology).some(keyword => symptomLowerCase.includes(keyword))) {
            confidence += 30;
            matchReason = 'Neurological symptoms detected matching provider specialty';
          } else {
            confidence += 10;
            matchReason = 'General provider with relevant medical expertise';
          }
          
          // Check expertise fields for additional matches
          if (specialty.expertise && specialty.expertise.length > 0) {
            for (const expertise of specialty.expertise) {
              if (symptomLowerCase.includes(expertise.toLowerCase())) {
                confidence += 15;
                matchReason += `. Provider has specific expertise in ${expertise}`;
              }
            }
          }
        }
      } else {
        // Default reason for providers without specialties
        matchReason = 'General provider available for initial assessment';
      }
      
      // Role-based adjustments
      switch (provider.role) {
        case UserRole.DOCTOR:
          confidence += 15;
          break;
        case UserRole.NURSE:
          // Nurses are good for initial triage
          confidence += 5;
          break;
        case UserRole.PHARMACIST:
          // Pharmacists are more relevant for medication issues
          if (symptomLowerCase.includes('medication') || 
              symptomLowerCase.includes('drug') || 
              symptomLowerCase.includes('prescription')) {
            confidence += 25;
            matchReason += '. Provider has pharmaceutical expertise for medication-related issues';
          } else {
            confidence -= 10; // Less relevant for non-medication issues
          }
          break;
      }
      
      // Cap confidence at 99%
      confidence = Math.min(99, Math.max(50, confidence));
      
      // Random availability for demo purposes
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const hours = Math.floor(Math.random() * 8) + 9; // 9 AM to 5 PM
      const minutes = Math.random() > 0.5 ? '00' : '30';
      const nextAvailable = `${tomorrow.toISOString().split('T')[0]} ${hours}:${minutes} ${hours >= 12 ? 'PM' : 'AM'}`;
      
      return {        id: provider.id,
        name: provider.email.split('@')[0], // Use email as name for demo
        role: provider.role,
        specialty: provider.specialties && provider.specialties[0] 
          ? provider.specialties[0].specialty 
          : 'General',
        confidence: Math.round(confidence),
        reason: matchReason,
        nextAvailable
      };
    });
    
    // Sort by confidence score descending
    providerRecommendations.sort((a, b) => b.confidence - a.confidence);
    
    // Take top 3 recommendations
    const topRecommendations = providerRecommendations.slice(0, 3);
    
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
      providers: topRecommendations,
      suggestedUrgency,
      analysis
    };
    
    // Log this AI suggestion
    await prisma.securityAuditLog.create({
      data: {
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

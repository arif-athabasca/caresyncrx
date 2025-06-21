/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * API endpoint for doctor prescription management with AI drug interaction checking
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { UserRole } from '@/auth';
import { randomUUID } from 'crypto';
import { getSession } from '@/auth/services/utils/session-utils';

/**
 * GET handler for fetching doctor's prescriptions
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !session.user || session.user.role !== UserRole.DOCTOR) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const patientId = searchParams.get('patientId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    // Build where conditions
    const whereConditions: any = {
      prescribedBy: session.user.id
    };

    if (patientId) {
      whereConditions.patientId = patientId;
    }

    if (status) {
      whereConditions.status = status;
    }

    if (search) {
      whereConditions.OR = [
        { drugName: { contains: search, mode: 'insensitive' } },
        { Patient: {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } }
          ]
        }}
      ];
    }

    // Fetch prescriptions with related data
    const prescriptions = await prisma.prescription.findMany({
      where: whereConditions,
      include: {
        Patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            dateOfBirth: true,
            allergies: true,
            currentMedications: true
          }
        },
        User: {
          select: {
            id: true,
            email: true
          }
        }
      },
      orderBy: { issueDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    // Get total count
    const totalPrescriptions = await prisma.prescription.count({
      where: whereConditions
    });

    // Calculate summary statistics
    const [activeCount, pendingCount, completedCount] = await Promise.all([
      prisma.prescription.count({
        where: { ...whereConditions, status: 'ACTIVE' }
      }),
      prisma.prescription.count({
        where: { ...whereConditions, status: 'PENDING' }
      }),
      prisma.prescription.count({
        where: { ...whereConditions, status: 'COMPLETED' }
      })
    ]);

    // Process prescriptions with AI insights
    const processedPrescriptions = await Promise.all(
      prescriptions.map(async (prescription) => {        // Check for drug interactions with patient's current medications
        const interactions = await checkDrugInteractions(
          prescription.drugName,
          prescription.Patient.currentMedications || []
        );

        // Check allergies
        const allergyRisk = checkAllergyRisk(
          prescription.drugName,
          prescription.Patient.allergies || []
        );

        // Calculate patient age for dosing considerations
        const age = prescription.Patient.dateOfBirth ? 
          Math.floor((Date.now() - new Date(prescription.Patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;

        // Assess prescription safety
        const safetyAssessment = assessPrescriptionSafety(prescription, interactions, allergyRisk, age);        return {
          id: prescription.id,
          patientId: prescription.patientId,
          medicationName: prescription.drugName,
          dosage: prescription.dosage,
          frequency: prescription.dosage, // Using dosage field as frequency placeholder
          duration: prescription.dosage, // Using dosage field as duration placeholder
          instructions: prescription.drugName, // Using drugName as instructions placeholder
          status: prescription.status,
          refillsAllowed: 0, // No refills field in schema
          refillsUsed: 0, // No refills field in schema
          issueDate: prescription.issueDate,
          refillDate: prescription.refillDate,
          expiresAt: null, // No expiry field in schema

          // Patient information
          patient: {
            id: prescription.Patient.id,
            name: `${prescription.Patient.firstName} ${prescription.Patient.lastName}`,
            firstName: prescription.Patient.firstName,
            lastName: prescription.Patient.lastName,
            email: prescription.Patient.email,
            phone: prescription.Patient.phone,
            age,
            allergies: prescription.Patient.allergies,
            currentMedications: prescription.Patient.currentMedications
          },

          // Safety information
          safety: {
            interactions,
            allergyRisk,
            safetyScore: safetyAssessment.score,
            warnings: safetyAssessment.warnings,
            recommendations: safetyAssessment.recommendations
          },          // Prescription metadata (simplified for schema compatibility)
          metadata: {
            daysRemaining: null, // No expiry field in schema
            isExpired: false,
            refillsRemaining: 0, // No refills field in schema
            canRefill: false // No refills field in schema
          }
        };
      })
    );    // Group prescriptions by status for better organization
    const groupedPrescriptions = {
      active: processedPrescriptions.filter(p => p.status === 'ACTIVE'),
      completed: processedPrescriptions.filter(p => p.status === 'COMPLETED'),      cancelled: processedPrescriptions.filter(p => p.status === 'CANCELLED'),
      onHold: processedPrescriptions.filter(p => p.status === 'ON_HOLD'),
      needsAttention: processedPrescriptions.filter(p => 
        p.safety.warnings.length > 0 || p.safety.interactions.length > 0
      )
    };

    return NextResponse.json({
      success: true,
      data: {
        prescriptions: processedPrescriptions,
        grouped: groupedPrescriptions,
        pagination: {
          page,
          limit,
          total: totalPrescriptions,
          pages: Math.ceil(totalPrescriptions / limit)
        },
        summary: {
          total: totalPrescriptions,
          active: activeCount,
          pending: pendingCount,
          completed: completedCount,
          needsAttention: groupedPrescriptions.needsAttention.length,
          expiringSoon: processedPrescriptions.filter(p => 
            p.metadata.daysRemaining !== null && p.metadata.daysRemaining <= 7
          ).length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

/**
 * POST handler for creating new prescriptions
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !session.user || session.user.role !== UserRole.DOCTOR) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();    const {
      patientId,
      medicationName,
      dosage,
      frequency,
      duration,
      instructions,
      refillsAllowed = 0
    } = body;

    // Validate required fields
    if (!patientId || !medicationName || !dosage) {
      return NextResponse.json({ 
        error: 'Patient ID, medication name, and dosage are required' 
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
      select: {
        id: true,
        firstName: true,
        lastName: true,
        allergies: true,
        currentMedications: true,
        dateOfBirth: true
      }
    });

    if (!patient) {
      return NextResponse.json({ 
        error: 'Patient not found or access denied' 
      }, { status: 404 });
    }

    // Check for drug interactions and allergies
    const interactions = await checkDrugInteractions(
      medicationName,
      patient.currentMedications || []
    );

    const allergyRisk = checkAllergyRisk(
      medicationName,
      patient.allergies || []
    );

    // Safety validation
    if (allergyRisk.isAllergic) {
      return NextResponse.json({ 
        error: 'Cannot prescribe medication due to known patient allergy',
        details: allergyRisk
      }, { status: 400 });
    }

    if (interactions.some(i => i.severity === 'contraindicated')) {
      return NextResponse.json({ 
        error: 'Cannot prescribe medication due to contraindicated drug interaction',
        details: interactions.filter(i => i.severity === 'contraindicated')
      }, { status: 400 });
    }

    // Calculate expiration date (typically 1 year from prescription date)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);    // Create prescription (using schema-compliant fields)
    const prescription = await prisma.prescription.create({
      data: {
        id: randomUUID(),
        patientId,
        userId: session.user.id,
        drugName: medicationName,
        dosage,
        status: 'ACTIVE', // Using valid enum value
        issueDate: new Date(),
        refillDate: null
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
        userId: session.user.id,        action: 'CREATE_PRESCRIPTION',
        resourceId: prescription.id,
        details: {
          patientId,
          medicationName,
          dosage,
          interactions: interactions.length > 0 ? interactions : undefined,
          warnings: allergyRisk.warnings.length > 0 ? allergyRisk.warnings : undefined
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date()
      }
    });

    // Generate AI analysis for the prescription
    const aiAnalysis = await generatePrescriptionAIAnalysis(prescription, patient, interactions, allergyRisk);

    return NextResponse.json({
      success: true,
      data: {
        prescription,
        aiAnalysis,
        safety: {
          interactions,
          allergyRisk,
          warnings: aiAnalysis.warnings
        }
      },
      message: 'Prescription created successfully'
    });

  } catch (error) {
    console.error('Error creating prescription:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

/**
 * Check for drug interactions
 */
async function checkDrugInteractions(newMedication: string, currentMedications: string[]): Promise<any[]> {
  // This is a simplified implementation
  // In production, integrate with a comprehensive drug interaction database
  
  const interactions: any[] = [];
  
  // Basic interaction patterns (expand with real database)
  const interactionPatterns = {
    'warfarin': ['aspirin', 'ibuprofen', 'naproxen'],
    'metformin': ['contrast dye'],
    'digoxin': ['furosemide', 'spironolactone'],
    'simvastatin': ['gemfibrozil', 'cyclosporine']
  };

  const newMedLower = newMedication.toLowerCase();
    for (const currentMed of currentMedications) {
    const currentMedLower = currentMed.toLowerCase();
    
    // Check for known interactions using safe property access
    const hasInteraction = Object.entries(interactionPatterns).some(([mainDrug, interactingDrugs]) => {
      return (newMedLower.includes(mainDrug.toLowerCase()) && interactingDrugs.some(drug => currentMedLower.includes(drug.toLowerCase()))) ||
             (currentMedLower.includes(mainDrug.toLowerCase()) && interactingDrugs.some(drug => newMedLower.includes(drug.toLowerCase())));
    });
    
    if (hasInteraction) {
      
      interactions.push({
        medication1: newMedication,
        medication2: currentMed,
        severity: 'moderate',
        description: `Potential interaction between ${newMedication} and ${currentMed}`,
        recommendation: 'Monitor patient closely and consider alternative therapy'
      });
    }
  }

  return interactions;
}

/**
 * Check for allergy risks
 */
function checkAllergyRisk(medication: string, allergies: string[]): any {
  const medicationLower = medication.toLowerCase();
  const allergyRisk = {
    isAllergic: false,
    warnings: [] as string[],
    crossReactions: [] as string[]
  };

  for (const allergy of allergies) {
    const allergyLower = allergy.toLowerCase();
    
    // Direct allergy match
    if (medicationLower.includes(allergyLower) || allergyLower.includes(medicationLower)) {
      allergyRisk.isAllergic = true;
      allergyRisk.warnings.push(`Patient is allergic to ${allergy}`);
    }
    
    // Cross-reactivity patterns (simplified)
    const crossReactionPatterns = {
      'penicillin': ['amoxicillin', 'ampicillin'],
      'sulfa': ['sulfamethoxazole', 'sulfadiazine'],
      'aspirin': ['ibuprofen', 'naproxen']
    };
    
    for (const [allergen, crossReactive] of Object.entries(crossReactionPatterns)) {
      if (allergyLower.includes(allergen) && crossReactive.some(med => medicationLower.includes(med))) {
        allergyRisk.warnings.push(`Potential cross-reaction with ${allergy} allergy`);
        allergyRisk.crossReactions.push(allergen);
      }
    }
  }

  return allergyRisk;
}

/**
 * Assess overall prescription safety
 */
function assessPrescriptionSafety(prescription: any, interactions: any[], allergyRisk: any, patientAge: number | null): any {
  let score = 100;
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Deduct points for interactions
  for (const interaction of interactions) {
    switch (interaction.severity) {
      case 'major':
        score -= 30;
        warnings.push(`Major drug interaction: ${interaction.description}`);
        break;
      case 'moderate':
        score -= 15;
        warnings.push(`Moderate drug interaction: ${interaction.description}`);
        break;
      case 'minor':
        score -= 5;
        break;
    }
  }

  // Deduct points for allergy risks
  if (allergyRisk.isAllergic) {
    score -= 50;
    warnings.push('Direct allergy contraindication');
  } else if (allergyRisk.warnings.length > 0) {
    score -= 20;
    warnings.push(...allergyRisk.warnings);
  }

  // Age-based considerations
  if (patientAge !== null) {
    if (patientAge >= 65) {
      score -= 5;
      recommendations.push('Consider geriatric dosing adjustments');
    }
    if (patientAge < 18) {
      score -= 10;
      recommendations.push('Verify pediatric dosing and safety');
    }
  }

  // Generate recommendations based on score
  if (score < 70) {
    recommendations.push('Consider alternative therapy');
    recommendations.push('Monitor patient closely');
  } else if (score < 85) {
    recommendations.push('Monitor for adverse effects');
  }

  return {
    score: Math.max(0, score),
    warnings,
    recommendations
  };
}

/**
 * Generate AI analysis for prescription
 */
async function generatePrescriptionAIAnalysis(
  prescription: any, 
  patient: any, 
  interactions: any[], 
  allergyRisk: any
): Promise<any> {
  
  // Call external AI service for prescription analysis
  const aiResponse = await callExternalAIService({
    type: 'prescription_analysis',    prescription: {
      medication: prescription.drugName,
      dosage: prescription.dosage,
      frequency: prescription.dosage, // Using dosage as frequency placeholder
      duration: prescription.dosage // Using dosage as duration placeholder
    },
    patient: {
      age: patient.dateOfBirth ? 
        Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null,
      allergies: patient.allergies,
      currentMedications: patient.currentMedications
    },
    interactions,
    allergyRisk
  });

  return aiResponse || {
    confidence: 75,
    warnings: interactions.length > 0 || allergyRisk.warnings.length > 0 ? 
      ['Review drug interactions and allergy risks'] : [],
    recommendations: [
      'Monitor patient response to therapy',
      'Follow up as clinically indicated',
      'Educate patient on proper medication use'
    ],
    summary: `Prescription analysis for ${prescription.drugName}. ${interactions.length} interactions found, ${allergyRisk.warnings.length} allergy warnings.`
  };
}

/**
 * Call external AI service
 */
async function callExternalAIService(payload: any): Promise<any> {
  try {
    const AI_API_URL = process.env.AI_API_URL || 'http://localhost:4000';
    const AI_API_KEY = process.env.AI_API_KEY || 'web_ui_api_key_13579_change_in_production';

    if (!AI_API_URL) return null;

    const response = await fetch(`${AI_API_URL}/api/prescription-ai`, {
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

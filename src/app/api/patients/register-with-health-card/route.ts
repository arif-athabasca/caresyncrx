// Health Card Registration API
// POST /api/patients/register-with-health-card
// Registers a new patient using their health card information

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { healthCardService, type HealthCardInfo } from '@/lib/health-card-service';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schema for health card registration
const HealthCardRegistrationSchema = z.object({
  healthCard: z.object({
    healthCardNumber: z.string().min(8).max(20),
    province: z.enum(['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT']),
    expiryDate: z.string().optional(),
  }),
  additionalInfo: z.object({
    email: z.string().email().optional(),
    phoneNumber: z.string().optional(),
    preferredLanguage: z.enum(['English', 'French']).optional(),
    emergencyContact: z.object({
      name: z.string(),
      relationship: z.string(),
      phone: z.string(),
    }).optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request data
    const validation = HealthCardRegistrationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { healthCard, additionalInfo } = validation.data;    // Check if patient already exists with this health card
    const existingPatient = await prisma.patient.findFirst({
      where: {
        healthCardNumber: healthCard.healthCardNumber,
        healthCardProvince: healthCard.province,
      },
    });

    if (existingPatient) {
      return NextResponse.json(
        { 
          error: 'Patient already registered with this health card',
          patientId: existingPatient.id,
        },
        { status: 409 }
      );
    }

    // Register patient with health card service
    const patientData = await healthCardService.registerPatientWithHealthCard(
      healthCard as HealthCardInfo,
      additionalInfo
    );

    // Create patient record in database
    const newPatient = await prisma.patient.create({
      data: {
        ...patientData,
        // Convert arrays to JSON for Prisma
        allergies: patientData.allergies as any,
        chronicConditions: patientData.chronicConditions as any,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        healthCardProvince: true,
        governmentVerified: true,
        createdAt: true,
        // Don't return sensitive data like health card number
      },
    });

    // Log the registration for audit
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        patientId: newPatient.id,
        action: 'PATIENT_REGISTERED_WITH_HEALTH_CARD',
        details: {
          province: healthCard.province,
          governmentVerified: true,
          registrationMethod: 'HEALTH_CARD',
        },
        ip_address: request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return NextResponse.json({
      success: true,
      patient: newPatient,
      message: 'Patient registered successfully with government verification',
    });

  } catch (error) {
    console.error('Health card registration error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to register patient',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// GET /api/patients/register-with-health-card/validate
// Validates a health card without registering the patient
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const healthCardNumber = searchParams.get('healthCardNumber');
    const province = searchParams.get('province');
    const expiryDate = searchParams.get('expiryDate');

    if (!healthCardNumber || !province) {
      return NextResponse.json(
        { error: 'Health card number and province are required' },
        { status: 400 }
      );
    }

    // Validate health card format
    const healthCard: HealthCardInfo = {
      healthCardNumber,
      province,
      expiryDate: expiryDate || '',
    };

    // Check with government API
    const validation = await healthCardService.validateHealthCard(healthCard);

    if (!validation.isValid) {
      return NextResponse.json(
        { 
          isValid: false,
          error: validation.error,
        },
        { status: 400 }
      );
    }

    // Check if already registered
    const existingPatient = await prisma.patient.findFirst({
      where: {
        healthCardNumber: healthCardNumber,
        healthCardProvince: province,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    return NextResponse.json({
      isValid: true,
      alreadyRegistered: !!existingPatient,
      existingPatient: existingPatient || undefined,
      governmentData: validation.patientData ? {
        firstName: validation.patientData.firstName,
        lastName: validation.patientData.lastName,
        dateOfBirth: validation.patientData.dateOfBirth,
        // Don't expose full address for privacy
        city: validation.patientData.address.city,
        province: validation.patientData.address.province,
      } : undefined,
    });

  } catch (error) {
    console.error('Health card validation error:', error);
    
    return NextResponse.json(
      { 
        isValid: false,
        error: 'Failed to validate health card',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

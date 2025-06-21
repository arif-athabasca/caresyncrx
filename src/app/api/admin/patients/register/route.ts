/**
 * Patient Registration API Endpoint
 * Handles patient registration using health card verification and PIPEDA consent collection
 */

import { NextRequest, NextResponse } from 'next/server';
import { HealthCardService } from '@/lib/services/healthCardService';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      healthCardNumber,
      province,
      dateOfBirth,
      clinicId,
      registeredBy,
      consents,
      additionalNotes
    } = body;

    // Validate required fields
    if (!healthCardNumber || !province || !clinicId || !registeredBy) {
      return NextResponse.json(
        { error: 'Missing required fields: healthCardNumber, province, clinicId, registeredBy' },
        { status: 400 }
      );
    }

    // Step 1: Verify health card with government
    console.log('Verifying health card with government...');
    const verificationResult = await HealthCardService.verifyHealthCard(
      healthCardNumber,
      province,
      dateOfBirth
    );

    if (!verificationResult.isValid) {
      return NextResponse.json(
        { 
          error: 'Health card verification failed',
          details: verificationResult.errorMessage 
        },
        { status: 400 }
      );
    }

    const govData = verificationResult.patientData!;

    // Step 2: Check if patient already exists
    console.log('Checking for existing patient...');
    const existingPatient = await prisma.patient.findUnique({
      where: { healthCardNumber: govData.healthCardNumber }
    });

    if (existingPatient) {
      return NextResponse.json(
        { error: 'Patient with this health card number already exists in the system' },
        { status: 409 }
      );
    }

    // Step 3: Create patient record with government data
    console.log('Creating patient record...');
    const patientId = uuidv4();
    
    const patient = await prisma.patient.create({
      data: {
        id: patientId,
        healthCardNumber: govData.healthCardNumber,
        healthCardProvince: province,
        healthCardExpiry: new Date(govData.healthCardExpiry),
        governmentVerified: true,
        lastGovSync: new Date(),
        
        // Personal information from government
        firstName: govData.firstName,
        lastName: govData.lastName,
        dateOfBirth: new Date(govData.dateOfBirth),
        gender: govData.gender,
        email: govData.email,
        phone: govData.phoneNumber,
        
        // Address information
        address: `${govData.address.street}, ${govData.address.city}, ${govData.address.province} ${govData.address.postalCode}`,
        
        // Emergency contact
        emergencyContact: govData.emergencyContact ? 
          `${govData.emergencyContact.name} (${govData.emergencyContact.relationship}) - ${govData.emergencyContact.phoneNumber}` : null,
        
        // System metadata
        language: 'en', // Default to English, can be updated later
        clinicId: clinicId
      }
    });

    // Step 4: Record PIPEDA consents using the PatientConsent model structure
    console.log('Recording PIPEDA consents...');
    if (consents) {
      await prisma.patientConsent.create({
        data: {
          id: uuidv4(),
          patientId: patientId,
          
          // Map consent data to the schema fields
          basicCare: true, // Always true for healthcare
          aiAnalysis: consents.aiAnalysis || false,
          aiDiagnostics: consents.aiAnalysis || false,
          aiMedication: consents.aiAnalysis || false,
          aiMentalHealth: consents.aiAnalysis || false,
          aiTriage: consents.aiAnalysis || false,
          dataSharing: consents.dataSharing || false,
          research: consents.research || false,
          administrative: true, // Always true for basic operations
          
          // AI Service specific consents
          doctorAIAssistant: consents.aiAnalysis || false,
          radiologyAI: consents.aiAnalysis || false,
          laboratoryAI: consents.aiAnalysis || false,
          pharmacistAI: consents.aiAnalysis || false,
          mentalHealthAI: consents.aiAnalysis || false,
          priorAuthAI: consents.aiAnalysis || false,
          medicalCodingAI: consents.aiAnalysis || false,
          patientCommunicationAI: consents.aiAnalysis || false,
          
          // Consent metadata
          consentMethod: 'ELECTRONIC',
          witnessedBy: registeredBy,
          consentGivenAt: new Date()
        }
      });
    }

    // Step 5: Create audit log entry
    console.log('Creating audit log...');
    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        patientId: patientId,
        userId: registeredBy,
        action: 'PATIENT_REGISTRATION',
        details: {
          healthCardVerified: true,
          governmentDataIntegrated: true,
          registrationMethod: 'HEALTH_CARD',
          province: province,
          verificationTimestamp: new Date().toISOString()
        },
        timestamp: new Date()
      }
    });

    console.log('Patient registration completed successfully');
    
    return NextResponse.json({
      success: true,
      patientId: patientId,
      patient: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        healthCardNumber: patient.healthCardNumber,
        governmentVerified: patient.governmentVerified
      },
      message: 'Patient registered successfully with government verification'
    });

  } catch (error) {
    console.error('Patient registration error:', error);
    
    return NextResponse.json(
      { 
        error: 'Registration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to validate health card before registration
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const healthCardNumber = searchParams.get('healthCardNumber');
    const province = searchParams.get('province');
    const dateOfBirth = searchParams.get('dateOfBirth');

    if (!healthCardNumber || !province) {
      return NextResponse.json(
        { error: 'Missing required parameters: healthCardNumber, province' },
        { status: 400 }
      );
    }

    // Verify health card with government
    const verificationResult = await HealthCardService.verifyHealthCard(
      healthCardNumber,
      province,
      dateOfBirth || undefined
    );

    if (!verificationResult.isValid) {
      return NextResponse.json({
        isValid: false,
        error: verificationResult.errorMessage
      });
    }

    // Check if patient already exists
    const existingPatient = await prisma.patient.findUnique({
      where: { healthCardNumber: verificationResult.patientData!.healthCardNumber }
    });

    if (existingPatient) {
      return NextResponse.json({
        isValid: false,
        error: 'Patient already registered in the system'
      });
    }

    return NextResponse.json({
      isValid: true,
      patientData: verificationResult.patientData,
      message: 'Health card verified successfully'
    });

  } catch (error) {
    console.error('Health card validation error:', error);
    
    return NextResponse.json(
      { 
        error: 'Validation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

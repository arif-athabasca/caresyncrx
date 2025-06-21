/**
 * Patient Registration Service
 * Handles complete patient registration flow including health card verification,
 * government data integration, and PIPEDA consent collection
 */

import { PrismaClient } from '@prisma/client';
import { HealthCardService, GovernmentPatientData } from './healthCardService';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// Define consent types and statuses as string literals since they're not enums in our schema
export type ConsentType = 
  | 'DATA_COLLECTION'
  | 'DATA_SHARING'
  | 'AI_ANALYSIS'
  | 'THIRD_PARTY_INTEGRATION'
  | 'MARKETING';

export type ConsentStatus = 'GRANTED' | 'DENIED' | 'WITHDRAWN';

export interface ConsentData {
  dataCollection: boolean;
  dataSharing: boolean;
  aiAnalysis: boolean;
  thirdPartyIntegration: boolean;
  marketingCommunications: boolean;
  dataRetentionYears: number;
  specialConsiderations?: string;
}

export interface PatientRegistrationData {
  healthCardNumber: string;
  province: string;
  dateOfBirth?: string;
  clinicId: string;
  registeredBy: string; // Admin user ID
  consents: ConsentData;
  additionalNotes?: string;
}

export interface RegistrationResult {
  success: boolean;
  patientId?: string;
  patient?: any;
  errors?: string[];
  warnings?: string[];
}

export class PatientRegistrationService {
  
  /**
   * Complete patient registration flow
   */
  static async registerPatient(registrationData: PatientRegistrationData): Promise<RegistrationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Step 1: Verify health card with government
      console.log('Step 1: Verifying health card with government...');
      const verificationResult = await HealthCardService.verifyHealthCard(
        registrationData.healthCardNumber,
        registrationData.province,
        registrationData.dateOfBirth
      );

      if (!verificationResult.isValid) {
        return {
          success: false,
          errors: [`Health card verification failed: ${verificationResult.errorMessage}`]
        };
      }

      const govData = verificationResult.patientData!;

      // Step 2: Check if patient already exists
      console.log('Step 2: Checking for existing patient...');
      const existingPatient = await prisma.patient.findUnique({
        where: { healthCardNumber: govData.healthCardNumber }
      });

      if (existingPatient) {
        return {
          success: false,
          errors: ['Patient with this health card number already exists in the system']
        };
      }

      // Step 3: Encrypt sensitive data
      console.log('Step 3: Encrypting sensitive data...');
      const encryptedHealthCard = await HealthCardService.encryptHealthCardData(govData.healthCardNumber);

      // Step 4: Create patient record with government data
      console.log('Step 4: Creating patient record...');
      const patientId = uuidv4();
      
      const patient = await prisma.patient.create({
        data: {
          id: patientId,
          healthCardNumber: govData.healthCardNumber,
          healthCardProvince: registrationData.province,
          healthCardExpiry: new Date(govData.healthCardExpiry),
          governmentVerified: true,
          governmentVerifiedAt: new Date(),
          
          // Personal information from government
          firstName: govData.firstName,
          lastName: govData.lastName,
          dateOfBirth: new Date(govData.dateOfBirth),
          gender: govData.gender,
          email: govData.email,
          phoneNumber: govData.phoneNumber,
          
          // Address information
          address: govData.address.street,
          city: govData.address.city,
          province: govData.address.province,
          postalCode: govData.address.postalCode,
          country: govData.address.country,
          
          // Emergency contact
          emergencyContactName: govData.emergencyContact?.name,
          emergencyContactRelationship: govData.emergencyContact?.relationship,
          emergencyContactPhoneNumber: govData.emergencyContact?.phoneNumber,
          
          // Registration metadata
          clinicId: registrationData.clinicId,
          registeredAt: new Date(),
          registeredBy: registrationData.registeredBy,
          notes: registrationData.additionalNotes,
          
          // PIPEDA compliance
          dataRetentionYears: registrationData.consents.dataRetentionYears,
          consentGivenAt: new Date()
        }
      });

      // Step 5: Record PIPEDA consents
      console.log('Step 5: Recording PIPEDA consents...');
      await this.recordPatientConsents(patientId, registrationData.consents, registrationData.registeredBy);

      // Step 6: Create audit log entry
      console.log('Step 6: Creating audit log...');
      await prisma.auditLog.create({
        data: {
          id: uuidv4(),
          patientId: patientId,
          userId: registrationData.registeredBy,
          action: 'PATIENT_REGISTRATION',
          details: {
            healthCardVerified: true,
            governmentDataIntegrated: true,
            consentTypes: Object.keys(registrationData.consents).filter(
              key => registrationData.consents[key as keyof ConsentData] === true
            ),
            registrationMethod: 'HEALTH_CARD'
          },
          timestamp: new Date()
        }
      });

      // Step 7: Set up data retention policy
      console.log('Step 7: Setting up data retention policy...');
      await prisma.dataRetentionPolicy.create({
        data: {
          id: uuidv4(),
          patientId: patientId,
          retentionPeriodYears: registrationData.consents.dataRetentionYears,
          dataTypes: ['PERSONAL_INFO', 'MEDICAL_RECORDS', 'CONSENTS'],
          createdAt: new Date(),
          createdBy: registrationData.registeredBy
        }
      });

      console.log('Patient registration completed successfully');
      
      return {
        success: true,
        patientId: patientId,
        patient: patient,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      console.error('Patient registration error:', error);
      
      return {
        success: false,
        errors: [`Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Record all PIPEDA consent types for the patient
   */
  private static async recordPatientConsents(
    patientId: string, 
    consents: ConsentData, 
    recordedBy: string
  ): Promise<void> {
    const consentRecords = [];

    // Data Collection Consent
    if (consents.dataCollection !== undefined) {
      consentRecords.push({
        id: uuidv4(),
        patientId,
        consentType: ConsentType.DATA_COLLECTION,
        status: consents.dataCollection ? ConsentStatus.GRANTED : ConsentStatus.DENIED,
        grantedAt: consents.dataCollection ? new Date() : null,
        recordedBy,
        details: {
          purpose: 'Medical care and treatment',
          scope: 'Personal and medical information'
        }
      });
    }

    // Data Sharing Consent
    if (consents.dataSharing !== undefined) {
      consentRecords.push({
        id: uuidv4(),
        patientId,
        consentType: ConsentType.DATA_SHARING,
        status: consents.dataSharing ? ConsentStatus.GRANTED : ConsentStatus.DENIED,
        grantedAt: consents.dataSharing ? new Date() : null,
        recordedBy,
        details: {
          purpose: 'Healthcare coordination and emergency care',
          scope: 'Relevant medical information with authorized healthcare providers'
        }
      });
    }

    // AI Analysis Consent
    if (consents.aiAnalysis !== undefined) {
      consentRecords.push({
        id: uuidv4(),
        patientId,
        consentType: ConsentType.AI_ANALYSIS,
        status: consents.aiAnalysis ? ConsentStatus.GRANTED : ConsentStatus.DENIED,
        grantedAt: consents.aiAnalysis ? new Date() : null,
        recordedBy,
        details: {
          purpose: 'AI-powered health insights and treatment recommendations',
          scope: 'Medical data for AI analysis and triage assistance'
        }
      });
    }

    // Third Party Integration Consent
    if (consents.thirdPartyIntegration !== undefined) {
      consentRecords.push({
        id: uuidv4(),
        patientId,
        consentType: ConsentType.THIRD_PARTY_INTEGRATION,
        status: consents.thirdPartyIntegration ? ConsentStatus.GRANTED : ConsentStatus.DENIED,
        grantedAt: consents.thirdPartyIntegration ? new Date() : null,
        recordedBy,
        details: {
          purpose: 'Integration with pharmacy, lab, and imaging services',
          scope: 'Relevant medical information for coordinated care'
        }
      });
    }

    // Marketing Communications Consent
    if (consents.marketingCommunications !== undefined) {
      consentRecords.push({
        id: uuidv4(),
        patientId,
        consentType: ConsentType.MARKETING,
        status: consents.marketingCommunications ? ConsentStatus.GRANTED : ConsentStatus.DENIED,
        grantedAt: consents.marketingCommunications ? new Date() : null,
        recordedBy,
        details: {
          purpose: 'Health tips, appointment reminders, and service updates',
          scope: 'Contact information for communications'
        }
      });
    }

    // Create all consent records
    if (consentRecords.length > 0) {
      await prisma.patientConsent.createMany({
        data: consentRecords
      });
    }
  }

  /**
   * Get patient registration by health card
   */
  static async getPatientByHealthCard(healthCardNumber: string): Promise<any | null> {
    return await prisma.patient.findUnique({
      where: { healthCardNumber },
      include: {
        consents: true,
        dataRetentionPolicies: true,
        auditLogs: {
          take: 5,
          orderBy: { timestamp: 'desc' }
        }
      }
    });
  }

  /**
   * Update patient consents
   */
  static async updatePatientConsents(
    patientId: string,
    consents: Partial<ConsentData>,
    updatedBy: string
  ): Promise<RegistrationResult> {
    try {
      // Record consent updates
      await this.recordPatientConsents(patientId, consents as ConsentData, updatedBy);

      // Create audit log
      await prisma.auditLog.create({
        data: {
          id: uuidv4(),
          patientId,
          userId: updatedBy,
          action: 'CONSENT_UPDATE',
          details: {
            updatedConsents: Object.keys(consents),
            timestamp: new Date()
          }
        }
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to update consents: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Validate health card before registration
   */
  static async validateHealthCardForRegistration(
    healthCardNumber: string,
    province: string,
    dateOfBirth?: string
  ): Promise<{ isValid: boolean; data?: GovernmentPatientData; error?: string }> {
    try {
      const result = await HealthCardService.verifyHealthCard(healthCardNumber, province, dateOfBirth);
      
      if (!result.isValid) {
        return { isValid: false, error: result.errorMessage };
      }

      // Check if patient already exists
      const existingPatient = await prisma.patient.findUnique({
        where: { healthCardNumber: result.patientData!.healthCardNumber }
      });

      if (existingPatient) {
        return { isValid: false, error: 'Patient already registered in the system' };
      }

      return { isValid: true, data: result.patientData };
    } catch (error) {
      return { 
        isValid: false, 
        error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}

// Health Card Registration Service
// This service integrates with government APIs to verify and retrieve patient information

import { encrypt, decrypt } from '@/lib/encryption';

interface HealthCardInfo {
  healthCardNumber: string;
  province: string;
  expiryDate: string;
}

interface GovernmentPatientData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  healthCardNumber: string;
  province: string;
  expiryDate: string;
  address: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
  };
  phoneNumber?: string;
  email?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  medicalInfo?: {
    allergies?: string[];
    bloodType?: string;
    chronicConditions?: string[];
  };
}

interface HealthCardValidationResult {
  isValid: boolean;
  patientData?: GovernmentPatientData;
  error?: string;
  verificationId?: string;
}

class HealthCardRegistrationService {
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly encryptionKey: string;

  constructor() {
    this.apiUrl = process.env.GOVERNMENT_HEALTH_API_URL || '';
    this.apiKey = process.env.GOVERNMENT_HEALTH_API_KEY || '';
    this.encryptionKey = process.env.HEALTH_CARD_ENCRYPTION_KEY || '';
    
    if (!this.apiUrl || !this.apiKey) {
      console.warn('Government Health API not configured. Health card verification will be mocked.');
    }
  }

  /**
   * Validate health card and retrieve patient information from government database
   */
  async validateHealthCard(healthCard: HealthCardInfo): Promise<HealthCardValidationResult> {
    try {
      // Encrypt health card number for secure transmission
      const encryptedHealthCard = this.encryptHealthCard(healthCard.healthCardNumber);

      if (!this.apiUrl || !this.apiKey) {
        // Return mock data for development
        return this.getMockPatientData(healthCard);
      }

      const response = await fetch(`${this.apiUrl}/verify-health-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Province': healthCard.province,
        },
        body: JSON.stringify({
          healthCardNumber: encryptedHealthCard,
          province: healthCard.province,
          expiryDate: healthCard.expiryDate,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          isValid: false,
          error: `Government API error: ${error}`,
        };
      }

      const data = await response.json();
      
      if (!data.isValid) {
        return {
          isValid: false,
          error: data.error || 'Health card validation failed',
        };
      }

      return {
        isValid: true,
        patientData: this.decryptPatientData(data.patientData),
        verificationId: data.verificationId,
      };

    } catch (error) {
      console.error('Health card validation error:', error);
      return {
        isValid: false,
        error: 'Failed to validate health card. Please try again.',
      };
    }
  }

  /**
   * Register a new patient using health card information
   */
  async registerPatientWithHealthCard(
    healthCard: HealthCardInfo,
    additionalInfo?: {
      email?: string;
      phoneNumber?: string;
      preferredLanguage?: string;
      emergencyContact?: {
        name: string;
        relationship: string;
        phone: string;
      };
    }
  ) {
    // First validate the health card
    const validation = await this.validateHealthCard(healthCard);
    
    if (!validation.isValid || !validation.patientData) {
      throw new Error(validation.error || 'Invalid health card');
    }

    const patientData = validation.patientData;

    // Create patient record with government-verified data
    const newPatient = {
      id: crypto.randomUUID(),
      firstName: patientData.firstName,
      lastName: patientData.lastName,
      dateOfBirth: new Date(patientData.dateOfBirth),
      email: additionalInfo?.email || patientData.email || '',
      phoneNumber: additionalInfo?.phoneNumber || patientData.phoneNumber || '',
      
      // Health card information (encrypted)
      healthCardNumber: this.encryptHealthCard(patientData.healthCardNumber),
      healthCardProvince: patientData.province,
      healthCardExpiry: new Date(patientData.expiryDate),
      governmentVerified: true,
      governmentVerificationId: validation.verificationId,
      
      // Address information
      address: patientData.address.street,
      city: patientData.address.city,
      province: patientData.address.province,
      postalCode: patientData.address.postalCode,
      country: 'Canada',
      
      // Medical information
      allergies: patientData.medicalInfo?.allergies || [],
      bloodType: patientData.medicalInfo?.bloodType,
      chronicConditions: patientData.medicalInfo?.chronicConditions || [],
      
      // Emergency contact
      emergencyContactName: additionalInfo?.emergencyContact?.name || patientData.emergencyContact?.name,
      emergencyContactPhone: additionalInfo?.emergencyContact?.phone || patientData.emergencyContact?.phone,
      emergencyContactRelation: additionalInfo?.emergencyContact?.relationship || patientData.emergencyContact?.relationship,
      
      // Preferences
      preferredLanguage: additionalInfo?.preferredLanguage || 'English',
      
      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return newPatient;
  }

  /**
   * Update patient information with latest government data
   */
  async syncPatientWithGovernment(patientId: string, healthCardNumber: string, province: string) {
    try {
      const healthCard: HealthCardInfo = {
        healthCardNumber: this.decryptHealthCard(healthCardNumber),
        province,
        expiryDate: '', // Will be validated by government API
      };

      const validation = await this.validateHealthCard(healthCard);
      
      if (!validation.isValid || !validation.patientData) {
        return {
          success: false,
          error: validation.error || 'Failed to sync with government database',
        };
      }

      const updatedData = validation.patientData;
      
      return {
        success: true,
        updates: {
          firstName: updatedData.firstName,
          lastName: updatedData.lastName,
          dateOfBirth: new Date(updatedData.dateOfBirth),
          address: updatedData.address.street,
          city: updatedData.address.city,
          province: updatedData.address.province,
          postalCode: updatedData.address.postalCode,
          healthCardExpiry: new Date(updatedData.expiryDate),
          governmentVerified: true,
          governmentVerificationId: validation.verificationId,
          lastGovernmentSync: new Date(),
        },
      };

    } catch (error) {
      console.error('Government sync error:', error);
      return {
        success: false,
        error: 'Failed to sync with government database',
      };
    }
  }

  /**
   * Encrypt health card number for secure storage
   */
  private encryptHealthCard(healthCardNumber: string): string {
    if (!this.encryptionKey) {
      console.warn('Encryption key not configured. Health card stored in plain text (development only).');
      return healthCardNumber;
    }
    return encrypt(healthCardNumber, this.encryptionKey);
  }

  /**
   * Decrypt health card number for API calls
   */
  private decryptHealthCard(encryptedHealthCard: string): string {
    if (!this.encryptionKey) {
      return encryptedHealthCard; // Assuming it's plain text in development
    }
    return decrypt(encryptedHealthCard, this.encryptionKey);
  }

  /**
   * Decrypt patient data received from government API
   */
  private decryptPatientData(encryptedData: any): GovernmentPatientData {
    // Government API should return encrypted data
    // For now, assume it's already decrypted or implement specific decryption
    return encryptedData;
  }

  /**
   * Mock patient data for development/testing
   */
  private getMockPatientData(healthCard: HealthCardInfo): HealthCardValidationResult {
    // Generate consistent mock data based on health card number
    const mockPatientData: GovernmentPatientData = {
      firstName: "John",
      lastName: "Smith",
      dateOfBirth: "1985-06-15",
      healthCardNumber: healthCard.healthCardNumber,
      province: healthCard.province,
      expiryDate: healthCard.expiryDate || "2025-12-31",
      address: {
        street: "123 Main Street",
        city: "Toronto",
        province: healthCard.province,
        postalCode: "M5V 3A8",
      },
      phoneNumber: "+1-416-555-0123",
      email: "john.smith@email.com",
      emergencyContact: {
        name: "Jane Smith",
        relationship: "Spouse",
        phone: "+1-416-555-0124",
      },
      medicalInfo: {
        allergies: ["Peanuts"],
        bloodType: "O+",
        chronicConditions: [],
      },
    };

    return {
      isValid: true,
      patientData: mockPatientData,
      verificationId: `mock-${Date.now()}`,
    };
  }
}

export const healthCardService = new HealthCardRegistrationService();
export type { HealthCardInfo, GovernmentPatientData, HealthCardValidationResult };

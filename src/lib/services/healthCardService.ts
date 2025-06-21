/**
 * Health Card Service
 * Handles validation and government API integration for health card verification
 */

export interface GovernmentPatientData {
  healthCardNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  address: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
  phoneNumber?: string;
  email?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phoneNumber: string;
  };
  healthCardExpiry: string;
  isActive: boolean;
  governmentVerified: boolean;
}

export interface HealthCardValidationResult {
  isValid: boolean;
  patientData?: GovernmentPatientData;
  errorMessage?: string;
  errorCode?: string;
}

export class HealthCardService {
  private static readonly GOVERNMENT_API_BASE_URL = process.env.GOVERNMENT_HEALTH_API_URL || 'https://api.health.gov.ca';
  private static readonly API_KEY = process.env.GOVERNMENT_HEALTH_API_KEY;
  private static readonly TIMEOUT = 30000; // 30 seconds

  /**
   * Validates health card number format based on province
   */
  static validateHealthCardFormat(healthCardNumber: string, province: string): boolean {
    const cleanedNumber = healthCardNumber.replace(/\s|-/g, '');
    
    const patterns: Record<string, RegExp> = {
      'ON': /^\d{10}$/, // Ontario: 10 digits
      'BC': /^\d{10}$/, // British Columbia: 10 digits  
      'AB': /^\d{9}$/, // Alberta: 9 digits
      'SK': /^\d{9}$/, // Saskatchewan: 9 digits
      'MB': /^\d{9}$/, // Manitoba: 9 digits
      'QC': /^[A-Z]{4}\d{8}$/, // Quebec: 4 letters + 8 digits
      'NB': /^\d{9}$/, // New Brunswick: 9 digits
      'NS': /^\d{10}$/, // Nova Scotia: 10 digits
      'PE': /^\d{7}$/, // Prince Edward Island: 7 digits
      'NL': /^[A-Z]\d{9}$/, // Newfoundland: 1 letter + 9 digits
      'NT': /^\d{9}$/, // Northwest Territories: 9 digits
      'YT': /^\d{8}$/, // Yukon: 8 digits
      'NU': /^\d{9}$/, // Nunavut: 9 digits
    };

    const pattern = patterns[province.toUpperCase()];
    return pattern ? pattern.test(cleanedNumber) : false;
  }

  /**
   * Calls government API to verify health card and retrieve patient information
   */
  static async verifyHealthCard(
    healthCardNumber: string, 
    province: string,
    dateOfBirth?: string
  ): Promise<HealthCardValidationResult> {
    try {
      // Validate format first
      if (!this.validateHealthCardFormat(healthCardNumber, province)) {
        return {
          isValid: false,
          errorMessage: `Invalid health card format for ${province}`,
          errorCode: 'INVALID_FORMAT'
        };
      }

      // Check if we're in development mode
      if (process.env.NODE_ENV === 'development' && !this.API_KEY) {
        console.warn('Government API key not configured, using mock data');
        return this.getMockPatientData(healthCardNumber, province);
      }

      const response = await fetch(`${this.GOVERNMENT_API_BASE_URL}/patient/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_KEY}`,
          'X-Province': province
        },
        body: JSON.stringify({
          healthCardNumber: healthCardNumber.replace(/\s|-/g, ''),
          dateOfBirth,
          province
        }),
        signal: AbortSignal.timeout(this.TIMEOUT)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          isValid: false,
          errorMessage: errorData.message || `Government API error: ${response.status}`,
          errorCode: errorData.code || 'API_ERROR'
        };
      }

      const data = await response.json();
      
      return {
        isValid: true,
        patientData: {
          healthCardNumber: data.healthCardNumber,
          firstName: data.firstName,
          lastName: data.lastName,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          address: data.address,
          phoneNumber: data.phoneNumber,
          email: data.email,
          emergencyContact: data.emergencyContact,
          healthCardExpiry: data.healthCardExpiry,
          isActive: data.isActive,
          governmentVerified: true
        }
      };

    } catch (error) {
      console.error('Health card verification error:', error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            isValid: false,
            errorMessage: 'Government service timeout',
            errorCode: 'TIMEOUT'
          };
        }
        
        return {
          isValid: false,
          errorMessage: error.message,
          errorCode: 'VERIFICATION_ERROR'
        };
      }

      return {
        isValid: false,
        errorMessage: 'Unknown verification error',
        errorCode: 'UNKNOWN_ERROR'
      };
    }
  }

  /**
   * Mock data for development/testing
   */
  private static getMockPatientData(healthCardNumber: string, province: string): HealthCardValidationResult {
    const mockData: GovernmentPatientData = {
      healthCardNumber,
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-15',
      gender: 'MALE',
      address: {
        street: '123 Main Street',
        city: 'Toronto',
        province: province,
        postalCode: 'M5V 3A8',
        country: 'Canada'
      },
      phoneNumber: '+1-416-555-0123',
      email: 'john.doe@email.com',
      emergencyContact: {
        name: 'Jane Doe',
        relationship: 'Spouse',
        phoneNumber: '+1-416-555-0124'
      },
      healthCardExpiry: '2027-12-31',
      isActive: true,
      governmentVerified: true
    };

    return {
      isValid: true,
      patientData: mockData
    };
  }

  /**
   * Encrypts sensitive health card data for storage
   */
  static async encryptHealthCardData(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(process.env.HEALTH_CARD_ENCRYPTION_KEY || 'default-dev-key-32-chars-long!'),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(data)
    );

    // Combine salt, iv, and encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  /**
   * Decrypts health card data
   */
  static async decryptHealthCardData(encryptedData: string): Promise<string> {
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );

    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encrypted = combined.slice(28);

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(process.env.HEALTH_CARD_ENCRYPTION_KEY || 'default-dev-key-32-chars-long!'),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  }
}

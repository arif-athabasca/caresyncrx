/**
 * Patient Registration Component for Admin Dashboard
 * Handles health card verification and PIPEDA consent collection
 */

'use client';

import { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { useRouter } from 'next/navigation';

interface ConsentData {
  dataCollection: boolean;
  dataSharing: boolean;
  aiAnalysis: boolean;
  thirdPartyIntegration: boolean;
  marketingCommunications: boolean;
  research: boolean;
  dataRetentionYears: number;
  specialConsiderations?: string;
}

interface PatientData {
  healthCardNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
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
}

const CANADIAN_PROVINCES = [
  { value: 'ON', label: 'Ontario' },
  { value: 'BC', label: 'British Columbia' },
  { value: 'AB', label: 'Alberta' },
  { value: 'SK', label: 'Saskatchewan' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'QC', label: 'Quebec' },
  { value: 'NB', label: 'New Brunswick' },
  { value: 'NS', label: 'Nova Scotia' },
  { value: 'PE', label: 'Prince Edward Island' },
  { value: 'NL', label: 'Newfoundland and Labrador' },
  { value: 'NT', label: 'Northwest Territories' },
  { value: 'YT', label: 'Yukon' },
  { value: 'NU', label: 'Nunavut' }
];

export default function PatientRegistration() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form data
  const [healthCardNumber, setHealthCardNumber] = useState('');
  const [province, setProvince] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [clinicId, setClinicId] = useState('clinic-1'); // Default clinic
  const [additionalNotes, setAdditionalNotes] = useState('');
  
  // Verified patient data from government
  const [verifiedPatientData, setVerifiedPatientData] = useState<PatientData | null>(null);
  
  // Consent data
  const [consents, setConsents] = useState<ConsentData>({
    dataCollection: true, // Required for healthcare
    dataSharing: false,
    aiAnalysis: false,
    thirdPartyIntegration: false,
    marketingCommunications: false,
    research: false,
    dataRetentionYears: 7,
    specialConsiderations: ''
  });

  const handleHealthCardVerification = async () => {
    if (!healthCardNumber || !province) {
      setError('Please enter health card number and select province');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        healthCardNumber,
        province,
        ...(dateOfBirth && { dateOfBirth })
      });

      const response = await fetch(`/api/admin/patients/register?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Verification failed');
      }

      if (!result.isValid) {
        setError(result.error || 'Health card verification failed');
        return;
      }

      setVerifiedPatientData(result.patientData);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegistration = async () => {
    if (!verifiedPatientData) {
      setError('Patient data not verified');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const registrationData = {
        healthCardNumber,
        province,
        dateOfBirth,
        clinicId,
        registeredBy: 'admin-user-id', // Should come from auth context
        consents,
        additionalNotes
      };

      const response = await fetch('/api/admin/patients/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Registration failed');
      }

      // Success - redirect to patient list or show success message
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleConsentChange = (consentType: keyof ConsentData, value: boolean | number | string) => {
    setConsents(prev => ({
      ...prev,
      [consentType]: value
    }));
  };

  if (step === 3) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
            <p className="text-gray-600">
              Patient has been successfully registered with government verification and PIPEDA consent collection.
            </p>
          </div>
          <div className="space-y-3">
            <Button 
              onClick={() => router.push('/admin/patients')}
              className="w-full"
            >
              View Patient List
            </Button>
            <Button 
              onClick={() => {
                setStep(1);
                setHealthCardNumber('');
                setProvince('');
                setDateOfBirth('');
                setVerifiedPatientData(null);
                setError(null);
              }}
              variant="outline"
              className="w-full"
            >
              Register Another Patient
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Patient Registration</h1>
        <p className="text-gray-600 mt-2">
          Register new patients using health card verification and collect PIPEDA compliance consents
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              1
            </div>
            <span className="ml-2">Health Card Verification</span>
          </div>
          <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              2
            </div>
            <span className="ml-2">PIPEDA Consent</span>
          </div>
          <div className={`flex items-center ${step >= 3 ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
              3
            </div>
            <span className="ml-2">Complete</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {step === 1 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">Step 1: Health Card Verification</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="healthCardNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Health Card Number *
              </label>
              <input
                type="text"
                id="healthCardNumber"
                value={healthCardNumber}
                onChange={(e) => setHealthCardNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter health card number"
              />
            </div>

            <div>
              <label htmlFor="province" className="block text-sm font-medium text-gray-700 mb-2">
                Province *
              </label>
              <select
                id="province"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Province</option>
                {CANADIAN_PROVINCES.map(prov => (
                  <option key={prov.value} value={prov.value}>{prov.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth (Optional)
              </label>
              <input
                type="date"
                id="dateOfBirth"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">
                Optional: Helps verify identity with government database
              </p>
            </div>

            <div>
              <label htmlFor="clinicId" className="block text-sm font-medium text-gray-700 mb-2">
                Clinic
              </label>
              <select
                id="clinicId"
                value={clinicId}
                onChange={(e) => setClinicId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="clinic-1">Main Clinic</option>
                <option value="clinic-2">North Branch</option>
                <option value="clinic-3">South Branch</option>
              </select>
            </div>
          </div>

          <div className="mt-6">
            <Button
              onClick={handleHealthCardVerification}
              disabled={loading || !healthCardNumber || !province}
              className="w-full md:w-auto"
            >
              {loading ? 'Verifying...' : 'Verify Health Card'}
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && verifiedPatientData && (
        <div className="space-y-6">
          {/* Patient Information Display */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Verified Patient Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <strong>Name:</strong> {verifiedPatientData.firstName} {verifiedPatientData.lastName}
              </div>
              <div>
                <strong>Date of Birth:</strong> {new Date(verifiedPatientData.dateOfBirth).toLocaleDateString()}
              </div>
              <div>
                <strong>Gender:</strong> {verifiedPatientData.gender}
              </div>
              <div>
                <strong>Health Card:</strong> {verifiedPatientData.healthCardNumber}
              </div>
              <div className="md:col-span-2">
                <strong>Address:</strong> {verifiedPatientData.address.street}, {verifiedPatientData.address.city}, {verifiedPatientData.address.province} {verifiedPatientData.address.postalCode}
              </div>
              {verifiedPatientData.phoneNumber && (
                <div>
                  <strong>Phone:</strong> {verifiedPatientData.phoneNumber}
                </div>
              )}
              {verifiedPatientData.email && (
                <div>
                  <strong>Email:</strong> {verifiedPatientData.email}
                </div>
              )}
            </div>
          </Card>

          {/* PIPEDA Consent Collection */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Step 2: PIPEDA Consent Collection</h2>
            <p className="text-gray-600 mb-6">
              Please collect the patient's consent for data processing as required by PIPEDA regulations.
            </p>

            <div className="space-y-4">
              {/* Core Consents */}
              <div>
                <h3 className="text-lg font-medium mb-3">Required Consents</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="dataCollection"
                      checked={consents.dataCollection}
                      onChange={(e) => handleConsentChange('dataCollection', e.target.checked)}
                      className="mt-1"
                    />
                    <div>
                      <label htmlFor="dataCollection" className="font-medium">
                        Data Collection for Healthcare *
                      </label>
                      <p className="text-sm text-gray-600">
                        Consent to collect and use personal health information for medical care and treatment.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Optional Consents */}
              <div>
                <h3 className="text-lg font-medium mb-3">Optional Consents</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="dataSharing"
                      checked={consents.dataSharing}
                      onChange={(e) => handleConsentChange('dataSharing', e.target.checked)}
                      className="mt-1"
                    />
                    <div>
                      <label htmlFor="dataSharing" className="font-medium">
                        Data Sharing with Healthcare Providers
                      </label>
                      <p className="text-sm text-gray-600">
                        Share relevant medical information with authorized healthcare providers for coordinated care.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="aiAnalysis"
                      checked={consents.aiAnalysis}
                      onChange={(e) => handleConsentChange('aiAnalysis', e.target.checked)}
                      className="mt-1"
                    />
                    <div>
                      <label htmlFor="aiAnalysis" className="font-medium">
                        AI-Powered Health Analysis
                      </label>
                      <p className="text-sm text-gray-600">
                        Use AI technology for health insights, treatment recommendations, and triage assistance.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="thirdPartyIntegration"
                      checked={consents.thirdPartyIntegration}
                      onChange={(e) => handleConsentChange('thirdPartyIntegration', e.target.checked)}
                      className="mt-1"
                    />
                    <div>
                      <label htmlFor="thirdPartyIntegration" className="font-medium">
                        Third-Party Service Integration
                      </label>
                      <p className="text-sm text-gray-600">
                        Integration with pharmacy, laboratory, and imaging services for coordinated care.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="research"
                      checked={consents.research}
                      onChange={(e) => handleConsentChange('research', e.target.checked)}
                      className="mt-1"
                    />
                    <div>
                      <label htmlFor="research" className="font-medium">
                        Medical Research
                      </label>
                      <p className="text-sm text-gray-600">
                        Use anonymized data for medical research and healthcare improvement initiatives.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="marketingCommunications"
                      checked={consents.marketingCommunications}
                      onChange={(e) => handleConsentChange('marketingCommunications', e.target.checked)}
                      className="mt-1"
                    />
                    <div>
                      <label htmlFor="marketingCommunications" className="font-medium">
                        Health Communications
                      </label>
                      <p className="text-sm text-gray-600">
                        Receive health tips, appointment reminders, and service updates.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Retention */}
              <div>
                <h3 className="text-lg font-medium mb-3">Data Retention</h3>
                <div>
                  <label htmlFor="dataRetentionYears" className="block font-medium mb-2">
                    Data Retention Period (Years)
                  </label>
                  <select
                    id="dataRetentionYears"
                    value={consents.dataRetentionYears}
                    onChange={(e) => handleConsentChange('dataRetentionYears', parseInt(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={7}>7 years (Legal minimum)</option>
                    <option value={10}>10 years</option>
                    <option value={15}>15 years</option>
                    <option value={25}>25 years (Lifetime)</option>
                  </select>
                  <p className="text-sm text-gray-600 mt-1">
                    How long should we retain your medical records? (Can be changed later)
                  </p>
                </div>
              </div>

              {/* Additional Notes */}
              <div>
                <label htmlFor="additionalNotes" className="block font-medium mb-2">
                  Additional Notes
                </label>
                <textarea
                  id="additionalNotes"
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any special considerations or notes..."
                />
              </div>
            </div>

            <div className="mt-8 flex space-x-4">
              <Button
                onClick={() => setStep(1)}
                variant="outline"
              >
                Back
              </Button>
              <Button
                onClick={handleRegistration}
                disabled={loading || !consents.dataCollection}
              >
                {loading ? 'Registering...' : 'Complete Registration'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

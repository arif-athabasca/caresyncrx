'use client';

import React, { useState } from 'react';

// Simple icon components using emoji/text
const CreditCard = ({ className }: { className?: string }) => <span className={className}>💳</span>;
const Shield = ({ className }: { className?: string }) => <span className={className}>🛡️</span>;
const CheckCircle = ({ className }: { className?: string }) => <span className={className}>✅</span>;
const AlertCircle = ({ className }: { className?: string }) => <span className={className}>⚠️</span>;
const Loader = ({ className }: { className?: string }) => <span className={className}>🔄</span>;
const X = ({ className }: { className?: string }) => <span className={className}>❌</span>;

interface HealthCardRegistrationProps {
  onCancel: () => void;
  onSuccess: (patient: any) => void;
}

interface ConsentData {
  dataProcessingConsent: boolean;
  marketingConsent: boolean;
  researchConsent: boolean;
  thirdPartyConsent: boolean;
  aiProcessingConsent: boolean;
}

export default function HealthCardRegistration({ onCancel, onSuccess }: HealthCardRegistrationProps) {
  const [step, setStep] = useState(1); // 1: Health Card, 2: Consent, 3: Review
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationResult, setVerificationResult] = useState<any>(null);
  
  // Form data
  const [healthCardData, setHealthCardData] = useState({
    healthCardNumber: '',
    province: '',
    dateOfBirth: '',
    clinicId: '', // This would be set based on current admin's clinic
  });

  const [consentData, setConsentData] = useState<ConsentData>({
    dataProcessingConsent: false,
    marketingConsent: false,
    researchConsent: false,
    thirdPartyConsent: false,
    aiProcessingConsent: false,
  });

  const provinces = [
    { code: 'AB', name: 'Alberta' },
    { code: 'BC', name: 'British Columbia' },
    { code: 'MB', name: 'Manitoba' },
    { code: 'NB', name: 'New Brunswick' },
    { code: 'NL', name: 'Newfoundland and Labrador' },
    { code: 'NS', name: 'Nova Scotia' },
    { code: 'ON', name: 'Ontario' },
    { code: 'PE', name: 'Prince Edward Island' },
    { code: 'QC', name: 'Quebec' },
    { code: 'SK', name: 'Saskatchewan' },
    { code: 'NT', name: 'Northwest Territories' },
    { code: 'NU', name: 'Nunavut' },
    { code: 'YT', name: 'Yukon' },
  ];

  const verifyHealthCard = async () => {
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams({
        healthCardNumber: healthCardData.healthCardNumber,
        province: healthCardData.province,
        dateOfBirth: healthCardData.dateOfBirth,
      });

      const response = await fetch(`/api/admin/patients/register?${params}`);
      const data = await response.json();

      if (data.isValid) {
        setVerificationResult(data.patientData);
        setStep(2);
      } else {
        setError(data.error || 'Health card verification failed');
      }
    } catch (err) {
      setError('Failed to verify health card. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const completeRegistration = async () => {
    setLoading(true);
    setError('');

    try {
      const registrationData = {
        ...healthCardData,
        consentData: {
          ...consentData,
          consentVersion: '1.0',
        },
      };

      const response = await fetch('/api/admin/patients/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess(data.data);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <CreditCard className="mx-auto h-12 w-12 text-blue-600" />
        <h2 className="mt-4 text-xl font-semibold text-gray-900">Health Card Verification</h2>
        <p className="mt-2 text-gray-600">
          Enter the patient's health card information to verify with government records
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Health Card Number *
          </label>
          <input
            type="text"
            value={healthCardData.healthCardNumber}
            onChange={(e) => setHealthCardData(prev => ({ ...prev, healthCardNumber: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter health card number"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Province/Territory *
          </label>
          <select
            value={healthCardData.province}
            onChange={(e) => setHealthCardData(prev => ({ ...prev, province: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Select Province/Territory</option>
            {provinces.map((province) => (
              <option key={province.code} value={province.code}>
                {province.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date of Birth *
          </label>
          <input
            type="date"
            value={healthCardData.dateOfBirth}
            onChange={(e) => setHealthCardData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={verifyHealthCard}
          disabled={loading || !healthCardData.healthCardNumber || !healthCardData.province || !healthCardData.dateOfBirth}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify Health Card'
          )}
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Shield className="mx-auto h-12 w-12 text-green-600" />
        <h2 className="mt-4 text-xl font-semibold text-gray-900">Patient Consent Collection</h2>
        <p className="mt-2 text-gray-600">
          Collect patient consent for data processing and AI services (PIPEDA Compliance)
        </p>
      </div>

      {verificationResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-800">Health Card Verified</span>
          </div>
          <div className="text-sm text-green-700">
            <p><strong>Name:</strong> {verificationResult.firstName} {verificationResult.lastName}</p>
            <p><strong>DOB:</strong> {verificationResult.dateOfBirth}</p>
            <p><strong>Gender:</strong> {verificationResult.gender}</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Required Consents</h3>
        
        <div className="space-y-3">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={consentData.dataProcessingConsent}
              onChange={(e) => setConsentData(prev => ({ ...prev, dataProcessingConsent: e.target.checked }))}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">
                Data Processing Consent *
              </span>
              <p className="text-xs text-gray-600">
                Consent to process personal health information for healthcare services
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={consentData.aiProcessingConsent}
              onChange={(e) => setConsentData(prev => ({ ...prev, aiProcessingConsent: e.target.checked }))}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">
                AI Processing Consent
              </span>
              <p className="text-xs text-gray-600">
                Consent to use AI services for clinical analysis, diagnostics, and treatment recommendations
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={consentData.marketingConsent}
              onChange={(e) => setConsentData(prev => ({ ...prev, marketingConsent: e.target.checked }))}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">
                Marketing Communications
              </span>
              <p className="text-xs text-gray-600">
                Consent to receive health tips, appointment reminders, and clinic updates
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={consentData.researchConsent}
              onChange={(e) => setConsentData(prev => ({ ...prev, researchConsent: e.target.checked }))}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">
                Research Participation
              </span>
              <p className="text-xs text-gray-600">
                Consent to use anonymized data for medical research and quality improvement
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={consentData.thirdPartyConsent}
              onChange={(e) => setConsentData(prev => ({ ...prev, thirdPartyConsent: e.target.checked }))}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">
                Third-Party Data Sharing
              </span>
              <p className="text-xs text-gray-600">
                Consent to share data with authorized healthcare providers and specialists
              </p>
            </div>
          </label>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => setStep(1)}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={completeRegistration}
          disabled={loading || !consentData.dataProcessingConsent}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              Registering...
            </>
          ) : (
            'Complete Registration'
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Patient Registration</h1>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-6 w-6 text-gray-400" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <div className={`w-16 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
            </div>
          </div>

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
        </div>
      </div>
    </div>
  );
}

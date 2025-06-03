'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Two-factor authentication setup page
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AuthCard } from '../components/auth/AuthCard';
import { AuthInput } from '../components/auth/AuthInput';
import { useAuth } from '../../auth/hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { Card } from '../components/ui/Card';

export default function TwoFactorSetupPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [step, setStep] = useState(1); // 1: Intro, 2: Scan QR, 3: Verify Code, 4: Backup Codes
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  
  // 2FA setup data
  const [setupData, setSetupData] = useState<{
    secret: string;
    qrCodeUrl: string;
    otpauthUrl: string;
  } | null>(null);
  
  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);
  
  // Initialize 2FA setup when user requests to begin
  const initializeSetup = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to initialize 2FA setup');
      }
      
      const data = await response.json();
      setSetupData({
        secret: data.secret,
        qrCodeUrl: data.qrCodeUrl,
        otpauthUrl: data.otpauthUrl
      });
      
      // Move to QR code step
      setStep(2);
    } catch (err) {
      console.error('2FA setup initialization error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize 2FA setup');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle verification code submission
  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      setError('Verification code must be 6 digits');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: verificationCode }),
        credentials: 'include', // Include cookies for authentication
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Verification failed');
      }
      
      const data = await response.json();
      
      // Show backup codes
      setBackupCodes(data.backupCodes);
      setStep(4);
    } catch (err) {
      console.error('2FA verification error:', err);
      setError(err instanceof Error ? err.message : 'Invalid verification code');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Complete 2FA setup
  const handleComplete = async () => {
    try {
      setIsSubmitting(true);
      
      // No additional API call needed - 2FA is already enabled by now
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      console.error('2FA setup completion error:', err);
      setError('Failed to complete 2FA setup');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render step 1: Introduction
  const renderIntroStep = () => (
    <>
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900">Enhance Your Account Security</h3>
        <p className="mt-2 text-sm text-gray-600">
          Two-factor authentication adds an extra layer of security to your account. Once enabled, you&apos;ll need to provide a code from your authentication app in addition to your password when signing in.
        </p>
      </div>
      
      <Alert 
        severity="warning" 
        title="Before you begin" 
        className="mb-6"
      >
        <p>
          You&apos;ll need an authenticator app like Google Authenticator, Authy, or Microsoft Authenticator installed on your mobile device.
        </p>
      </Alert>
      
      <div className="mt-6">
        <Button
          onClick={initializeSetup}
          isLoading={isSubmitting}
          fullWidth
        >
          Begin Setup
        </Button>
      </div>
    </>
  );

  // Render step 2: Scan QR Code
  const renderQrStep = () => (
    <>
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900">Scan QR Code</h3>
        <p className="mt-2 text-sm text-gray-600">
          Scan this QR code with your authenticator app, or enter the setup key manually.
        </p>
      </div>
      
      <div className="flex justify-center mb-6">
        {setupData?.qrCodeUrl ? (
          <div className="border-2 border-gray-300 rounded-md p-2 bg-white">            
            <Image 
              src={setupData.qrCodeUrl} 
              alt="2FA QR Code" 
              width={192}
              height={192}
              className="w-48 h-48"
            />
          </div>
        ) : (
          <div className="border-2 border-gray-300 rounded-md p-2 w-48 h-48 flex items-center justify-center bg-white">
            <div className="text-center">
              <p className="text-sm text-gray-500">Loading QR Code...</p>
            </div>
          </div>
        )}
      </div>
      
      <Card className="mb-6">
        <p className="text-sm font-medium text-gray-700">Cannot scan the QR code?</p>
        <p className="mt-2 text-sm text-gray-600">
          Enter this setup key in your authenticator app:
        </p>
        <div className="mt-2 bg-gray-100 p-2 rounded-md font-mono text-sm break-all">
          {setupData?.secret}
        </div>
      </Card>
      
      <div className="mt-6 space-y-4">
        <AuthInput 
          id="verificationCode"
          name="verificationCode"
          label="Verification Code"
          type="text"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
          placeholder="Enter 6-digit code"
          autoComplete="one-time-code"
          maxLength={6}
          pattern="\d{6}"
          inputMode="numeric"
          required
          icon={
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
            </svg>
          }
        />
        
        {error && (
          <Alert severity="error" className="mt-4">
            {error}
          </Alert>
        )}
        
        <div className="flex space-x-4">
          <Button
            variant="outline"
            onClick={() => setStep(1)}
            disabled={isSubmitting}
          >
            Back
          </Button>
          <Button
            onClick={handleVerifyCode}
            disabled={verificationCode.length !== 6 || isSubmitting}
            isLoading={isSubmitting}
            fullWidth
          >
            Verify
          </Button>
        </div>
      </div>
    </>
  );

  // Render step 3: Backup Codes
  const renderBackupCodesStep = () => (
    <>
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900">Save Your Backup Codes</h3>
        <p className="mt-2 text-sm text-gray-600">
          These backup codes will allow you to sign in if you lose access to your authenticator app. Each code can only be used once.
        </p>
      </div>
      
      <Alert 
        severity="warning" 
        title="Important" 
        className="mb-6"
      >
        <p>
          Store these codes in a safe place. They will only be shown once!
        </p>
      </Alert>
      
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-6">
        <div className="grid grid-cols-2 gap-2">
          {backupCodes.map((code, index) => (
            <div key={index} className="font-mono text-sm bg-white border border-gray-200 rounded p-2 text-center">
              {code}
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-center">
          <Button 
            variant="outline"
            size="sm"
            onClick={() => {
              const codes = backupCodes.join('\n');
              navigator.clipboard.writeText(codes);
              alert('Backup codes copied to clipboard');
            }}
          >
            Copy to Clipboard
          </Button>
        </div>
      </div>
      
      <div className="mt-6">
        <Button
          onClick={handleComplete}
          isLoading={isSubmitting}
          fullWidth
        >
          Complete Setup
        </Button>
      </div>
    </>
  );
  
  return (
    <AuthCard
      title="Two-Factor Authentication Setup"
      subtitle={
        step === 1 ? 'Enhance your account security' : 
        step === 2 ? 'Scan the QR code with your authenticator app' :
        'Save your backup codes'
      }
    >
      {step === 1 && renderIntroStep()}
      {step === 2 && renderQrStep()}
      {step === 4 && renderBackupCodesStep()}
    </AuthCard>
  );
}
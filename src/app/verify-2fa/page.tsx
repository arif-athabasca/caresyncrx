'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Two-factor authentication verification page for login
 */

import React, { useState, FormEvent, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthCard } from '../components/auth/AuthCard';
import { AuthInput } from '../components/auth/AuthInput';
import Link from 'next/link';
import { useAuth } from '../../auth/hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

// Loading fallback component
function LoadingVerification() {
  return (
    <AuthCard title="Verification">
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    </AuthCard>
  );
}

// Actual verification component that uses searchParams
function Verify2FAContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tempToken = searchParams.get('token');
  
  // Redirect if no token is provided
  useEffect(() => {
    if (!tempToken) {
      router.push('/login');
    }
  }, [tempToken, router]);
  
  // State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number>(5);
  // Use the auth hook
  const { verify2FALogin } = useAuth();

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!tempToken) {
      setError('Invalid session. Please login again.');
      return;
    }
    
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit verification code');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await verify2FALogin(tempToken, verificationCode, true);
      
      if (result.success) {
        // Successful verification - redirect to dashboard or requested page
        router.push('/dashboard');
      } else {
        setError(result.error || 'Invalid verification code. Please try again.');
        setRemainingAttempts((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError('An unexpected error occurred. Please try again.');
      setRemainingAttempts((prev) => Math.max(0, prev - 1));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle input change
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, ''); // Allow only digits
    if (value.length <= 6) {
      setVerificationCode(value);
      setError(null);
    }
  };
  
  // If all attempts used, show locked message
  if (remainingAttempts === 0) {
    return (
      <AuthCard
        title="Too many attempts"
        subtitle="Account verification locked"
      >
        <div className="text-center py-4">
          <Alert severity="error" title="Account Locked" className="mb-4">
            <p>
              You have made too many incorrect attempts. For security reasons, please try again later or contact support.
            </p>
          </Alert>
          <Button
            variant="outline"
            as={Link}
            href="/login"
          >
            Return to login
          </Button>
        </div>
      </AuthCard>
    );
  }
  
  return (
    <AuthCard
      title="Two-Factor Verification"
      subtitle="Enter the verification code from your authenticator app"
    >
      {error && (
        <Alert severity="error" className="mb-4">
          <p>{error}</p>
        </Alert>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <AuthInput
          id="verificationCode"
          name="verificationCode"
          label="Verification Code"
          type="text"
          value={verificationCode}
          onChange={handleCodeChange}
          placeholder="Enter your 6-digit code"
          autoComplete="one-time-code"
          required
          maxLength={6}
          pattern="\d{6}"
          inputMode="numeric"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          }
        />
        
        {remainingAttempts < 5 && (
          <Alert severity="warning" className="text-sm">
            {remainingAttempts} attempt{remainingAttempts !== 1 && 's'} remaining
          </Alert>
        )}
        
        <div className="text-sm text-gray-600">
          <p>Don&apos;t have access to your authenticator app?</p>
          <p className="mt-1">
            You can use one of your{' '}
            <button
              type="button"
              className="text-primary-600 hover:text-primary-500"
              onClick={() => setError("Enter your backup code in the format XXXXX-XXXXX")}
            >
              backup codes
            </button>{' '}
            instead.
          </p>
        </div>
        
        <div>
          <Button
            type="submit"
            disabled={isLoading || !verificationCode}
            isLoading={isLoading}
            fullWidth
          >
            {isLoading ? 'Verifying...' : 'Verify'}
          </Button>
        </div>
        
        <div className="text-center">
          <Button 
            as={Link} 
            href="/login" 
            variant="text" 
            size="sm"
          >
            Cancel and return to login          </Button>
        </div>
      </form>
    </AuthCard>
  );
}

// Export the page component with proper Suspense boundary
export default function Verify2FAPage() {
  return (
    <Suspense fallback={<LoadingVerification />}>
      <Verify2FAContent />
    </Suspense>
  );
}

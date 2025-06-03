'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Reset password page for changing user password
 */

import React, { useState, FormEvent, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthCard } from '../components/auth/AuthCard';
import { AuthInput } from '../components/auth/AuthInput';
import { PasswordValidator } from '../../auth/utils/password-validator';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { Progress } from '../components/ui/Progress';

// Loading fallback component
function LoadingResetPassword() {
  return (
    <AuthCard title="Reset Password">
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    </AuthCard>
  );
}

// Main component that uses searchParams
function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');
  
  // Form state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetComplete, setIsResetComplete] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  
  // Validate token on page load
  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token');
    }
  }, [token]);
  
  // Update password strength and validation errors on change
  useEffect(() => {
    if (password) {
      const strength = PasswordValidator.calculatePasswordStrength(password);
      setPasswordStrength(strength);
      setPasswordErrors(PasswordValidator.getValidationErrors(password));
    } else {
      setPasswordStrength(0);
      setPasswordErrors([]);
    }
  }, [password]);
  
  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validate passwords
    if (!password || !confirmPassword) {
      setError('Both password fields are required');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (passwordErrors.length > 0) {
      setError('Please fix the password requirements');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Call the password reset API
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password,
          confirmPassword
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }
      
      // Show success message and redirect after a delay
      setIsResetComplete(true);
      
      // For testing purposes, redirect to login after a delay
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      console.error('Password reset error:', err);
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Get strength label based on password strength score
  const getStrengthLabel = () => {
    if (passwordStrength < 30) return 'Weak';
    if (passwordStrength < 60) return 'Moderate';
    return 'Strong';
  };
  
  return (
    <AuthCard
      title="Reset Password"
      subtitle="Choose a new secure password for your account"
      footer={
        <p className="text-center text-sm text-gray-600">
          Remember your password?{' '}
          <Link href="/login" className="text-primary-600 hover:text-primary-500">
            Back to login
          </Link>
        </p>
      }
    >
      {isResetComplete ? (
        <Alert severity="success" title="Password reset successful">
          <p>
            Your password has been successfully reset.
            <span className="block mt-2">
              Redirecting to login page...
            </span>
          </p>
        </Alert>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && (
            <Alert severity="error" title="Error" className="mb-4">
              <p>{error}</p>
            </Alert>
          )}
          
          <AuthInput
            id="password"
            name="password"
            label="New Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="••••••••••••"
            required
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            }
          />
          
          {/* Password strength meter */}
          {password && (
            <>
              <div className="mt-2 mb-4">
                <Progress 
                  value={passwordStrength} 
                  label="Password strength" 
                  valueFormatter={() => getStrengthLabel()}
                  showValue
                />
              </div>
              
              {passwordErrors.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-gray-700 mb-1">Password must:</h4>
                  <ul className="text-xs text-gray-600 ml-4 list-disc">
                    {passwordErrors.map((error, index) => (
                      <li key={index} className="text-red-600">{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
          
          <AuthInput
            id="confirmPassword"
            name="confirmPassword"
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="••••••••••••"
            required
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            }
          />
          
          <div className="mt-6">
            <Button
              type="submit"
              disabled={isSubmitting || !token}
              isLoading={isSubmitting}
              fullWidth
            >
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
            </Button>
          </div>
        </form>
      )}
    </AuthCard>
  );
}

// Default export with Suspense
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingResetPassword />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
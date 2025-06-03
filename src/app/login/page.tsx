'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Login page for user authentication
 */

import React, { useState, FormEvent, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthCard } from '../components/auth/AuthCard';
import { AuthInput } from '../components/auth/AuthInput';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { useAuth } from '../../auth/hooks/useAuth';
import { UserRole } from '@/auth';

// Loading fallback component
function LoadingLogin() {
  return (
    <AuthCard 
      title="Sign in to your account"
      subtitle="Access your CareSyncRx dashboard"
    >
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    </AuthCard>
  );
}

// Main component that uses searchParams
function LoginContent() {
  const { login, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get redirect URL from query params if present
  const redirect = searchParams.get('redirect') || '/dashboard';
  // Check if user was logged out due to session timeout
  const timeout = searchParams.get('timeout');
  const error = searchParams.get('error');
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    form?: string;
    info?: string;
  }>({});
    // Show session timeout message if applicable
  useEffect(() => {
    if (timeout === 'true') {
      setErrors({
        info: 'Your session has expired due to inactivity. Please log in again to continue.'
      });
    } else if (error === 'logout') {
      setErrors({
        info: 'There was an issue with your session. Please log in again.'
      });
    } else if (timeout) {
      setErrors({
        info: 'Your session has ended. Please log in again.'
      });
    }
  }, [timeout, error]);
  
  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    
    // Clear field-specific error when user types
    if (errors[name as keyof typeof errors]) {
      setErrors({
        ...errors,
        [name]: undefined
      });
    }
  };
  
  // Validate form fields
  const validateForm = () => {
    const newErrors: typeof errors = {};
    
    // Validate email
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email address is invalid';
    }
    
    // Validate password
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Clear any previous form errors
    setErrors({});
    
    // Validate the form
    if (!validateForm()) {
      return;
    }
    
    try {
      // Attempt login
      const result = await login(formData.email, formData.password);
      
      // Check if 2FA is required
      if (result.requiresTwoFactor) {
        // Generate temporary token for 2FA verification
        const twoFactorResponse = await fetch('/api/auth/temp-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: result.user.id,
            deviceId: window.navigator.userAgent // Using user agent as simple device ID
          }),
        });
        
        if (!twoFactorResponse.ok) {
          throw new Error('Failed to generate verification token');
        }
        
        const twoFactorData = await twoFactorResponse.json();
        
        // Redirect to 2FA verification page with the token
        router.push(`/verify-2fa?token=${twoFactorData.token}`);
        return;
      }      // Successful login without 2FA - determine correct redirect based on user role
      if (result.user.role === UserRole.ADMIN) {
        // Redirect admin users to the admin dashboard with cache-busting parameter
        const timestamp = Date.now();
        
        // Check if we have a stored path from a previous session
        let targetPath = '/admin/dashboard';
        if (typeof sessionStorage !== 'undefined') {
          const lastPath = sessionStorage.getItem('lastAuthenticatedPath');
          if (lastPath && lastPath.startsWith('/admin')) {
            targetPath = lastPath;
          }
        }
        
        // Use replace instead of push for better back-button behavior
        router.replace(`${targetPath}?t=${timestamp}`);
      } else {
        // Redirect other users to the regular dashboard or requested page with cache-busting
        const timestamp = Date.now();
        
        // Check if we have a stored path from a previous session
        let targetPath = redirect === '/dashboard' ? redirect : redirect;
        if (typeof sessionStorage !== 'undefined') {
          const lastPath = sessionStorage.getItem('lastAuthenticatedPath');
          if (lastPath && !lastPath.startsWith('/admin')) {
            targetPath = lastPath;
          }
        }
        
        router.replace(`${targetPath}?t=${timestamp}`);
      }
    } catch (err) {
      console.error('Login error:', err);
      
      // Handle specific error messages from the API
      if (err instanceof Error) {
        if (err.message.includes('Invalid credentials')) {
          setErrors({
            form: 'Invalid email or password'
          });
        } else if (err.message.includes('Account is locked')) {
          setErrors({
            form: 'Account is temporarily locked. Please try again later.'
          });
        } else {
          setErrors({
            form: 'Authentication failed. Please try again.'
          });
        }
      } else {
        setErrors({
          form: 'An unexpected error occurred. Please try again.'
        });
      }
    }
  };
  
  return (
    <AuthCard
      title="Sign in to your account"
      subtitle="Access your CareSyncRx dashboard"      footer={
        <p className="text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-primary-600 hover:text-primary-500">
            Register here
          </Link>
        </p>
      }
    >      {errors.form && (
        <Alert 
          severity="error" 
          title="Authentication Error" 
          className="mb-4"
        >
          <p>{errors.form}</p>
        </Alert>
      )}
      
      {errors.info && (
        <Alert 
          severity="info" 
          title="Session Information" 
          className="mb-4"
        >
          <p>{errors.info}</p>
        </Alert>
      )}
      
      <form onSubmit={handleSubmit}>
        <AuthInput
          id="email"
          name="email"
          label="Email Address"
          type="email"
          value={formData.email}
          onChange={handleChange}
          autoComplete="email"
          placeholder="yourname@example.com"
          required
          error={errors.email}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
          }
        />

        <AuthInput
          id="password"
          name="password"
          label="Password"
          value={formData.password}
          onChange={handleChange}
          autoComplete="current-password"
          required
          error={errors.password}
          isPassword={true}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          }        />

        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center">
            <input
              id="rememberMe"
              name="rememberMe"
              type="checkbox"
              checked={formData.rememberMe}
              onChange={handleChange}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
              Remember me
            </label>
          </div>

          <Link href="/forgot-password" className="text-sm text-primary-600 hover:text-primary-500">
            Forgot password?
          </Link>
        </div>
        <div className="mt-6">
          <Button
            type="submit"
            disabled={isLoading}
            isLoading={isLoading}
            fullWidth          >
            Sign in
          </Button>
        </div>
      </form>
    </AuthCard>
  );
}

// Default export with Suspense
export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingLogin />}>
      <LoginContent />
    </Suspense>
  );
}
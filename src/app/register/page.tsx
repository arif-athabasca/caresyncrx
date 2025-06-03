'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Registration page for new user accounts
 */

import React, { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthCard } from '../components/auth/AuthCard';
import { AuthInput } from '../components/auth/AuthInput';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { useAuth } from '../../auth/hooks/useAuth';
import { UserRole } from '@/auth';
import { passwordSchema } from '../../auth/utils/password-validator';

export default function RegisterPage() {
  const { register, isLoading } = useAuth();
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: UserRole.NURSE as UserRole, // Default role
    clinicId: '', // This would ideally come from a clinic selection dropdown
    agreeToTerms: false
  });

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    clinicId?: string;
    agreeToTerms?: string;
    form?: string;
  }>({});

  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
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
    
    // Validate password using schema
    try {
      passwordSchema.parse(formData.password);
    } catch (err: any) {
      newErrors.password = err.errors?.[0]?.message || 'Password does not meet requirements';
    }
    
    // Validate password confirmation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    // Validate clinic ID
    if (!formData.clinicId) {
      newErrors.clinicId = 'Clinic ID is required';
    }
    
    // Validate terms agreement
    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the Terms and Conditions';
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
      // Register the user
      const result = await register(
        formData.email,
        formData.password,
        formData.role,
        formData.clinicId
      );
      
      // Successful registration - redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      console.error('Registration error:', err);
      
      // Handle specific error messages from the API
      if (err instanceof Error) {
        if (err.message.includes('Email is already registered') || 
            err.message.includes('User already exists')) {
          setErrors({
            email: 'This email is already registered'
          });
        } else if (err.message.includes('Password does not meet')) {
          setErrors({
            password: 'Password does not meet security requirements'
          });
        } else if (err.message.includes('Clinic ID is required')) {
          setErrors({
            clinicId: 'Valid clinic ID is required'
          });
        } else {
          setErrors({
            form: 'Registration failed. Please try again.'
          });
        }
      } else {
        setErrors({
          form: 'An unexpected error occurred. Please try again.'
        });
      }
    }
  };

  // Password requirements help text
  const passwordRequirements = 
    'Password must be at least 12 characters and include an uppercase letter, ' +
    'lowercase letter, number, and special character.';

  return (
    <AuthCard
      title="Create your account"
      subtitle="Sign up for CareSyncRx"
      footer={
        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-primary-600 hover:text-primary-500">
            Sign in
          </Link>
        </p>
      }
    >      {errors.form && (
        <Alert 
          severity="error" 
          title="Registration Error" 
          className="mb-4"
        >
          <p>{errors.form}</p>
        </Alert>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
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
          autoComplete="new-password"
          required
          error={errors.password}
          helperText={passwordRequirements}
          isPassword={true}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          }
        />

        <AuthInput
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm Password"
          value={formData.confirmPassword}
          onChange={handleChange}
          autoComplete="new-password"
          required
          error={errors.confirmPassword}
          isPassword={true}
        />

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
            Role
          </label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 py-2 px-3 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value={UserRole.NURSE}>Nurse</option>
            <option value={UserRole.DOCTOR}>Doctor</option>
            <option value={UserRole.PHARMACIST}>Pharmacist</option>
            <option value={UserRole.ADMIN}>Administrator</option>
          </select>
        </div>

        <AuthInput
          id="clinicId"
          name="clinicId"
          label="Clinic ID"
          value={formData.clinicId}
          onChange={handleChange}
          placeholder="Enter your clinic ID"
          required
          error={errors.clinicId}
          helperText="You should have received this from your clinic administrator"
        />

        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="agreeToTerms"
              name="agreeToTerms"
              type="checkbox"
              checked={formData.agreeToTerms}
              onChange={handleChange}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="agreeToTerms" className={`font-medium ${errors.agreeToTerms ? 'text-red-600' : 'text-gray-700'}`}>
              I agree to the Terms and Conditions and Privacy Policy
            </label>
            {errors.agreeToTerms && (
              <p className="text-red-600">{errors.agreeToTerms}</p>
            )}
          </div>
        </div>        <div className="mt-6">
          <Button
            type="submit"
            disabled={isLoading}
            isLoading={isLoading}
            fullWidth
          >
            Create Account
          </Button>
        </div>
      </form>
    </AuthCard>
  );
}
'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Provider Selection Component
 * - Dropdown for selecting healthcare providers
 * - Filters by role, clinic, and status
 * - Shows real-time availability information
 */

import React, { useState, useEffect } from 'react';
import { UserRole } from '@/enums';
import { Select } from './FormElements';

export interface Provider {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  specialty?: string;
  isAvailable?: boolean;
  clinicId?: string;
}

export interface ProviderSelectProps {
  value?: string;
  onChange: (providerId: string, provider?: Provider) => void;
  roles?: UserRole[];
  clinicId?: string;
  label?: string;
  placeholder?: string;
  showStatus?: boolean;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
}

/**
 * Provider selection dropdown component
 */
export function ProviderSelect({
  value,
  onChange,
  roles = [UserRole.DOCTOR, UserRole.NURSE, UserRole.PHARMACIST],
  clinicId,
  label = "Select Provider",
  placeholder = "Choose a provider...",
  showStatus = false,
  required = false,
  disabled = false,
  error,
  helperText,
  className = '',
}: ProviderSelectProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch providers when component mounts or dependencies change
  useEffect(() => {
    const fetchProviders = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        
        // Add role filters
        if (roles && roles.length > 0) {
          roles.forEach(role => params.append('roles', role));
        }
        
        // Add clinic filter
        if (clinicId) {
          params.append('clinicId', clinicId);
        }

        const response = await fetch(`/api/admin/providers?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch providers');
        }

        const data = await response.json();
        setProviders(data.providers || []);
      } catch (error) {
        console.error('Error fetching providers:', error);
        setProviders([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProviders();
  }, [roles, clinicId]);

  // Handle selection change
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const providerId = e.target.value;
    const selectedProvider = providers.find(p => p.id === providerId);
    onChange(providerId, selectedProvider);
  };

  // Format provider display name
  const formatProviderName = (provider: Provider) => {
    const name = `${provider.firstName} ${provider.lastName}`;
    const specialty = provider.specialty ? ` - ${provider.specialty}` : '';
    const status = showStatus && provider.isAvailable !== undefined 
      ? ` (${provider.isAvailable ? 'Available' : 'Unavailable'})` 
      : '';
    
    return `${name}${specialty}${status}`;
  };

  // Create options for the select
  const options = [
    { value: '', label: placeholder },
    ...providers.map(provider => ({
      value: provider.id,
      label: formatProviderName(provider)
    }))
  ];

  return (
    <div className={className}>
      <Select
        id="provider-select"
        label={label}
        value={value || ''}
        onChange={handleChange}
        options={options}
        required={required}
        disabled={disabled || isLoading}
        error={error}
        helperText={isLoading ? 'Loading providers...' : helperText}
      />
    </div>
  );
}
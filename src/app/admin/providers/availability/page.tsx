'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Provider Availability Management Page
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ClinicalLayout from '../../../components/layout/ClinicalLayout';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../../auth/hooks/useAuth';
import { UserRole } from '@/enums';
import { withRoleProtection } from '../../../../auth/components/withRoleProtection';
import { Card } from '../../triage/components/TriageCard';
import { Badge } from '../../triage/components/TriageBadge';
import { Input, Select } from '../../triage/components/TriageFormElements';

interface Provider {
  id: string;
  email: string;
  role: string;
  specialties: Array<{
    specialty: string;
    expertise: string[];
  }>;
  availability: Array<{
    id: string;
    dayOfWeek: number;
    isAvailable: boolean;
    startTime: string;
    endTime: string;
    maxPatients: number;
  }>;
  currentWorkload: number;
  availabilityStatus: string;
  nextAvailable: string | null;
}

interface AvailabilitySlot {
  dayOfWeek: number;
  isAvailable: boolean;
  startTime: string;
  endTime: string;
  maxPatients: number;
}

function ProviderAvailabilityPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [editingAvailability, setEditingAvailability] = useState<AvailabilitySlot[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  const daysOfWeek = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];

  // Load providers and availability
  useEffect(() => {
    if (!authLoading && user) {
      fetchProviders();
    }
  }, [authLoading, user]);

  const fetchProviders = async () => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/admin/providers/availability', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch providers: ${response.status}`);
      }

      const result = await response.json();
      setProviders(result.data || []);
    } catch (error) {
      console.error('Error fetching providers:', error);
      alert('Failed to load provider availability');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    const provider = providers.find(p => p.id === providerId);
    if (provider) {
      // Initialize editing availability with current schedule or default schedule
      const currentAvailability = provider.availability.length > 0 
        ? provider.availability.map(slot => ({
            dayOfWeek: slot.dayOfWeek,
            isAvailable: slot.isAvailable,
            startTime: slot.startTime,
            endTime: slot.endTime,
            maxPatients: slot.maxPatients
          }))
        : daysOfWeek.map((_, index) => ({
            dayOfWeek: index,
            isAvailable: index >= 1 && index <= 5, // Default Mon-Fri available
            startTime: '09:00',
            endTime: '17:00',
            maxPatients: 8
          }));
      
      setEditingAvailability(currentAvailability);
    }
    setIsEditing(false);
  };

  const updateAvailabilitySlot = (dayIndex: number, field: keyof AvailabilitySlot, value: any) => {
    setEditingAvailability(prev => 
      prev.map((slot, index) => 
        index === dayIndex 
          ? { ...slot, [field]: value }
          : slot
      )
    );
  };

  const saveAvailability = async () => {
    if (!selectedProvider) return;

    try {
      setIsLoading(true);

      const response = await fetch('/api/admin/providers/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        credentials: 'include',
        body: JSON.stringify({
          providerId: selectedProvider,
          availability: editingAvailability
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update availability: ${response.status}`);
      }

      // Refresh providers list
      await fetchProviders();
      setIsEditing(false);
      alert('Provider availability updated successfully!');
    } catch (error) {
      console.error('Error updating availability:', error);
      alert('Failed to update provider availability');
    } finally {
      setIsLoading(false);
    }
  };

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'available': return 'green';
      case 'busy': return 'yellow';
      case 'unavailable': return 'red';
      default: return 'gray';
    }
  };

  const getWorkloadColor = (workload: number, maxCapacity: number = 8) => {
    const percentage = (workload / maxCapacity) * 100;
    if (percentage >= 90) return 'red';
    if (percentage >= 70) return 'yellow';
    return 'green';
  };

  if (authLoading) {
    return (
      <ClinicalLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </ClinicalLayout>
    );
  }

  return (
    <ClinicalLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Provider Availability Management</h1>
          <Button 
            variant="outline" 
            onClick={() => router.push('/admin/dashboard')}
          >
            Back to Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Provider List */}
          <Card>
            <Card.Header>
              <Card.Title>Providers</Card.Title>
            </Card.Header>
            <Card.Body>
              <div className="space-y-3">
                {providers.map(provider => (
                  <div 
                    key={provider.id}
                    className={`p-3 border rounded cursor-pointer transition-colors ${
                      selectedProvider === provider.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => handleProviderSelect(provider.id)}
                  >
                    <div className="font-medium">{provider.email}</div>
                    <div className="text-sm text-gray-600">{provider.role}</div>
                    {provider.specialties.length > 0 && (
                      <div className="text-sm text-gray-500">
                        {provider.specialties.map(s => s.specialty).join(', ')}
                      </div>
                    )}
                    <div className="flex justify-between items-center mt-2">
                      <Badge color={getAvailabilityColor(provider.availabilityStatus)}>
                        {provider.availabilityStatus}
                      </Badge>
                      <Badge color={getWorkloadColor(provider.currentWorkload)}>
                        {provider.currentWorkload} patients
                      </Badge>
                    </div>
                    {provider.nextAvailable && (
                      <div className="text-xs text-gray-500 mt-1">
                        Next: {provider.nextAvailable}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>

          {/* Availability Schedule */}
          <Card className="lg:col-span-2">
            <Card.Header>
              <div className="flex justify-between items-center">
                <Card.Title>
                  {selectedProvider 
                    ? `Schedule: ${providers.find(p => p.id === selectedProvider)?.email}`
                    : 'Select a Provider'
                  }
                </Card.Title>
                {selectedProvider && (
                  <div className="flex space-x-2">
                    {isEditing ? (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setIsEditing(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          size="sm"
                          onClick={saveAvailability}
                          disabled={isLoading}
                        >
                          Save
                        </Button>
                      </>
                    ) : (
                      <Button 
                        size="sm"
                        onClick={() => setIsEditing(true)}
                      >
                        Edit Schedule
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card.Header>
            <Card.Body>
              {selectedProvider ? (
                <div className="space-y-4">
                  {editingAvailability.map((slot, index) => (
                    <div key={index} className="border rounded p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{daysOfWeek[slot.dayOfWeek]}</h4>
                        <div className="flex items-center space-x-2">
                          <label className="text-sm">Available:</label>
                          <input
                            type="checkbox"
                            checked={slot.isAvailable}
                            onChange={(e) => updateAvailabilitySlot(index, 'isAvailable', e.target.checked)}
                            disabled={!isEditing}
                            className="rounded"
                          />
                        </div>
                      </div>
                      
                      {slot.isAvailable && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Start Time
                            </label>
                            <Input
                              type="time"
                              value={slot.startTime}
                              onChange={(e) => updateAvailabilitySlot(index, 'startTime', e.target.value)}
                              disabled={!isEditing}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              End Time
                            </label>
                            <Input
                              type="time"
                              value={slot.endTime}
                              onChange={(e) => updateAvailabilitySlot(index, 'endTime', e.target.value)}
                              disabled={!isEditing}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Max Patients
                            </label>
                            <Input
                              type="number"
                              min="1"
                              max="20"
                              value={slot.maxPatients}
                              onChange={(e) => updateAvailabilitySlot(index, 'maxPatients', parseInt(e.target.value))}
                              disabled={!isEditing}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Select a provider to view and edit their availability schedule
                </div>
              )}
            </Card.Body>
          </Card>
        </div>

        {/* Provider Overview Stats */}
        <Card className="mt-6">
          <Card.Header>
            <Card.Title>Provider Overview</Card.Title>
          </Card.Header>
          <Card.Body>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {providers.filter(p => p.availabilityStatus === 'available').length}
                </div>
                <div className="text-sm text-gray-600">Available Now</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {providers.filter(p => p.availabilityStatus === 'busy').length}
                </div>
                <div className="text-sm text-gray-600">Busy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {providers.filter(p => p.availabilityStatus === 'unavailable').length}
                </div>
                <div className="text-sm text-gray-600">Unavailable</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {providers.reduce((sum, p) => sum + p.currentWorkload, 0)}
                </div>
                <div className="text-sm text-gray-600">Total Active Patients</div>
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>
    </ClinicalLayout>
  );
}

export default withRoleProtection(ProviderAvailabilityPage, {
  allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  fallbackComponent: () => (
    <ClinicalLayout>
      <div className="text-center py-8">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p className="mt-4">You do not have permission to manage provider availability.</p>
      </div>
    </ClinicalLayout>
  )
});

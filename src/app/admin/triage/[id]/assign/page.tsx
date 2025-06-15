'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Triage Assignment Page - Assign providers to triage cases
 */

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ClinicalLayout from '../../../../components/layout/ClinicalLayout';
import { Button } from '../../../../components/ui/Button';
import { useAuth } from '../../../../../auth/hooks/useAuth';
import { UserRole } from '@/enums';
import { withRoleProtection } from '../../../../../auth/components/withRoleProtection';
import { Card } from '../../../../components/ui/Card';
import { Badge, BadgeProps } from '../../../../components/ui/Badge';

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface TriageDetails {
  id: string;
  Patient: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
  };
  symptoms: string;
  urgencyLevel: string;
  status: string;
  aiSuggestion: any;
  createdAt: string;
  assignedToId?: string;
  User_PatientTriage_assignedToIdToUser?: {
    id: string;
    email: string;
    role: string;
  };
}

interface Provider {
  id: string;
  email: string;
  role: string;
  specialties: Array<{
    specialty: string;
    expertise: string[];
  }>;
  availability: Array<{
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

function TriageAssignmentPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const triageId = params.id as string;
  
  const [isLoading, setIsLoading] = useState(false);
  const [triage, setTriage] = useState<TriageDetails | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [assignmentReason, setAssignmentReason] = useState('');
  const [scheduledDateTime, setScheduledDateTime] = useState('');

  // Load triage details and available providers
  useEffect(() => {
    if (!authLoading && user && triageId) {
      fetchTriageDetails();
      fetchAvailableProviders();
    }
  }, [authLoading, user, triageId]);
  const fetchTriageDetails = async () => {
    try {
      const response = await fetch(`/api/admin/triage/${triageId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch triage: ${response.status}`);
      }

      const result = await response.json();
      setTriage(result.data);
    } catch (error) {
      console.error('Error fetching triage details:', error);
      alert('Failed to load triage details');
    }
  };

  const fetchAvailableProviders = async () => {
    try {
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
      alert('Failed to load available providers');
    }
  };

  const assignProvider = async () => {
    if (!selectedProvider) {
      alert('Please select a provider');
      return;
    }

    if (!assignmentReason.trim()) {
      alert('Please provide a reason for this assignment');
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(`/api/admin/triage/${triageId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        credentials: 'include',
        body: JSON.stringify({
          providerId: selectedProvider,
          assignmentReason: assignmentReason,
          scheduledDateTime: scheduledDateTime || undefined
        })
      });

      if (!response.ok) {
        throw new Error(`Assignment failed: ${response.status}`);
      }

      const result = await response.json();
      
      setIsLoading(false);
      alert('Provider assigned successfully!');
      router.push('/admin/dashboard?tab=triage');
      
    } catch (error) {
      console.error('Error assigning provider:', error);
      setIsLoading(false);
      alert('Failed to assign provider. Please try again.');
    }
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

  if (!triage) {
    return (
      <ClinicalLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading triage details...</div>
        </div>
      </ClinicalLayout>
    );
  }
  const getUrgencyVariant = (urgency: string): BadgeVariant => {
    switch (urgency) {
      case 'HIGH': return 'error';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'success';
      default: return 'info';
    }
  };

  const getAvailabilityVariant = (status: string): BadgeVariant => {
    switch (status) {
      case 'available': return 'success';
      case 'busy': return 'warning';
      case 'unavailable': return 'error';
      default: return 'neutral';
    }
  };

  return (
    <ClinicalLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Assign Provider to Triage</h1>
          <Button 
            variant="outline" 
            onClick={() => router.push('/admin/dashboard?tab=triage')}
          >
            Back to Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Triage Details */}
          <Card title="Triage Details">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient</label>
                <div className="text-lg font-medium">
                  {triage.Patient.firstName} {triage.Patient.lastName}
                </div>
                <div className="text-sm text-gray-600">ID: {triage.Patient.id}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Urgency Level</label>
                <Badge variant={getUrgencyVariant(triage.urgencyLevel)}>
                  {triage.urgencyLevel}
                </Badge>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <Badge variant={triage.status === 'PENDING' ? 'warning' : 'info'}>
                  {triage.status}
                </Badge>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Symptoms</label>
                <div className="p-3 bg-gray-50 rounded border text-sm">
                  {triage.symptoms}
                </div>
              </div>

              {triage.aiSuggestion && triage.aiSuggestion.analysis && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">AI Analysis</label>
                  <div className="p-3 bg-blue-50 rounded border text-sm">
                    {triage.aiSuggestion.analysis}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                <div className="text-sm text-gray-600">
                  {new Date(triage.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          </Card>

          {/* Provider Assignment */}
          <Card 
            title="Assign Provider"
            footer={
              <div className="flex justify-end space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/admin/dashboard?tab=triage')}
                >
                  Cancel
                </Button>
                <Button
                  onClick={assignProvider}
                  disabled={!selectedProvider || !assignmentReason.trim() || isLoading}
                  isLoading={isLoading}
                >
                  Assign Provider
                </Button>
              </div>
            }
          >
            <div className="space-y-4">              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Provider</label>
                <select
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={selectedProvider}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedProvider(e.target.value)}
                >
                  <option value="">Choose a provider...</option>
                  {providers.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.email} - {provider.role} 
                      {provider.specialties.length > 0 && ` (${provider.specialties[0].specialty})`}
                      - {provider.availabilityStatus.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProvider && (
                <div className="border rounded p-3 bg-gray-50">
                  {providers.filter(p => p.id === selectedProvider).map(provider => (
                    <div key={provider.id} className="space-y-2">
                      <div className="font-medium">{provider.email}</div>
                      <div className="text-sm">Role: {provider.role}</div>
                      {provider.specialties.length > 0 && (
                        <div className="text-sm">
                          Specialty: {provider.specialties.map(s => s.specialty).join(', ')}
                        </div>
                      )}                        <div className="flex items-center space-x-2">
                        <Badge variant={getAvailabilityVariant(provider.availabilityStatus)}>
                          {provider.availabilityStatus}
                        </Badge>
                        <span className="text-sm">
                          Workload: {provider.currentWorkload} patients
                        </span>
                      </div>
                      {provider.nextAvailable && (
                        <div className="text-sm text-gray-600">
                          Next available: {provider.nextAvailable}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assignment Reason</label>
                <textarea
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Explain why this provider is being assigned to this case..."
                  rows={3}
                  value={assignmentReason}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAssignmentReason(e.target.value)}
                />
              </div>              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scheduled Appointment (Optional)
                </label>
                <input
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  type="datetime-local"
                  value={scheduledDateTime}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setScheduledDateTime(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
                <div className="text-xs text-gray-500 mt-1">
                  If provided, a care action will be created for this appointment
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* AI Recommended Providers */}
        {triage.aiSuggestion && triage.aiSuggestion.providers && triage.aiSuggestion.providers.length > 0 && (
          <Card title="AI Recommended Providers" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {triage.aiSuggestion.providers.map((aiProvider: any) => (
                <div key={aiProvider.id} className="border rounded p-3 bg-blue-50">
                  <div className="font-medium">{aiProvider.name}</div>
                  <div className="text-sm text-gray-600">{aiProvider.role}</div>
                  <div className="text-sm">{aiProvider.specialty}</div>
                  <div className="text-sm mt-1">
                    <span className="font-medium">Confidence:</span> {aiProvider.confidence}%
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Reason:</span> {aiProvider.reason}
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="mt-2"
                    onClick={() => {
                      setSelectedProvider(aiProvider.id);
                      setAssignmentReason(`AI recommended: ${aiProvider.reason}`);
                    }}
                  >
                    Select This Provider
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </ClinicalLayout>
  );
}

export default withRoleProtection(TriageAssignmentPage, {
  allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  redirectTo: '/unauthorized'
});

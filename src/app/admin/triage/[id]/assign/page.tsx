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
import { Card } from '../../components/TriageCard';
import { Badge } from '../../components/TriageBadge';
import { Input, Textarea, Select } from '../../components/TriageFormElements';

interface TriageDetails {
  id: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
  };
  symptoms: string;
  urgencyLevel: string;
  status: string;
  aiSuggestion: any;
  createdAt: string;
  assignedTo?: {
    id: string;
    email: string;
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
      const response = await fetch(`/api/admin/triage/${triageId}/assign`, {
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

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'HIGH': return 'red';
      case 'MEDIUM': return 'yellow';
      case 'LOW': return 'green';
      default: return 'blue';
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
          <Card>
            <Card.Header>
              <Card.Title>Triage Details</Card.Title>
            </Card.Header>
            <Card.Body>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Patient</label>
                  <div className="text-lg font-medium">
                    {triage.patient.firstName} {triage.patient.lastName}
                  </div>
                  <div className="text-sm text-gray-600">ID: {triage.patient.id}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Urgency Level</label>
                  <Badge color={getUrgencyColor(triage.urgencyLevel)}>
                    {triage.urgencyLevel}
                  </Badge>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <Badge color={triage.status === 'PENDING' ? 'yellow' : 'blue'}>
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
            </Card.Body>
          </Card>

          {/* Provider Assignment */}
          <Card>
            <Card.Header>
              <Card.Title>Assign Provider</Card.Title>
            </Card.Header>
            <Card.Body>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Provider</label>
                  <Select
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                  >
                    <option value="">Choose a provider...</option>
                    {providers.map(provider => (
                      <option key={provider.id} value={provider.id}>
                        {provider.email} - {provider.role} 
                        {provider.specialties.length > 0 && ` (${provider.specialties[0].specialty})`}
                        - {provider.availabilityStatus.toUpperCase()}
                      </option>
                    ))}
                  </Select>
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
                        )}
                        <div className="flex items-center space-x-2">
                          <Badge color={getAvailabilityColor(provider.availabilityStatus)}>
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
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assignment Reason</label>
                  <Textarea
                    placeholder="Explain why this provider is being assigned to this case..."
                    rows={3}
                    value={assignmentReason}
                    onChange={(e) => setAssignmentReason(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scheduled Appointment (Optional)
                  </label>
                  <Input
                    type="datetime-local"
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    If provided, a care action will be created for this appointment
                  </div>
                </div>
              </div>
            </Card.Body>
            <Card.Footer>
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
            </Card.Footer>
          </Card>
        </div>

        {/* AI Recommended Providers */}
        {triage.aiSuggestion && triage.aiSuggestion.providers && triage.aiSuggestion.providers.length > 0 && (
          <Card className="mt-6">
            <Card.Header>
              <Card.Title>AI Recommended Providers</Card.Title>
            </Card.Header>
            <Card.Body>
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
            </Card.Body>
          </Card>
        )}
      </div>
    </ClinicalLayout>
  );
}

export default withRoleProtection(TriageAssignmentPage, {
  allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  fallbackComponent: () => (
    <ClinicalLayout>
      <div className="text-center py-8">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p className="mt-4">You do not have permission to assign triage cases.</p>
      </div>
    </ClinicalLayout>
  )
});

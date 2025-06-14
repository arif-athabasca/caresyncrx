'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Triage Detail Page - View triage case details and management options
 */

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ClinicalLayout from '../../../components/layout/ClinicalLayout';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../../auth/hooks/useAuth';
import { UserRole } from '@/enums';
import { withRoleProtection } from '../../../../auth/components/withRoleProtection';
import { Card } from '../components/TriageCard';
import { Badge } from '../components/TriageBadge';

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
  updatedAt: string;
  assignedTo?: {
    id: string;
    email: string;
  };
  adminAssignedBy?: {
    id: string;
    email: string;
  };
  assignmentReason?: string;
  careActions: Array<{
    id: string;
    actionType: string;
    description: string;
    dueDate: string;
    status: string;
    completedAt?: string;
  }>;
}

function TriageDetailPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const triageId = params.id as string;
  
  const [isLoading, setIsLoading] = useState(false);
  const [triage, setTriage] = useState<TriageDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load triage details
  useEffect(() => {
    if (!authLoading && user && triageId) {
      fetchTriageDetails();
    }
  }, [authLoading, user, triageId]);

  const fetchTriageDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

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
      setError('Failed to load triage details');
    } finally {
      setIsLoading(false);
    }
  };

  const updateTriageStatus = async (newStatus: string) => {
    if (!triage) return;

    try {
      setIsLoading(true);

      const response = await fetch(`/api/admin/triage/${triageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        credentials: 'include',
        body: JSON.stringify({
          status: newStatus
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update status: ${response.status}`);
      }

      // Refresh triage details
      await fetchTriageDetails();
      alert(`Triage status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating triage status:', error);
      alert('Failed to update triage status');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <ClinicalLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </ClinicalLayout>
    );
  }

  if (error) {
    return (
      <ClinicalLayout>
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">{error}</div>
          <Button onClick={fetchTriageDetails} variant="outline">
            Retry
          </Button>
        </div>
      </ClinicalLayout>
    );
  }

  if (!triage) {
    return (
      <ClinicalLayout>
        <div className="text-center py-8">
          <div className="text-gray-600 mb-4">Triage not found</div>
          <Button onClick={() => router.push('/admin/dashboard?tab=triage')} variant="outline">
            Back to Dashboard
          </Button>
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'yellow';
      case 'ASSIGNED': return 'blue';
      case 'IN_PROGRESS': return 'purple';
      case 'COMPLETED': return 'green';
      case 'CANCELLED': return 'gray';
      default: return 'gray';
    }
  };

  return (
    <ClinicalLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Triage Case Details</h1>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => router.push('/admin/dashboard?tab=triage')}
            >
              Back to Queue
            </Button>
            {triage.status === 'PENDING' && user?.role === UserRole.ADMIN && (
              <Button as="a" href={`/admin/triage/${triageId}/assign`}>
                Assign Provider
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Triage Information */}
          <Card className="lg:col-span-2">
            <Card.Header>
              <Card.Title>Triage Information</Card.Title>
            </Card.Header>
            <Card.Body>
              <div className="space-y-6">
                {/* Patient Info */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Patient Information</h3>
                  <div className="bg-gray-50 p-4 rounded">
                    <div className="text-xl font-medium">
                      {triage.patient.firstName} {triage.patient.lastName}
                    </div>
                    <div className="text-sm text-gray-600">Patient ID: {triage.patient.id}</div>
                  </div>
                </div>

                {/* Symptoms */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Reported Symptoms</h3>
                  <div className="bg-gray-50 p-4 rounded">
                    <p className="text-gray-700">{triage.symptoms}</p>
                  </div>
                </div>

                {/* AI Analysis */}
                {triage.aiSuggestion && triage.aiSuggestion.analysis && (
                  <div>
                    <h3 className="text-lg font-medium mb-3">AI Analysis</h3>
                    <div className="bg-blue-50 p-4 rounded border-l-4 border-blue-400">
                      <p className="text-blue-900">{triage.aiSuggestion.analysis}</p>
                    </div>
                  </div>
                )}

                {/* Assignment Information */}
                {triage.assignedTo && (
                  <div>
                    <h3 className="text-lg font-medium mb-3">Assignment Details</h3>
                    <div className="bg-green-50 p-4 rounded">
                      <div><strong>Assigned to:</strong> {triage.assignedTo.email}</div>
                      {triage.adminAssignedBy && (
                        <div><strong>Assigned by:</strong> {triage.adminAssignedBy.email}</div>
                      )}
                      {triage.assignmentReason && (
                        <div className="mt-2">
                          <strong>Reason:</strong> {triage.assignmentReason}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Care Actions */}
                {triage.careActions && triage.careActions.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium mb-3">Care Actions</h3>
                    <div className="space-y-2">
                      {triage.careActions.map(action => (
                        <div key={action.id} className="border rounded p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium">{action.actionType}</div>
                              <div className="text-sm text-gray-600">{action.description}</div>
                              <div className="text-sm text-gray-500">
                                Due: {new Date(action.dueDate).toLocaleString()}
                              </div>
                            </div>
                            <Badge color={action.status === 'COMPLETED' ? 'green' : 'yellow'}>
                              {action.status}
                            </Badge>
                          </div>
                          {action.completedAt && (
                            <div className="text-sm text-gray-500 mt-1">
                              Completed: {new Date(action.completedAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>

          {/* Status and Actions */}
          <Card>
            <Card.Header>
              <Card.Title>Status & Actions</Card.Title>
            </Card.Header>
            <Card.Body>
              <div className="space-y-4">
                {/* Current Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Status</label>
                  <Badge color={getStatusColor(triage.status)} className="text-base px-3 py-1">
                    {triage.status}
                  </Badge>
                </div>

                {/* Urgency Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Urgency Level</label>
                  <Badge color={getUrgencyColor(triage.urgencyLevel)} className="text-base px-3 py-1">
                    {triage.urgencyLevel}
                  </Badge>
                </div>

                {/* Timestamps */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Timeline</label>
                  <div className="text-sm space-y-1">
                    <div><strong>Created:</strong> {new Date(triage.createdAt).toLocaleString()}</div>
                    <div><strong>Updated:</strong> {new Date(triage.updatedAt).toLocaleString()}</div>
                  </div>
                </div>

                {/* Status Actions */}
                {user?.role === UserRole.ADMIN && (
                  <div className="pt-4 border-t">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Update Status</label>
                    <div className="space-y-2">
                      {triage.status === 'ASSIGNED' && (
                        <Button 
                          variant="primary" 
                          size="sm" 
                          className="w-full"
                          onClick={() => updateTriageStatus('IN_PROGRESS')}
                          disabled={isLoading}
                        >
                          Mark In Progress
                        </Button>
                      )}
                      {(triage.status === 'ASSIGNED' || triage.status === 'IN_PROGRESS') && (
                        <Button 
                          variant="success" 
                          size="sm" 
                          className="w-full"
                          onClick={() => updateTriageStatus('COMPLETED')}
                          disabled={isLoading}
                        >
                          Mark Completed
                        </Button>
                      )}
                      {triage.status !== 'CANCELLED' && triage.status !== 'COMPLETED' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => updateTriageStatus('CANCELLED')}
                          disabled={isLoading}
                        >
                          Cancel Triage
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </div>

        {/* AI Recommended Providers (if available) */}
        {triage.aiSuggestion && triage.aiSuggestion.providers && triage.aiSuggestion.providers.length > 0 && (
          <Card className="mt-6">
            <Card.Header>
              <Card.Title>AI Provider Recommendations</Card.Title>
            </Card.Header>
            <Card.Body>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {triage.aiSuggestion.providers.map((provider: any) => (
                  <div key={provider.id} className="border rounded p-4 bg-blue-50">
                    <div className="font-medium">{provider.name}</div>
                    <div className="text-sm text-gray-600">{provider.role}</div>
                    <div className="text-sm">{provider.specialty}</div>
                    <div className="text-sm mt-2">
                      <span className="font-medium">Confidence:</span> {provider.confidence}%
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Reason:</span> {provider.reason}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Next Available:</span>{' '}
                      {new Date(provider.nextAvailable).toLocaleString()}
                    </div>
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

export default withRoleProtection(TriageDetailPage, {
  allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE],
  fallbackComponent: () => (
    <ClinicalLayout>
      <div className="text-center py-8">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p className="mt-4">You do not have permission to view triage details.</p>
      </div>
    </ClinicalLayout>
  )
});

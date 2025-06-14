'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Professional Scheduler Dashboard - Advanced scheduling and workload management
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ClinicalLayout from '@/app/components/layout/ClinicalLayout';
import { Button } from '@/app/components/ui/Button';
import { useAuth } from '@/auth/hooks/useAuth';
import { UserRole } from '@/enums';
import { withRoleProtection } from '@/auth/components/withRoleProtection';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';

interface ScheduleSlot {
  id: string;
  startTime: string;
  endTime: string;
  appointmentType: string;
  status: string;
  description?: string;
  location?: string;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  triage?: {
    id: string;
    urgencyLevel: string;
    symptoms: string;
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
  scheduleSlots: ScheduleSlot[];
  workload: {
    totalSlots: number;
    bookedSlots: number;
    availableSlots: number;
    utilizationRate: number;
  };
}

interface TriageAssignment {
  id: string;
  patient: {
    firstName: string;
    lastName: string;
  };
  urgencyLevel: string;
  status: string;
  assignedTo?: {
    email: string;
  };
  createdAt: string;
  scheduledTime?: string;
}

function SchedulerDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [viewMode, setViewMode] = useState<'calendar' | 'workload' | 'assignments'>('calendar');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [assignments, setAssignments] = useState<TriageAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      fetchScheduleData();
      fetchTriageAssignments();
    }
  }, [authLoading, user, selectedDate]);

  const fetchScheduleData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/schedule?date=${selectedDate}`, {
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (response.ok) {
        const result = await response.json();
        setProviders(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching schedule data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTriageAssignments = async () => {
    try {
      const response = await fetch(`/api/admin/triage?status=ASSIGNED&date=${selectedDate}`, {
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (response.ok) {
        const result = await response.json();
        setAssignments(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching triage assignments:', error);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'success';
      case 'BOOKED': return 'info';
      case 'BLOCKED': return 'error';
      case 'COMPLETED': return 'neutral';
      default: return 'neutral';
    }
  };

  const getUrgencyVariant = (urgency: string) => {
    switch (urgency) {
      case 'HIGH': return 'error';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'success';
      default: return 'info';
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const renderCalendarView = () => {
    const timeSlots = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
    
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Time Column */}
        <div className="lg:col-span-1">
          <Card title="Time Slots">
            <div className="space-y-2">
              {timeSlots.map(time => (
                <div key={time} className="py-3 border-b text-sm font-medium text-gray-600">
                  {time}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Providers Columns */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {providers.filter(p => !selectedProvider || p.id === selectedProvider).map(provider => (
              <Card 
                key={provider.id}
                title={provider.email.split('@')[0]}
                subtitle={provider.specialties.length > 0 ? provider.specialties[0].specialty : undefined}
                headerAction={<Badge variant="info">{provider.role}</Badge>}
              >
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {provider.scheduleSlots
                    .filter(slot => slot.startTime.startsWith(selectedDate))
                    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                    .map(slot => (
                      <div
                        key={slot.id}
                        className={`p-2 rounded text-xs border-l-4 ${
                          slot.status === 'AVAILABLE' ? 'bg-green-50 border-green-400' :
                          slot.status === 'BOOKED' ? 'bg-blue-50 border-blue-400' :
                          slot.status === 'BLOCKED' ? 'bg-red-50 border-red-400' :
                          'bg-gray-50 border-gray-400'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">
                            {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                          </span>
                          <Badge variant={getStatusVariant(slot.status)} size="sm">
                            {slot.status}
                          </Badge>
                        </div>
                        {slot.patient && (
                          <div className="mt-1">
                            <span className="font-medium">
                              {slot.patient.firstName} {slot.patient.lastName}
                            </span>
                          </div>
                        )}
                        {slot.triage && (
                          <div className="mt-1">
                            <Badge variant={getUrgencyVariant(slot.triage.urgencyLevel)} size="sm">
                              {slot.triage.urgencyLevel}
                            </Badge>
                            <div className="text-xs text-gray-600 mt-1 truncate">
                              {slot.triage.symptoms.substring(0, 50)}...
                            </div>
                          </div>
                        )}
                        {slot.description && (
                          <div className="text-xs text-gray-600 mt-1">
                            {slot.description}
                          </div>
                        )}
                        {slot.location && (
                          <div className="text-xs text-gray-500">
                            📍 {slot.location}
                          </div>
                        )}
                      </div>
                    ))}
                  {provider.scheduleSlots.filter(slot => slot.startTime.startsWith(selectedDate)).length === 0 && (
                    <div className="text-center text-gray-500 py-4">
                      No scheduled appointments
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderWorkloadView = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {providers.map(provider => (
          <Card 
            key={provider.id}
            title={provider.email.split('@')[0]}
            subtitle={provider.specialties.length > 0 ? provider.specialties.map(s => s.specialty).join(', ') : undefined}
            headerAction={<Badge variant="info">{provider.role}</Badge>}
          >
            <div className="space-y-4">
              {/* Utilization Rate */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Utilization Rate</span>
                  <span className="text-sm font-bold">
                    {provider.workload.utilizationRate.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${
                      provider.workload.utilizationRate > 80 ? 'bg-red-500' :
                      provider.workload.utilizationRate > 60 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, provider.workload.utilizationRate)}%` }}
                  />
                </div>
              </div>

              {/* Slot Statistics */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-blue-50 p-3 rounded">
                  <div className="text-lg font-bold text-blue-600">
                    {provider.workload.totalSlots}
                  </div>
                  <div className="text-xs text-blue-600">Total</div>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <div className="text-lg font-bold text-green-600">
                    {provider.workload.availableSlots}
                  </div>
                  <div className="text-xs text-green-600">Available</div>
                </div>
                <div className="bg-red-50 p-3 rounded">
                  <div className="text-lg font-bold text-red-600">
                    {provider.workload.bookedSlots}
                  </div>
                  <div className="text-xs text-red-600">Booked</div>
                </div>
              </div>

              {/* Today's Schedule Summary */}
              <div>
                <h4 className="font-medium mb-2">Today's Schedule</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {provider.scheduleSlots
                    .filter(slot => slot.startTime.startsWith(selectedDate) && slot.status === 'BOOKED')
                    .slice(0, 3)
                    .map(slot => (
                      <div key={slot.id} className="text-xs bg-gray-50 p-2 rounded">
                        <span className="font-medium">
                          {formatTime(slot.startTime)}
                        </span>
                        {slot.patient && (
                          <span className="ml-2">
                            {slot.patient.firstName} {slot.patient.lastName}
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  const renderAssignmentsView = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Assignments */}
        <Card title="Recent Triage Assignments">
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {assignments.map(assignment => (
              <div key={assignment.id} className="border rounded p-3 bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">
                      {assignment.patient.firstName} {assignment.patient.lastName}
                    </div>
                    <div className="text-sm text-gray-600">
                      Assigned to: {assignment.assignedTo?.email || 'Unassigned'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(assignment.createdAt).toLocaleDateString()} at{' '}
                      {new Date(assignment.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <Badge variant={getUrgencyVariant(assignment.urgencyLevel)}>
                      {assignment.urgencyLevel}
                    </Badge>
                    <Badge variant={assignment.status === 'ASSIGNED' ? 'info' : 'success'}>
                      {assignment.status}
                    </Badge>
                  </div>
                </div>
                {assignment.scheduledTime && (
                  <div className="mt-2 text-sm text-blue-600">
                    📅 Scheduled: {new Date(assignment.scheduledTime).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
            {assignments.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No triage assignments found for this date
              </div>
            )}
          </div>
        </Card>

        {/* Assignment Statistics */}
        <Card title="Assignment Statistics">
          <div className="space-y-4">
            {/* Urgency Distribution */}
            <div>
              <h4 className="font-medium mb-2">Urgency Distribution</h4>
              {['HIGH', 'MEDIUM', 'LOW'].map(urgency => {
                const count = assignments.filter(a => a.urgencyLevel === urgency).length;
                const percentage = assignments.length ? (count / assignments.length) * 100 : 0;
                
                return (
                  <div key={urgency} className="flex justify-between items-center mb-2">
                    <span className="text-sm">{urgency}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            urgency === 'HIGH' ? 'bg-red-500' :
                            urgency === 'MEDIUM' ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Provider Load */}
            <div>
              <h4 className="font-medium mb-2">Provider Load</h4>
              {providers.map(provider => {
                const assignedToProvider = assignments.filter(
                  a => a.assignedTo?.email === provider.email
                ).length;
                
                return (
                  <div key={provider.id} className="flex justify-between items-center mb-2">
                    <span className="text-sm">{provider.email.split('@')[0]}</span>
                    <span className="text-sm font-medium">{assignedToProvider}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>
    );
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
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-2xl font-bold">Healthcare Scheduler Dashboard</h1>
            <p className="text-gray-600">Manage provider schedules, workload, and triage assignments</p>
          </div>
          <div className="flex flex-wrap items-center space-x-4">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border rounded-md"
            />
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="">All Providers</option>
              {providers.map(provider => (
                <option key={provider.id} value={provider.id}>
                  {provider.email.split('@')[0]} ({provider.role})
                </option>
              ))}
            </select>
            <Button 
              variant="outline" 
              onClick={() => router.push('/admin/dashboard')}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
          {[
            { key: 'calendar', label: 'Calendar View', icon: '📅' },
            { key: 'workload', label: 'Workload', icon: '📊' },
            { key: 'assignments', label: 'Assignments', icon: '👥' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setViewMode(tab.key as any)}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === tab.key
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center h-32">
            <div className="text-lg">Loading schedule data...</div>
          </div>
        )}

        {/* View Content */}
        {!isLoading && (
          <>
            {viewMode === 'calendar' && renderCalendarView()}
            {viewMode === 'workload' && renderWorkloadView()}
            {viewMode === 'assignments' && renderAssignmentsView()}
          </>
        )}
      </div>
    </ClinicalLayout>
  );
}

export default withRoleProtection(SchedulerDashboard, {
  allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
});

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
        const responseData = result.data || {};
        
        // Group slots by provider to create providers array
        const providersMap = new Map<string, Provider>();
        
        if (responseData.slots && Array.isArray(responseData.slots)) {
          responseData.slots.forEach((slot: any) => {
            if (!slot.provider) return;
            
            const providerId = slot.provider.id;
            if (!providersMap.has(providerId)) {
              providersMap.set(providerId, {
                id: providerId,
                email: slot.provider.email || '',
                role: slot.provider.role || '',
                specialties: Array.isArray(slot.provider.specialties) ? 
                  slot.provider.specialties.map((s: string) => ({ specialty: s, expertise: [] })) : 
                  [],
                scheduleSlots: [],
                workload: {
                  totalSlots: 0,
                  bookedSlots: 0,
                  availableSlots: 0,
                  utilizationRate: 0
                }
              });
            }
            
            const provider = providersMap.get(providerId)!;
            provider.scheduleSlots.push({
              id: slot.id,
              startTime: slot.startTime,
              endTime: slot.endTime,
              appointmentType: slot.appointmentType || '',
              status: slot.status || 'AVAILABLE',
              description: slot.description,
              location: slot.location,
              patient: slot.patient,
              triage: slot.triage
            });
          });
        }
        
        // Update workload data for each provider
        if (responseData.workload && Array.isArray(responseData.workload)) {
          responseData.workload.forEach((workload: any) => {
            const provider = providersMap.get(workload.providerId);
            if (provider) {
              provider.workload = {
                totalSlots: workload.totalSlots || 0,
                bookedSlots: workload.bookedSlots || 0,
                availableSlots: workload.availableSlots || 0,
                utilizationRate: workload.utilizationRate || 0
              };
            }
          });
        }
        
        setProviders(Array.from(providersMap.values()));
      }
    } catch (error) {
      console.error('Error fetching schedule data:', error);
      setProviders([]); // Ensure providers is always an array
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
    const timeSlots = Array.from({ length: 16 }, (_, i) => i + 8); // 8 AM to 11 PM
    const filteredProviders = Array.isArray(providers) ? providers.filter(p => !selectedProvider || p.id === selectedProvider) : [];
    
    // Get all slots for the selected date grouped by hour
    const getSlotsByHour = (provider: Provider, hour: number) => {
      return Array.isArray(provider.scheduleSlots) ? provider.scheduleSlots.filter(slot => {
        const slotDate = new Date(slot.startTime);
        return slot.startTime.startsWith(selectedDate) && slotDate.getHours() === hour;
      }) : [];
    };

    return (
      <div className="space-y-6">
        {/* Calendar Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">
              Schedule for {new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h3>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded"></div>
                <span className="text-sm text-gray-600">Available</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-400 rounded"></div>
                <span className="text-sm text-gray-600">Booked</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-400 rounded"></div>
                <span className="text-sm text-gray-600">Blocked</span>
              </div>
            </div>
          </div>
        </div>

        {/* Unified Calendar Timeline View */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Header Row */}
              <div className="grid gap-0 border-b border-gray-200" style={{ gridTemplateColumns: `100px repeat(${filteredProviders.length}, minmax(200px, 1fr))` }}>
                <div className="bg-gray-50 p-4 border-r border-gray-200">
                  <span className="text-sm font-semibold text-gray-700">Time</span>
                </div>
                {filteredProviders.map(provider => (
                  <div key={provider.id} className="bg-gray-50 p-4 border-r border-gray-200 min-w-[200px]">
                    <div className="text-sm font-semibold text-gray-900 mb-1">
                      {provider.email.split('@')[0]}
                    </div>
                    <div className="text-xs text-gray-600 mb-1">
                      {provider.specialties.length > 0 ? provider.specialties[0].specialty : 'General Practice'}
                    </div>
                    <Badge variant="secondary" size="sm">
                      {provider.role}
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Time Rows */}
              {timeSlots.map(hour => (
                <div key={hour} className="grid gap-0 border-b border-gray-100 hover:bg-gray-50/50" style={{ gridTemplateColumns: `100px repeat(${filteredProviders.length}, minmax(200px, 1fr))` }}>
                  {/* Time Column */}
                  <div className="p-4 border-r border-gray-200 bg-gray-50/50">
                    <div className="text-sm font-medium text-gray-700">
                      {hour.toString().padStart(2, '0')}:00
                    </div>
                    <div className="text-xs text-gray-500">
                      {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                    </div>
                  </div>

                  {/* Provider Columns */}
                  {filteredProviders.map(provider => {
                    const hourSlots = getSlotsByHour(provider, hour);
                    return (
                      <div key={provider.id} className="p-2 border-r border-gray-200 min-h-[80px] min-w-[200px]">
                        <div className="space-y-1">
                          {hourSlots.length > 0 ? (
                            hourSlots.map(slot => (
                              <div
                                key={slot.id}
                                className={`p-2 rounded-lg text-xs border transition-all hover:shadow-sm cursor-pointer ${
                                  slot.status === 'AVAILABLE' 
                                    ? 'bg-green-50 border-green-200 hover:bg-green-100 text-green-800' :
                                  slot.status === 'BOOKED' 
                                    ? 'bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-800' :
                                  slot.status === 'BLOCKED' 
                                    ? 'bg-red-50 border-red-200 hover:bg-red-100 text-red-800' :
                                    'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-800'
                                }`}
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-medium">
                                    {formatTime(slot.startTime)}
                                  </span>
                                  <span className="text-xs font-medium">
                                    {slot.status}
                                  </span>
                                </div>
                                {slot.patient && (
                                  <div className="font-medium">
                                    {slot.patient.firstName} {slot.patient.lastName}
                                  </div>
                                )}
                                {slot.triage && (
                                  <div className="flex items-center space-x-1 mt-1">
                                    <Badge 
                                      variant={getUrgencyVariant(slot.triage.urgencyLevel)} 
                                      size="sm"
                                      className="text-xs"
                                    >
                                      {slot.triage.urgencyLevel}
                                    </Badge>
                                  </div>
                                )}
                                {slot.description && (
                                  <div className="text-xs opacity-75 mt-1 line-clamp-2">
                                    {slot.description}
                                  </div>
                                )}
                                {slot.location && (
                                  <div className="text-xs opacity-75 flex items-center mt-1">
                                    <span className="mr-1">📍</span>
                                    {slot.location}
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 text-xs">
                              <span>No appointments</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Provider Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProviders.map(provider => {
            const todaySlots = provider.scheduleSlots.filter(slot => slot.startTime.startsWith(selectedDate));
            const bookedSlots = todaySlots.filter(slot => slot.status === 'BOOKED');
            const availableSlots = todaySlots.filter(slot => slot.status === 'AVAILABLE');
            
            return (
              <div key={provider.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{provider.email.split('@')[0]}</h4>
                    <p className="text-sm text-gray-600">{provider.role}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">{bookedSlots.length}</div>
                    <div className="text-xs text-gray-500">Appointments</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-blue-50 p-2 rounded">
                    <div className="font-bold text-blue-600">{todaySlots.length}</div>
                    <div className="text-blue-600">Total</div>
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <div className="font-bold text-green-600">{availableSlots.length}</div>
                    <div className="text-green-600">Available</div>
                  </div>
                  <div className="bg-red-50 p-2 rounded">
                    <div className="font-bold text-red-600">{bookedSlots.length}</div>
                    <div className="text-red-600">Booked</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  const renderWorkloadView = () => {
    if (!Array.isArray(providers) || providers.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-3">📊</div>
          <div className="text-lg font-medium mb-1">No workload data available</div>
          <div className="text-sm">No provider workload information found for this date</div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {providers.map(provider => {
          const utilizationRate = Number(provider.workload.utilizationRate) || 0;
          const getUtilizationColor = (rate: number) => {
            if (rate >= 90) return 'bg-red-500';
            if (rate >= 70) return 'bg-yellow-500';
            if (rate >= 40) return 'bg-blue-500';
            return 'bg-green-500';
          };
          const getUtilizationBg = (rate: number) => {
            if (rate >= 90) return 'from-red-500 to-red-600';
            if (rate >= 70) return 'from-yellow-500 to-yellow-600';
            if (rate >= 40) return 'from-blue-500 to-blue-600';
            return 'from-green-500 to-green-600';
          };

          return (
            <div key={provider.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
              {/* Provider Header */}
              <div className={`bg-gradient-to-r ${getUtilizationBg(utilizationRate)} px-6 py-5 text-white`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-1 text-white">{provider.email.split('@')[0]}</h3>
                    <p className="text-white text-sm mb-2">
                      {provider.specialties.length > 0 
                        ? provider.specialties.map(s => s.specialty).join(', ')
                        : 'General Practice'
                      }
                    </p>
                    <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs">
                      {provider.role}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold mb-1 text-white">
                      {utilizationRate.toFixed(0)}%
                    </div>
                    <div className="text-white text-xs">Utilization</div>
                  </div>
                </div>
              </div>

              {/* Workload Content */}
              <div className="p-6">
                {/* Utilization Bar */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Capacity Usage</span>
                    <span className="text-sm font-bold text-gray-900">
                      {utilizationRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div
                      className={`h-4 rounded-full transition-all duration-500 ${getUtilizationColor(utilizationRate)}`}
                      style={{ width: `${Math.min(100, utilizationRate)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Slot Statistics */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl text-center border border-blue-200">
                    <div className="text-2xl font-bold text-blue-700 mb-1">
                      {provider.workload.totalSlots}
                    </div>
                    <div className="text-xs text-blue-600 font-medium">Total Slots</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl text-center border border-green-200">
                    <div className="text-2xl font-bold text-green-700 mb-1">
                      {provider.workload.availableSlots}
                    </div>
                    <div className="text-xs text-green-600 font-medium">Available</div>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl text-center border border-red-200">
                    <div className="text-2xl font-bold text-red-700 mb-1">
                      {provider.workload.bookedSlots}
                    </div>
                    <div className="text-xs text-red-600 font-medium">Booked</div>
                  </div>
                </div>

                {/* Today's Schedule Preview */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900 text-sm">Today's Schedule</h4>
                    <span className="text-xs text-gray-500">
                      {provider.scheduleSlots.filter(slot => slot.startTime.startsWith(selectedDate) && slot.status === 'BOOKED').length} appointments
                    </span>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                    {provider.scheduleSlots
                      .filter(slot => slot.startTime.startsWith(selectedDate) && slot.status === 'BOOKED')
                      .slice(0, 3)
                      .map(slot => (
                        <div key={slot.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-sm text-gray-900">
                              {formatTime(slot.startTime)}
                            </span>
                            {slot.triage && (
                              <Badge variant={getUrgencyVariant(slot.triage.urgencyLevel)} size="sm">
                                {slot.triage.urgencyLevel}
                              </Badge>
                            )}
                          </div>
                          {slot.patient && (
                            <div className="text-sm text-gray-600 mt-1">
                              {slot.patient.firstName} {slot.patient.lastName}
                            </div>
                          )}
                        </div>
                      ))}
                    {provider.scheduleSlots.filter(slot => slot.startTime.startsWith(selectedDate) && slot.status === 'BOOKED').length === 0 && (
                      <div className="text-center text-gray-500 py-4 bg-gray-50 rounded-lg">
                        <div className="text-lg mb-1">📅</div>
                        <div className="text-xs">No appointments today</div>
                      </div>
                    )}
                    {provider.scheduleSlots.filter(slot => slot.startTime.startsWith(selectedDate) && slot.status === 'BOOKED').length > 3 && (
                      <div className="text-xs text-gray-500 text-center pt-2">
                        +{provider.scheduleSlots.filter(slot => slot.startTime.startsWith(selectedDate) && slot.status === 'BOOKED').length - 3} more appointments
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderAssignmentsView = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Assignments */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4 text-white">
            <h3 className="text-lg font-semibold">Recent Triage Assignments</h3>
            <p className="text-purple-100 text-sm">Latest patient assignments and scheduling</p>
          </div>
          <div className="p-6">
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {assignments.map(assignment => (
                <div key={assignment.id} className="border border-gray-200 rounded-xl p-4 bg-gradient-to-r from-gray-50 to-white hover:shadow-md transition-all duration-200">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 mb-1">
                        {assignment.patient.firstName} {assignment.patient.lastName}
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        Assigned to: <span className="font-medium">{assignment.assignedTo?.email || 'Unassigned'}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(assignment.createdAt).toLocaleDateString()} at{' '}
                        {new Date(assignment.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <Badge variant={getUrgencyVariant(assignment.urgencyLevel)}>
                        {assignment.urgencyLevel}
                      </Badge>
                      <Badge variant={assignment.status === 'ASSIGNED' ? 'info' : 'success'}>
                        {assignment.status}
                      </Badge>
                    </div>
                  </div>
                  {assignment.scheduledTime && (
                    <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="text-sm text-blue-700 flex items-center">
                        <span className="mr-2">📅</span>
                        Scheduled: {new Date(assignment.scheduledTime).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {assignments.length === 0 && (
                <div className="text-center text-gray-500 py-12 bg-gray-50 rounded-xl">
                  <div className="text-4xl mb-3">📋</div>
                  <div className="text-lg font-medium mb-1">No assignments found</div>
                  <div className="text-sm">No triage assignments found for this date</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Assignment Statistics */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-4 text-white">
            <h3 className="text-lg font-semibold">Assignment Statistics</h3>
            <p className="text-indigo-100 text-sm">Workload distribution and metrics</p>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {/* Urgency Distribution */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">🚨</span>
                  Urgency Distribution
                </h4>
                <div className="space-y-3">
                  {['HIGH', 'MEDIUM', 'LOW'].map(urgency => {
                    const count = assignments.filter(a => a.urgencyLevel === urgency).length;
                    const percentage = assignments.length ? (count / assignments.length) * 100 : 0;
                    
                    return (
                      <div key={urgency} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">{urgency}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-bold text-gray-900">{count}</span>
                            <span className="text-xs text-gray-500">({percentage.toFixed(0)}%)</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              urgency === 'HIGH' ? 'bg-red-500' :
                              urgency === 'MEDIUM' ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Provider Load */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">👥</span>
                  Provider Load
                </h4>                <div className="space-y-3">
                  {Array.isArray(providers) ? providers.map(provider => {
                    const assignedToProvider = assignments.filter(
                      a => a.assignedTo?.email === provider.email
                    ).length;
                    const maxAssignments = Math.max(...providers.map(p => 
                      assignments.filter(a => a.assignedTo?.email === p.email).length
                    ), 1);
                    const percentage = (assignedToProvider / maxAssignments) * 100;
                    
                    return (
                      <div key={provider.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <span className="text-sm font-medium text-gray-700">
                              {provider.email.split('@')[0]}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">({provider.role})</span>
                          </div>
                          <span className="text-sm font-bold text-gray-900">{assignedToProvider}</span>
                        </div>                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-blue-500 transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="text-center text-gray-500 py-4">
                      No provider data available
                    </div>
                  )}
                </div>
              </div>

              {/* Summary Stats */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3">Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{assignments.length}</div>
                    <div className="text-xs text-gray-600">Total Assignments</div>
                  </div>                  <div>
                    <div className="text-2xl font-bold text-green-600">{Array.isArray(providers) ? providers.length : 0}</div>
                    <div className="text-xs text-gray-600">Active Providers</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
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
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Healthcare Scheduler Dashboard</h1>
                <p className="text-gray-600">Manage provider schedules, workload, and triage assignments</p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Date:</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Provider:</label>                  <select
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="">All Providers</option>
                    {Array.isArray(providers) && providers.map(provider => (
                      <option key={provider.id} value={provider.id}>
                        {provider.email.split('@')[0]} ({provider.role})
                      </option>
                    ))}
                  </select>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/admin/dashboard')}
                  className="whitespace-nowrap"
                >
                  ← Back to Dashboard
                </Button>
              </div>
            </div>
          </div>

          {/* View Mode Tabs */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2 mb-8">
            <div className="flex space-x-1">
              {[
                { key: 'calendar', label: 'Calendar View', icon: '📅', description: 'View scheduled appointments' },
                { key: 'workload', label: 'Workload', icon: '📊', description: 'Provider capacity analysis' },
                { key: 'assignments', label: 'Assignments', icon: '👥', description: 'Triage assignments' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setViewMode(tab.key as any)}
                  className={`flex-1 px-6 py-4 text-sm font-medium rounded-xl transition-all duration-200 ${
                    viewMode === tab.key
                      ? 'bg-blue-500 text-white shadow-lg transform scale-105'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  title={tab.description}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-lg">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                <div className="text-lg font-medium text-gray-700">Loading schedule data...</div>
                <div className="text-sm text-gray-500">Please wait while we fetch the latest information</div>
              </div>
            </div>
          )}

          {/* View Content */}
          {!isLoading && (
            <div className="animate-fadeIn">
              {viewMode === 'calendar' && renderCalendarView()}
              {viewMode === 'workload' && renderWorkloadView()}
              {viewMode === 'assignments' && renderAssignmentsView()}
            </div>
          )}
        </div>
      </div>
    </ClinicalLayout>
  );
}

export default withRoleProtection(SchedulerDashboard, {
  allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
});

'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Appointments Tab - Advanced scheduling with AI optimization and calendar integration
 * Features: Smart scheduling, telemedicine, conflict resolution, AI recommendations
 */

import React, { useState, useEffect } from 'react';
import { useDoctorContext } from '../../contexts/DoctorContext';

interface AppointmentsTabProps {
  onPatientSelect: (patientId: string) => void;
}

interface Appointment {
  id: string;
  patientId?: string;
  patientName?: string;
  patientPhone?: string;
  type: 'consultation' | 'follow-up' | 'emergency' | 'telemedicine' | 'procedure' | 'blocked';
  scheduledTime: string;
  duration: number;
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show' | 'blocked' | 'available';
  reasonForVisit?: string;
  location: string;
  urgent?: boolean;
  notes?: string;
  blockReason?: string; // For blocked slots
  aiOptimization?: {
    suggestedDuration: number;
    conflictWarnings: string[];
    preparationTime: number;
  };
}

interface BlockTimeSlot {
  startTime: string;
  endTime: string;
  reason: string;
  recurring?: boolean;
  recurringPattern?: 'daily' | 'weekly' | 'monthly';
  recurringEnd?: string;
}

interface ScheduleMetrics {
  totalAppointments: number;
  confirmedAppointments: number;
  pendingConfirmation: number;
  todayAppointments: number;
  upcomingWeek: number;
  averageDuration: number;
  utilizationRate: number;
}

export default function AppointmentsTab({ onPatientSelect }: AppointmentsTabProps) {
  const { state, dispatch } = useDoctorContext();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [metrics, setMetrics] = useState<ScheduleMetrics | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [isLoading, setIsLoading] = useState(true);  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [showBlockTime, setShowBlockTime] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [blockTimeData, setBlockTimeData] = useState<BlockTimeSlot>({
    startTime: '',
    endTime: '',
    reason: '',
    recurring: false
  });

  useEffect(() => {
    loadAppointments();
  }, [selectedDate, viewMode, filterStatus]);

  const loadAppointments = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        timeframe: viewMode,
        ...(filterStatus !== 'all' && { status: filterStatus })
      });

      const response = await fetch(`/api/doctor/appointments?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch appointments');
      }

      const result = await response.json();
      setAppointments(result.data.appointments || []);
      setMetrics(result.data.metrics || null);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/doctor/appointments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          status: newStatus
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update appointment');
      }

      // Refresh appointments
      loadAppointments();
    } catch (error) {
      console.error('Error updating appointment:', error);
    }
  };

  const blockTimeSlot = async () => {
    try {
      const response = await fetch('/api/doctor/schedule/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          startTime: blockTimeData.startTime,
          endTime: blockTimeData.endTime,
          reason: blockTimeData.reason,
          recurring: blockTimeData.recurring,
          recurringPattern: blockTimeData.recurringPattern,
          recurringEnd: blockTimeData.recurringEnd
        })
      });

      if (!response.ok) {
        throw new Error('Failed to block time slot');
      }

      // Reset form and close modal
      setBlockTimeData({
        startTime: '',
        endTime: '',
        reason: '',
        recurring: false
      });
      setShowBlockTime(false);
      
      // Refresh appointments to show blocked slots
      loadAppointments();
    } catch (error) {
      console.error('Error blocking time slot:', error);
      alert('Failed to block time slot. Please try again.');
    }
  };

  const unblockTimeSlot = async (appointmentId: string) => {
    try {
      const response = await fetch('/api/doctor/schedule/unblock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId })
      });

      if (!response.ok) {
        throw new Error('Failed to unblock time slot');
      }

      // Refresh appointments
      loadAppointments();
    } catch (error) {
      console.error('Error unblocking time slot:', error);
      alert('Failed to unblock time slot. Please try again.');
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'no-show':
        return 'bg-orange-100 text-orange-800';
      case 'blocked':
        return 'bg-gray-500 text-white';
      case 'available':
        return 'bg-green-50 text-green-700';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'emergency':
        return 'text-red-600';
      case 'telemedicine':
        return 'text-blue-600';
      case 'procedure':
        return 'text-purple-600';
      case 'follow-up':
        return 'text-green-600';
      case 'blocked':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Appointment AI Analytics Integration
  const callAppointmentAnalyticsAI = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:4000/api/appointment-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: 'current-doctor-id', // Replace with actual doctor ID
          timeframe: viewMode,
          startDate: selectedDate,
          endDate: viewMode === 'week' 
            ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            : viewMode === 'month'
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            : selectedDate,
          appointmentData: appointments.filter(apt => apt.status !== 'blocked').map(apt => ({
            id: apt.id,
            type: apt.type,
            duration: apt.duration,
            status: apt.status,
            scheduledTime: apt.scheduledTime,
            urgent: apt.urgent || false
          })),
          historicalData: true // Request historical analysis
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Store the analytics result
        await storeAppointmentAnalyticsResult(result);
        
        // Show the analytics insights to the user
        showAnalyticsInsights(result);
        
      } else {
        throw new Error('Failed to get appointment analytics AI response');
      }
    } catch (error) {
      console.error('Appointment Analytics AI error:', error);
      alert('Appointment analytics AI temporarily unavailable. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Store Appointment Analytics AI result in local database
  const storeAppointmentAnalyticsResult = async (analyticsResult: any) => {
    try {
      const response = await fetch('/api/doctor/appointment-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeframe: viewMode,
          startDate: selectedDate,
          insights: analyticsResult.insights || [],
          recommendations: analyticsResult.recommendations || [],
          metrics: analyticsResult.metrics || {},
          optimizations: analyticsResult.optimizations || [],
          metadata: {
            aiModel: analyticsResult.model || 'appointment-analytics-ai',
            timestamp: new Date().toISOString(),
            appointmentCount: appointments.length
          }
        })
      });

      if (!response.ok) {
        console.error('Failed to store appointment analytics result');
      }
    } catch (error) {
      console.error('Error storing appointment analytics result:', error);
    }
  };

  // Show analytics insights in a user-friendly way
  const showAnalyticsInsights = (result: any) => {
    const insights = result.insights || [];
    const recommendations = result.recommendations || [];
    const optimizations = result.optimizations || [];

    let message = 'Appointment Analytics Insights:\n\n';
    
    if (insights.length > 0) {
      message += 'Key Insights:\n';
      insights.forEach((insight: any, index: number) => {
        message += `${index + 1}. ${insight.description} (Confidence: ${Math.round(insight.confidence * 100)}%)\n`;
      });
      message += '\n';
    }

    if (recommendations.length > 0) {
      message += 'Recommendations:\n';
      recommendations.forEach((rec: any, index: number) => {
        message += `${index + 1}. ${rec.suggestion}\n`;
      });
      message += '\n';
    }

    if (optimizations.length > 0) {
      message += 'Schedule Optimizations:\n';
      optimizations.forEach((opt: any, index: number) => {
        message += `${index + 1}. ${opt.description}\n`;
      });
    }

    // Create a more professional modal/alert
    const analyticsWindow = window.open('', '_blank', 'width=700,height=600,scrollbars=yes');
    if (analyticsWindow) {
      analyticsWindow.document.write(`
        <html>
          <head><title>Appointment Analytics Report</title></head>
          <body style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
            <h2>📊 AI-Powered Appointment Analytics</h2>
            <p><strong>Analysis Period:</strong> ${viewMode} view starting ${selectedDate}</p>
            
            ${insights.length > 0 ? `
            <h3>🔍 Key Insights</h3>
            <ul>
              ${insights.map((insight: any) => `
                <li style="margin-bottom: 10px;">
                  <strong>${insight.description}</strong><br>
                  <small>Confidence: ${Math.round(insight.confidence * 100)}%</small>
                </li>
              `).join('')}
            </ul>
            ` : ''}
            
            ${recommendations.length > 0 ? `
            <h3>💡 Recommendations</h3>
            <ul>
              ${recommendations.map((rec: any) => `
                <li style="margin-bottom: 10px;">
                  <strong>${rec.suggestion}</strong><br>
                  <small>Impact: ${rec.impact || 'Moderate'}</small>
                </li>
              `).join('')}
            </ul>
            ` : ''}
            
            ${optimizations.length > 0 ? `
            <h3>⚡ Schedule Optimizations</h3>
            <ul>
              ${optimizations.map((opt: any) => `
                <li style="margin-bottom: 10px;">
                  <strong>${opt.description}</strong><br>
                  <small>Expected benefit: ${opt.expectedBenefit || 'Improved efficiency'}</small>
                </li>
              `).join('')}
            </ul>
            ` : ''}
            
            <br>
            <button onclick="window.print()" style="background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">Print Report</button>
          </body>
        </html>
      `);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              📅 Appointment Management
            </h1>
            <p className="text-gray-600">
              Smart scheduling with AI optimization and conflict resolution
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as 'day' | 'week' | 'month')}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white"
            >
              <option value="day">Day View</option>
              <option value="week">Week View</option>
              <option value="month">Month View</option>
            </select>
            
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white"
            />            <button
              onClick={() => setShowNewAppointment(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              📅 New Appointment
            </button>
            
            <button
              onClick={() => setShowBlockTime(true)}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              🚫 Block Time
            </button>
            
            <button
              onClick={callAppointmentAnalyticsAI}
              disabled={isLoading || appointments.length === 0}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center space-x-1">
                  <span className="animate-spin">⟳</span>
                  <span>Analyzing...</span>
                </span>
              ) : (
                '📊 AI Analytics'
              )}
            </button>
          </div>
        </div>

        {/* Metrics Dashboard */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Appointments</p>
                  <p className="text-3xl font-bold text-blue-600">{metrics.totalAppointments}</p>
                </div>
                <div className="text-4xl">📋</div>
              </div>
              <div className="mt-2 text-sm text-green-600">
                +{metrics.todayAppointments} today
              </div>
            </div>

            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Confirmed</p>
                  <p className="text-3xl font-bold text-green-600">{metrics.confirmedAppointments}</p>
                </div>
                <div className="text-4xl">✅</div>
              </div>
              <div className="mt-2 text-sm text-orange-600">
                {metrics.pendingConfirmation} pending
              </div>
            </div>

            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Utilization</p>
                  <p className="text-3xl font-bold text-purple-600">{metrics.utilizationRate}%</p>
                </div>
                <div className="text-4xl">⏰</div>
              </div>
              <div className="mt-2 text-sm text-blue-600">
                {formatDuration(metrics.averageDuration)} avg
              </div>
            </div>

            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">This Week</p>
                  <p className="text-3xl font-bold text-indigo-600">{metrics.upcomingWeek}</p>
                </div>
                <div className="text-4xl">📊</div>
              </div>
              <div className="mt-2 text-sm text-gray-500">
                Upcoming appointments
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4">
          <div className="flex items-center space-x-4">
            <span className="text-gray-700 font-medium">Filter by status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1 rounded-lg border border-gray-300 bg-white text-sm"
            >              <option value="all">All Appointments</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="blocked">Blocked Time</option>
            </select>
          </div>
        </div>

        {/* Appointments List */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800">
              Appointments for {new Date(selectedDate).toLocaleDateString()}
            </h2>
            <span className="text-sm text-gray-500">
              {appointments.length} appointments
            </span>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {appointments.length > 0 ? (
              appointments.map((appointment) => (
                <div 
                  key={appointment.id}
                  className="p-6 bg-white/50 rounded-xl border border-white/30 hover:bg-white/70 transition-all duration-200"
                >                  <div className="flex items-start justify-between">
                    {/* Left side - Main info */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        {appointment.status === 'blocked' ? (
                          <div className="font-semibold text-lg text-gray-600 flex items-center">
                            🚫 <span className="ml-2">Blocked Time</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => appointment.patientId && onPatientSelect(appointment.patientId)}
                            className="font-semibold text-lg text-blue-600 hover:text-blue-800 transition-colors"
                            disabled={!appointment.patientId}
                          >
                            {appointment.patientName || 'Unknown Patient'}
                          </button>
                        )}
                        
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                          {appointment.status}
                        </span>

                        {appointment.urgent && appointment.status !== 'blocked' && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            🚨 Urgent
                          </span>
                        )}

                        <span className={`text-sm font-medium ${getTypeColor(appointment.type)}`}>
                          {appointment.type}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-600">Time & Duration</p>
                          <p className="font-medium">
                            {formatTime(appointment.scheduledTime)} • {formatDuration(appointment.duration)}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-600">Location</p>
                          <p className="font-medium">{appointment.location}</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-1">
                          {appointment.status === 'blocked' ? 'Block Reason' : 'Reason for Visit'}
                        </p>
                        <p className="text-gray-800">
                          {appointment.status === 'blocked' 
                            ? (appointment.blockReason || 'No reason specified')
                            : (appointment.reasonForVisit || 'No reason specified')
                          }
                        </p>
                      </div>

                      {appointment.notes && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-600 mb-1">Notes</p>
                          <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{appointment.notes}</p>
                        </div>
                      )}

                      {appointment.aiOptimization && (
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <p className="text-sm font-medium text-purple-800 mb-2">🤖 AI Optimization</p>
                          <div className="text-sm text-purple-700">
                            <p>Suggested duration: {formatDuration(appointment.aiOptimization.suggestedDuration)}</p>
                            <p>Preparation time: {formatDuration(appointment.aiOptimization.preparationTime)}</p>
                            {appointment.aiOptimization.conflictWarnings.length > 0 && (
                              <div className="mt-2">
                                <p className="font-medium">⚠️ Warnings:</p>
                                <ul className="list-disc list-inside">
                                  {appointment.aiOptimization.conflictWarnings.map((warning, index) => (
                                    <li key={index}>{warning}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>                    {/* Right side - Actions */}
                    <div className="ml-6 flex flex-col space-y-2">
                      {appointment.status === 'blocked' ? (
                        <button
                          onClick={() => unblockTimeSlot(appointment.id)}
                          className="px-4 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
                        >
                          ✅ Unblock
                        </button>
                      ) : (
                        <>
                          {appointment.status === 'scheduled' && (
                            <button
                              onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                              className="px-4 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
                            >
                              ✅ Confirm
                            </button>
                          )}
                          
                          {appointment.status === 'confirmed' && (
                            <button
                              onClick={() => updateAppointmentStatus(appointment.id, 'in-progress')}
                              className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                            >
                              ▶️ Start
                            </button>
                          )}
                          
                          {appointment.status === 'in-progress' && (
                            <button
                              onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                              className="px-4 py-2 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 transition-colors"
                            >
                              ✅ Complete
                            </button>
                          )}

                          <button
                            onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                            className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                          >
                            ❌ Cancel
                          </button>

                          {appointment.type === 'telemedicine' && (
                            <button
                              className="px-4 py-2 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600 transition-colors"
                            >
                              💻 Join Call
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">📅</div>
                <h3 className="text-xl font-medium mb-2">No appointments found</h3>
                <p>No appointments scheduled for the selected date and filters.</p>
                <button
                  onClick={() => setShowNewAppointment(true)}
                  className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Schedule New Appointment
                </button>
              </div>
            )}
          </div>
        </div>

        {/* AI Scheduling Insights */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            🤖 AI Scheduling Insights
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <h3 className="font-medium text-blue-800 mb-2">📊 Schedule Optimization</h3>
              <p className="text-sm text-blue-700">
                Your schedule utilization is {metrics?.utilizationRate || 0}%. 
                Consider spacing appointments to allow for adequate consultation time.
              </p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-xl border border-green-200">              <h3 className="font-medium text-green-800 mb-2">⏰ Time Management</h3>
              <p className="text-sm text-green-700">
                Average consultation time is {formatDuration(metrics?.averageDuration || 30)}. 
                AI suggests grouping similar appointment types for efficiency.
              </p>            </div>
          </div>
        </div>

        {/* Block Time Modal */}
        {showBlockTime && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">🚫 Block Time Slot</h3>
                <button
                  onClick={() => setShowBlockTime(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={blockTimeData.startTime}
                      onChange={(e) => setBlockTimeData(prev => ({ ...prev, startTime: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={blockTimeData.endTime}
                      onChange={(e) => setBlockTimeData(prev => ({ ...prev, endTime: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for Blocking
                  </label>
                  <select
                    value={blockTimeData.reason}
                    onChange={(e) => setBlockTimeData(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a reason...</option>
                    <option value="Personal Time">Personal Time</option>
                    <option value="Medical Emergency">Medical Emergency</option>
                    <option value="Administrative Work">Administrative Work</option>
                    <option value="Training/Education">Training/Education</option>
                    <option value="Lunch Break">Lunch Break</option>
                    <option value="Surgery">Surgery</option>
                    <option value="Hospital Rounds">Hospital Rounds</option>
                    <option value="Vacation">Vacation</option>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                {blockTimeData.reason === 'Other' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Custom Reason
                    </label>
                    <input
                      type="text"
                      placeholder="Enter custom reason..."
                      onChange={(e) => setBlockTimeData(prev => ({ ...prev, reason: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
                
                <div className="border-t pt-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <input
                      type="checkbox"
                      id="recurring"
                      checked={blockTimeData.recurring}
                      onChange={(e) => setBlockTimeData(prev => ({ ...prev, recurring: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="recurring" className="text-sm font-medium text-gray-700">
                      Make this a recurring block
                    </label>
                  </div>
                  
                  {blockTimeData.recurring && (
                    <div className="space-y-3 ml-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Repeat Pattern
                        </label>
                        <select
                          value={blockTimeData.recurringPattern || ''}
                          onChange={(e) => setBlockTimeData(prev => ({ ...prev, recurringPattern: e.target.value as 'daily' | 'weekly' | 'monthly' }))}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select pattern...</option>
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={blockTimeData.recurringEnd || ''}
                          onChange={(e) => setBlockTimeData(prev => ({ ...prev, recurringEnd: e.target.value }))}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={blockTimeSlot}
                    disabled={!blockTimeData.startTime || !blockTimeData.endTime || !blockTimeData.reason}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🚫 Block Time
                  </button>
                  <button
                    onClick={() => setShowBlockTime(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-all duration-200 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AppointmentCard({ appointment, onPatientSelect }: {
  appointment: any;
  onPatientSelect: (patientId: string) => void;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="
      p-4 rounded-lg bg-white/30 border border-white/20
      hover:bg-white/40 transition-all duration-200
    ">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-800">
              {new Date(appointment.scheduledTime).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
            <div className="text-xs text-gray-500">
              {appointment.duration} min
            </div>
          </div>
          
          <div className="flex-1">
            <h4 className="font-medium text-gray-800">{appointment.patientName}</h4>
            <p className="text-sm text-gray-600">{appointment.reasonForVisit}</p>
            <p className="text-xs text-gray-500">
              {appointment.type} • {appointment.location}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className={`
            px-2 py-1 rounded-full text-xs font-medium
            ${getStatusColor(appointment.status)}
          `}>
            {appointment.status}
          </span>
          
          <button
            onClick={() => onPatientSelect(appointment.patientId)}
            className="
              px-3 py-1 text-sm text-blue-600 
              hover:bg-blue-50 rounded
              transition-colors
            "
          >
            View Patient
          </button>
        </div>
      </div>
    </div>
  );
}

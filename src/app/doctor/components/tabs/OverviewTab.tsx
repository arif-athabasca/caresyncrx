'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Overview Tab - Modern dashboard with real-time metrics, AI insights, and glass morphism UI
 * Features: Live analytics, patient overview, AI recommendations, quick actions
 */

import React, { useState, useEffect } from 'react';
import { useDoctorContext } from '../../contexts/DoctorContext';

interface OverviewTabProps {
  onPatientSelect: (patientId: string) => void;
}

interface DashboardMetrics {
  totalPatients: number;
  activePatients: number;
  criticalPatients: number;
  newPatients: number;
  upcomingAppointments: number;
  pendingConsultations: number;
  triageAlerts: number;
  completedAppointments: number;
}

interface AIInsight {
  type: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  actionable: boolean;
  action?: string;
}

interface TodayAppointment {
  id: string;
  patientId: string;
  patientName: string;
  startTime: string;
  endTime: string;
  type: string;
  status: string;
  location: string;
}

interface RecentActivity {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  urgency: string;
  patientId: string;
}

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  color: string;
  description: string;
  urgent: boolean;
}

interface OverviewData {
  metrics: DashboardMetrics;
  todaySchedule: TodayAppointment[];
  aiInsights: AIInsight[];
  quickActions: QuickAction[];
  recentActivity: RecentActivity[];
  performanceMetrics: {
    patientsSeenToday: number;
    averageConsultationTime: number;
    patientSatisfactionScore: number;
    onTimePercentage: number;
  };
}

export default function OverviewTab({ onPatientSelect }: OverviewTabProps) {
  const { state, dispatch } = useDoctorContext();
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month'>('today');
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Additional state for the overview metrics
  const [metrics, setMetrics] = useState({
    totalPatients: 0,
    activePatients: 0,
    criticalPatients: 0,
    newPatients: 0,
    upcomingAppointments: 0,
    pendingConsultations: 0,
    triageAlerts: 0,
    completedAppointments: 0
  });

  // Quick actions configuration
  const quickActions = [
    {
      id: 'new-patient',
      label: 'New Patient',
      icon: '👤',
      description: 'Register new patient'
    },
    {
      id: 'emergency',
      label: 'Emergency',
      icon: '🚨',
      description: 'Emergency protocols'
    },
    {
      id: 'prescription',
      label: 'E-Prescribe',
      icon: '💊',
      description: 'Prescription management'
    },
    {
      id: 'lab-order',
      label: 'Lab Orders',
      icon: '🧪',
      description: 'Lab test ordering'
    }
  ];

  // Load overview data
  useEffect(() => {
    loadOverviewData();
  }, [timeframe, refreshKey]);

  const loadOverviewData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/doctor/overview?timeframe=${timeframe}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch overview data');
      }

      const result = await response.json();
      setOverviewData(result.data);
    } catch (error) {
      console.error('Error loading overview data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const handleQuickAction = (actionId: string) => {
    switch (actionId) {
      case 'new-patient':
        window.location.href = '/register';
        break;
      case 'emergency-consult':
        // Handle emergency workflow
        break;
      case 'review-triage':
        // Handle triage review
        break;
      case 'ai-insights':
        // Handle AI insights
        break;
      default:
        console.log('Unknown action:', actionId);
    }
  };

  const refreshData = () => {
    setRefreshKey(prev => prev + 1);
  };

  const getMetricColor = (type: string, value: number) => {
    switch (type) {
      case 'critical':
        return value > 0 ? 'text-red-600' : 'text-green-600';
      case 'alerts':
        return value > 2 ? 'text-orange-600' : 'text-blue-600';
      default:
        return 'text-blue-600';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-l-4 border-red-500 bg-red-50';
      case 'warning':
        return 'border-l-4 border-yellow-500 bg-yellow-50';
      default:
        return 'border-l-4 border-blue-500 bg-blue-50';
    }
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!overviewData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto text-center py-12">
          <div className="text-gray-500 text-lg">No data available</div>
          <button 
            onClick={refreshData}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
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
              🏥 Dashboard Overview
            </h1>
            <p className="text-gray-600">
              Comprehensive view of your practice with AI-powered insights
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as 'today' | 'week' | 'month')}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
            
            <button
              onClick={refreshData}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Assigned Patients</p>
                <p className="text-3xl font-bold text-blue-600">{overviewData.metrics.totalPatients}</p>
              </div>
              <div className="text-4xl">👥</div>
            </div>
            <div className="mt-2 text-sm text-green-600">
              +{overviewData.metrics.newPatients} new today
            </div>
          </div>

          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Critical Patients</p>
                <p className={`text-3xl font-bold ${getMetricColor('critical', overviewData.metrics.criticalPatients)}`}>
                  {overviewData.metrics.criticalPatients}
                </p>
              </div>
              <div className="text-4xl">🚨</div>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Require immediate attention
            </div>
          </div>

          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Appointments</p>
                <p className="text-3xl font-bold text-purple-600">{overviewData.metrics.upcomingAppointments}</p>
              </div>
              <div className="text-4xl">📅</div>
            </div>
            <div className="mt-2 text-sm text-blue-600">
              {overviewData.metrics.completedAppointments} completed
            </div>
          </div>

          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Satisfaction</p>
                <p className="text-3xl font-bold text-green-600">
                  {overviewData.performanceMetrics.patientSatisfactionScore}
                </p>
              </div>
              <div className="text-4xl">⭐</div>
            </div>
            <div className="mt-2 text-sm text-green-600">
              {overviewData.performanceMetrics.onTimePercentage}% on-time
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Schedule */}
          <div className="lg:col-span-2 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                📅 Today's Schedule
              </h2>
              <span className="text-sm text-gray-500">
                {overviewData.todaySchedule.length} appointments
              </span>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {overviewData.todaySchedule.length > 0 ? (
                overviewData.todaySchedule.map((appointment) => (
                  <div 
                    key={appointment.id} 
                    className="p-4 bg-white/50 rounded-xl border border-white/30 hover:bg-white/70 transition-colors cursor-pointer"
                    onClick={() => onPatientSelect(appointment.patientId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <div>
                          <p className="font-medium text-gray-800">{appointment.patientName}</p>
                          <p className="text-sm text-gray-600">{appointment.type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-800">
                          {formatTime(appointment.startTime)}
                        </p>
                        <p className="text-xs text-gray-500">{appointment.location}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📋</div>
                  <p>No appointments scheduled for today</p>
                </div>
              )}
            </div>
          </div>

          {/* AI Insights */}
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
              🤖 AI Insights
            </h2>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {overviewData.aiInsights.map((insight, index) => (
                <div 
                  key={index} 
                  className={`p-4 rounded-xl ${getSeverityColor(insight.severity)}`}
                >
                  <h3 className="font-medium text-gray-800 mb-2">{insight.title}</h3>
                  <p className="text-sm text-gray-700 mb-3">{insight.message}</p>
                  {insight.actionable && (
                    <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      Take Action →
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">⚡ Quick Actions</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {overviewData.quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action.id)}
                className={`
                  p-4 rounded-xl border-2 border-transparent
                  bg-white/50 hover:bg-white/70
                  ${action.urgent ? 'ring-2 ring-red-500 ring-opacity-50' : ''}
                  transition-all duration-200 hover:scale-105
                  group
                `}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">{action.icon}</div>
                  <p className="font-medium text-gray-800 text-sm">{action.label}</p>
                  <p className="text-xs text-gray-600 mt-1">{action.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">📊 Recent Activity</h2>
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {overviewData.recentActivity.map((activity) => (
              <div 
                key={activity.id} 
                className="flex items-center space-x-3 p-3 bg-white/30 rounded-lg hover:bg-white/50 transition-colors cursor-pointer"
                onClick={() => onPatientSelect(activity.patientId)}
              >
                <div className={`w-2 h-2 rounded-full ${
                  activity.urgency === 'CRITICAL' ? 'bg-red-500' :
                  activity.urgency === 'HIGH' ? 'bg-orange-500' : 'bg-blue-500'
                }`}></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-800">{activity.message}</p>
                  <p className="text-xs text-gray-500">{formatDate(activity.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>        </div>
      </div>
    </div>
  );
}

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: number;
  icon: string;
  color: string;
  trend?: string;
  trendDirection?: 'up' | 'down';
  onClick?: () => void;
}

function MetricCard({ title, value, icon, color, trend, trendDirection, onClick }: MetricCardProps) {
  return (
    <div 
      className={`
        backdrop-blur-xl bg-white/20 border border-white/30 
        rounded-2xl p-4 
        hover:bg-white/30 hover:border-white/40
        transition-all duration-300 ease-out
        ${onClick ? 'cursor-pointer hover:scale-105' : ''}
        shadow-lg shadow-black/5
      `}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {trend && (
          <span className={`
            text-xs font-medium flex items-center
            ${trendDirection === 'up' ? 'text-green-600' : 'text-red-600'}
          `}>
            <span className="mr-1">
              {trendDirection === 'up' ? '↗️' : '↘️'}
            </span>
            {trend}
          </span>
        )}
      </div>
      
      <div className={`text-2xl font-bold ${color} mb-1`}>
        {value.toLocaleString()}
      </div>
      
      <div className="text-sm text-gray-600">
        {title}
      </div>
    </div>
  );
}

// Today's Schedule Widget
function TodaysScheduleWidget({ onPatientSelect }: { onPatientSelect: (id: string) => void }) {
  const appointments = [
    { id: '1', time: '09:00', patient: 'John Doe', type: 'Follow-up', status: 'confirmed' },
    { id: '2', time: '10:30', patient: 'Sarah Wilson', type: 'Consultation', status: 'urgent' },
    { id: '3', time: '11:15', patient: 'Mike Johnson', type: 'Routine', status: 'confirmed' },
    { id: '4', time: '14:00', patient: 'Emma Davis', type: 'New Patient', status: 'new' }
  ];

  return (
    <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        📅 Today's Schedule
        <span className="ml-auto text-sm text-gray-500">{appointments.length} appointments</span>
      </h3>
      
      <div className="space-y-3">
        {appointments.map(appointment => (
          <div 
            key={appointment.id}
            className="
              p-3 rounded-lg bg-white/30 border border-white/20
              hover:bg-white/40 cursor-pointer
              transition-all duration-200
            "
            onClick={() => onPatientSelect(appointment.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-sm font-medium text-gray-700">
                  {appointment.time}
                </div>
                <div>
                  <div className="font-medium text-gray-800">{appointment.patient}</div>
                  <div className="text-xs text-gray-500">{appointment.type}</div>
                </div>
              </div>
              
              <div className={`
                w-2 h-2 rounded-full
                ${appointment.status === 'urgent' ? 'bg-red-500' :
                  appointment.status === 'new' ? 'bg-green-500' : 'bg-blue-500'}
              `} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Quick Actions Widget
function QuickActionsWidget({ actions, onAction }: { actions: QuickAction[]; onAction: (actionId: string) => void }) {
  return (
    <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">⚡ Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">        {actions.map(action => (
          <button
            key={action.id}
            onClick={() => onAction(action.id)}
            className={`
              p-3 rounded-xl
              bg-gradient-to-r ${action.color}
              text-white font-medium
              hover:scale-105 hover:shadow-lg
              transition-all duration-200
              flex flex-col items-center text-center
            `}
            title={action.description}
          >
            <span className="text-xl mb-1">{action.icon}</span>
            <span className="text-xs">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// AI Insights Widget
function AIInsightsWidget({ insights, onPatientSelect }: { 
  insights: any[], 
  onPatientSelect: (id: string) => void 
}) {
  return (
    <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        🧠 AI Insights
        <span className="ml-auto text-sm text-green-600">●  Active</span>
      </h3>
      
      <div className="space-y-4">
        {insights.map(insight => (
          <div 
            key={insight.id}
            className={`
              p-4 rounded-lg border-l-4
              ${insight.severity === 'critical' ? 'bg-red-50/50 border-red-500' :
                insight.severity === 'high' ? 'bg-red-50/50 border-red-500' :
                insight.severity === 'moderate' ? 'bg-yellow-50/50 border-yellow-500' :
                'bg-blue-50/50 border-blue-500'}
              hover:bg-white/40 cursor-pointer
              transition-all duration-200
            `}
            onClick={() => onPatientSelect(insight.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-800 mb-1">{insight.title}</h4>
                <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                <div className="flex items-center text-xs text-gray-500">
                  <span className="mr-3">🎯 {Math.round(insight.confidence * 100)}% confidence</span>
                  <span>{insight.source}</span>
                  <span className="ml-3">{new Date(insight.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
              <span className="text-xl">
                {insight.severity === 'critical' ? '🚨' : insight.type === 'lab' ? '🧪' : '💡'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Recent Activity Widget
function RecentActivityWidget() {
  const activities = [
    { id: '1', action: 'Lab results reviewed', patient: 'John Doe', time: '10 min ago', type: 'lab' },
    { id: '2', action: 'Prescription sent', patient: 'Sarah Wilson', time: '25 min ago', type: 'prescription' },
    { id: '3', action: 'Patient notes updated', patient: 'Mike Johnson', time: '1 hour ago', type: 'note' }
  ];

  return (
    <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">📝 Recent Activity</h3>
      
      <div className="space-y-3">
        {activities.map(activity => (
          <div key={activity.id} className="flex items-center space-x-3 p-2">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm
              ${activity.type === 'lab' ? 'bg-blue-100 text-blue-600' :
                activity.type === 'prescription' ? 'bg-green-100 text-green-600' :
                'bg-purple-100 text-purple-600'}
            `}>
              {activity.type === 'lab' ? '🧪' : 
               activity.type === 'prescription' ? '💊' : '📝'}
            </div>
            
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-800">{activity.action}</div>
              <div className="text-xs text-gray-500">{activity.patient} • {activity.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Loading Skeleton
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-24 bg-white/20 rounded-2xl"></div>
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 bg-white/20 rounded-2xl"></div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="h-64 bg-white/20 rounded-2xl"></div>
        <div className="col-span-2 h-64 bg-white/20 rounded-2xl"></div>
      </div>
    </div>
  );
}

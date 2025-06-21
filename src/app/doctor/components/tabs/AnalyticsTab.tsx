'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Analytics Tab - Performance metrics, clinical analytics, and AI insights
 * Features: Real-time metrics, trend analysis, performance tracking, clinical outcomes
 */

import React, { useState, useEffect } from 'react';
import { useDoctorContext } from '../../contexts/DoctorContext';

interface AnalyticsData {
  overview: {
    patientsSeenToday: number;
    totalPatientsThisMonth: number;
    averageConsultationTime: number;
    patientSatisfactionScore: number;
    treatmentSuccessRate: number;
    onTimePercentage: number;
  };
  trends: {
    patientVolume: any[];
    consultationTimes: any[];
    satisfactionScores: any[];
    outcomeMetrics: any[];
  };
  performance: {
    efficiency: number;
    accuracy: number;
    patientOutcomes: number;
    aiUtilization: number;
  };
  insights: any[];
}

export default function AnalyticsTab() {
  const { state, dispatch } = useDoctorContext();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'quarter' | 'year'>('month');
  const [metricType, setMetricType] = useState<'overview' | 'patients' | 'appointments' | 'prescriptions' | 'performance'>('overview');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange, metricType]);

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        timeframe: timeRange,
        metric: metricType
      });

      const response = await fetch(`/api/doctor/analytics?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const result = await response.json();
      setAnalyticsData(result.data);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getChangeColor = (change: string) => {
    if (change.startsWith('+')) return 'text-green-600';
    if (change.startsWith('-')) return 'text-red-600';
    return 'text-gray-600';
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 75) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded-xl"></div>
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
              📊 Analytics & Performance
            </h1>
            <p className="text-gray-600">
              Clinical performance metrics and AI-powered insights for continuous improvement
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={metricType}
              onChange={(e) => setMetricType(e.target.value as any)}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white"
            >
              <option value="overview">Overview</option>
              <option value="patients">Patients</option>
              <option value="appointments">Appointments</option>
              <option value="prescriptions">Prescriptions</option>
              <option value="performance">Performance</option>
            </select>
            
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white"
            >
              <option value="day">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>

        {/* Key Performance Indicators */}
        {analyticsData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Patients Seen</p>
                  <p className="text-3xl font-bold text-blue-600">{analyticsData.overview.totalPatientsThisMonth}</p>
                </div>
                <div className="text-4xl">👥</div>
              </div>
              <div className="mt-2 text-sm text-green-600">
                +{analyticsData.overview.patientsSeenToday} today
              </div>
            </div>

            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Avg Consultation</p>
                  <p className="text-3xl font-bold text-purple-600">{analyticsData.overview.averageConsultationTime}m</p>
                </div>
                <div className="text-4xl">⏱️</div>
              </div>
              <div className="mt-2 text-sm text-blue-600">
                Optimal range: 20-30m
              </div>
            </div>

            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Satisfaction</p>
                  <p className="text-3xl font-bold text-green-600">{analyticsData.overview.patientSatisfactionScore}/5</p>
                </div>
                <div className="text-4xl">⭐</div>
              </div>
              <div className="mt-2 text-sm text-green-600">
                Excellent rating
              </div>
            </div>

            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Success Rate</p>
                  <p className="text-3xl font-bold text-indigo-600">{analyticsData.overview.treatmentSuccessRate}%</p>
                </div>
                <div className="text-4xl">✅</div>
              </div>
              <div className="mt-2 text-sm text-indigo-600">
                Treatment outcomes
              </div>
            </div>
          </div>
        )}

        {/* Performance Metrics */}
        {analyticsData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">🎯 Performance Metrics</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-800">Clinical Efficiency</p>
                    <p className="text-sm text-gray-600">Time management and workflow optimization</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-lg font-bold ${getPerformanceColor(analyticsData.performance.efficiency)}`}>
                    {analyticsData.performance.efficiency}%
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-800">Diagnostic Accuracy</p>
                    <p className="text-sm text-gray-600">Accuracy of initial diagnoses</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-lg font-bold ${getPerformanceColor(analyticsData.performance.accuracy)}`}>
                    {analyticsData.performance.accuracy}%
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-800">Patient Outcomes</p>
                    <p className="text-sm text-gray-600">Treatment success and patient satisfaction</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-lg font-bold ${getPerformanceColor(analyticsData.performance.patientOutcomes)}`}>
                    {analyticsData.performance.patientOutcomes}%
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-800">AI Utilization</p>
                    <p className="text-sm text-gray-600">Effective use of AI tools and recommendations</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-lg font-bold ${getPerformanceColor(analyticsData.performance.aiUtilization)}`}>
                    {analyticsData.performance.aiUtilization}%
                  </div>
                </div>
              </div>
            </div>

            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">📈 Trend Analysis</h2>
              
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                  <h3 className="font-medium text-blue-800 mb-2">Patient Volume Trend</h3>
                  <p className="text-sm text-blue-700 mb-2">
                    {timeRange === 'month' ? 'This month' : timeRange === 'week' ? 'This week' : 'Today'}: 
                    <span className="font-bold ml-1">{analyticsData.overview.totalPatientsThisMonth} patients</span>
                  </p>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${Math.min(analyticsData.overview.totalPatientsThisMonth / 100 * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-xl border border-green-200">
                  <h3 className="font-medium text-green-800 mb-2">Satisfaction Trend</h3>
                  <p className="text-sm text-green-700 mb-2">
                    Current rating: <span className="font-bold">{analyticsData.overview.patientSatisfactionScore}/5.0</span>
                  </p>
                  <div className="w-full bg-green-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${(analyticsData.overview.patientSatisfactionScore / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                  <h3 className="font-medium text-purple-800 mb-2">Efficiency Trend</h3>
                  <p className="text-sm text-purple-700 mb-2">
                    On-time appointments: <span className="font-bold">{analyticsData.overview.onTimePercentage}%</span>
                  </p>
                  <div className="w-full bg-purple-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full" 
                      style={{ width: `${analyticsData.overview.onTimePercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Insights and Recommendations */}
        {analyticsData && analyticsData.insights.length > 0 && (
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">🤖 AI Performance Insights</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {analyticsData.insights.map((insight, index) => (
                <div 
                  key={index} 
                  className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200"
                >
                  <h3 className="font-medium text-blue-800 mb-2">{insight.title}</h3>
                  <p className="text-sm text-blue-700 mb-3">{insight.message}</p>
                  {insight.actionable && (
                    <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      Apply Recommendation →
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Reports */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">📋 Detailed Reports</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button className="p-6 bg-white/50 rounded-xl border border-white/30 hover:bg-white/70 transition-all duration-200 text-left">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="font-semibold text-gray-800 mb-2">Clinical Outcomes Report</h3>
              <p className="text-sm text-gray-600">Comprehensive analysis of treatment outcomes and patient recovery rates</p>
            </button>

            <button className="p-6 bg-white/50 rounded-xl border border-white/30 hover:bg-white/70 transition-all duration-200 text-left">
              <div className="text-3xl mb-3">⏱️</div>
              <h3 className="font-semibold text-gray-800 mb-2">Time & Efficiency Report</h3>
              <p className="text-sm text-gray-600">Detailed breakdown of consultation times and workflow efficiency</p>            </button>

            <button className="p-6 bg-white/50 rounded-xl border border-white/30 hover:bg-white/70 transition-all duration-200 text-left">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="font-semibold text-gray-800 mb-2">Quality Metrics Report</h3>
              <p className="text-sm text-gray-600">Patient satisfaction, diagnostic accuracy, and care quality indicators</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

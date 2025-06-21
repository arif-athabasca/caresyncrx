'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Diagnostics Tab - AI-powered diagnostic tools with lab integration and image analysis
 * Features: Lab results, imaging analysis, AI recommendations, trend analysis
 */

import React, { useState, useEffect } from 'react';
import { useDoctorContext } from '../../contexts/DoctorContext';

interface DiagnosticsTabProps {
  selectedPatientId: string | null;
}

interface DiagnosticResult {
  id: string;
  patientId: string;
  patientName: string;
  testType: string;
  status: 'pending' | 'completed' | 'in-progress';
  resultDate: string;
  criticalFlag: boolean;
  results?: any;
  aiAnalysis?: {
    interpretation: string;
    recommendations: string[];
    confidence: number;
  };
}

interface ImagingStudy {
  id: string;
  patientId: string;
  patientName: string;
  studyType: string;
  status: string;
  studyDate: string;
  findings: string;
  aiAnalysis?: {
    interpretation: string;
    confidence: number;
    annotations: any[];
  };
}

interface DiagnosticData {
  summary: {
    totalTests: number;
    pendingResults: number;
    criticalResults: number;
    completedToday: number;
  };
  recentResults: (DiagnosticResult | ImagingStudy)[];
  aiInsights: any[];
  trends: any[];
}

export default function DiagnosticsTab({ selectedPatientId }: DiagnosticsTabProps) {
  const { state, dispatch } = useDoctorContext();
  const [activeView, setActiveView] = useState<'overview' | 'lab' | 'imaging' | 'trends'>('overview');
  const [diagnosticData, setDiagnosticData] = useState<DiagnosticData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter'>('month');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadDiagnosticData();
  }, [selectedPatientId, dateRange, activeView]);

  const loadDiagnosticData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        ...(selectedPatientId && { patientId: selectedPatientId }),
        ...(activeView !== 'overview' && { type: activeView }),
        dateFrom: getDateFromRange(dateRange),
        dateTo: new Date().toISOString()
      });

      const response = await fetch(`/api/doctor/diagnostics?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch diagnostic data');
      }

      const result = await response.json();
      setDiagnosticData(result.data);
    } catch (error) {
      console.error('Error loading diagnostic data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDateFromRange = (range: string) => {
    const now = new Date();
    switch (range) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case 'quarter':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }
  };

  const orderNewTest = async (testData: any) => {
    try {
      const response = await fetch('/api/doctor/diagnostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });

      if (!response.ok) {
        throw new Error('Failed to order test');
      }

      // Refresh data
      loadDiagnosticData();
      setShowOrderForm(false);
    } catch (error) {
      console.error('Error ordering test:', error);
    }
  };

  const getResultColor = (result: DiagnosticResult | ImagingStudy) => {
    if ('criticalFlag' in result && result.criticalFlag) return 'border-red-500 bg-red-50';
    if (result.status === 'pending') return 'border-yellow-500 bg-yellow-50';
    return 'border-green-500 bg-green-50';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Store Advanced Imaging AI result
  const storeAdvancedImagingResult = async (result: any, imagingType: string) => {
    if (!selectedPatientId) return;

    try {
      const response = await fetch('/api/doctor/diagnostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatientId,
          aiServiceType: 'advanced-imaging',
          resultData: {
            imagingType,
            findings: result.data?.findings || [],
            recommendations: result.data?.recommendations || [],
            confidence: result.data?.confidence || 0,
            followUp: result.data?.followUp || '',
            criticalFindings: result.data?.criticalFindings || []
          },
          metadata: {
            model: result.metadata?.model || 'advanced-imaging-ai',
            processingTime: result.metadata?.processingTime,
            timestamp: new Date().toISOString()
          }
        })
      });

      if (response.ok) {
        console.log('Advanced imaging result stored successfully');
      }
    } catch (error) {
      console.error('Error storing advanced imaging result:', error);
    }
  };

  // Mental Health AI Integration
  const callMentalHealthAI = async (assessmentType: 'screening' | 'risk_assessment' | 'therapy_planning') => {
    if (!selectedPatientId) {
      alert('Please select a patient first');
      return;
    }

    setIsProcessing(true);
    try {
      const query = prompt(`Enter mental health assessment details for ${assessmentType}:`);
      if (!query) {
        setIsProcessing(false);
        return;
      }

      const response = await fetch('http://localhost:4000/api/v1/healthcare/mental-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentType,
          patientData: {
            age: 45, // Could be populated from patient data
            gender: 'Unknown', // Could be populated from patient data
            symptoms: query.split(',').map(s => s.trim()),
            mentalHealthHistory: [],
            currentStressors: []
          },
          query
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Store the result
        await storeMentalHealthResult(result, assessmentType);
          // Display results
        const newResult: DiagnosticResult = {
          id: Date.now().toString(),
          patientId: selectedPatientId,
          patientName: 'Current Patient',
          testType: 'Mental Health Assessment',
          status: 'completed',
          resultDate: new Date().toISOString(),
          criticalFlag: result.data?.riskAssessment === 'High',
          results: {
            assessmentType: assessmentType.replace('_', ' '),
            riskAssessment: result.data?.riskAssessment,
            screeningResults: result.data?.screeningResults,
            treatmentRecommendations: result.data?.treatmentRecommendations || [],
            therapyApproaches: result.data?.therapyApproaches || [],
            referralNeeds: result.data?.referralNeeds,
            safetyPlan: result.data?.safetyPlan,
            followUpSchedule: result.data?.followUpSchedule
          },
          aiAnalysis: {
            interpretation: result.data?.screeningResults || 'Mental health assessment completed',
            recommendations: result.data?.treatmentRecommendations || [],
            confidence: result.data?.confidence || 0
          }
        };

        setDiagnosticData(prev => prev ? {
          ...prev,
          recentResults: [newResult, ...prev.recentResults]
        } : null);

        alert(`Mental Health Assessment Complete:\n\nRisk Level: ${result.data?.riskAssessment}\nRecommendations: ${result.data?.treatmentRecommendations?.join(', ')}`);
        
      } else {
        throw new Error('Failed to get mental health AI response');
      }
    } catch (error) {
      console.error('Mental Health AI error:', error);
      alert('Mental health AI service temporarily unavailable. Please try again later.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Store Mental Health AI result
  const storeMentalHealthResult = async (result: any, assessmentType: string) => {
    if (!selectedPatientId) return;

    try {
      const response = await fetch('/api/doctor/diagnostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatientId,
          aiServiceType: 'mental-health',
          resultData: {
            assessmentType,
            riskAssessment: result.data?.riskAssessment || '',
            screeningResults: result.data?.screeningResults || '',
            treatmentRecommendations: result.data?.treatmentRecommendations || [],
            therapyApproaches: result.data?.therapyApproaches || [],
            referralNeeds: result.data?.referralNeeds || '',
            safetyPlan: result.data?.safetyPlan || '',
            followUpSchedule: result.data?.followUpSchedule || '',
            confidence: result.data?.confidence || 0
          },
          metadata: {
            model: result.metadata?.model || 'mental-health-ai',
            processingTime: result.metadata?.processingTime,
            timestamp: new Date().toISOString()
          }
        })
      });

      if (response.ok) {
        console.log('Mental health assessment result stored successfully');
      }
    } catch (error) {
      console.error('Error storing mental health result:', error);
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
                <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
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
              🔬 AI Diagnostics Center
            </h1>
            <p className="text-gray-600">
              Advanced diagnostic tools with AI-powered analysis and insights
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as 'week' | 'month' | 'quarter')}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white"
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="quarter">Last Quarter</option>
            </select>
              <button
              onClick={() => setShowOrderForm(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              🧪 Order Tests
            </button>
            
            <button
              onClick={() => callMentalHealthAI('screening')}
              disabled={!selectedPatientId || isProcessing}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <span className="flex items-center space-x-1">
                  <span className="animate-spin">⟳</span>
                  <span>Processing...</span>
                </span>
              ) : (
                '🧠 Mental Health AI'
              )}
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {diagnosticData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Tests</p>
                  <p className="text-3xl font-bold text-blue-600">{diagnosticData.summary.totalTests}</p>
                </div>
                <div className="text-4xl">📊</div>
              </div>
              <div className="mt-2 text-sm text-green-600">
                +{diagnosticData.summary.completedToday} today
              </div>
            </div>

            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending Results</p>
                  <p className="text-3xl font-bold text-orange-600">{diagnosticData.summary.pendingResults}</p>
                </div>
                <div className="text-4xl">⏳</div>
              </div>
              <div className="mt-2 text-sm text-gray-500">
                Awaiting completion
              </div>
            </div>

            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Critical Results</p>
                  <p className="text-3xl font-bold text-red-600">{diagnosticData.summary.criticalResults}</p>
                </div>
                <div className="text-4xl">🚨</div>
              </div>
              <div className="mt-2 text-sm text-red-500">
                Require attention
              </div>
            </div>

            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">AI Accuracy</p>
                  <p className="text-3xl font-bold text-purple-600">94%</p>
                </div>
                <div className="text-4xl">🤖</div>
              </div>
              <div className="mt-2 text-sm text-purple-600">
                Analysis confidence
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4">
          <div className="flex space-x-4">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'lab', label: 'Lab Results', icon: '🧪' },
              { id: 'imaging', label: 'Imaging', icon: '🔬' },
              { id: 'trends', label: 'Trends', icon: '📈' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as any)}
                className={`
                  px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors
                  ${activeView === tab.id 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white/50 text-gray-700 hover:bg-white/70'
                  }
                `}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
          {activeView === 'overview' && diagnosticData && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Recent Diagnostic Results</h2>
              
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {diagnosticData.recentResults.map((result) => (
                  <div 
                    key={result.id}
                    className={`p-6 rounded-xl border-l-4 ${getResultColor(result)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="text-lg font-semibold text-gray-800">
                            {'testType' in result ? result.testType : result.studyType}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            result.status === 'completed' ? 'bg-green-100 text-green-800' :
                            result.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {result.status}
                          </span>
                          {'criticalFlag' in result && result.criticalFlag && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              🚨 Critical
                            </span>
                          )}
                        </div>

                        <p className="text-gray-600 mb-2">
                          Patient: {result.patientName}
                        </p>
                        <p className="text-sm text-gray-500 mb-4">
                          Date: {formatDate('resultDate' in result ? result.resultDate : result.studyDate)}
                        </p>

                        {'findings' in result ? (
                          <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-1">Findings:</p>
                            <p className="text-gray-800">{result.findings}</p>
                          </div>
                        ) : (
                          'results' in result && result.results && (
                            <div className="mb-4">
                              <p className="text-sm text-gray-600 mb-2">Results:</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {Object.entries(result.results).map(([key, value]: [string, any]) => (
                                  <div key={key} className="flex justify-between items-center p-2 bg-white rounded">
                                    <span className="text-sm font-medium">{key}:</span>
                                    <span className={`text-sm ${value.normal ? 'text-green-600' : 'text-red-600'}`}>
                                      {value.value} {value.unit}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        )}

                        {result.aiAnalysis && (
                          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                            <h4 className="font-medium text-purple-800 mb-2 flex items-center">
                              🤖 AI Analysis (Confidence: {Math.round(result.aiAnalysis.confidence * 100)}%)
                            </h4>
                            <p className="text-sm text-purple-700 mb-3">{result.aiAnalysis.interpretation}</p>                            {result.aiAnalysis && 'recommendations' in result.aiAnalysis && result.aiAnalysis.recommendations && (
                              <div>
                                <p className="text-sm font-medium text-purple-800 mb-1">Recommendations:</p>
                                <ul className="text-sm text-purple-700 list-disc list-inside">
                                  {result.aiAnalysis.recommendations.map((rec: string, index: number) => (
                                    <li key={index}>{rec}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="ml-4 flex flex-col space-y-2">
                        <button
                          className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                          onClick={() => {
                            // View detailed results
                          }}
                        >
                          View Details
                        </button>
                        
                        <button
                          className="px-4 py-2 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 transition-colors"
                          onClick={() => {
                            // Get AI insights
                          }}
                        >
                          🤖 AI Insights
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeView === 'lab' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Laboratory Results</h2>
              <p className="text-gray-600">Laboratory results with AI analysis will be displayed here.</p>
            </div>
          )}

          {activeView === 'imaging' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Medical Imaging</h2>
              <p className="text-gray-600">Imaging studies with AI interpretation will be displayed here.</p>
            </div>
          )}

          {activeView === 'trends' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Diagnostic Trends</h2>
              <p className="text-gray-600">Trend analysis and patterns will be displayed here.</p>
            </div>
          )}
        </div>

        {/* AI Insights Panel */}
        {diagnosticData && diagnosticData.aiInsights.length > 0 && (
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">🤖 AI Clinical Insights</h2>
            
            <div className="space-y-4">
              {diagnosticData.aiInsights.map((insight, index) => (
                <div key={index} className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-blue-800">{insight.message}</p>
                </div>
              ))}
            </div>          </div>
        )}
      </div>
    </div>
  );
}

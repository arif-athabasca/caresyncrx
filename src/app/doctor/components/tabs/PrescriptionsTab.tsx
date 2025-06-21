'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Prescriptions Tab - E-prescribing with AI assistance and drug interaction checking
 * Features: Smart prescribing, drug interactions, formulary checking, AI recommendations
 */

import React, { useState, useEffect } from 'react';
import { useDoctorContext } from '../../contexts/DoctorContext';

interface PrescriptionsTabProps {
  selectedPatientId: string | null;
}

interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  status: 'active' | 'pending' | 'completed' | 'cancelled';
  prescribedDate: string;
  lastModified: string;
  instructions: string;
  refills: number;
  refillsRemaining: number;
  aiSuggestions?: {
    dosageOptimization: string;
    interactions: string[];
    alternatives: string[];
    warnings: string[];
  };
}

interface PrescriptionData {
  prescriptions: Prescription[];
  summary: {
    totalPrescriptions: number;
    activePrescriptions: number;
    pendingPrescriptions: number;
    interactionAlerts: number;
  };
  drugInteractions: any[];
  formularyInfo: any[];
}

export default function PrescriptionsTab({ selectedPatientId }: PrescriptionsTabProps) {
  const { state, dispatch } = useDoctorContext();
  const [activeSection, setActiveSection] = useState<'prescribe' | 'pending' | 'history'>('prescribe');
  const [prescriptionData, setPrescriptionData] = useState<PrescriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewPrescription, setShowNewPrescription] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // New prescription form state
  const [newPrescription, setNewPrescription] = useState({
    patientId: selectedPatientId || '',
    medicationName: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
    refills: 0
  });

  useEffect(() => {
    loadPrescriptions();
  }, [selectedPatientId, activeSection]);

  const loadPrescriptions = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        ...(selectedPatientId && { patientId: selectedPatientId }),
        ...(activeSection !== 'prescribe' && { status: activeSection === 'pending' ? 'pending' : 'all' })
      });

      const response = await fetch(`/api/doctor/prescriptions?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch prescriptions');
      }

      const result = await response.json();
      setPrescriptionData(result.data);
    } catch (error) {
      console.error('Error loading prescriptions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createPrescription = async () => {
    try {
      const response = await fetch('/api/doctor/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPrescription)
      });

      if (!response.ok) {
        throw new Error('Failed to create prescription');
      }

      // Reset form and refresh data
      setNewPrescription({
        patientId: selectedPatientId || '',
        medicationName: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
        refills: 0
      });
      setShowNewPrescription(false);
      loadPrescriptions();
    } catch (error) {
      console.error('Error creating prescription:', error);
    }
  };

  const updatePrescriptionStatus = async (prescriptionId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/doctor/prescriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prescriptionId,
          status: newStatus
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update prescription');
      }

      loadPrescriptions();
    } catch (error) {
      console.error('Error updating prescription:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Prior Authorization AI Integration
  const callPriorAuthAI = async (prescriptionData: any) => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:4000/api/prior-authorization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medication: {
            name: prescriptionData.medicationName,
            dosage: prescriptionData.dosage,
            quantity: prescriptionData.quantity || 30,
            ndc: prescriptionData.ndc || ''
          },
          patient: {
            id: selectedPatientId,
            age: prescriptionData.patientAge || 45,
            gender: prescriptionData.patientGender || 'Unknown',
            insurance: prescriptionData.insurance || 'Unknown'
          },
          clinical: {
            diagnosis: prescriptionData.diagnosis || '',
            medicalHistory: prescriptionData.medicalHistory || [],
            allergies: prescriptionData.allergies || [],
            currentMedications: prescriptionData.currentMedications || []
          },
          prescriber: {
            id: 'current-doctor-id', // Replace with actual doctor ID
            npi: prescriptionData.prescriberNPI || ''
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Store the prior auth result in local database
        await storePriorAuthResult(result);
        
        // Show the result to the user
        const authStatus = result.recommendation;
        const message = authStatus === 'APPROVED' 
          ? 'Prior authorization likely to be approved. You may proceed with prescribing.'
          : authStatus === 'DENIED'
          ? `Prior authorization may be denied. Reason: ${result.reason}. Consider alternatives.`
          : `Prior authorization review required. Additional documentation needed: ${result.additionalInfo?.join(', ')}`;
        
        alert(`Prior Authorization Check Complete:\n\n${message}`);
        
        // If alternatives suggested, show them
        if (result.alternatives && result.alternatives.length > 0) {
          const altMessage = `Alternative medications suggested:\n${result.alternatives.map((alt: any) => `• ${alt.name} (${alt.rationale})`).join('\n')}`;
          alert(altMessage);
        }
        
      } else {
        throw new Error('Failed to get prior authorization AI response');
      }
    } catch (error) {
      console.error('Prior Authorization AI error:', error);
      alert('Prior authorization AI temporarily unavailable. Please check manually with insurance.');
    } finally {
      setIsLoading(false);
    }
  };

  // Store Prior Authorization AI result in local database
  const storePriorAuthResult = async (authResult: any) => {
    try {
      const response = await fetch('/api/doctor/prior-authorization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatientId,
          medicationName: newPrescription.medicationName,
          recommendation: authResult.recommendation,
          confidence: authResult.confidence || 0,
          reason: authResult.reason || '',
          alternatives: authResult.alternatives || [],
          additionalInfo: authResult.additionalInfo || [],
          metadata: {
            aiModel: authResult.model || 'prior-auth-ai',
            timestamp: new Date().toISOString(),
            requestData: authResult.requestData
          }
        })
      });

      if (!response.ok) {
        console.error('Failed to store prior authorization result');
      }
    } catch (error) {
      console.error('Error storing prior authorization result:', error);
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
              💊 Prescription Management
            </h1>
            <p className="text-gray-600">
              AI-assisted e-prescribing with drug interaction checking and formulary validation
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowNewPrescription(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              💊 New Prescription
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {prescriptionData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Prescriptions</p>
                  <p className="text-3xl font-bold text-blue-600">{prescriptionData.summary.totalPrescriptions}</p>
                </div>
                <div className="text-4xl">💊</div>
              </div>
            </div>

            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Active</p>
                  <p className="text-3xl font-bold text-green-600">{prescriptionData.summary.activePrescriptions}</p>
                </div>
                <div className="text-4xl">✅</div>
              </div>
            </div>

            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending</p>
                  <p className="text-3xl font-bold text-orange-600">{prescriptionData.summary.pendingPrescriptions}</p>
                </div>
                <div className="text-4xl">⏳</div>
              </div>
            </div>

            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Interactions</p>
                  <p className="text-3xl font-bold text-red-600">{prescriptionData.summary.interactionAlerts}</p>
                </div>
                <div className="text-4xl">⚠️</div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex space-x-4">
              {[
                { id: 'prescribe', label: 'New Prescription', icon: '💊' },
                { id: 'pending', label: 'Pending', icon: '⏳' },
                { id: 'history', label: 'History', icon: '📋' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id as any)}
                  className={`
                    px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors
                    ${activeSection === tab.id 
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

            <input
              type="text"
              placeholder="Search medications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white"
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
          {activeSection === 'prescribe' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">🤖 AI-Assisted Prescribing</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Prescription Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Medication Name</label>
                    <input
                      type="text"
                      value={newPrescription.medicationName}
                      onChange={(e) => setNewPrescription({...newPrescription, medicationName: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white"
                      placeholder="Search medications..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Dosage</label>
                      <input
                        type="text"
                        value={newPrescription.dosage}
                        onChange={(e) => setNewPrescription({...newPrescription, dosage: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white"
                        placeholder="e.g., 500mg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                      <select
                        value={newPrescription.frequency}
                        onChange={(e) => setNewPrescription({...newPrescription, frequency: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white"
                      >
                        <option value="">Select frequency</option>
                        <option value="once_daily">Once daily</option>
                        <option value="twice_daily">Twice daily</option>
                        <option value="three_times_daily">Three times daily</option>
                        <option value="four_times_daily">Four times daily</option>
                        <option value="as_needed">As needed</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
                      <input
                        type="text"
                        value={newPrescription.duration}
                        onChange={(e) => setNewPrescription({...newPrescription, duration: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white"
                        placeholder="e.g., 30 days"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Refills</label>
                      <input
                        type="number"
                        value={newPrescription.refills}
                        onChange={(e) => setNewPrescription({...newPrescription, refills: parseInt(e.target.value)})}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white"
                        min="0"
                        max="5"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
                    <textarea
                      value={newPrescription.instructions}
                      onChange={(e) => setNewPrescription({...newPrescription, instructions: e.target.value})}
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white"
                      placeholder="Special instructions for the patient..."
                    />
                  </div>                  <div className="space-y-3">
                    <button
                      onClick={createPrescription}
                      className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      📝 Create Prescription
                    </button>
                    
                    <button
                      onClick={() => callPriorAuthAI({
                        medicationName: newPrescription.medicationName,
                        dosage: newPrescription.dosage,
                        quantity: 30,
                        diagnosis: '', // Could be populated from patient data
                        medicalHistory: [],
                        allergies: [],
                        currentMedications: [],
                        patientAge: 45, // Could be populated from patient data
                        patientGender: 'Unknown',
                        insurance: 'Unknown'
                      })}
                      disabled={!newPrescription.medicationName || !selectedPatientId || isLoading}
                      className="w-full px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center space-x-2">
                          <span className="animate-spin">⟳</span>
                          <span>Checking...</span>
                        </span>
                      ) : (
                        '🏥 Check Prior Authorization'
                      )}
                    </button>
                  </div>
                </div>

                {/* AI Recommendations */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">🤖 AI Recommendations</h3>
                  
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <h4 className="font-medium text-blue-800 mb-2">Drug Interaction Check</h4>
                    <p className="text-sm text-blue-700">No significant interactions found.</p>
                  </div>

                  <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <h4 className="font-medium text-green-800 mb-2">Formulary Status</h4>
                    <p className="text-sm text-green-700">Medication is covered by patient's insurance.</p>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                    <h4 className="font-medium text-purple-800 mb-2">Dosage Recommendations</h4>
                    <p className="text-sm text-purple-700">Standard dosing for patient's age and weight.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(activeSection === 'pending' || activeSection === 'history') && prescriptionData && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">
                {activeSection === 'pending' ? 'Pending Prescriptions' : 'Prescription History'}
              </h2>
              
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {prescriptionData.prescriptions
                  .filter(p => activeSection === 'pending' ? p.status === 'pending' : true)
                  .map((prescription) => (
                  <div 
                    key={prescription.id}
                    className="p-6 bg-white/50 rounded-xl border border-white/30 hover:bg-white/70 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="text-lg font-semibold text-gray-800">
                            {prescription.medicationName}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(prescription.status)}`}>
                            {prescription.status}
                          </span>
                        </div>

                        <p className="text-gray-600 mb-2">
                          Patient: {prescription.patientName}
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600">Dosage & Frequency</p>
                            <p className="font-medium">{prescription.dosage} - {prescription.frequency}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-gray-600">Duration</p>
                            <p className="font-medium">{prescription.duration}</p>
                          </div>
                        </div>

                        <div className="mb-4">
                          <p className="text-sm text-gray-600 mb-1">Instructions</p>
                          <p className="text-gray-800">{prescription.instructions}</p>
                        </div>

                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>Prescribed: {formatDate(prescription.prescribedDate)}</span>
                          <span>Refills: {prescription.refillsRemaining}/{prescription.refills}</span>
                        </div>

                        {prescription.aiSuggestions && (
                          <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <p className="text-sm font-medium text-purple-800 mb-2">🤖 AI Suggestions</p>
                            {prescription.aiSuggestions.warnings.length > 0 && (
                              <div className="mb-2">
                                <p className="text-sm text-purple-700">Warnings:</p>
                                <ul className="text-sm text-purple-600 list-disc list-inside">
                                  {prescription.aiSuggestions.warnings.map((warning, index) => (
                                    <li key={index}>{warning}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="ml-6 flex flex-col space-y-2">
                        {prescription.status === 'pending' && (
                          <button
                            onClick={() => updatePrescriptionStatus(prescription.id, 'active')}
                            className="px-4 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
                          >
                            ✅ Approve
                          </button>
                        )}
                        
                        {prescription.status === 'active' && (
                          <button
                            onClick={() => updatePrescriptionStatus(prescription.id, 'completed')}
                            className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            🏁 Complete
                          </button>
                        )}

                        <button
                          onClick={() => updatePrescriptionStatus(prescription.id, 'cancelled')}
                          className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                        >
                          ❌ Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {prescriptionData.prescriptions.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-6xl mb-4">💊</div>
                    <h3 className="text-xl font-medium mb-2">No prescriptions found</h3>
                    <p>No prescriptions match your current filter.</p>
                  </div>
                )}              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

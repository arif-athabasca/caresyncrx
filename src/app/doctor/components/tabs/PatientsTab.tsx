'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Patients Tab - Advanced patient management with AI insights and triage integration
 * Features: Smart search, risk assessment, patient timeline, PIPEDA compliance
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useDoctorContext } from '../../contexts/DoctorContext';

interface PatientsTabProps {
  selectedPatientId: string | null;
  onPatientSelect: (patientId: string) => void;
}

interface PatientData {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth: string;
  gender?: string;
  address?: string;
  emergencyContact?: string;
  medicalHistory: string[];
  allergies: string[];
  currentMedications: string[];
  lastVisit: string;
  compliance: {
    hasValidConsent: boolean;
    aiAnalysisConsent: boolean;
    dataSharing: boolean;
  };
  clinicalStatus: {
    riskLevel: string;
    activeTriages: number;
    upcomingAppointments: number;
  };
  recentTriages: Array<{
    id: string;
    urgencyLevel: string;
    status: string;
    symptoms?: string;
    createdAt: string;
  }>;
  nextAppointment?: {
    id: string;
    startTime: string;
    appointmentType: string;
    status: string;
  };
}

interface PatientListFilters {
  searchTerm: string;
  urgencyLevel: '' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  patientType: 'all' | 'assigned' | 'scheduled';
  sortBy: 'name' | 'lastVisit' | 'urgency' | 'status';
  sortOrder: 'asc' | 'desc';
}

export default function PatientsTab({ selectedPatientId, onPatientSelect }: PatientsTabProps) {
  const { state, dispatch } = useDoctorContext();
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [filters, setFilters] = useState<PatientListFilters>({
    searchTerm: '',
    urgencyLevel: '',
    patientType: 'all',
    sortBy: 'lastVisit',
    sortOrder: 'desc'
  });
  const [viewMode, setViewMode] = useState<'list' | 'cards' | 'details'>('cards');
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0
  });
  const [summary, setSummary] = useState({
    totalPatients: 0,
    activeTriages: 0,
    upcomingAppointments: 0,
    consentCompliance: 0
  });
  // Load patients from API
  const loadPatients = useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search: filters.searchTerm,
        urgencyLevel: filters.urgencyLevel,
        type: filters.patientType
      });

      const response = await fetch(`/api/doctor/patients?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch patients');
      }

      const data = await response.json();
      
      // For development, use mock data if API returns empty
      const mockPatients = [
        {
          id: 'patient-1',
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '1985-03-15',
          gender: 'Male',
          email: 'john.doe@email.com',
          phone: '(555) 123-4567',
          riskScore: 85,
          lastVisit: '2025-06-15',
          insurance: {
            provider: 'Blue Cross',
            policyNumber: 'BC123456789',
            status: 'active' as const,
            copay: 25
          },
          currentMedications: [
            {
              id: 'med-1',
              name: 'Lisinopril',
              dosage: '10mg',
              frequency: 'Daily',
              prescribedDate: '2025-05-01',
              prescribedBy: 'Dr. Smith',
              status: 'active' as const
            }
          ],
          allergies: [
            {
              id: 'allergy-1',
              allergen: 'Penicillin',
              reaction: 'Rash',
              severity: 'moderate' as const
            }
          ],
          vitalSigns: {
            temperature: 98.6,
            bloodPressure: { systolic: 140, diastolic: 90 },
            heartRate: 75,
            weight: 180,
            recordedAt: '2025-06-15T10:30:00Z'
          }
        },
        {
          id: 'patient-2',
          firstName: 'Sarah',
          lastName: 'Wilson',
          dateOfBirth: '1978-11-22',
          gender: 'Female',
          email: 'sarah.wilson@email.com',
          phone: '(555) 987-6543',
          riskScore: 45,
          lastVisit: '2025-06-10',
          insurance: {
            provider: 'Aetna',
            policyNumber: 'AE987654321',
            status: 'active' as const,
            copay: 30
          },
          currentMedications: [],
          allergies: [],
          vitalSigns: {
            temperature: 98.4,
            bloodPressure: { systolic: 120, diastolic: 80 },
            heartRate: 68,
            weight: 145,
            recordedAt: '2025-06-10T14:15:00Z'
          }
        }
      ];

      dispatch({ type: 'SET_PATIENTS', payload: data.patients || mockPatients });
    } catch (error) {      console.error('Failed to load patients:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load patients' });
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, filters.searchTerm, filters.urgencyLevel, filters.patientType, dispatch]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  // Handle filter changes
  const handleFilterChange = (key: keyof PatientListFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1 on filter change
  };

  // Get risk level styling
  const getRiskLevelStyle = (level: string) => {
    switch (level.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  // Get urgency level icon
  const getUrgencyIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const filteredPatients = state.patients.filter(patient => {
    // Search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      const matches = 
        patient.firstName.toLowerCase().includes(searchLower) ||
        patient.lastName.toLowerCase().includes(searchLower) ||
        patient.email?.toLowerCase().includes(searchLower) ||
        patient.phone?.includes(filters.searchTerm);
      if (!matches) return false;
    }

    // Urgency level filter
    if (filters.urgencyLevel) {
      // Implementation for urgency level filtering
    }

    return true;
  });

  const sortedPatients = [...filteredPatients].sort((a, b) => {
    const order = filters.sortOrder === 'asc' ? 1 : -1;
    
    switch (filters.sortBy) {
      case 'name':
        return order * `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      case 'lastVisit':
        return order * (new Date(a.lastVisit || 0).getTime() - new Date(b.lastVisit || 0).getTime());
      default:
        return 0;
    }
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Patient Management</h1>
            <p className="text-gray-600">
              Manage patient records with AI-powered insights • {sortedPatients.length} patients
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* View Mode Toggle */}
            <div className="flex bg-white/30 rounded-lg p-1">
              {(['list', 'cards', 'details'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`
                    px-3 py-1 rounded-md text-sm font-medium transition-all
                    ${viewMode === mode 
                      ? 'bg-white text-gray-800 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-800'
                    }
                  `}
                >
                  {mode === 'list' ? '☰' : mode === 'cards' ? '▦' : '📋'} {mode}
                </button>
              ))}
            </div>

            {/* Add Patient Button */}
            <button className="
              px-4 py-2 rounded-lg
              bg-gradient-to-r from-blue-500 to-purple-500
              text-white font-medium
              hover:from-blue-600 hover:to-purple-600
              transition-all duration-200
              flex items-center space-x-2
            ">
              <span>👤</span>
              <span>Add Patient</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <PatientFilters filters={filters} onFiltersChange={setFilters} />
      </div>

      {/* Patient List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Patient List */}
        <div className={`
          ${selectedPatientId ? 'lg:col-span-8' : 'lg:col-span-12'}
          transition-all duration-300
        `}>
          {viewMode === 'cards' && (
            <PatientCardGrid 
              patients={sortedPatients}
              selectedId={selectedPatientId}
              onSelect={onPatientSelect}
            />
          )}
          
          {viewMode === 'list' && (
            <PatientTable 
              patients={sortedPatients}
              selectedId={selectedPatientId}
              onSelect={onPatientSelect}
            />
          )}
        </div>

        {/* Patient Details Sidebar */}
        {selectedPatientId && (
          <div className="lg:col-span-4">
            <PatientDetailsSidebar 
              patientId={selectedPatientId}
              onClose={() => onPatientSelect('')}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Patient Filters Component
function PatientFilters({ filters, onFiltersChange }: {
  filters: PatientListFilters;
  onFiltersChange: (filters: PatientListFilters) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Search */}
      <div className="lg:col-span-2">
        <input
          type="text"
          placeholder="Search patients by name, email, or phone..."
          value={filters.searchTerm}
          onChange={(e) => onFiltersChange({ ...filters, searchTerm: e.target.value })}
          className="
            w-full p-2 rounded-lg
            backdrop-blur-xl bg-white/50
            border border-white/30
            text-sm text-gray-700
            focus:outline-none focus:ring-2 focus:ring-blue-500/50
          "
        />
      </div>

      {/* Risk Level */}
      <select
        value={filters.riskLevel}
        onChange={(e) => onFiltersChange({ ...filters, riskLevel: e.target.value as any })}
        className="
          p-2 rounded-lg
          backdrop-blur-xl bg-white/50
          border border-white/30
          text-sm text-gray-700
          focus:outline-none focus:ring-2 focus:ring-blue-500/50
        "
      >
        <option value="all">All Risk Levels</option>
        <option value="low">Low Risk (0-29)</option>
        <option value="moderate">Moderate (30-59)</option>
        <option value="high">High (60-79)</option>
        <option value="critical">Critical (80+)</option>
      </select>

      {/* Status */}
      <select
        value={filters.status}
        onChange={(e) => onFiltersChange({ ...filters, status: e.target.value as any })}
        className="
          p-2 rounded-lg
          backdrop-blur-xl bg-white/50
          border border-white/30
          text-sm text-gray-700
          focus:outline-none focus:ring-2 focus:ring-blue-500/50
        "
      >
        <option value="all">All Patients</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="new">New Patients</option>
      </select>

      {/* Sort */}
      <select
        value={`${filters.sortBy}-${filters.sortOrder}`}
        onChange={(e) => {
          const [sortBy, sortOrder] = e.target.value.split('-');
          onFiltersChange({ ...filters, sortBy: sortBy as any, sortOrder: sortOrder as any });
        }}
        className="
          p-2 rounded-lg
          backdrop-blur-xl bg-white/50
          border border-white/30
          text-sm text-gray-700
          focus:outline-none focus:ring-2 focus:ring-blue-500/50
        "
      >
        <option value="lastVisit-desc">Recent Visit</option>
        <option value="name-asc">Name A-Z</option>
        <option value="name-desc">Name Z-A</option>
        <option value="riskScore-desc">High Risk First</option>
        <option value="age-asc">Youngest First</option>
        <option value="age-desc">Oldest First</option>
      </select>
    </div>
  );
}

// Patient Card Grid Component
function PatientCardGrid({ patients, selectedId, onSelect }: {
  patients: any[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {patients.map(patient => (
        <PatientCard 
          key={patient.id}
          patient={patient}
          isSelected={selectedId === patient.id}
          onClick={() => onSelect(patient.id)}
        />
      ))}
    </div>
  );
}

// Patient Card Component
function PatientCard({ patient, isSelected, onClick }: {
  patient: any;
  isSelected: boolean;
  onClick: () => void;
}) {
  const getRiskColor = (score: number) => {
    if (score >= 80) return 'bg-red-500';
    if (score >= 60) return 'bg-orange-500';
    if (score >= 30) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();

  return (
    <div 
      className={`
        backdrop-blur-xl bg-white/20 border border-white/30 
        rounded-2xl p-4 cursor-pointer
        hover:bg-white/30 hover:border-white/40
        transition-all duration-300 ease-out
        ${isSelected ? 'ring-2 ring-blue-500/50 bg-white/40' : ''}
        shadow-lg shadow-black/5
      `}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
            {patient.firstName[0]}{patient.lastName[0]}
          </div>
          
          <div>
            <h3 className="font-medium text-gray-800">
              {patient.firstName} {patient.lastName}
            </h3>
            <p className="text-xs text-gray-500">
              {age} years • {patient.gender}
            </p>
          </div>
        </div>

        {/* Risk Score */}
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${getRiskColor(patient.riskScore || 0)}`} />
          <span className="text-xs font-medium text-gray-600">
            {patient.riskScore || 0}
          </span>
        </div>
      </div>

      {/* Quick Info */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center text-xs text-gray-600">
          <span className="mr-2">📞</span>
          <span>{patient.phone}</span>
        </div>
        
        <div className="flex items-center text-xs text-gray-600">
          <span className="mr-2">📅</span>
          <span>Last visit: {new Date(patient.lastVisit || '').toLocaleDateString()}</span>
        </div>

        {patient.insurance && (
          <div className="flex items-center text-xs text-gray-600">
            <span className="mr-2">🏥</span>
            <span>{patient.insurance.provider}</span>
          </div>
        )}
      </div>

      {/* Alerts */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-1">
          {patient.currentMedications?.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
              💊 {patient.currentMedications.length}
            </span>
          )}
          
          {patient.allergies?.length > 0 && (
            <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
              ⚠️ {patient.allergies.length}
            </span>
          )}
        </div>

        <button 
          className="text-xs text-blue-600 hover:text-blue-800"
          onClick={(e) => {
            e.stopPropagation();
            // Quick actions menu
          }}
        >
          ⋯
        </button>
      </div>
    </div>
  );
}

// Patient Table Component (simplified for space)
function PatientTable({ patients, selectedId, onSelect }: {
  patients: any[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-white/20 border-b border-white/20">
            <tr>
              <th className="text-left p-4 font-medium text-gray-700">Patient</th>
              <th className="text-left p-4 font-medium text-gray-700">Age</th>
              <th className="text-left p-4 font-medium text-gray-700">Risk</th>
              <th className="text-left p-4 font-medium text-gray-700">Last Visit</th>
              <th className="text-left p-4 font-medium text-gray-700">Insurance</th>
              <th className="text-left p-4 font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {patients.map(patient => (
              <tr 
                key={patient.id}
                className={`
                  border-b border-white/10 hover:bg-white/20 cursor-pointer
                  ${selectedId === patient.id ? 'bg-white/30' : ''}
                `}
                onClick={() => onSelect(patient.id)}
              >
                <td className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm">
                      {patient.firstName[0]}{patient.lastName[0]}
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">
                        {patient.firstName} {patient.lastName}
                      </div>
                      <div className="text-xs text-gray-500">{patient.email}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-sm text-gray-600">
                  {new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()}
                </td>
                <td className="p-4">
                  <span className={`
                    inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                    ${(patient.riskScore || 0) >= 80 ? 'bg-red-100 text-red-600' :
                      (patient.riskScore || 0) >= 60 ? 'bg-orange-100 text-orange-600' :
                      (patient.riskScore || 0) >= 30 ? 'bg-yellow-100 text-yellow-600' :
                      'bg-green-100 text-green-600'}
                  `}>
                    {patient.riskScore || 0}
                  </span>
                </td>
                <td className="p-4 text-sm text-gray-600">
                  {new Date(patient.lastVisit || '').toLocaleDateString()}
                </td>
                <td className="p-4 text-sm text-gray-600">
                  {patient.insurance?.provider || 'None'}
                </td>
                <td className="p-4">
                  <button className="text-blue-600 hover:text-blue-800 text-sm">
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Patient Details Sidebar Component
function PatientDetailsSidebar({ patientId, onClose }: {
  patientId: string;
  onClose: () => void;
}) {
  const { state } = useDoctorContext();
  const patient = state.patients.find(p => p.id === patientId);

  if (!patient) return null;

  return (
    <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-6 sticky top-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Patient Details</h3>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-white/30 rounded-lg transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="space-y-6">
        {/* Patient Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-xl font-medium">
            {patient.firstName[0]}{patient.lastName[0]}
          </div>
          <h4 className="font-medium text-gray-800">
            {patient.firstName} {patient.lastName}
          </h4>
          <p className="text-sm text-gray-500">
            {new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()} years • {patient.gender}
          </p>
        </div>

        {/* Contact Info */}
        <div className="space-y-2">
          <h5 className="font-medium text-gray-700">Contact Information</h5>
          <div className="text-sm text-gray-600 space-y-1">
            <div>📞 {patient.phone}</div>
            <div>✉️ {patient.email}</div>
          </div>
        </div>

        {/* Vital Signs */}
        {patient.vitalSigns && (
          <div className="space-y-2">
            <h5 className="font-medium text-gray-700">Latest Vitals</h5>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-white/20 p-2 rounded">
                <div className="text-xs text-gray-500">BP</div>
                <div className="font-medium">
                  {patient.vitalSigns.bloodPressure?.systolic}/{patient.vitalSigns.bloodPressure?.diastolic}
                </div>
              </div>
              <div className="bg-white/20 p-2 rounded">
                <div className="text-xs text-gray-500">HR</div>
                <div className="font-medium">{patient.vitalSigns.heartRate} bpm</div>
              </div>
            </div>
          </div>
        )}

        {/* Medications */}
        {patient.currentMedications && patient.currentMedications.length > 0 && (
          <div className="space-y-2">
            <h5 className="font-medium text-gray-700">Current Medications</h5>
            <div className="space-y-1">
              {patient.currentMedications.map(med => (
                <div key={med.id} className="text-sm bg-white/20 p-2 rounded">
                  <div className="font-medium">{med.name}</div>
                  <div className="text-xs text-gray-500">{med.dosage} • {med.frequency}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Allergies */}
        {patient.allergies && patient.allergies.length > 0 && (
          <div className="space-y-2">
            <h5 className="font-medium text-gray-700">Allergies</h5>
            <div className="space-y-1">
              {patient.allergies.map(allergy => (
                <div key={allergy.id} className="text-sm bg-red-50/50 border border-red-200 p-2 rounded">
                  <div className="font-medium text-red-800">{allergy.allergen}</div>
                  <div className="text-xs text-red-600">{allergy.reaction} • {allergy.severity}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <button className="w-full p-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-purple-600 transition-all">
            View Full Record
          </button>
          <button className="w-full p-2 bg-white/30 text-gray-700 rounded-lg text-sm font-medium hover:bg-white/40 transition-all">
            Schedule Appointment
          </button>
        </div>
      </div>
    </div>
  );
}

// Loading Skeleton
function PatientListSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-32 bg-white/20 rounded-2xl"></div>
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-48 bg-white/20 rounded-2xl"></div>
        ))}
      </div>
    </div>
  );
}

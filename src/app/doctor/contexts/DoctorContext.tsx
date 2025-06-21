'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Doctor Dashboard Context - Centralized state management for doctor workflow
 */

import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Types
interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  email?: string;
  phone?: string;
  address?: string;
  insurance?: InsuranceInfo;
  medicalHistory?: MedicalHistory[];
  currentMedications?: Medication[];
  allergies?: Allergy[];
  vitalSigns?: VitalSigns;
  riskScore?: number;
  lastVisit?: string;
}

interface InsuranceInfo {
  provider: string;
  policyNumber: string;
  groupNumber?: string;
  copay?: number;
  deductible?: number;
  status: 'active' | 'inactive' | 'pending';
}

interface MedicalHistory {
  id: string;
  condition: string;
  diagnosisDate: string;
  status: 'active' | 'resolved' | 'chronic';
  notes?: string;
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  prescribedDate: string;
  prescribedBy: string;
  status: 'active' | 'discontinued' | 'completed';
  interactions?: DrugInteraction[];
}

interface DrugInteraction {
  drug: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  description: string;
}

interface Allergy {
  id: string;
  allergen: string;
  reaction: string;
  severity: 'mild' | 'moderate' | 'severe';
  notes?: string;
}

interface VitalSigns {
  temperature?: number;
  bloodPressure?: { systolic: number; diastolic: number };
  heartRate?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  recordedAt: string;
}

interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  type: 'routine' | 'urgent' | 'consultation' | 'follow-up' | 'telemedicine';
  scheduledTime: string;
  duration: number;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  location?: string;
  notes?: string;
  reasonForVisit?: string;
}

interface AIInsight {
  id: string;
  type: 'diagnosis' | 'treatment' | 'medication' | 'risk' | 'lab' | 'imaging';
  title: string;
  description: string;
  confidence: number;
  source: string;
  recommendations?: string[];
  severity?: 'low' | 'moderate' | 'high' | 'critical';
  timestamp: string;
}

interface Prescription {
  id: string;
  patientId: string;
  medicationName: string;
  dosage: string;
  quantity: number;
  refills: number;
  instructions: string;
  prescribedDate: string;
  status: 'pending' | 'sent' | 'filled' | 'rejected';
  pharmacy?: string;
  priorAuthRequired?: boolean;
}

// State interfaces
interface DoctorState {
  // Current selections
  selectedPatient: Patient | null;
  selectedAppointment: Appointment | null;
  
  // Data collections
  patients: Patient[];
  todaysAppointments: Appointment[];
  pendingPrescriptions: Prescription[];
  aiInsights: AIInsight[];
  
  // UI state
  loading: boolean;
  error: string | null;
  
  // Search and filters
  patientSearchQuery: string;
  appointmentFilter: 'all' | 'today' | 'upcoming' | 'past';
  
  // Performance metrics
  metrics: {
    totalPatients: number;
    todaysAppointments: number;
    pendingPrescriptions: number;
    avgConsultationTime: number;
    patientSatisfaction: number;
  };
}

// Action types
type DoctorAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SELECTED_PATIENT'; payload: Patient | null }
  | { type: 'SET_SELECTED_APPOINTMENT'; payload: Appointment | null }
  | { type: 'SET_PATIENTS'; payload: Patient[] }
  | { type: 'ADD_PATIENT'; payload: Patient }
  | { type: 'UPDATE_PATIENT'; payload: Patient }
  | { type: 'SET_APPOINTMENTS'; payload: Appointment[] }
  | { type: 'ADD_APPOINTMENT'; payload: Appointment }
  | { type: 'UPDATE_APPOINTMENT'; payload: Appointment }
  | { type: 'SET_PRESCRIPTIONS'; payload: Prescription[] }
  | { type: 'ADD_PRESCRIPTION'; payload: Prescription }
  | { type: 'UPDATE_PRESCRIPTION'; payload: Prescription }
  | { type: 'SET_AI_INSIGHTS'; payload: AIInsight[] }
  | { type: 'ADD_AI_INSIGHT'; payload: AIInsight }
  | { type: 'SET_PATIENT_SEARCH'; payload: string }
  | { type: 'SET_APPOINTMENT_FILTER'; payload: DoctorState['appointmentFilter'] }
  | { type: 'SET_METRICS'; payload: DoctorState['metrics'] };

// Initial state
const initialState: DoctorState = {
  selectedPatient: null,
  selectedAppointment: null,
  patients: [],
  todaysAppointments: [],
  pendingPrescriptions: [],
  aiInsights: [],
  loading: false,
  error: null,
  patientSearchQuery: '',
  appointmentFilter: 'today',
  metrics: {
    totalPatients: 0,
    todaysAppointments: 0,
    pendingPrescriptions: 0,
    avgConsultationTime: 0,
    patientSatisfaction: 0
  }
};

// Reducer
function doctorReducer(state: DoctorState, action: DoctorAction): DoctorState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_SELECTED_PATIENT':
      return { ...state, selectedPatient: action.payload };
    
    case 'SET_SELECTED_APPOINTMENT':
      return { ...state, selectedAppointment: action.payload };
    
    case 'SET_PATIENTS':
      return { ...state, patients: action.payload };
    
    case 'ADD_PATIENT':
      return { 
        ...state, 
        patients: [...state.patients, action.payload],
        metrics: {
          ...state.metrics,
          totalPatients: state.metrics.totalPatients + 1
        }
      };
    
    case 'UPDATE_PATIENT':
      return {
        ...state,
        patients: state.patients.map(p => 
          p.id === action.payload.id ? action.payload : p
        ),
        selectedPatient: state.selectedPatient?.id === action.payload.id 
          ? action.payload 
          : state.selectedPatient
      };
    
    case 'SET_APPOINTMENTS':
      return { 
        ...state, 
        todaysAppointments: action.payload,
        metrics: {
          ...state.metrics,
          todaysAppointments: action.payload.filter(apt => 
            new Date(apt.scheduledTime).toDateString() === new Date().toDateString()
          ).length
        }
      };
    
    case 'ADD_APPOINTMENT':
      return { 
        ...state, 
        todaysAppointments: [...state.todaysAppointments, action.payload] 
      };
    
    case 'UPDATE_APPOINTMENT':
      return {
        ...state,
        todaysAppointments: state.todaysAppointments.map(apt => 
          apt.id === action.payload.id ? action.payload : apt
        ),
        selectedAppointment: state.selectedAppointment?.id === action.payload.id 
          ? action.payload 
          : state.selectedAppointment
      };
    
    case 'SET_PRESCRIPTIONS':
      return { 
        ...state, 
        pendingPrescriptions: action.payload,
        metrics: {
          ...state.metrics,
          pendingPrescriptions: action.payload.filter(p => p.status === 'pending').length
        }
      };
    
    case 'ADD_PRESCRIPTION':
      return { 
        ...state, 
        pendingPrescriptions: [...state.pendingPrescriptions, action.payload] 
      };
    
    case 'UPDATE_PRESCRIPTION':
      return {
        ...state,
        pendingPrescriptions: state.pendingPrescriptions.map(p => 
          p.id === action.payload.id ? action.payload : p
        )
      };
    
    case 'SET_AI_INSIGHTS':
      return { ...state, aiInsights: action.payload };
    
    case 'ADD_AI_INSIGHT':
      return { 
        ...state, 
        aiInsights: [action.payload, ...state.aiInsights] 
      };
    
    case 'SET_PATIENT_SEARCH':
      return { ...state, patientSearchQuery: action.payload };
    
    case 'SET_APPOINTMENT_FILTER':
      return { ...state, appointmentFilter: action.payload };
    
    case 'SET_METRICS':
      return { ...state, metrics: action.payload };
    
    default:
      return state;
  }
}

// Context
interface DoctorContextValue {
  state: DoctorState;
  dispatch: React.Dispatch<DoctorAction>;
  
  // Action creators
  actions: {
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    selectPatient: (patient: Patient | null) => void;
    selectAppointment: (appointment: Appointment | null) => void;
    updatePatient: (patient: Patient) => void;
    updateAppointment: (appointment: Appointment) => void;
    addPrescription: (prescription: Prescription) => void;
    addAIInsight: (insight: AIInsight) => void;
    setPatientSearch: (query: string) => void;
    setAppointmentFilter: (filter: DoctorState['appointmentFilter']) => void;
  };
  
  // Computed values
  computed: {
    filteredPatients: Patient[];
    filteredAppointments: Appointment[];
    criticalInsights: AIInsight[];
    todaysMetrics: DoctorState['metrics'];
  };
}

const DoctorContext = createContext<DoctorContextValue | undefined>(undefined);

// Provider component
export function DoctorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(doctorReducer, initialState);

  // Action creators
  const actions = {
    setLoading: (loading: boolean) => dispatch({ type: 'SET_LOADING', payload: loading }),
    setError: (error: string | null) => dispatch({ type: 'SET_ERROR', payload: error }),
    selectPatient: (patient: Patient | null) => dispatch({ type: 'SET_SELECTED_PATIENT', payload: patient }),
    selectAppointment: (appointment: Appointment | null) => dispatch({ type: 'SET_SELECTED_APPOINTMENT', payload: appointment }),
    updatePatient: (patient: Patient) => dispatch({ type: 'UPDATE_PATIENT', payload: patient }),
    updateAppointment: (appointment: Appointment) => dispatch({ type: 'UPDATE_APPOINTMENT', payload: appointment }),
    addPrescription: (prescription: Prescription) => dispatch({ type: 'ADD_PRESCRIPTION', payload: prescription }),
    addAIInsight: (insight: AIInsight) => dispatch({ type: 'ADD_AI_INSIGHT', payload: insight }),
    setPatientSearch: (query: string) => dispatch({ type: 'SET_PATIENT_SEARCH', payload: query }),
    setAppointmentFilter: (filter: DoctorState['appointmentFilter']) => dispatch({ type: 'SET_APPOINTMENT_FILTER', payload: filter })
  };

  // Computed values
  const computed = {
    filteredPatients: state.patients.filter(patient => 
      state.patientSearchQuery === '' ||
      `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(state.patientSearchQuery.toLowerCase()) ||
      patient.id.toLowerCase().includes(state.patientSearchQuery.toLowerCase())
    ),
    
    filteredAppointments: state.todaysAppointments.filter(appointment => {
      const today = new Date().toDateString();
      const appointmentDate = new Date(appointment.scheduledTime).toDateString();
      
      switch (state.appointmentFilter) {
        case 'today':
          return appointmentDate === today;
        case 'upcoming':
          return new Date(appointment.scheduledTime) > new Date();
        case 'past':
          return new Date(appointment.scheduledTime) < new Date();
        default:
          return true;
      }
    }),
    
    criticalInsights: state.aiInsights.filter(insight => 
      insight.severity === 'high' || insight.severity === 'critical'
    ),
    
    todaysMetrics: state.metrics
  };

  const contextValue: DoctorContextValue = {
    state,
    dispatch,
    actions,
    computed
  };

  return (
    <DoctorContext.Provider value={contextValue}>
      {children}
    </DoctorContext.Provider>
  );
}

// Hook to use doctor context
export function useDoctorContext() {
  const context = useContext(DoctorContext);
  if (context === undefined) {
    throw new Error('useDoctorContext must be used within a DoctorProvider');
  }
  return context;
}

// Export types for use in components
export type { 
  Patient, 
  Appointment, 
  AIInsight, 
  Prescription, 
  Medication, 
  VitalSigns,
  MedicalHistory,
  Allergy,
  InsuranceInfo,
  DrugInteraction
};

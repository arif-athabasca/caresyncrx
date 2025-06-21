/**
 * Patients List Page for Admin Dashboard
 * Displays all registered patients with health card verification status and registration
 */

'use client';

import React, { useState } from 'react';
import PatientsList from './components/PatientsList';
import HealthCardRegistration from './components/HealthCardRegistration';

type ViewMode = 'list' | 'register' | 'edit' | 'view';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  gender?: string;
  dateOfBirth: string;
  healthCardNumber?: string;
  healthCardProvince?: string;
  governmentVerified: boolean;
  createdAt: string;
  Clinic: {
    name: string;
  };
  consent?: {
    dataProcessingConsent: boolean;
    consentDate: string;
  };
  _count: {
    ScheduleSlot: number;
    Prescription: number;
    ClinicalNote: number;
  };
}

export default function AdminPatientsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const handleRegisterNew = () => {
    setViewMode('register');
  };

  const handleEditPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setViewMode('edit');
  };

  const handleViewPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setViewMode('view');
  };

  const handleRegistrationSuccess = (newPatient: any) => {
    console.log('Patient registered successfully:', newPatient);
    setViewMode('list');
  };

  const handleCancel = () => {
    setSelectedPatient(null);
    setViewMode('list');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Patient List View */}
        {viewMode === 'list' && (
          <PatientsList
            onRegisterNew={handleRegisterNew}
            onEditPatient={handleEditPatient}
            onViewPatient={handleViewPatient}
          />
        )}        {/* Health Card Registration */}
        {viewMode === 'register' && (
          <HealthCardRegistration
            onCancel={handleCancel}
            onSuccess={handleRegistrationSuccess}
          />
        )}

        {/* Edit Patient */}
        {viewMode === 'edit' && selectedPatient && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4">
              Edit Patient: {selectedPatient.firstName} {selectedPatient.lastName}
            </h2>
            <p className="text-gray-600 mb-4">
              Patient editing functionality will be implemented here.
              This will allow updating patient information while maintaining PIPEDA compliance.
            </p>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to List
            </button>
          </div>
        )}

        {/* View Patient Details */}
        {viewMode === 'view' && selectedPatient && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4">
              Patient Details: {selectedPatient.firstName} {selectedPatient.lastName}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <span className="font-medium">Email:</span> {selectedPatient.email || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Phone:</span> {selectedPatient.phone || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Gender:</span> {selectedPatient.gender || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Date of Birth:</span> {new Date(selectedPatient.dateOfBirth).toLocaleDateString()}
              </div>
              <div>
                <span className="font-medium">Health Card:</span> {selectedPatient.healthCardNumber || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Province:</span> {selectedPatient.healthCardProvince || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Government Verified:</span> {selectedPatient.governmentVerified ? 'Yes' : 'No'}
              </div>
              <div>
                <span className="font-medium">Clinic:</span> {selectedPatient.Clinic.name}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-lg font-semibold text-blue-800">{selectedPatient._count.ScheduleSlot}</div>
                <div className="text-sm text-blue-600">Appointments</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-lg font-semibold text-green-800">{selectedPatient._count.Prescription}</div>
                <div className="text-sm text-green-600">Prescriptions</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="text-lg font-semibold text-purple-800">{selectedPatient._count.ClinicalNote}</div>
                <div className="text-sm text-purple-600">Clinical Notes</div>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to List
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

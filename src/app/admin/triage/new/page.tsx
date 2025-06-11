'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Triage Creation Page - AI-powered patient triage system
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ClinicalLayout from '../../../components/layout/ClinicalLayout';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../../auth/hooks/useAuth';
import { UserRole } from '@/auth';
import { withRoleProtection } from '../../../../auth/components/withRoleProtection';
import { Card } from '../components/TriageCard';
import { Badge } from '../components/TriageBadge';
import { Input, Textarea, Select } from '../components/TriageFormElements';

// Define interfaces outside of component to keep it clean
interface Patient {
  id: string;
  name: string;
  dob: string;
}

interface Provider {
  id: string;
  name: string;
  role: string;
  specialty: string;
  confidence: number;
  reason: string;
  nextAvailable: string;
}

interface AISuggestion {
  providers: Provider[];
  suggestedUrgency: string;
  analysis: string;
}

function NewTriagePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');  
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [symptoms, setSymptoms] = useState('');
  const [triageSuggestion, setTriageSuggestion] = useState<AISuggestion | null>(null);
  const [urgencyLevel, setUrgencyLevel] = useState('MEDIUM');  
  // Check authentication on load
  useEffect(() => {
    if (!authLoading && !user) {
      // Store current path for return after login
      if (typeof window !== 'undefined' && window.AuthSession) {
        window.AuthSession.storeLoginRedirect('/admin/triage/new');
      }
      router.push('/login?redirect=/admin/triage/new&source=triage');
    }
    
    // Special authentication check for New Triage page
    if (typeof window !== 'undefined' && !authLoading && user) {
      // Define an async function to handle auth checks
      const performEnhancedAuthChecks = async () => {
        console.log('New Triage Page: Performing enhanced authentication checks');
        
        // First check token validity
        if (window.AuthCore) {
          try {
            const isValid = window.AuthCore.isTokenValid(60); // Check if token is valid with 60s buffer
            console.log('New Triage Page: Token validity check result:', isValid);
            
            // If token is not valid, attempt to refresh it
            if (!isValid) {
              console.log('New Triage Page: Refreshing token');
              try {
                await window.AuthCore.refreshToken();
                console.log('New Triage Page: Token refreshed successfully');
              } catch (refreshError) {
                console.error('New Triage Page: Error refreshing token:', refreshError);
                if (window.AuthSession) {
                  window.AuthSession.redirectToLogin('/admin/triage/new');
                }
              }
            }
          } catch (error) {
            console.error('New Triage Page: Error checking token validity:', error);
          }
        }
        
        // Verify we can actually access the triage API
        try {
          const verifyResponse = await fetch('/api/admin/triage?verify=true', {
            method: 'HEAD',
            credentials: 'include',
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
              'X-Source': 'new-triage-verification'
            }
          });
          
          if (!verifyResponse.ok) {
            console.warn('New Triage Page: Verification request failed, redirecting to login');
            if (window.AuthSession) {
              window.AuthSession.redirectToLogin('/admin/triage/new');
            }
          } else {
            console.log('New Triage Page: Verification request successful');
          }
        } catch (verifyError) {
          console.error('New Triage Page: Error during verification request:', verifyError);
        }
      };
      
      // Run the enhanced auth checks
      performEnhancedAuthChecks();
    }
  }, [authLoading, user, router]);

  // Mock patient data - in a real app this would be fetched from an API
  const mockPatients: Patient[] = [
    { id: 'PT10001', name: 'John Smith', dob: '1975-05-12' },
    { id: 'PT10002', name: 'Maria Garcia', dob: '1982-11-30' },
    { id: 'PT10003', name: 'Ahmed Khan', dob: '1968-02-15' },
    { id: 'PT10004', name: 'Sarah Johnson', dob: '1990-08-22' },
  ];

  // Filter patients based on search query
  const filteredPatients = patientSearchQuery 
    ? mockPatients.filter(p => 
        p.name.toLowerCase().includes(patientSearchQuery.toLowerCase()) || 
        p.id.toLowerCase().includes(patientSearchQuery.toLowerCase())
      )
    : [];

  // Generate AI triage suggestion
  const generateTriageSuggestion = async () => {
    if (!selectedPatient) {
      alert('Please select a patient');
      return;
    }
    
    if (!symptoms || symptoms.trim().length < 10) {
      alert('Please enter a detailed description of the symptoms');
      return;
    }
    
    try {
      // Call the AI suggestion API endpoint
      setIsLoading(true);
      
      // In a real app, this would be a fetch call to an API
      // For demo purposes, we'll simulate a delay and return mock data
      setTimeout(() => {
        setIsLoading(false);
        setTriageSuggestion({
          providers: [
            {
              id: 'DR001',
              name: 'Dr. Elena Rodriguez',
              role: 'Primary Care Physician',
              specialty: 'Internal Medicine',
              confidence: 92,
              reason: 'Symptoms suggest need for general assessment',
              nextAvailable: '2025-06-12T10:00:00'
            },
            {
              id: 'DR018',
              name: 'Dr. James Wilson',
              role: 'Specialist',
              specialty: 'Cardiology',
              confidence: 76,
              reason: 'Potential cardiac involvement based on symptoms',
              nextAvailable: '2025-06-15T14:30:00'
            }
          ],
          suggestedUrgency: 'MEDIUM',
          analysis: 'Patient symptoms indicate a non-emergency situation that requires prompt medical attention. The described symptoms could be related to several conditions including respiratory infection, cardiovascular issues, or stress-related manifestations. Recommend primary care assessment with potential cardiology follow-up depending on initial findings.'
        });
        
        // Set the urgency level to the suggested one
        setUrgencyLevel('MEDIUM');
      }, 2000);
      
    } catch (error) {
      console.error('Error generating triage suggestion:', error);
      setIsLoading(false);
      alert('Failed to generate triage suggestion. Please try again.');
    }
  };

  // Submit the triage form
  const submitTriage = async () => {
    if (!selectedPatient) {
      alert('Please select a patient');
      return;
    }
    
    if (!symptoms || symptoms.trim().length < 10) {
      alert('Please enter a detailed description of the symptoms');
      return;
    }
    
    if (!triageSuggestion) {
      alert('Please generate a triage suggestion first');
      return;
    }
    
    try {
      // In a real app, this would call an API to create the triage record
      setIsLoading(true);
      
      // Simulate API call
      setTimeout(() => {
        setIsLoading(false);
        alert('Triage created successfully!');
        router.push('/admin/dashboard?tab=triage');
      }, 1500);
      
    } catch (error) {
      console.error('Error submitting triage:', error);
      setIsLoading(false);
      alert('Failed to create triage. Please try again.');
    }
  };
  // Ensure token is fresh before navigating away
  const navigateWithFreshToken = async (path: string) => {
    try {
      if (window.AuthCore && !window.AuthCore.isTokenValid(300)) { // 5 minute buffer
        console.log('Refreshing token before navigation');
        await window.AuthCore.refreshToken();
      }
      router.push(path);
    } catch (error) {
      console.error('Error refreshing token before navigation:', error);
      router.push(path);
    }
  };

  return (
    <ClinicalLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">New Patient Triage</h1>
          <Button 
            variant="outline" 
            onClick={() => navigateWithFreshToken('/admin/dashboard?tab=triage')}
          >
            Return to Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Selection */}
          <Card className="lg:col-span-1">
            <Card.Header>
              <Card.Title>Patient Selection</Card.Title>
            </Card.Header>
            <Card.Body>
              <div className="space-y-4">
                <div>
                  <label className="block mb-1">Search Patient</label>
                  <Input
                    type="text"
                    placeholder="Search by name or ID"
                    value={patientSearchQuery}
                    onChange={(e) => setPatientSearchQuery(e.target.value)}
                  />
                </div>
                
                {patientSearchQuery && (
                  <div className="max-h-60 overflow-y-auto border rounded">
                    {filteredPatients.length > 0 ? (
                      <ul className="divide-y">
                        {filteredPatients.map(patient => (
                          <li 
                            key={patient.id}
                            className="p-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => {
                              setSelectedPatient(patient);
                              setPatientSearchQuery('');
                            }}
                          >
                            <div className="font-medium">{patient.name}</div>
                            <div className="text-sm text-gray-600">ID: {patient.id} | DOB: {patient.dob}</div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-3 text-center text-gray-500">No patients found</div>
                    )}
                  </div>
                )}
                
                {selectedPatient && (
                  <div className="p-4 border rounded bg-blue-50">
                    <div className="font-medium text-lg">{selectedPatient.name}</div>
                    <div className="text-sm">Patient ID: {selectedPatient.id}</div>
                    <div className="text-sm">Date of Birth: {selectedPatient.dob}</div>
                    <Button 
                      variant="text" 
                      size="sm" 
                      className="mt-2 text-red-600"
                      onClick={() => setSelectedPatient(null)}
                    >
                      Clear Selection
                    </Button>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>

          {/* Symptoms and Urgency */}
          <Card className="lg:col-span-2">
            <Card.Header>
              <Card.Title>Symptoms & Urgency Assessment</Card.Title>
            </Card.Header>
            <Card.Body>
              <div className="space-y-4">
                <div>
                  <label className="block mb-1">Patient Symptoms</label>
                  <Textarea
                    placeholder="Describe the patient's symptoms in detail..."
                    rows={5}
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                  />
                </div>
                
                <div className="flex justify-end">
                  <Button
                    onClick={generateTriageSuggestion}
                    disabled={!selectedPatient || !symptoms || isLoading}
                    isLoading={isLoading}
                  >
                    Generate AI Suggestion
                  </Button>
                </div>
                
                {triageSuggestion && (
                  <div className="mt-6 space-y-4 border-t pt-4">
                    <div>
                      <h3 className="font-medium mb-2">AI Analysis:</h3>
                      <p className="text-gray-700 bg-gray-50 p-3 rounded">{triageSuggestion.analysis}</p>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-2">Suggested Urgency:</h3>
                      <div className="flex items-center space-x-2">
                        <Badge color={
                          triageSuggestion.suggestedUrgency === 'HIGH' ? 'red' :
                          triageSuggestion.suggestedUrgency === 'MEDIUM' ? 'yellow' : 'green'
                        }>
                          {triageSuggestion.suggestedUrgency}
                        </Badge>
                        <span className="text-sm text-gray-500">(AI Suggestion)</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block mb-1">Set Urgency Level:</label>
                      <Select
                        value={urgencyLevel}
                        onChange={(e) => setUrgencyLevel(e.target.value)}
                      >
                        <option value="HIGH">HIGH - Immediate attention needed</option>
                        <option value="MEDIUM">MEDIUM - Prompt attention needed</option>
                        <option value="LOW">LOW - Routine care appropriate</option>
                      </Select>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-2">Recommended Providers:</h3>
                      <div className="space-y-3">
                        {triageSuggestion.providers.map(provider => (
                          <div key={provider.id} className="border rounded p-3">
                            <div className="flex justify-between">
                              <div className="font-medium">{provider.name}</div>
                              <Badge color="blue">{provider.specialty}</Badge>
                            </div>
                            <div className="text-sm text-gray-600">{provider.role}</div>
                            <div className="text-sm mt-1">
                              <span className="font-medium">Reason:</span> {provider.reason}
                            </div>
                            <div className="text-sm">
                              <span className="font-medium">Next Available:</span> {new Date(provider.nextAvailable).toLocaleString()}
                            </div>
                            <div className="flex justify-between items-center mt-2">
                              <div className="text-sm">
                                <span className="font-medium">Match Confidence:</span> {Math.round(provider.confidence)}%
                              </div>
                              <Button size="sm" variant="outline">Schedule</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card.Body>
            <Card.Footer>
              <div className="flex justify-end space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => navigateWithFreshToken('/admin/dashboard?tab=triage')}
                >
                  Cancel
                </Button>
                <Button
                  onClick={submitTriage}
                  disabled={!selectedPatient || !symptoms || !triageSuggestion || isLoading}
                  isLoading={isLoading}
                >
                  Create Triage
                </Button>
              </div>
            </Card.Footer>
          </Card>
        </div>
      </div>
    </ClinicalLayout>
  );
}

export default withRoleProtection(NewTriagePage, {
  allowedRoles: [UserRole.ADMIN, UserRole.DOCTOR],
  redirectTo: '/login?unauthorized=true&redirect=/admin/triage/new'
});
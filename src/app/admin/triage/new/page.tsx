'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Triage Creation Page - AI-powered patient triage system with Speech-to-Text
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ClinicalLayout from '../../../components/layout/ClinicalLayout';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../../auth/hooks/useAuth';
import { UserRole } from '@/enums';
import { withRoleProtection } from '../../../../auth/components/withRoleProtection';
import { Card } from '../components/TriageCard';
import { Badge } from '../components/TriageBadge';
import { Input, Select } from '../components/TriageFormElements';
import { SpeechToTextInput } from '../../../components/ui/SpeechToTextInput';
import { ProviderSelect, Provider as ProviderType } from '../../../components/ui/ProviderSelect';

// Define interfaces
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
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);  const [symptoms, setSymptoms] = useState('');
  const [inputUrgency, setInputUrgency] = useState('moderate'); // New urgency input state
  const [originalUrgency, setOriginalUrgency] = useState('moderate'); // Track original assessment
  const [triageSuggestion, setTriageSuggestion] = useState<AISuggestion | null>(null);
  const [urgencyLevel, setUrgencyLevel] = useState('MEDIUM');
    // Speech-to-text preferences
  const [speechEnabled, setSpeechEnabled] = useState(true);
  // Provider assignment
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<ProviderType | null>(null);
  const [assignmentReason, setAssignmentReason] = useState('');

  // Check authentication on load
  useEffect(() => {
    if (!authLoading && !user) {
      if (typeof window !== 'undefined' && window.AuthSession) {
        window.AuthSession.storeLoginRedirect('/admin/triage/new');
      }
      router.push('/login?redirect=/admin/triage/new&source=triage');
    }
  }, [authLoading, user, router]);

  // Sample patient data using actual database IDs from seeded data
  const mockPatients: Patient[] = [
    { id: 'cmbsuhsf700xjtqrsws6qhxph', name: 'John Smith', dob: '1985-03-15' },
    { id: 'cmbsuhsfb00xltqrslgk97isj', name: 'Maria Garcia', dob: '1978-07-22' },
    { id: 'cmbsuhsfc00xntqrs5buq7wrq', name: 'Robert Johnson', dob: '1963-11-08' },
    { id: 'cmbsuhsfc00xptqrsqzsd8x8n', name: 'Jennifer Davis', dob: '1990-05-30' },
    { id: 'cmbsuhsfd00xrtqrs06q3mjmg', name: 'Michael Wilson', dob: '1972-09-12' },
  ];

  // Filter patients based on search query
  const filteredPatients = patientSearchQuery 
    ? mockPatients.filter(p => 
        p.name.toLowerCase().includes(patientSearchQuery.toLowerCase()) || 
        p.id.toLowerCase().includes(patientSearchQuery.toLowerCase())
      )
    : [];  // Generate AI triage suggestion
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
      setIsLoading(true);
      
      const response = await fetch('/api/admin/triage/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        credentials: 'include',        body: JSON.stringify({
          patientId: selectedPatient.id,
          symptoms: symptoms,
          urgency: inputUrgency
        })
      });
        if (!response.ok) {
        console.error('Response status:', response.status);
        console.error('Response statusText:', response.statusText);
        const errorText = await response.text();
        console.error('Response body:', errorText);
        throw new Error(`AI suggestion failed: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
        setTriageSuggestion({
        providers: result.data.providers || [],
        suggestedUrgency: result.data.suggestedUrgency || 'MEDIUM',
        analysis: result.data.analysis || 'AI analysis completed successfully.'
      });
        // Update urgency level to AI suggestion
      setUrgencyLevel(result.data.suggestedUrgency || 'MEDIUM');
      
      // Auto-update initial urgency assessment to match AI suggestion for consistency
      if (result.data.suggestedUrgency) {
        const urgencyMapping: { [key: string]: string } = {
          'HIGH': 'high',
          'MEDIUM': 'moderate', 
          'LOW': 'low',
          'CRITICAL': 'critical'
        };
        const newUrgency = urgencyMapping[result.data.suggestedUrgency] || 'moderate';
        
        // Only update if different from original (to show "Updated by AI" message)
        if (newUrgency !== inputUrgency) {
          setOriginalUrgency(inputUrgency); // Store the original before updating
          setInputUrgency(newUrgency);
        }
      }
      setIsLoading(false);
      
    } catch (error) {
      console.error('Error generating triage suggestion:', error);
      setIsLoading(false);
      alert('Failed to generate triage suggestion. Please try again.');
    }
  };// Handle scheduling a recommended provider
  const scheduleRecommendedProvider = (provider: Provider) => {
    setSelectedProviderId(provider.id);
    setSelectedProvider({
      id: provider.id,
      firstName: provider.name.split(' ')[0], // Extract first name
      lastName: provider.name.split(' ').slice(1).join(' '), // Extract last name
      email: '', // Will be populated by ProviderSelect if needed
      role: provider.role as any, // Type assertion since the interfaces may differ slightly
      specialty: provider.specialty,
      isAvailable: true,
      clinicId: user?.clinicId
    });
    setAssignmentReason(`AI recommended provider: ${provider.reason} (Confidence: ${Math.round(provider.confidence)}%)`);
    
    // Scroll to assignment section
    const assignmentSection = document.querySelector('[data-section="provider-assignment"]');
    if (assignmentSection) {
      assignmentSection.scrollIntoView({ behavior: 'smooth' });
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
      setIsLoading(true);
      
      const response = await fetch('/api/admin/triage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        credentials: 'include',        body: JSON.stringify({
          patientId: selectedPatient.id,
          symptoms: symptoms,
          urgencyLevel: urgencyLevel,
          aiSuggestion: triageSuggestion,
          assignedToId: selectedProviderId || null,
          assignmentReason: assignmentReason || null
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create triage: ${response.status}`);
      }
      
      setIsLoading(false);
      alert('Triage created successfully!');
      router.push('/admin/dashboard?tab=triage');
      
    } catch (error) {
      console.error('Error submitting triage:', error);
      setIsLoading(false);
      alert('Failed to create triage. Please try again.');
    }
  };

  // Navigate with fresh token
  const navigateWithFreshToken = async (path: string) => {
    try {
      if (typeof window !== 'undefined' && window.AuthCore && !window.AuthCore.isTokenValid(300)) {
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
                {/* Speech-to-Text Input Component */}                <SpeechToTextInput
                  value={symptoms}
                  onChange={setSymptoms}
                  label="Patient Symptoms"
                  placeholder="Describe the patient's symptoms in detail..."
                  rows={5}
                  showWordCount={true}
                  speechEnabled={speechEnabled}
                  onSpeechEnabledChange={setSpeechEnabled}
                  maxLength={2000}
                />
                  {/* Initial Urgency Assessment */}
                <div>                  
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Initial Urgency Assessment
                    {triageSuggestion && originalUrgency !== inputUrgency && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-normal">
                        ⚡ Updated by AI: {originalUrgency} → {inputUrgency}
                      </span>
                    )}
                  </label>
                  <Select
                    value={inputUrgency}
                    onChange={(e) => setInputUrgency(e.target.value)}
                    className="w-full"
                  >
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </Select>                  <p className="text-xs text-gray-500 mt-1">
                    {triageSuggestion 
                      ? "AI has analyzed symptoms and updated this assessment"
                      : "Select your initial assessment - AI will provide its own recommendation"
                    }
                  </p>
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
                    </div>                    <div>
                      <label className="block mb-1 font-medium">
                        Set Final Urgency Level:
                        {urgencyLevel !== triageSuggestion.suggestedUrgency && (
                          <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-normal">
                            ⚠️ Override: AI suggested {triageSuggestion.suggestedUrgency}
                          </span>
                        )}
                      </label>
                      <Select
                        value={urgencyLevel}
                        onChange={(e) => setUrgencyLevel(e.target.value)}
                        className="w-full"
                      >
                        <option value="HIGH">HIGH - Immediate attention needed</option>
                        <option value="MEDIUM">MEDIUM - Prompt attention needed</option>
                        <option value="LOW">LOW - Routine care appropriate</option>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        This is the final urgency level that will be used for provider recommendations
                      </p>
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
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => scheduleRecommendedProvider(provider)}
                              >
                                Schedule
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>                      {/* Provider Assignment Section */}
                    <div className="border-t pt-4" data-section="provider-assignment">
                      <h3 className="font-medium mb-3">
                        Assign to Provider (Optional)
                        {selectedProvider && triageSuggestion.providers.length > 0 && 
                         selectedProvider.id !== triageSuggestion.providers[0].id && (
                          <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full font-normal">
                            💡 Different from AI's #1 choice: {triageSuggestion.providers[0].name}
                          </span>
                        )}
                      </h3>
                      <div className="space-y-3">                        <ProviderSelect
                          value={selectedProviderId}
                          onChange={(providerId, provider) => {
                            setSelectedProviderId(providerId);
                            setSelectedProvider(provider || null);
                          }}
                          roles={[UserRole.DOCTOR, UserRole.NURSE, UserRole.PHARMACIST]}
                          label="Select Provider"
                          placeholder="Choose a provider to assign this triage..."
                          showStatus={true}
                          clinicId={user?.clinicId || undefined}
                        />
                        
                        {selectedProvider && (
                          <div>
                            <label className="block mb-1 text-sm font-medium">Assignment Reason</label>
                            <textarea
                              value={assignmentReason}
                              onChange={(e) => setAssignmentReason(e.target.value)}
                              placeholder="Why is this provider being assigned to this case?"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              rows={2}
                            />
                          </div>
                        )}
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
  allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DOCTOR],
  redirectTo: '/login?unauthorized=true&redirect=/admin/triage/new'
});

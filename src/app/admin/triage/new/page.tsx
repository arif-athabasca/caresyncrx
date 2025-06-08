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
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input, Textarea, Select } from '../../../components/ui/FormElements';
import { Badge } from '../../../components/ui/Badge';
import { useAuth } from '../../../../auth/hooks/useAuth';
import { UserRole } from '@/auth';
import { withRoleProtection } from '../../../../auth/components/withRoleProtection';
import { TokenStorage } from '../../../../auth/utils/token-storage';

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
      router.push('/login?redirect=/admin/triage/new');
    }
  }, [user, authLoading, router]);
    // Track navigation and ensure tokens are fresh
  useEffect(() => {
    const trackNavigationAndRefresh = async () => {
      if (typeof window !== 'undefined') {
        // Store this path for navigation tracking
        const fullPath = window.location.pathname + window.location.search;
        console.log('Tracking navigation on triage page:', fullPath);
        
        try {
          // Ensure TokenStorage is available with required methods
          if (window.TokenStorage && typeof window.TokenStorage.storeNavigationState === 'function') {
            window.TokenStorage.storeNavigationState(fullPath);
          } else if (typeof TokenStorage.storeNavigationState === 'function') {
            TokenStorage.storeNavigationState(fullPath);
          } else {
            // Fallback - store in session storage directly
            if (typeof sessionStorage !== 'undefined') {
              sessionStorage.setItem('lastNavigationPath', fullPath);
            }
          }
          
          // Check if we need to refresh tokens - use window.TokenStorage if available for consistent behavior
          const needsRefresh = 
            (window.TokenStorage && typeof window.TokenStorage.isRefreshNeededForNavigation === 'function' && window.TokenStorage.isRefreshNeededForNavigation()) ||
            (typeof TokenStorage.isRefreshNeededForNavigation === 'function' && TokenStorage.isRefreshNeededForNavigation());
          
          if (needsRefresh) {
            console.log('Refresh needed on triage page load');
            
            // First do a quick verification to see if we even need a refresh
            const verifyResponse = await fetch('/api/auth/verify-token', {
              method: 'GET',
              headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Expires': '0',
                'X-Source': 'triage-verification'
              },
              credentials: 'include'
            });
            
            const verifyData = await verifyResponse.json();
            
            // Only refresh if verification shows it's needed
            if (!verifyData.valid) {
              console.log('Token verification failed, refreshing token');
              
              // Get the refresh token - using consistent method
              const refreshToken = 
                (window.TokenStorage && typeof window.TokenStorage.getRefreshToken === 'function') ? 
                window.TokenStorage.getRefreshToken() : 
                TokenStorage.getRefreshToken();
                
              // Get device ID - using consistent method
              const deviceId = 
                (window.TokenStorage && typeof window.TokenStorage.getDeviceId === 'function') ? 
                window.TokenStorage.getDeviceId() : 
                TokenStorage.getDeviceId();
              
              // Refresh via direct API call for most immediate response
              const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Cache-Control': 'no-cache',
                  'Pragma': 'no-cache',
                  'Expires': '0',
                  'X-Source': 'triage-page-navigation'
                },
                body: JSON.stringify({
                  refreshToken: refreshToken,
                  deviceId: deviceId
                }),
                credentials: 'include'
              });
              
              if (response.ok) {
                console.log('Token refreshed successfully in triage page');
                const data = await response.json();
                
                // Explicitly store the new tokens to ensure they're saved
                if (data.tokens) {
                  // Store in window.TokenStorage if available
                  if (window.TokenStorage) {
                    if (typeof window.TokenStorage.setAccessToken === 'function') {
                      window.TokenStorage.setAccessToken(data.tokens.accessToken);
                    }
                    if (typeof window.TokenStorage.setRefreshToken === 'function') {
                      window.TokenStorage.setRefreshToken(data.tokens.refreshToken);
                    }
                  }
                  
                  // Also store in the imported TokenStorage
                  TokenStorage.setAccessToken(data.tokens.accessToken);
                  TokenStorage.setRefreshToken(data.tokens.refreshToken);
                  
                  // Store directly in localStorage as fallback
                  localStorage.setItem('accessToken', data.tokens.accessToken);
                  localStorage.setItem('refreshToken', data.tokens.refreshToken);
                  
                  // Mark refresh as complete
                  if (typeof sessionStorage !== 'undefined') {
                    sessionStorage.removeItem('refreshInProgress');
                  }
                }
                
                // Get current user data to update auth state
                await fetch('/api/auth/me', {
                  credentials: 'include',
                  headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                    'X-Source': 'triage-page-after-refresh'
                  }
                });
              } else {
                console.warn('Token refresh failed in triage page');
                
                // Get the error data
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('Refresh error:', errorData);
                
                // Use our global token refresh error handler if available
                if (typeof window.handleTokenRefreshError === 'function') {
                  window.handleTokenRefreshError(
                    errorData.error || errorData.message || 'Token refresh failed', 
                    '/admin/triage/new'
                  );
                } else {
                  // Fallback handling
                  const isExpiredToken = 
                    (errorData.error && errorData.error.includes('expired')) || 
                    (errorData.message && errorData.message.includes('expired'));
                  
                  if (response.status === 401 || isExpiredToken) {
                    // Use the token-expired event for consistent handling
                    document.dispatchEvent(new CustomEvent('token-expired', {
                      detail: {
                        message: errorData.error || errorData.message || 'Token expired',
                        returnPath: '/admin/triage/new'
                      }
                    }));
                  } else {
                    // Direct navigation as last resort
                    router.replace('/login?redirect=/admin/triage/new&token_expired=true');
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('Error in token refresh handling on triage page:', error);
          
          // Use our global token refresh error handler if available
          if (typeof window.handleTokenRefreshError === 'function') {
            window.handleTokenRefreshError(error, '/admin/triage/new');
          } else if (typeof document !== 'undefined') {
            // Dispatch token expired event as fallback
            document.dispatchEvent(new CustomEvent('token-expired', {
              detail: {
                message: error instanceof Error ? error.message : String(error),
                returnPath: '/admin/triage/new'
              }
            }));
          }
        }
      }
    };
    
    // Run immediately on mount
    trackNavigationAndRefresh();
    
    // Handle page showing from back/forward cache
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        console.log('Page restored from back/forward cache in triage page');
        TokenStorage.markBfCacheRestoration();
        trackNavigationAndRefresh();
      }
    };
    
    // Set up event listeners for navigation events
    window.addEventListener('pageshow', handlePageShow);
    
    // Focus event can also indicate browser tab switch, which might need token refresh
    window.addEventListener('focus', trackNavigationAndRefresh);
    
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('focus', trackNavigationAndRefresh);
    };
  }, [router]);
  
  // Mock data - would be replaced with actual API calls
  const mockPatients: Patient[] = [
    { id: '1', name: 'John Smith', dob: '1975-05-15' },
    { id: '2', name: 'Jane Doe', dob: '1982-11-23' },
    { id: '3', name: 'Mike Johnson', dob: '1968-03-12' },
  ];
  
  const handlePatientSearch = (query: string) => {
    setPatientSearchQuery(query);
    // In a real app, this would make an API call to search patients
  };
  
  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientSearchQuery('');
  };
  
  const generateTriageSuggestion = async () => {
    if (!selectedPatient || !symptoms || symptoms.length < 10) {
      alert('Please select a patient and provide detailed symptoms');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Call the AI suggestion API endpoint
      const response = await fetch('/api/admin/triage/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          patientId: selectedPatient?.id,
          symptoms
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get AI suggestions');
      }
      
      const result = await response.json();
      const aiSuggestion = result.data;
      
      setTriageSuggestion(aiSuggestion);
      setUrgencyLevel(aiSuggestion.suggestedUrgency);
    } catch (error) {
      console.error('Error generating triage suggestion:', error);
      alert('Failed to generate triage suggestion. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPatient || !symptoms || !triageSuggestion) {
      alert('Please complete all required fields and generate a triage suggestion');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // In a real app, this would call an API to create the triage record
      // Simulate API call with a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Make the actual API call to create a triage record
      const response = await fetch('/api/admin/triage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          symptoms,
          urgencyLevel,
          aiSuggestion: triageSuggestion
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create triage record');
      }
      
      // Use router.back() instead of hardcoded path to enable better back button behavior
      router.replace('/admin/dashboard?tab=triage');
    } catch (error) {
      console.error('Error creating triage:', error);
      alert('Failed to create triage. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add handler for cancel button
  const handleCancel = async () => {
    // Store the navigation state before going back
    TokenStorage.storeNavigationState('/admin/dashboard');
    
    // Refresh token before navigating to ensure we have fresh tokens
    try {
      const refreshToken = TokenStorage.getRefreshToken();
      const deviceId = TokenStorage.getDeviceId();
      
      if (refreshToken) {
        console.log('Refreshing token before navigation');
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Source': 'triage-cancel-button'
          },
          body: JSON.stringify({
            refreshToken,
            deviceId
          }),
          credentials: 'include'
        });
        
        if (response.ok) {
          console.log('Token refreshed successfully before navigation');
          const data = await response.json();
          
          // Explicitly store the new tokens
          if (data.tokens) {
            TokenStorage.setAccessToken(data.tokens.accessToken);
            TokenStorage.setRefreshToken(data.tokens.refreshToken);
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing token before navigation:', error);
    }
    
    // Add a timestamp to prevent caching issues
    const timestamp = Date.now();
    router.replace(`/admin/dashboard?tab=triage&t=${timestamp}`);
  };
  
  return (
    <ClinicalLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Patient Triage</h1>
        <p className="text-gray-600">Create a new triage request with AI-powered care provider suggestions</p>
      </div>
      
      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Patient Information</h2>
          
          {selectedPatient ? (
            <div className="mb-4">
              <div className="flex justify-between items-center p-4 border rounded-md bg-gray-50">
                <div>
                  <p className="font-medium">{selectedPatient.name}</p>
                  <p className="text-sm text-gray-500">DOB: {selectedPatient.dob}</p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setSelectedPatient(null)}
                >
                  Change
                </Button>
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <Input
                label="Search Patient"
                id="patientSearch"
                value={patientSearchQuery}
                onChange={(e) => handlePatientSearch(e.target.value)}
                placeholder="Search by name or ID..."
                helperText="Enter patient name or ID to search"
              />
              
              {patientSearchQuery.length > 2 && (
                <div className="mt-2 border rounded-md divide-y">
                  {mockPatients
                    .filter(p => p.name.toLowerCase().includes(patientSearchQuery.toLowerCase()))
                    .map(patient => (
                      <div 
                        key={patient.id}
                        className="p-2 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handlePatientSelect(patient)}
                      >
                        <p className="font-medium">{patient.name}</p>
                        <p className="text-sm text-gray-500">DOB: {patient.dob}</p>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          )}
        </Card>
        
        <Card className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Symptoms & Triage</h2>
          
          <Textarea
            label="Patient Symptoms"
            id="symptoms"
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="Enter detailed description of patient symptoms..."
            required
            rows={6}
            className="mb-4"
            helperText="Provide as much detail as possible for better AI suggestions"
          />
          
          <div className="flex justify-end mb-6">
            <Button
              type="button"
              onClick={generateTriageSuggestion}
              disabled={!selectedPatient || symptoms.length < 10 || isLoading}
              isLoading={isLoading}
            >
              Generate AI Suggestions
            </Button>
          </div>
          
          {triageSuggestion && (
            <div className="border-t pt-4">
              <div className="mb-4">
                <h3 className="font-medium text-gray-900">AI Analysis</h3>
                <p className="mt-1 text-gray-700">{triageSuggestion.analysis}</p>
              </div>
              
              <div className="mb-4">
                <div className="flex items-center mb-2">
                  <h3 className="font-medium text-gray-900 mr-3">Suggested Urgency:</h3>
                  <Badge 
                    variant={
                      triageSuggestion.suggestedUrgency === 'HIGH' || triageSuggestion.suggestedUrgency === 'CRITICAL' 
                        ? 'error' 
                        : triageSuggestion.suggestedUrgency === 'MEDIUM' ? 'warning' : 'neutral'
                    }
                  >
                    {triageSuggestion.suggestedUrgency}
                  </Badge>
                </div>
                
                <Select
                  label="Urgency Level"
                  id="urgencyLevel"
                  value={urgencyLevel}
                  onChange={(e) => setUrgencyLevel(e.target.value)}
                  options={[
                    { value: 'LOW', label: 'Low' },
                    { value: 'MEDIUM', label: 'Medium' },
                    { value: 'HIGH', label: 'High' },
                    { value: 'CRITICAL', label: 'Critical' },
                  ]}
                  helperText="You can override the AI-suggested urgency level"
                />
              </div>
              
              <h3 className="font-medium text-gray-900 mb-2">Recommended Care Providers</h3>
              <div className="space-y-3">
                {triageSuggestion.providers.map((provider: Provider) => (
                  <div key={provider.id} className="border rounded-md p-4">
                    <div className="flex justify-between">
                      <div>
                        <h4 className="font-medium">{provider.name}</h4>
                        <p className="text-sm text-gray-500">{provider.specialty} ({provider.role})</p>
                      </div>
                      <Badge variant="info">{provider.confidence}% Match</Badge>
                    </div>
                    <p className="text-sm mt-2">{provider.reason}</p>
                    <div className="flex justify-between mt-2">
                      <span className="text-sm text-gray-500">Next Available: {provider.nextAvailable}</span>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          // This would actually assign the patient in a real app
                          alert(`Assigned to ${provider.name}`);
                        }}
                      >
                        Assign
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
        
        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isLoading}
            disabled={!selectedPatient || !symptoms || !triageSuggestion}
          >
            Create Triage
          </Button>
        </div>
      </form>
    </ClinicalLayout>
  );
}

// Export the component wrapped with role protection
export default withRoleProtection(NewTriagePage, {
  allowedRoles: [UserRole.ADMIN],
  redirectPath: '/login'
});
'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Doctor Dashboard - Modern glass morphism UI with comprehensive clinical workflow
 * Features: AI integration, smart patient management, treatment planning, documentation
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/auth/hooks/useAuth';
import { UserRole } from '@/enums';
import { withRoleProtection } from '@/auth/components/withRoleProtection';
import DoctorDashboardLayout from './components/DoctorDashboardLayout';
import OverviewTab from './components/tabs/OverviewTab';
import PatientsTab from './components/tabs/PatientsTab';
import AppointmentsTab from './components/tabs/AppointmentsTab';
import DiagnosticsTab from './components/tabs/DiagnosticsTab';
import PrescriptionsTab from './components/tabs/PrescriptionsTab';
import DocumentationTab from './components/tabs/DocumentationTab';
import AnalyticsTab from './components/tabs/AnalyticsTab';
import SettingsTab from './components/tabs/SettingsTab';
import AIAssistantPanel from './components/ai/AIAssistantPanel';
import CommunicationAppBridge from './components/communication/CommunicationAppBridge';
import { DoctorProvider } from './contexts/DoctorContext';

export type DoctorDashboardTab = 
  | 'overview' 
  | 'patients' 
  | 'appointments' 
  | 'diagnostics' 
  | 'prescriptions' 
  | 'documentation' 
  | 'analytics' 
  | 'settings';

interface DashboardState {
  activeTab: DoctorDashboardTab;
  sidebarCollapsed: boolean;
  aiPanelVisible: boolean;
  selectedPatientId: string | null;
  communicationAppOpen: boolean;
}

function DoctorDashboardPage() {
  const { user, isLoading } = useAuth();
  
  // Dashboard state management
  const [dashboardState, setDashboardState] = useState<DashboardState>({
    activeTab: 'overview',
    sidebarCollapsed: false,
    aiPanelVisible: false,
    selectedPatientId: null,
    communicationAppOpen: false
  });
  // Real-time updates
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
  }>>([]);
  const [aiStatus, setAIStatus] = useState<'online' | 'offline' | 'processing'>('online');

  // Update dashboard state
  const updateDashboardState = useCallback((updates: Partial<DashboardState>) => {
    setDashboardState(prev => ({ ...prev, ...updates }));
  }, []);

  // Handle tab changes
  const handleTabChange = useCallback((tab: DoctorDashboardTab) => {
    updateDashboardState({ activeTab: tab });
  }, [updateDashboardState]);

  // Handle patient selection
  const handlePatientSelect = useCallback((patientId: string) => {
    updateDashboardState({ 
      selectedPatientId: patientId,
      activeTab: 'patients'
    });
  }, [updateDashboardState]);

  // Initialize real-time connections
  useEffect(() => {
    if (!user) return;

    // Initialize WebSocket for real-time updates
    const initializeRealTimeUpdates = async () => {
      try {
        // Check AI service status
        const aiStatusResponse = await fetch('/api/v1/healthcare/status');
        const aiStatusData = await aiStatusResponse.json();
        setAIStatus(aiStatusData.status || 'online');

        // Initialize notifications (placeholder)
        // In production, this would connect to WebSocket or Server-Sent Events
        const mockNotifications = [
          {
            id: '1',
            type: 'urgent',
            title: 'Critical Lab Result',
            message: 'Patient John Doe has elevated troponin levels',
            timestamp: new Date(),
            read: false
          }
        ];
        setNotifications(mockNotifications);

      } catch (error) {
        console.error('Failed to initialize real-time updates:', error);
        setAIStatus('offline');
      }
    };

    initializeRealTimeUpdates();

    // Cleanup function
    return () => {
      // Close WebSocket connections
    };
  }, [user]);

  // Render tab content
  const renderTabContent = () => {
    const { activeTab, selectedPatientId } = dashboardState;
    
    switch (activeTab) {
      case 'overview':
        return <OverviewTab onPatientSelect={handlePatientSelect} />;
      case 'patients':
        return <PatientsTab selectedPatientId={selectedPatientId} onPatientSelect={handlePatientSelect} />;
      case 'appointments':
        return <AppointmentsTab onPatientSelect={handlePatientSelect} />;
      case 'diagnostics':
        return <DiagnosticsTab selectedPatientId={selectedPatientId} />;
      case 'prescriptions':
        return <PrescriptionsTab selectedPatientId={selectedPatientId} />;
      case 'documentation':
        return <DocumentationTab selectedPatientId={selectedPatientId} />;
      case 'analytics':
        return <AnalyticsTab />;
      case 'settings':
        return <SettingsTab />;
      default:
        return <OverviewTab onPatientSelect={handlePatientSelect} />;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="backdrop-blur-xl bg-white/20 rounded-2xl p-8 border border-white/30">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-center text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <DoctorProvider>
      <DoctorDashboardLayout
        activeTab={dashboardState.activeTab}
        sidebarCollapsed={dashboardState.sidebarCollapsed}
        aiStatus={aiStatus}
        notifications={notifications}
        onTabChange={handleTabChange}
        onToggleSidebar={() => updateDashboardState({ 
          sidebarCollapsed: !dashboardState.sidebarCollapsed 
        })}
        onToggleAI={() => updateDashboardState({ 
          aiPanelVisible: !dashboardState.aiPanelVisible 
        })}
        onOpenCommunication={() => updateDashboardState({ 
          communicationAppOpen: true 
        })}
      >
        {/* Main dashboard content */}
        <main className="flex-1 overflow-auto">
          {renderTabContent()}
        </main>

        {/* AI Assistant Panel */}
        <AIAssistantPanel
          visible={dashboardState.aiPanelVisible}
          selectedPatientId={dashboardState.selectedPatientId}
          onClose={() => updateDashboardState({ aiPanelVisible: false })}
        />

        {/* Communication App Integration */}
        <CommunicationAppBridge
          isOpen={dashboardState.communicationAppOpen}
          currentPatient={dashboardState.selectedPatientId}
          onClose={() => updateDashboardState({ communicationAppOpen: false })}
        />
      </DoctorDashboardLayout>
    </DoctorProvider>
  );
}

export default withRoleProtection(DoctorDashboardPage, {
  allowedRoles: [UserRole.DOCTOR],
  redirectTo: '/login?unauthorized=true&redirect=/doctor'
});

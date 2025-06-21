'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Doctor Dashboard Layout - Modern glass morphism UI layout
 * Features responsive design, animated sidebar, AI integration, HIPAA compliance
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/auth/hooks/useAuth';
import { DoctorDashboardTab } from '../page';
import DashboardHeader from './DashboardHeader';
import AnimatedSidebar from './AnimatedSidebar';
import FloatingActionButtons from './FloatingActionButtons';

interface DoctorDashboardLayoutProps {
  children: React.ReactNode;
  activeTab: DoctorDashboardTab;
  sidebarCollapsed: boolean;
  aiStatus: 'online' | 'offline' | 'processing';
  notifications: any[];
  onTabChange: (tab: DoctorDashboardTab) => void;
  onToggleSidebar: () => void;
  onToggleAI: () => void;
  onOpenCommunication: () => void;
}

export default function DoctorDashboardLayout({
  children,
  activeTab,
  sidebarCollapsed,
  aiStatus,
  notifications,
  onTabChange,
  onToggleSidebar,
  onToggleAI,
  onOpenCommunication
}: DoctorDashboardLayoutProps) {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Handle mounting to prevent hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* HIPAA Compliance Notice */}
      <div className="sr-only" aria-live="polite">
        CareSyncRx Doctor Dashboard - HIPAA Compliant Healthcare Management System
      </div>

      {/* Header with Glass Effect */}
      <DashboardHeader
        user={user}
        notifications={notifications}
        aiStatus={aiStatus}
        onToggleSidebar={onToggleSidebar}
        onToggleAI={onToggleAI}
        onOpenCommunication={onOpenCommunication}
      />

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Animated Sidebar */}
        <AnimatedSidebar
          activeTab={activeTab}
          collapsed={sidebarCollapsed}
          onTabChange={onTabChange}
        />

        {/* Main Content Area */}
        <main 
          className={`
            flex-1 transition-all duration-300 ease-out
            ${sidebarCollapsed ? 'ml-16' : 'ml-64'}
            p-6 overflow-auto
          `}
          role="main"
          aria-label="Doctor Dashboard Main Content"
        >
          {/* Content Container with Glass Effect */}
          <div className="
            backdrop-blur-xl bg-white/30 
            border border-white/20 
            rounded-2xl 
            min-h-full
            shadow-2xl shadow-black/5
            transition-all duration-300 ease-out
          ">
            {children}
          </div>
        </main>
      </div>

      {/* Floating Action Buttons */}
      <FloatingActionButtons
        onToggleAI={onToggleAI}
        onOpenCommunication={onOpenCommunication}
        aiStatus={aiStatus}
      />

      {/* Emergency Alert Overlay (HIPAA Compliant) */}
      <div id="emergency-alerts" aria-live="assertive" className="sr-only">
        {/* Emergency alerts will be announced here for screen readers */}
      </div>
    </div>
  );
}

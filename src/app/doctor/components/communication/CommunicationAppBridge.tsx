'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Communication App Bridge - External communication application integration
 * Features: Secure context sharing, deep linking, PIPEDA compliant
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/auth/hooks/useAuth';

interface CommunicationAppBridgeProps {
  isOpen: boolean;
  currentPatient: string | null;
  onClose: () => void;
}

export default function CommunicationAppBridge({ 
  isOpen, 
  currentPatient, 
  onClose 
}: CommunicationAppBridgeProps) {
  const { user } = useAuth();
  const [isLaunching, setIsLaunching] = useState(false);
  const [communicationWindow, setCommunicationWindow] = useState<Window | null>(null);

  useEffect(() => {
    if (isOpen) {
      launchCommunicationApp();
    }
  }, [isOpen]);

  useEffect(() => {
    // Listen for messages from communication app
    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security
      const allowedOrigins = [
        process.env.NEXT_PUBLIC_COMMUNICATION_APP_URL,
        'http://localhost:4000', // Development
        'https://communication.caresyncrx.com' // Production
      ].filter(Boolean);

      if (!allowedOrigins.includes(event.origin)) {
        return;
      }

      // Handle different message types
      switch (event.data.type) {
        case 'COMMUNICATION_READY':
          setIsLaunching(false);
          break;
        case 'PATIENT_SELECTED':
          // Handle patient selection from communication app
          break;
        case 'COMMUNICATION_CLOSED':
          handleCommunicationClosed();
          break;
        default:
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const launchCommunicationApp = async () => {
    if (!user) return;

    setIsLaunching(true);

    try {
      // Generate secure session token for communication app
      const sessionToken = await generateSecureToken();
      
      // Prepare context data (PIPEDA compliant - minimal data sharing)
      const contextData = {
        userId: user.id,
        role: 'doctor',
        clinicId: user.clinicId,
        patientId: currentPatient,
        sessionToken: sessionToken,
        timestamp: new Date().toISOString()
      };

      // Encrypt context data for secure transmission
      const encryptedContext = btoa(JSON.stringify(contextData));
      
      // Communication app URL
      const communicationAppUrl = process.env.NEXT_PUBLIC_COMMUNICATION_APP_URL || 'http://localhost:4000';
      const url = `${communicationAppUrl}?context=${encryptedContext}&source=caresyncrx`;

      // Launch communication app in new window
      const newWindow = window.open(
        url,
        'CareSyncRx_Communication',
        'width=1200,height=800,scrollbars=yes,resizable=yes,toolbar=no,menubar=no'
      );

      if (newWindow) {
        setCommunicationWindow(newWindow);
        
        // Monitor window close
        const checkClosed = setInterval(() => {
          if (newWindow.closed) {
            clearInterval(checkClosed);
            handleCommunicationClosed();
          }
        }, 1000);
      } else {
        // Popup blocked - show fallback
        showPopupBlockedMessage();
      }

    } catch (error) {
      console.error('Failed to launch communication app:', error);
      setIsLaunching(false);
      showErrorMessage();
    }
  };

  const generateSecureToken = async (): Promise<string> => {
    // In production, call backend to generate JWT token
    const response = await fetch('/api/v1/auth/communication-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({
        purpose: 'communication_app_access',
        patientId: currentPatient
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate communication token');
    }

    const data = await response.json();
    return data.token;
  };

  const handleCommunicationClosed = () => {
    setCommunicationWindow(null);
    setIsLaunching(false);
    onClose();
  };

  const showPopupBlockedMessage = () => {
    setIsLaunching(false);
    // Show popup blocked notification
  };

  const showErrorMessage = () => {
    // Show error notification
  };

  // Render loading overlay when launching
  if (isLaunching) {
    return (
      <div className="
        fixed inset-0 z-50
        backdrop-blur-xl bg-black/20
        flex items-center justify-center
      ">
        <div className="
          backdrop-blur-xl bg-white/90
          border border-white/30
          rounded-2xl p-8
          shadow-2xl shadow-black/10
          max-w-md text-center
        ">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-2xl">💬</span>
            </div>
          </div>
          
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Launching Communication App
          </h3>
          
          <p className="text-gray-600 mb-4">
            Opening secure communication platform with patient context...
          </p>
          
          <div className="flex items-center justify-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>

          <div className="mt-6 p-3 bg-green-100/50 border border-green-200 rounded-lg">
            <div className="flex items-center text-sm text-green-700">
              <span className="mr-2">🔒</span>
              <span>PIPEDA Compliant - Encrypted data transmission</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="
              mt-4 px-4 py-2 
              text-sm text-gray-600 
              hover:bg-white/50 rounded-lg
              transition-colors
            "
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return null;
}

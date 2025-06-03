'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * IdleTimeoutProvider Component
 * Provides idle timeout functionality throughout the application
 * This component wraps the application and monitors user activity
 * to automatically log out inactive users.
 */

import React, { ReactNode, useEffect, useCallback } from 'react';
import { useIdleTimeout } from '../../auth/hooks/useIdleTimeout';
import { AUTH_CONFIG } from '@/auth';
import { useAuth } from '../../auth/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { TokenStorage } from '../../auth/utils/token-storage';

interface IdleTimeoutProviderProps {
  children: ReactNode;
  customTimeout?: number;
}

/**
 * IdleTimeoutProvider component
 * 
 * Monitors user activity and automatically logs out inactive users
 * after the configured timeout period.
 */
export function IdleTimeoutProvider({ 
  children,
  customTimeout
}: IdleTimeoutProviderProps) {
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();
  
  // Custom timeout handler
  const handleTimeout = useCallback(async () => {
    try {
      console.log('User session timed out due to inactivity');
      
      // Log the user out
      await logout();
      
      // Redirect to login page with timeout message
      router.replace('/login?timeout=true&t=' + Date.now());
    } catch (error) {
      console.error('Error handling idle timeout:', error);
      
      // Force clear tokens as a fallback
      TokenStorage.clearTokens();
      
      // Fallback redirect
      router.replace('/login?timeout=true&error=logout&t=' + Date.now());
    }
  }, [logout, router]);
  
  // Activity handler
  const handleActivity = useCallback(() => {
    // Update activity timestamp on any user activity
    TokenStorage.updateLastActivity();
  }, []);
  
  // Only track idle timeout for authenticated users
  const { resetIdleTimer } = useIdleTimeout({
    timeout: customTimeout || AUTH_CONFIG.SECURITY.IDLE_TIMEOUT_MS,
    onTimeout: handleTimeout,
    onActivity: handleActivity
  });
  
  // Reset timer on component mount and when auth state changes
  useEffect(() => {
    if (isAuthenticated) {
      resetIdleTimer();
      TokenStorage.updateLastActivity();
    }
  }, [isAuthenticated, resetIdleTimer]);
  
  // Just render children - the hook handles all the idle timeout logic
  return <>{children}</>;
}

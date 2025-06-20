'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Hook for handling user session idle timeout.
 * Tracks user activity and automatically logs out after a period of inactivity.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './useAuth';
// Import directly from auth-config to avoid circular dependencies
import { AUTH_CONFIG } from '../config/auth-config';

/**
 * User activity events to track
 */
const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keypress',
  'scroll',
  'touchstart',
  'click',
  'keydown'
];

interface IdleTimeoutOptions {
  timeout?: number;
  onTimeout?: () => void;
  onActivity?: () => void;
}

/**
 * Updates the last activity timestamp using AuthCore if available, falling back to localStorage
 */
const updateLastActivity = () => {
  try {
    // Use AuthCore if available
    if (typeof window !== 'undefined' && window.AuthCore && typeof window.AuthCore.updateLastActivity === 'function') {
      window.AuthCore.updateLastActivity();
    } else {
      // Fallback to direct localStorage update
      localStorage.setItem('lastActivity', Date.now().toString());
    }
  } catch (e) {
    console.warn('Error updating activity timestamp:', e);
  }
};

/**
 * Hook for managing user session idle timeout
 * @param options Configuration options for idle timeout
 * @returns Object containing idle timeout state and methods
 */
export function useIdleTimeout(options?: IdleTimeoutOptions) {
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use provided timeout or default from config
  const idleTimeoutMs = options?.timeout || AUTH_CONFIG.SECURITY.IDLE_TIMEOUT_MS;

  /**
   * Check if the user's session has timed out
   */  const checkIdleStatus = useCallback(() => {
    if (!isAuthenticated) return;
    
    // Check for timeout in localStorage
    let localStorageTimedOut = false;
    try {
      const lastActivity = localStorage.getItem('lastActivity');
      if (lastActivity) {
        const lastActivityTime = parseInt(lastActivity, 10);
        localStorageTimedOut = (Date.now() - lastActivityTime) > idleTimeoutMs;
      } else {
        // No activity record means we should consider it timed out
        localStorageTimedOut = true;
      }
    } catch (e) {
      console.warn('Error checking localStorage for activity:', e);
    }
    
    // Also check for the lastActivity cookie which is set by middleware
    let cookieTimedOut = false;
    const cookieStr = document.cookie.split('; ').find(row => row.startsWith('lastActivity='));
    if (cookieStr) {
      const lastActivityCookie = parseInt(cookieStr.split('=')[1], 10);
      cookieTimedOut = (Date.now() - lastActivityCookie) > idleTimeoutMs;
    }
    
    // If either localStorage or cookie shows timeout, log out
    if (localStorageTimedOut || cookieTimedOut) {
      // Call onTimeout callback if provided
      if (options?.onTimeout) {
        options.onTimeout();
      } else {
        // Default behavior - log out and redirect
        logout();
        router.push('/login?timeout=1');
      }
    }
  }, [isAuthenticated, logout, router, idleTimeoutMs, options]);

  /**
   * Handle user activity by updating the last activity timestamp
   * and resetting the timeout timer
   */  const handleUserActivity = useCallback(() => {
    if (!isAuthenticated) return;
    
    // Update last activity timestamp in localStorage
    updateLastActivity();
    
    // Call onActivity callback if provided
    if (options?.onActivity) {
      options.onActivity();
    }
    
    // Reset the timeout timer
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Start a new timeout timer
    timeoutRef.current = setTimeout(() => {
      checkIdleStatus();
    }, idleTimeoutMs);
  }, [isAuthenticated, checkIdleStatus, idleTimeoutMs, options]);

  // Set up event listeners for tracking user activity
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Initialize last activity timestamp
    updateLastActivity();
    
    // Set up event listeners
    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, handleUserActivity);
    });
    
    // Initial timeout check
    timeoutRef.current = setTimeout(() => {
      checkIdleStatus();
    }, idleTimeoutMs);
    
    // Clean up event listeners
    return () => {
      ACTIVITY_EVENTS.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isAuthenticated, handleUserActivity, checkIdleStatus, idleTimeoutMs]);

  // Check idle status on component mount
  useEffect(() => {
    if (isAuthenticated) {
      checkIdleStatus();
    }
  }, [isAuthenticated, checkIdleStatus]);

  return {
    checkIdleStatus,
    resetIdleTimer: handleUserActivity
  };
}

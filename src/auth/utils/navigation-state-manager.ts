/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Navigation state manager for handling token refresh during browser navigation
 * This provides utilities to track and restore navigation state during auth flows
 */

import { TokenStorage } from './token-storage';

/**
 * Time window in milliseconds to consider navigation events as part of the same session
 * This helps with browser back/forward button handling
 */
const NAV_TIME_WINDOW_MS = 60 * 1000; // 1 minute

/**
 * Navigation state manager - provides methods for tracking and restoring
 * navigation state during authentication flows
 */
export const NavigationStateManager = {  /**
   * Track a navigation event with enhanced context
   * @param path The current path including search params
   */
  trackNavigation(path: string): void {
    try {
      if (typeof sessionStorage === 'undefined') return;
      
      // Skip tracking for certain paths
      const isAuthPath = 
        path.includes('/login') || 
        path.includes('/register') || 
        path.includes('/api/auth/');
      
      // Store current path in TokenStorage
      TokenStorage.storeNavigationState(path);
      
      // Get existing navigation history
      const navHistory = sessionStorage.getItem('navigationHistory');
      const history = navHistory ? JSON.parse(navHistory) : [];
      
      // Add current path to history with enhanced context
      history.push({
        path,
        timestamp: Date.now(),
        title: typeof document !== 'undefined' ? document.title : '',
        referrer: typeof document !== 'undefined' ? document.referrer : '',
        isAuthPath: isAuthPath
      });
      
      // Keep only the last 20 navigation events (increased from 10)
      const trimmedHistory = history.slice(-20);
      
      // Store updated history
      sessionStorage.setItem('navigationHistory', JSON.stringify(trimmedHistory));
      
      // If this is a "safe" path that we might want to return to, save it specifically
      if (!isAuthPath && !path.includes('/api/')) {
        sessionStorage.setItem('lastSafePath', path);
        console.log('Tracked safe navigation path:', path);
      }
    } catch (e) {
      console.warn('Error tracking navigation state:', e);
    }
  },
  /**
   * Get the appropriate path to return to after authentication
   * Enhanced to provide better browser back button support
   */
  getReturnPath(): string | null {
    try {
      if (typeof sessionStorage === 'undefined') return null;
      
      // First check for explicitly stored authenticated path
      const lastAuthPath = sessionStorage.getItem('lastAuthenticatedPath');
      if (lastAuthPath) {
        console.log('Using explicitly stored authenticated path:', lastAuthPath);
        return lastAuthPath;
      }
      
      // Then check navigation history
      const navHistory = sessionStorage.getItem('navigationHistory');
      if (!navHistory) return null;
      
      interface NavHistoryEntry {
        path: string;
        timestamp: number;
      }
      
      const history = JSON.parse(navHistory) as NavHistoryEntry[];
      if (!history.length) return null;
      
      // Find the most recent valid navigation within time window
      const now = Date.now();
      
      // Filter out login page and authentication-related paths
      const validPaths = history.filter((nav: NavHistoryEntry) => {
        const path = nav.path;
        const isAuthPath = 
          path.includes('/login') || 
          path.includes('/register') || 
          path.includes('/forgot-password') || 
          path.includes('/reset-password') ||
          path.includes('/verify-2fa') ||
          path.includes('/setup-2fa');
        
        return !isAuthPath && (now - nav.timestamp < NAV_TIME_WINDOW_MS);
      });
      
      if (validPaths.length > 0) {
        // Get the most recent valid navigation
        const lastNav = validPaths[validPaths.length - 1];
        console.log('Using navigation history path:', lastNav.path);
        
        // Store this as the authenticated path for future use
        sessionStorage.setItem('lastAuthenticatedPath', lastNav.path);
        
        return lastNav.path;
      }
      
      // Fallback to dashboard if no valid path found
      return '/admin/dashboard';
    } catch (e) {
      console.warn('Error getting return path:', e);
      return null;
    }
  },
    /**
   * Check if a token refresh is needed during navigation
   * Enhanced with additional heuristics and improved timing checks
   */
  isRefreshNeededForNavigation(): boolean {
    try {
      // Check explicit cookie signal first (most reliable)
      if (typeof document !== 'undefined' && document.cookie.includes('refreshNeeded=true')) {
        console.log('Refresh needed: refreshNeeded cookie detected');
        return true;
      }
      
      // Check for x-needs-token-refresh header in local storage
      if (typeof localStorage !== 'undefined') {
        const needsRefresh = localStorage.getItem('needsTokenRefresh');
        if (needsRefresh) {
          const refreshTimestamp = parseInt(needsRefresh, 10);
          // Increased time window to 10 seconds to handle more navigation cases
          if (Date.now() - refreshTimestamp < 10000) {
            console.log('Refresh needed: needsTokenRefresh timestamp is recent');
            return true;
          }
        }
      }
      
      // Check for ongoing navigation that might need a refresh
      if (typeof sessionStorage !== 'undefined') {
        const lastNavTime = sessionStorage.getItem('lastNavTime');
        if (lastNavTime) {
          const navTimestamp = parseInt(lastNavTime, 10);
          // If navigation was very recent (within 2 seconds) and token is nearing expiry
          // This helps with rapid back/forward navigation
          if (Date.now() - navTimestamp < 2000) {
            const tokenTimestamp = TokenStorage.getAccessTokenTimestamp();
            if (tokenTimestamp) {
              // If token is more than 80% through its lifetime, refresh preemptively
              const tokenAge = Date.now() - tokenTimestamp;
              const tokenLifetime = 1000 * 60 * 15; // 15 minutes in milliseconds
              if (tokenAge > (tokenLifetime * 0.8)) {
                console.log('Refresh needed: Recent navigation with aging token');
                return true;
              }
            }
          }
        }
      }
      
      // Finally, check if access token is definitely expired
      const isExpired = TokenStorage.isAccessTokenExpired();
      if (isExpired) {
        console.log('Refresh needed: Access token is expired');
      }
      return isExpired;
    } catch (e) {
      console.warn('Error checking if refresh needed:', e);
      // Default to true on error to be safe
      return true;
    }
  },
  
  /**
   * Mark a refresh attempt as completed
   */
  markRefreshComplete(): void {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('refreshInProgress');
      }
      
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('needsTokenRefresh');
      }
      
      // Clear any refresh needed cookie
      if (typeof document !== 'undefined') {
        document.cookie = 'refreshNeeded=; max-age=0; path=/;';
      }
    } catch (e) {
      console.warn('Error marking refresh complete:', e);
    }
  },
  
  /**
   * Clear all navigation state
   */
  clearNavigationState(): void {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('lastNavPath');
        sessionStorage.removeItem('lastNavTime');
        sessionStorage.removeItem('navigationHistory');
        sessionStorage.removeItem('lastAuthenticatedPath');
        sessionStorage.removeItem('refreshInProgress');
      }
      
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('needsTokenRefresh');
      }
      
      // Clear refresh needed cookie
      if (typeof document !== 'undefined') {
        document.cookie = 'refreshNeeded=; max-age=0; path=/;';
      }
    } catch (e) {
      console.warn('Error clearing navigation state:', e);
    }
  }
};

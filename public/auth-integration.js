/**
 * AuthCore Integration Helper
 * 
 * This script adds a compatibility layer between the auth system and the restored TokenUtil.
 * It ensures both authentication systems can work together without conflicts.
 * 
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 */

// This script should run after auth-core.js but before any other auth-related scripts
(function() {
  // Only run in browser context
  if (typeof window === 'undefined') return;
  
  console.log('Auth Integration Helper: Initializing...');
  
  // Add integration between TokenUtil and AuthCore
  window.AUTH_INITIALIZED = true;
  
  // Create a bridge object if needed for TokenUtil compatibility
  if (!window.TokenManager) {
    window.TokenManager = {
      // Methods that map to AuthCore and AuthSession
      storeNavigationState: function(path) {
        if (window.AuthCore && typeof window.AuthCore.storeAuthState === 'function') {
          window.AuthCore.storeAuthState(path);
        } else if (window.AuthSession && typeof window.AuthSession.storeLoginRedirect === 'function') {
          window.AuthSession.storeLoginRedirect(path);
        } else {
          try {
            sessionStorage.setItem('lastNavPath', path);
          } catch (e) {
            console.warn('TokenManager: Error storing navigation state', e);
          }
        }
      },
      
      // Methods for token operations
      getDeviceId: function() {
        if (window.AuthCore && typeof window.AuthCore.getDeviceId === 'function') {
          return window.AuthCore.getDeviceId();
        }
        
        try {
          return localStorage.getItem('deviceId');
        } catch (e) {
          console.warn('TokenManager: Error getting device ID', e);
          return null;
        }
      },
      
      // Get access token for API calls
      getAccessToken: function() {
        if (window.AuthCore && typeof window.AuthCore.getAccessToken === 'function') {
          return window.AuthCore.getAccessToken();
        }
        
        try {
          return localStorage.getItem('accessToken');
        } catch (e) {
          console.warn('TokenManager: Error getting access token', e);
          return null;
        }
      },
      
      // Get refresh token for token refresh operations
      getRefreshToken: function() {
        if (window.AuthCore && typeof window.AuthCore.getRefreshToken === 'function') {
          return window.AuthCore.getRefreshToken();
        }
        
        try {
          return localStorage.getItem('refreshToken');
        } catch (e) {
          console.warn('TokenManager: Error getting refresh token', e);
          return null;
        }
      },
      
      // Compatibility method for the old token format validation
      validateTokenFormat: function(token) {
        if (!token) return false;
        
        // Simple JWT format validation (header.payload.signature)
        const parts = token.split('.');
        return parts.length === 3;
      },
      
      // Legacy redirect method for backward compatibility
      redirectToLogin: function(reason) {
        let redirectUrl = '/login';
        if (reason) {
          redirectUrl += '?' + reason;
        }
        
        // Use proper navigation if available
        if (typeof window.location !== 'undefined') {
          window.location.href = redirectUrl;
        }
      }
    };
  }
  
  console.log('Auth Integration Helper: Compatibility layer added');
})();

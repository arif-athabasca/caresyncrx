'use client';

/**
 * Debug Console Logger
 * 
 * This component helps debug authentication issues by logging errors to the browser console
 * It should be included in the layout component that wraps authenticated pages.
 */

import { useEffect } from 'react';
import { TokenStorage } from '@/auth/utils/token-storage';

export default function AuthDebugLogger() {
  useEffect(() => {
    // Log initial auth state
    console.log('Auth Debug Logger initialized');
    console.log('Access Token:', TokenStorage.getAccessToken() ? 'Present' : 'Missing');
    console.log('Refresh Token:', TokenStorage.getRefreshToken() ? 'Present' : 'Missing');
    console.log('Token Expired:', TokenStorage.isTokenExpired());
    
    // Test token validation
    try {
      const token = TokenStorage.getAccessToken();
      console.log('validateTokenFormat result:', TokenStorage.validateTokenFormat(token));
    } catch (error) {
      console.error('Error testing validateTokenFormat:', error);
    }
    
    // Test access token expiration
    try {
      console.log('isAccessTokenExpired result:', TokenStorage.isAccessTokenExpired());
    } catch (error) {
      console.error('Error testing isAccessTokenExpired:', error);
    }
    
    // Test BF cache restoration
    try {
      console.log('Testing markBfCacheRestoration method...');
      TokenStorage.markBfCacheRestoration();
      console.log('markBfCacheRestoration method executed successfully');
    } catch (error) {
      console.error('Error testing markBfCacheRestoration:', error);
    }
    
    // Set up error listeners
    const originalError = console.error;
    console.error = function(...args) {
      // Check if any errors are related to TokenStorage methods
      const errorString = args.join(' ');
      if (errorString.includes('TokenStorage') || errorString.includes('token')) {
        console.log('%c AUTH ERROR DETECTED ', 'background: #ff0000; color: white; padding: 2px;');
      }
      originalError.apply(console, args);
    };
    
    return () => {
      // Restore original console.error
      console.error = originalError;
    };
  }, []);
  
  return null; // This component doesn't render anything
}

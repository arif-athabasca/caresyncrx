'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Authentication context and hook for the CareSyncRx platform.
 * This provides authentication state management and auth methods throughout the application.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { UserRole } from '../index';
import { TokenStorage } from '../utils/token-storage';
import { deviceIdentity } from '../utils/device-identity';

// Define user data structure
interface User {
  id: string;
  email: string;
  role: UserRole;
  twoFactorEnabled?: boolean;
}

// Define login result structure
interface LoginResult {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  requiresTwoFactor?: boolean;
  tempToken?: string;
}

// Define authentication context state and methods
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, deviceId?: string) => Promise<LoginResult>;
  verify2FALogin: (tempToken: string, code: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, role: UserRole, clinicId: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  refreshToken: (refreshToken: string, deviceId?: string) => Promise<{ accessToken: string; refreshToken: string }>;
  clearError: () => void;
}

// Create the authentication context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Props interface for AuthProvider component
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Authentication Provider Component
 * Wraps the application and provides authentication state and methods to all children
 */
export function AuthProvider({ children }: AuthProviderProps) {
  // Authentication state
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [refreshErrorCount, setRefreshErrorCount] = useState<number>(0);
    /**
   * Handle token refresh when access token expires
   */
  const handleTokenRefresh = useCallback(async (): Promise<boolean> => {
    try {
      // Check if a refresh is already in progress to prevent multiple simultaneous attempts
      if (typeof sessionStorage !== 'undefined') {
        const refreshInProgress = sessionStorage.getItem('refreshInProgress');
        const now = Date.now();
        
        if (refreshInProgress) {
          const refreshStartTime = parseInt(refreshInProgress, 10);
          // If refresh started less than 2 seconds ago, wait for it to complete
          if (now - refreshStartTime < 2000) {
            console.log('Token refresh already in progress, waiting...');
            // Wait a moment and then check if it succeeded
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check if user was set during the other refresh operation
            const hasValidToken = !TokenStorage.isAccessTokenExpired();
            if (hasValidToken) {
              console.log('Another refresh process completed successfully');
              sessionStorage.removeItem('refreshInProgress');
              return true;
            }
          } else {
            // Stale refresh operation, clear it
            sessionStorage.removeItem('refreshInProgress');
          }
        }
        
        // Mark refresh as in progress
        sessionStorage.setItem('refreshInProgress', now.toString());
      }
      
      // Try to get refresh token from storage utility
      const storedRefreshToken = TokenStorage.getRefreshToken();
      
      if (!storedRefreshToken) {
        console.warn('No refresh token available');
        // No refresh token available, user needs to log in again
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem('refreshInProgress');
        }
        return false;
      }      
      // Validate the token format before sending to the server
      if (!TokenStorage.validateTokenFormat(storedRefreshToken)) {
        console.error('Invalid refresh token format found in storage');
        TokenStorage.clearTokens();
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem('refreshInProgress');
        }
        return false;
      }
      
      // Get device ID from device identity system first, then fall back to TokenStorage
      let deviceId: string | null = null;
      try {
        deviceId = await deviceIdentity.getDeviceId();
        // Sync TokenStorage with DeviceIdentity for backward compatibility
        if (deviceId && deviceId !== TokenStorage.getDeviceId()) {
          TokenStorage.setDeviceId(deviceId);
        }
      } catch (e) {
        console.warn('Error getting device ID from device identity system, falling back to TokenStorage:', e);
        deviceId = TokenStorage.getDeviceId();
      }
      
      // Check for navigation state to help with browser back button
      const lastNavPath = typeof sessionStorage !== 'undefined' ? 
        sessionStorage.getItem('lastNavPath') : null;
      
      console.log('Attempting token refresh with stored token');
      
      // Call refresh endpoint with retry logic
      let response;
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries) {
        try {
          response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'private, max-age=0, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
              ...(lastNavPath ? { 'X-Last-Navigation-Path': lastNavPath } : {})
            },
            body: JSON.stringify({
              refreshToken: storedRefreshToken,
              deviceId: deviceId || undefined,
            }),
            credentials: 'include', // Include cookies in the request
          });
          
          // If successful, break out of the retry loop
          if (response.ok) {
            break;
          }
          
          // Only retry on network errors and 500 server errors
          if (!response.ok && response.status !== 500 && response.status !== 503) {
            console.error(`Token refresh failed with status: ${response.status}`);
            break;
          }
          
          // Increment retry counter
          retryCount++;
          
          // If we've reached max retries, break out
          if (retryCount > maxRetries) {
            console.error(`Maximum retry attempts (${maxRetries}) reached for token refresh`);
            break;
          }
          
          // Exponential backoff
          const waitTime = Math.min(1000 * Math.pow(2, retryCount), 5000);
          console.log(`Retrying token refresh in ${waitTime}ms (attempt ${retryCount} of ${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } catch (e) {
          // Increment retry counter for network errors
          retryCount++;
          
          if (retryCount > maxRetries) {
            console.error(`Maximum retry attempts (${maxRetries}) reached for token refresh`);
            throw e;
          }
          
          // Exponential backoff for network errors
          const waitTime = Math.min(1000 * Math.pow(2, retryCount), 5000);
          console.log(`Network error, retrying token refresh in ${waitTime}ms (attempt ${retryCount} of ${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
      
      // Check if we got a valid response after retries
      if (!response || !response.ok) {
        const errorData = response ? await response.json().catch(() => ({ error: 'Unknown error' })) : { error: 'Network error' };
        console.error('Token refresh failed after retries:', errorData.error);
        
        // If refresh failed, clear auth state
        setUser(null);
        TokenStorage.clearTokens();
        
        // Clear the in-progress flag
        sessionStorage.removeItem('refreshInProgress');
        return false;
      }
        const data = await response.json();
      
      console.log('Token refresh successful, storing new tokens');
      
      // Store new tokens using the utility
      TokenStorage.setRefreshToken(data.tokens.refreshToken);
      TokenStorage.setAccessToken(data.tokens.accessToken);
      TokenStorage.updateLastActivity(); // Update activity timestamp
      
      // Reset error count on successful refresh
      setRefreshErrorCount(0);
      
      // Check if we received a navigation path header
      if (response.headers.get('X-Auth-Refreshed') && lastNavPath) {
        // We successfully refreshed during a browser navigation
        console.log('Successfully refreshed token during browser navigation');
      }
      
      // Fetch user data with new token
      const userResponse = await fetch('/api/auth/me', {
        headers: {
          'Cache-Control': 'private, max-age=0, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        credentials: 'include'
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData.user);
        
        // Clear the in-progress flag
        sessionStorage.removeItem('refreshInProgress');
        return true;
      }      // Clear the in-progress flag
      sessionStorage.removeItem('refreshInProgress');
      return false;
    } catch (err) {
      console.error('Token refresh error:', err);
      
      // Increment error count to track persistent issues
      setRefreshErrorCount(prev => prev + 1);
      
      // Log detailed error information
      const errorDetails = {
        message: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
        url: window.location.href,
        hasRefreshToken: !!TokenStorage.getRefreshToken(),
        refreshErrorCount: refreshErrorCount + 1
      };
      console.error('Detailed token refresh error:', JSON.stringify(errorDetails, null, 2));
      
      // Clear auth state on refresh error
      setUser(null);
      TokenStorage.clearTokens();
      
      // Clear the in-progress flag
      sessionStorage.removeItem('refreshInProgress');
      return false;
    }
  }, [refreshErrorCount]);

  // Reset error count after successful authentication
  useEffect(() => {
    if (user) {
      setRefreshErrorCount(0);
    }
  }, [user]);
  
  // Monitor refresh errors to detect persistent issues
  useEffect(() => {
    if (refreshErrorCount >= 3) {
      console.error('Multiple token refresh failures detected, forcing logout');
      // Force logout after 3 consecutive refresh errors
      TokenStorage.clearTokens();
      setUser(null);
      setError('Session expired due to authentication issues. Please login again.');
      setRefreshErrorCount(0);
    }  }, [refreshErrorCount]);  

  // Check if user is authenticated on initial load  
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        
        // Initialize device identity system first
        console.log('Initializing device identity system');
        const deviceId = await deviceIdentity.init();
        
        // Ensure device ID is stored in TokenStorage for backward compatibility
        if (deviceId && !TokenStorage.getDeviceId()) {
          TokenStorage.setDeviceId(deviceId);
        } else if (TokenStorage.getDeviceId() && TokenStorage.getDeviceId() !== deviceId) {
          // If we have a different device ID in TokenStorage, verify it
          const isValid = await deviceIdentity.verifyDeviceId(TokenStorage.getDeviceId() as string);
          if (isValid) {
            // If valid, update device identity with the TokenStorage value
            await deviceIdentity.verifyDeviceId(TokenStorage.getDeviceId() as string);
          } else {
            // If not valid, update TokenStorage with the device identity value
            TokenStorage.setDeviceId(deviceId);
          }
        }
        
        // Always attempt to get user data on initialization - this helps with browser back button navigation
        const response = await fetch('/api/auth/me', {
          credentials: 'include', // Always include cookies
          headers: {
            'Cache-Control': 'private, max-age=0, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData.user);
          // Mark successful authentication
          TokenStorage.updateLastActivity();
        } else if (response.status === 401) {
          console.log('Auth initialization: Token invalid or expired, attempting refresh');
          // Token expired or invalid, try to refresh
          const refreshResult = await handleTokenRefresh();
          
          // If refresh failed and we have no user, prepare for fresh login
          if (!refreshResult && !user) {
            console.log('Auth initialization: Token refresh failed, preparing for fresh login');
            // Clear any stale state
            TokenStorage.clearTokens();
            
            // If there's a valid refresh token but refresh failed, something may be wrong with the token
            // Let's verify the token's format and clear it if it looks invalid
            const refreshToken = TokenStorage.getRefreshToken();
            if (refreshToken) {
              try {
                // Basic JWT format check (header.payload.signature)
                const parts = refreshToken.split('.');
                if (parts.length !== 3) {
                  console.warn('Auth initialization: Invalid refresh token format, clearing token');
                  TokenStorage.clearTokens();
                }
              } catch (error) {
                console.error('Auth initialization: Error checking token format:', error);
                TokenStorage.clearTokens();
              }
            }
          }
        } else {
          // Other error responses
          console.error(`Auth initialization: Unexpected response status: ${response.status}`);          // Try to parse error message
          try {
            const errorData = await response.json();            console.error('Auth initialization error details:', errorData);
          } catch {
            console.error('Auth initialization: Could not parse error response');
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        // Fall back to token refresh if network error occurred
        if (err instanceof Error && (err.message.includes('network') || err.message.includes('fetch'))) {
          console.log('Auth initialization: Network error, trying token refresh as fallback');
          await handleTokenRefresh();
        }
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };
    
    initializeAuth();
  }, [user, handleTokenRefresh]);

  useEffect(() => {
    const handleRefreshSignal = async () => {
      // Check if refresh is needed based on tokens or navigation
      if (TokenStorage.isRefreshNeededForNavigation()) {
        console.log('Token refresh needed in useAuth');
        await handleTokenRefresh();
      }
    };

    // Check if we need to refresh on page load
    handleRefreshSignal();
    
    // Set up listeners for navigation events
    const handleNavigation = () => {
      console.log('Navigation event detected in useAuth');
      if (typeof window !== 'undefined') {
        TokenStorage.storeNavigationState(window.location.pathname + window.location.search);
      }
      handleRefreshSignal();
    };
    
    const handlePageShow = (event: PageTransitionEvent) => {
      // When page is restored from back-forward cache
      if (event.persisted) {
        console.log('Page restored from BFCache in useAuth');
        TokenStorage.markBfCacheRestoration();
        
        // Immediate check and refresh for BFCache
        const refreshToken = TokenStorage.getRefreshToken();
        if (refreshToken) {
          console.log('Refreshing token immediately after BFCache restoration');
          handleTokenRefresh();
        }
      }
    };
    
    // Listen for various navigation events
    window.addEventListener('focus', handleNavigation);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('popstate', handleNavigation);
      return () => {
      window.removeEventListener('focus', handleNavigation);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('popstate', handleNavigation);
    };
  }, [handleTokenRefresh]);

  /**
   * Login method
   */
  const login = async (email: string, password: string, deviceId?: string): Promise<LoginResult> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Generate a device ID if not provided
      const finalDeviceId = deviceId || generateDeviceId();
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({
          email,
          password,
          deviceId: finalDeviceId,
        }),
        credentials: 'include',  // Include cookies in the request
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }
        // Store tokens using the centralized token storage utility
      if (data.tokens?.refreshToken) {
        TokenStorage.setRefreshToken(data.tokens.refreshToken);
        TokenStorage.setAccessToken(data.tokens.accessToken);
        TokenStorage.setDeviceId(finalDeviceId);
      }
      
      // If 2FA is required, return without setting user
      if (data.requiresTwoFactor) {
        return data;
      }
      
      // Set user data in state
      setUser(data.user);
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  /**
   * Verify two-factor authentication during login
   */
  const verify2FALogin = async (
    tempToken: string,
    code: string,
    rememberMe = false
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Generate a device ID if not already stored
      const deviceId = TokenStorage.getDeviceId() || generateDeviceId();
      
      // Call the verification endpoint
      const response = await fetch('/api/auth/2fa/login-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({
          tempToken,
          code,
          deviceId,
          rememberMe
        }),
        credentials: 'include',  // Include cookies in the request
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Verification failed');
      }
      
      // Store tokens using the centralized token storage utility
      if (data.tokens?.refreshToken) {
        TokenStorage.setRefreshToken(data.tokens.refreshToken);
        TokenStorage.setAccessToken(data.tokens.accessToken);
        TokenStorage.setDeviceId(deviceId);
      }
      
      // Set user data in state if successful
      if (data.success && data.user) {
        setUser(data.user);
        return { success: true };
      }
      
      return { 
        success: false,
        error: 'Invalid verification code'
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Register a new user
   */
  const register = async (
    email: string, 
    password: string, 
    role: UserRole,
    clinicId: string
  ): Promise<LoginResult> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Generate a device ID for this registration
      const deviceId = generateDeviceId();
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          role,
          clinicId,
          agreeToTerms: true,  // This is from the form
        }),
        credentials: 'include',  // Include cookies in the request
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }
      
      // Store refresh token in localStorage
      if (data.tokens?.refreshToken) {
        localStorage.setItem('refreshToken', data.tokens.refreshToken);
        localStorage.setItem('deviceId', deviceId);
      }
      
      // Set user data in state
      setUser(data.user);
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Logout the current user
   */  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Get refresh token to invalidate it on the backend
      const refreshToken = TokenStorage.getRefreshToken();
      
      // Call logout endpoint
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({
          refreshToken: refreshToken || undefined,
        }),
        credentials: 'include', // Include cookies for server recognition
      });
      
      // Clear local state regardless of server response
      setUser(null);
      TokenStorage.clearTokens();
    } catch (err) {
      console.error('Logout error:', err);
      // Still clear local state even if there's an error
      setUser(null);
      TokenStorage.clearTokens();
    } finally {
      setIsLoading(false);
    }
  };
  /**
   * Refresh access token using a refresh token
   */
  const refreshToken = async (
    refreshToken: string,
    deviceId?: string
  ): Promise<{ accessToken: string; refreshToken: string }> => {
    try {
      setIsLoading(true);
      
      // Try up to 3 times with exponential backoff
      let lastError: Error | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            },
            body: JSON.stringify({
              refreshToken,
              deviceId,
            }),
            credentials: 'include', // Include cookies
          });
          
          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || data.details || 'Token refresh failed');
          }
            const data = await response.json();
          
          // Use token storage utility for consistency          
          TokenStorage.setRefreshToken(data.tokens.refreshToken);          
          TokenStorage.setAccessToken(data.tokens.accessToken);
          TokenStorage.updateLastActivity();
          
          return data.tokens;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          console.error(`Token refresh attempt ${attempt + 1} failed:`, lastError);
          
          // Only retry for certain error types
          if (attempt < 2) {
            const waitTime = Math.min(1000 * Math.pow(2, attempt), 3000);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }
      
      // If we've exhausted all retries, throw the last error
      if (lastError) {
        throw lastError;
      }
      
      // This should not happen, but TypeScript requires a return statement
      throw new Error('Failed to refresh token after multiple attempts');
    } catch (err) {
      console.error('Token refresh error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error refreshing token');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Clear any error messages
   */
  const clearError = () => {
    setError(null);
  };

  // Compute derived state
  const isAuthenticated = !!user;
  
  // Create context value
  const contextValue: AuthContextType = {
    user,
    isLoading,
    error,
    isAuthenticated,
    login,
    verify2FALogin,
    register,
    logout,
    refreshToken,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to use the authentication context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

/**
 * Generate a device ID
 */
function generateDeviceId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 10);
  return `device-${timestamp}-${randomStr}`;
}

'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Authentication context and hook for the CareSyncRx platform.
 * This provides authentication state management and auth methods throughout the application.
 * Updated to use the new auth system with window.AuthCore, window.AuthSession, and window.AuthInterceptor.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
// Import from central enums directory
import { UserRole } from '@/enums';
import { deviceIdentity } from '../utils/device-identity';
// Type definitions for window extensions are in auth-system.d.ts (imported implicitly)

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
 * Updated to use the new auth system
 */
export function AuthProvider({ children }: AuthProviderProps) {
  // Authentication state
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  /**
   * Reset auth state and redirect to login
   */
  const resetAuthAndRedirect = useCallback((returnPath?: string) => {
    // Clear user state
    setUser(null);
    
    // Use the new AuthCore for clearing tokens
    if (typeof window !== 'undefined' && window.AuthCore) {
      window.AuthCore.clearTokens();
    }
    
    // Store return path if provided
    if (returnPath && typeof window !== 'undefined' && window.AuthSession) {
      window.AuthSession.storeLoginRedirect(returnPath);
    }
    
    // Use AuthSession to redirect to login
    if (typeof window !== 'undefined' && window.AuthSession) {
      window.AuthSession.redirectToLogin(returnPath);
    } else if (typeof window !== 'undefined') {
      // Fallback if AuthSession is not available
      window.location.href = `/login${returnPath ? `?redirect=${encodeURIComponent(returnPath)}` : ''}`;
    }
  }, []);

  /**
   * Handle token refresh when access token expires
   */
  const handleTokenRefresh = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    
    try {
      // Use the new AuthCore for token refresh
      if (window.AuthCore && window.AuthCore.refreshToken) {
        console.log('Attempting token refresh with AuthCore');
        await window.AuthCore.refreshToken();
        
        // Wait a moment for tokens to be properly stored
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Use AuthSession to load user data
        if (window.AuthSession) {
          const userData = await window.AuthSession.loadUser();
          if (userData) {
            setUser(userData as User);
            return true;
          }
        }
        
        // Fallback: fetch user data directly
        const userResponse = await fetch('/api/auth/me', {
          headers: {
            'Cache-Control': 'no-cache',
            'X-Request-Source': 'auth-refresh-verification'
          },
          credentials: 'include'
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData.user);
          return true;
        }
        
        console.warn('User data fetch failed after token refresh:', userResponse.status);
        return false;
      }
      
      console.warn('AuthCore not available for token refresh');
      return false;
    } catch (err) {
      console.error('Token refresh error:', err);
      return false;
    }
  }, []);

  // Check if user is authenticated on initial load  
  useEffect(() => {
    const initializeAuth = async () => {
      if (typeof window === 'undefined') {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        
        // Initialize device identity system first
        console.log('Initializing device identity system');
        await deviceIdentity.init();
        
        // Use AuthSession to get user data if available
        if (window.AuthSession) {
          // Check if already authenticated in the session
          if (window.AuthSession.isAuthenticated()) {
            const userData = await window.AuthSession.loadUser();
            if (userData) {
              setUser(userData as User);
              console.log('Auth initialization: User loaded from AuthSession');
              setIsLoading(false);
              setIsInitialized(true);
              return;
            }
          }
        }
        
        // Check if we have valid tokens with AuthCore
        if (window.AuthCore) {
          const isValid = window.AuthCore.isTokenValid();
          
          if (!isValid && window.AuthCore.getRefreshToken()) {
            // Token expired but we have a refresh token, try to refresh
            console.log('Auth initialization: Token expired, attempting refresh');
            const refreshSuccess = await handleTokenRefresh();
            if (refreshSuccess) {
              console.log('Auth initialization: Token refresh successful');
              setIsLoading(false);
              setIsInitialized(true);
              return;
            }
          }
        }
        
        // Fallback to direct API call
        try {
          const response = await fetch('/api/auth/me', {
            credentials: 'include',
            headers: {
              'Cache-Control': 'no-cache',
              'X-Request-Source': 'auth-initialization'
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData.user);
            console.log('Auth initialization: User loaded from API');
          } else {
            console.log('Auth initialization: Not authenticated');
          }
        } catch (error) {
          console.warn('Auth initialization: Error fetching user data', error);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };
    
    initializeAuth();
  }, [handleTokenRefresh]);

  /**
   * Login user with email and password
   */
  const login = useCallback(async (
    email: string, 
    password: string,
    deviceId?: string
  ): Promise<LoginResult> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get device ID if not provided
      if (!deviceId) {
        try {
          deviceId = await deviceIdentity.getDeviceId();
        } catch (e) {
          console.warn('Error getting device ID during login:', e);
        }
      }
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, deviceId }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }
      
      const data = await response.json();
      
      // Handle 2FA flow
      if (data.requiresTwoFactor) {
        return data;
      }
      
      // Store tokens using the AuthCore
      if (typeof window !== 'undefined' && window.AuthCore) {
        window.AuthCore.setTokens(
          data.tokens.accessToken,
          data.tokens.refreshToken,
          Date.now() + (15 * 60 * 1000) // Default to 15 minutes
        );
      }
      
      // Store device ID if available
      if (deviceId && typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem('deviceId', deviceId);
        } catch (e) {
          console.warn('Error storing device ID:', e);
        }
      }
      
      // Store user data in AuthSession if available
      if (typeof window !== 'undefined' && window.AuthSession) {
        window.AuthSession.setUser(data.user);
      }
      
      setUser(data.user);
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Verify 2FA code for login
   */
  const verify2FALogin = useCallback(async (
    tempToken: string,
    code: string,
    rememberMe?: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, code, rememberMe }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Verification failed');
      }
      
      const data = await response.json();
      
      // Store tokens using AuthCore
      if (typeof window !== 'undefined' && window.AuthCore) {
        window.AuthCore.setTokens(
          data.tokens.accessToken,
          data.tokens.refreshToken,
          Date.now() + (15 * 60 * 1000) // Default to 15 minutes
        );
      }
      
      // Store user in AuthSession
      if (typeof window !== 'undefined' && window.AuthSession) {
        window.AuthSession.setUser(data.user);
      }
      
      setUser(data.user);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Verification failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Register a new user
   */
  const register = useCallback(async (
    email: string,
    password: string,
    role: UserRole,
    clinicId: string
  ): Promise<LoginResult> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get device ID for registration
      let deviceId: string | null = null;
      try {
        deviceId = await deviceIdentity.getDeviceId();
      } catch (e) {
        console.warn('Error getting device ID during registration:', e);
      }
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password, 
          role, 
          clinicId,
          deviceId 
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }
      
      const data = await response.json();
      
      // Store tokens using AuthCore
      if (typeof window !== 'undefined' && window.AuthCore) {
        window.AuthCore.setTokens(
          data.tokens.accessToken,
          data.tokens.refreshToken,
          Date.now() + (15 * 60 * 1000) // Default to 15 minutes
        );
      }
      
      // Store device ID if available
      if (deviceId && typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem('deviceId', deviceId);
        } catch (e) {
          console.warn('Error storing device ID:', e);
        }
      }
      
      // Store user in AuthSession
      if (typeof window !== 'undefined' && window.AuthSession) {
        window.AuthSession.setUser(data.user);
      }
      
      setUser(data.user);
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Logout the user
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Use the AuthSession for logout
      if (typeof window !== 'undefined' && window.AuthSession) {
        await window.AuthSession.logout();
      } else {
        // Fallback for direct API call
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include'
        });
        
        // Clear tokens with AuthCore
        if (typeof window !== 'undefined' && window.AuthCore) {
          window.AuthCore.clearTokens();
        }
      }
      
      // Clear user state
      setUser(null);
      
      // Redirect to login page on next render cycle
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Logout error:', error);
      
      // Ensure tokens and state are cleared even if the API call fails
      if (typeof window !== 'undefined') {
        if (window.AuthCore) window.AuthCore.clearTokens();
        if (window.AuthSession) window.AuthSession.clearUser();
      }
      
      setUser(null);
      
      // Still redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Manually refresh token (rarely needed directly)
   */
  const refreshToken = useCallback(async (
    refreshToken: string,
    deviceId?: string
  ): Promise<{ accessToken: string; refreshToken: string }> => {
    try {
      // Try to use AuthCore first
      if (typeof window !== 'undefined' && window.AuthCore && window.AuthCore.refreshToken) {
        console.log('Using AuthCore for manual token refresh');
        await window.AuthCore.refreshToken();
        
        // Get tokens from AuthCore
        const accessToken = window.AuthCore.getAccessToken() || '';
        const newRefreshToken = window.AuthCore.getRefreshToken() || '';
        
        if (accessToken && newRefreshToken) {
          return { 
            accessToken,
            refreshToken: newRefreshToken
          };
        }
      }
      
      // Fallback to direct API call
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken, deviceId }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Token refresh failed');
      }
      
      const data = await response.json();
      
      // Store tokens using AuthCore
      if (typeof window !== 'undefined' && window.AuthCore) {
        window.AuthCore.setTokens(
          data.tokens.accessToken,
          data.tokens.refreshToken,
          Date.now() + (15 * 60 * 1000) // Default to 15 minutes
        );
      }
      
      return data.tokens;
    } catch (error) {
      console.error('Manual token refresh error:', error);
      throw error;
    }
  }, []);

  /**
   * Clear any error messages
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Authentication context value
  const contextValue = {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    login,
    verify2FALogin,
    register,
    logout,
    refreshToken,
    clearError
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
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

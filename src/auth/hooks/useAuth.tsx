'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Authentication context and hook for the CareSyncRx platform.
 * This provides authentication state management and auth methods throughout the application.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
// Import directly from enums.ts to avoid circular dependencies
import { UserRole } from '../enums';
import { TokenStorage } from '../utils/token-storage';
import { deviceIdentity } from '../utils/device-identity';
// Type definitions for window extensions are in window-auth.d.ts (imported implicitly)

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
   * Reset auth state and redirect to login
   */
  const resetAuthAndRedirect = useCallback((returnPath?: string) => {
    // Clear user state
    setUser(null);
    
    // Use the unified TokenManager for clearing tokens
    if (window.TokenManager) {
      window.TokenManager.clearTokens();
    } else {
      // Fallback to the original TokenStorage
      TokenStorage.clearTokens();
    }
    
    // Clear any in-progress flags
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('refreshInProgress');
    }
    
    // Store return path if provided
    if (returnPath && typeof window !== 'undefined') {
      if (window.TokenManager) {
        window.TokenManager.storeNavigationState(returnPath);
      } else {
        TokenStorage.storeNavigationState(returnPath);
      }
    }
    
    // Use AuthNavigation if available, otherwise fall back to direct redirect
    if (window.AuthNavigation) {
      window.AuthNavigation.redirectToLogin(returnPath);
    } else if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      const redirectQuery = returnPath ? `?redirect=${encodeURIComponent(returnPath)}` : '';
      window.location.href = `/login${redirectQuery}`;
    }
  }, []);

  /**
   * Handle token refresh when access token expires
   */
  const handleTokenRefresh = useCallback(async (): Promise<boolean> => {
    try {
      // If AuthNavigation is available, use it for token refresh
      if (window.AuthNavigation) {
        try {
          await window.AuthNavigation.refreshToken();
          
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
            return true;
          }
          
          return false;
        } catch (error) {
          console.error('Token refresh failed using AuthNavigation:', error);
          
          // Get current path for return after login
          const currentPath = typeof window !== 'undefined' ? 
            window.location.pathname + window.location.search : '';
            
          // Use our reset function to handle this scenario
          resetAuthAndRedirect(currentPath);
          return false;
        }
      }
      
      // Fall back to the original refresh logic if AuthNavigation is not available
      // Simplified for this version
      console.log('Attempting token refresh with stored token');
      
      // Try to get refresh token from storage utility
      const storedRefreshToken = window.TokenManager 
        ? window.TokenManager.getRefreshToken() 
        : TokenStorage.getRefreshToken();
      
      if (!storedRefreshToken) {
        console.warn('No refresh token available');
        return false;
      }
      
      // Get device ID
      let deviceId: string | null = null;
      try {
        deviceId = await deviceIdentity.getDeviceId();
      } catch (e) {
        console.warn('Error getting device ID:', e);
        deviceId = window.TokenManager ? window.TokenManager.getDeviceId() : TokenStorage.getDeviceId();
      }
      
      // Call refresh endpoint
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({
          refreshToken: storedRefreshToken,
          deviceId: deviceId || undefined,
        }),
        credentials: 'include'
      });
        
      if (!response.ok) {
        console.error('Token refresh failed:', response.status);
        
        // If refresh failed, clear auth state
        setUser(null);
        if (window.TokenManager) {
          window.TokenManager.clearTokens();
        } else {
          TokenStorage.clearTokens();
        }
        
        return false;
      }
        
      const data = await response.json();
      
      // Store new tokens using the available utility
      if (window.TokenManager) {
        window.TokenManager.setTokens(
          data.tokens.accessToken,
          data.tokens.refreshToken,
          Date.now() + (15 * 60 * 1000) // Default to 15 minutes
        );
      } else {
        TokenStorage.setRefreshToken(data.tokens.refreshToken);
        TokenStorage.setAccessToken(data.tokens.accessToken);
        TokenStorage.updateLastActivity();
      }
      
      // Reset error count on successful refresh
      setRefreshErrorCount(0);
      
      return true;
    } catch (err) {
      console.error('Token refresh error:', err);
      setRefreshErrorCount(prev => prev + 1);
      return false;
    }
  }, [refreshErrorCount, resetAuthAndRedirect]);

  // Check if user is authenticated on initial load  
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        
        // Initialize device identity system first
        console.log('Initializing device identity system');
        await deviceIdentity.init();
        
        // Get user data
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData.user);
        } else if (response.status === 401) {
          // Token expired or invalid, try to refresh
          await handleTokenRefresh();
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
      
      // Store tokens using the appropriate utility
      if (window.TokenManager) {
        window.TokenManager.setTokens(
          data.tokens.accessToken,
          data.tokens.refreshToken,
          Date.now() + (15 * 60 * 1000) // Default to 15 minutes
        );
        
        // Store device ID if available
        if (deviceId) {
          window.TokenManager.setDeviceId(deviceId);
        }
      } else {
        TokenStorage.setAccessToken(data.tokens.accessToken);
        TokenStorage.setRefreshToken(data.tokens.refreshToken);
        TokenStorage.updateLastActivity();
        
        // Store device ID if available
        if (deviceId) {
          TokenStorage.setDeviceId(deviceId);
        }
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
      
      // Store tokens
      if (window.TokenManager) {
        window.TokenManager.setTokens(
          data.tokens.accessToken,
          data.tokens.refreshToken,
          Date.now() + (15 * 60 * 1000) // Default to 15 minutes
        );
      } else {
        TokenStorage.setAccessToken(data.tokens.accessToken);
        TokenStorage.setRefreshToken(data.tokens.refreshToken);
        TokenStorage.updateLastActivity();
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
      
      // Store tokens
      if (window.TokenManager) {
        window.TokenManager.setTokens(
          data.tokens.accessToken,
          data.tokens.refreshToken,
          Date.now() + (15 * 60 * 1000) // Default to 15 minutes
        );
        
        if (deviceId) {
          window.TokenManager.setDeviceId(deviceId);
        }
      } else {
        TokenStorage.setAccessToken(data.tokens.accessToken);
        TokenStorage.setRefreshToken(data.tokens.refreshToken);
        TokenStorage.updateLastActivity();
        
        if (deviceId) {
          TokenStorage.setDeviceId(deviceId);
        }
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
      
      // Use the AuthLogout system if available
      if (window.AuthLogout) {
        await window.AuthLogout.logout();
      } else {
        // Otherwise perform a standard logout
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include'
        });
        
        // Clear tokens and state
        if (window.TokenManager) {
          window.TokenManager.clearTokens();
        } else {
          TokenStorage.clearTokens();
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
      if (window.TokenManager) {
        window.TokenManager.clearTokens();
      } else {
        TokenStorage.clearTokens();
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
      
      // Store tokens
      if (window.TokenManager) {
        window.TokenManager.setTokens(
          data.tokens.accessToken,
          data.tokens.refreshToken,
          Date.now() + (15 * 60 * 1000) // Default to 15 minutes
        );
      } else {
        TokenStorage.setAccessToken(data.tokens.accessToken);
        TokenStorage.setRefreshToken(data.tokens.refreshToken);
        TokenStorage.updateLastActivity();
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

/**
 * Type definitions for the global window extensions added by the auth scripts.
 * This file defines TypeScript interfaces for the auth-related JavaScript objects
 * attached to the global window object.
 */

// Extend the Window interface to include our auth objects
interface Window {
  // TokenManager provides unified token storage and management
  TokenManager?: {
    // Storage operations
    getAccessToken: () => string | null;
    getRefreshToken: () => string | null;
    getExpiresAt: () => number | null;
    getDeviceId: () => string | null;
    
    // Set operations
    setAccessToken: (token: string | null) => void;
    setRefreshToken: (token: string | null) => void;
    setExpiresAt: (timestamp: number | null) => void;
    setDeviceId: (deviceId: string | null) => void;
    
    // Combined operations
    setTokens: (accessToken: string | null, refreshToken: string | null, expiresAt: number | null) => void;
    clearTokens: () => void;
    
    // Validation
    isAccessTokenExpired: () => boolean;
    validateTokenFormat: (token: string | null) => boolean;
    
    // Navigation state
    storeNavigationState: (path: string) => void;
    markBfCacheRestoration: () => void;
    updateLastActivity: () => void;
    
    // Navigation refresh detection
    isRefreshNeededForNavigation: () => boolean;
    
    // Refresh state management
    isRefreshInProgress: () => boolean;
    markRefreshInProgress: () => void;
    
    // Login redirect management
    recordLoginRedirect: () => void;
  };
  
  // AuthNavigation handles auth-related navigation and browser history
  AuthNavigation?: {
    // Configuration
    config: {
      refreshEndpoint: string;
      loginPath: string;
      publicPaths: string[];
      tokenRefreshThresholdMs: number;
    };
    
    // Path checking
    isPublicPath: (path?: string) => boolean;
    isRefreshNeeded: () => boolean;
    
    // Navigation handlers
    handleNavigation: (event?: Event) => void;
    handlePopState: (event: PopStateEvent) => void;
    handlePageShow: (event: PageTransitionEvent) => void;
    
    // Token operations
    refreshToken: () => Promise<void>;
    redirectToLogin: (returnPath?: string) => void;
  };
  
  // AuthVerification checks auth status on page load
  AuthVerification?: {
    // Configuration
    config: {
      authEndpoint: string;
      loginPath: string;
      publicPaths: string[];
      bypassPaths: string[];
    };
    
    // Path checking
    isPublicPath: (path?: string) => boolean;
    
    // Auth verification
    verifyAuth: () => Promise<void>;
    
    // Redirect handling
    redirectToLogin: () => void;
    isRedirectThrottled: () => boolean;
  };
  
  // AuthErrorHandler manages auth-related errors
  AuthErrorHandler?: {
    // Configuration
    config: {
      errorTypes: {
        tokenValidation: string[];
        authorization: string[];
      };
    };
    
    // Error handling
    handleGlobalError: (event: ErrorEvent) => void;
    isAuthError: (errorMsg: string) => boolean;
    
    // XHR and fetch interceptors
    setupXhrInterceptor: () => void;
    setupFetchInterceptor: () => void;
  };
  
  // AuthLogout manages logout operations
  AuthLogout?: {
    // Logout methods
    logout: () => Promise<void>;
    clientLogout: () => Promise<void>;
    serverLogout: () => Promise<void>;
  };
}

// Export these types to be used in other modules
export {};

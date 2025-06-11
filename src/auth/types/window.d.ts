// Window extension for auth system globals
declare global {
  interface Window {
    // Modern auth system API interfaces
    AuthCore: {
      getAccessToken: () => string | null;
      getRefreshToken: () => string | null;
      setTokens: (accessToken: string, refreshToken: string, expiresAt: number) => void;
      clearTokens: () => void;
      isTokenValid: (timeBuffer?: number) => boolean;
      refreshToken: () => Promise<boolean>;
    };
      AuthSession: {
      getUser: () => any | null;
      isAuthenticated: () => boolean;
      loadUser: () => Promise<any | null>;
      clearUser: () => void;
      setUser: (user: any) => void;
      logout: () => Promise<boolean>;
      storeLoginRedirect: (path?: string) => void;
      getLoginRedirect: () => string | null;
      clearLoginRedirect: () => void;
      redirectToLogin: (returnPath?: string) => void;
      isSessionValid: () => boolean;
    };
    
    AuthInterceptor: {
      setup: (refreshTokenFn: () => Promise<boolean>) => void;
    };
    
    // Legacy functions maintained for backward compatibility
    logout?: (returnPath?: string) => void;
    handleTokenRefreshError?: (error: unknown, returnPath?: string) => void;
    tokenErrorRefreshAttempted?: boolean;
  }
}

export {};

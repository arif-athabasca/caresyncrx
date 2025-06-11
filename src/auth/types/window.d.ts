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
      storeLoginRedirect: (path: string) => void;
      getLoginRedirect: () => string | null;
      clearLoginRedirect: () => void;
      handleLogin: (tokens: { accessToken: string, refreshToken: string }, expiresIn: number) => void;
      handleLogout: (redirectToLogin?: boolean) => void;
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

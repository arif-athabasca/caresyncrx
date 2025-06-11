/**
 * Type declarations for the new auth system
 */

interface AuthCoreAPI {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  getTokenExpiresAt: () => number | null;
  isTokenValid: (bufferSeconds?: number) => boolean;
  setTokens: (accessToken: string, refreshToken: string, expiresAt: number) => void;
  initializeFromLoginResponse: (loginResponse: any) => any;
  refreshToken: () => Promise<any>;
  clearTokens: () => void;
  on: (event: string, callback: Function) => Function;
  off: (event: string, callback: Function) => void;
  verifyToken: () => Promise<boolean>;
  getState: () => {
    hasToken: boolean;
    isValid: boolean;
    isRefreshing: boolean;
    expiresAt: number | null;
  };
  isTokenExpired: () => boolean;
}

interface AuthSessionAPI {
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
}

interface AuthInterceptorAPI {
  stats: {
    requestsIntercepted: number;
    tokensApplied: number;
    refreshesTriggered: number;
    authErrors: number;
    successfulRequests: number;
    failedRequests: number;
    retriesAttempted: number;
    retriesSuccessful: number;
  };
  requiresAuthentication: (url: string) => boolean;
  isSensitiveRoute: (url: string) => { path: string; name: string; priority: string } | null;
  resetStats: () => void;
}

declare global {
  interface Window {
    AuthCore?: AuthCoreAPI;
    AuthSession?: AuthSessionAPI;
    AuthInterceptor?: AuthInterceptorAPI;
  }
}

export {};

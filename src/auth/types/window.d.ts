// Window extension for TokenStorage global
declare global {
  interface Window {
    TokenStorage: {
      getAccessToken: () => string | null;
      getRefreshToken: () => string | null;
      getDeviceId: () => string | null;
      setAccessToken: (token: string | null) => void;
      setRefreshToken: (token: string | null) => void;
      clearTokens: () => void;
      isAccessTokenExpired: () => boolean;
      validateTokenFormat: (token: string | null) => boolean;
      markBfCacheRestoration: () => void;
      storeNavigationState: (path: string) => void;
      getStoredNavigationState: () => string | null;
      isRefreshNeededForNavigation: () => boolean;
    };
    logout?: (returnPath?: string) => void;
    handleTokenRefreshError?: (error: unknown, returnPath?: string) => void;
    tokenErrorRefreshAttempted?: boolean;
  }
}

export {};

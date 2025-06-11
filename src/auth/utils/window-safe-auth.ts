/**
 * Helper module to type-safely access the window.TokenManager
 * This helps avoid TypeScript errors when accessing global window extensions
 */

// Get access token safely
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  // @ts-ignore - TokenManager is defined in window-auth.d.ts but TypeScript still complains
  if (window.TokenManager && typeof window.TokenManager.getAccessToken === 'function') {
    // @ts-ignore
    return window.TokenManager.getAccessToken();
  }
  
  return null;
}

// Get refresh token safely
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  // @ts-ignore - TokenManager is defined in window-auth.d.ts but TypeScript still complains
  if (window.TokenManager && typeof window.TokenManager.getRefreshToken === 'function') {
    // @ts-ignore
    return window.TokenManager.getRefreshToken();
  }
  
  return null;
}

// Clear tokens safely
export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  
  // @ts-ignore - TokenManager is defined in window-auth.d.ts but TypeScript still complains
  if (window.TokenManager && typeof window.TokenManager.clearTokens === 'function') {
    // @ts-ignore
    window.TokenManager.clearTokens();
  }
}

// Set tokens safely
export function setTokens(accessToken: string, refreshToken: string, expiresAt: number): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Ensure we're setting valid tokens
    if (!accessToken || !refreshToken) {
      console.warn('Attempted to set empty tokens');
      return;
    }
    
    // Set explicitly in localStorage for redundancy
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('expiresAt', expiresAt.toString());
      } catch (e) {
        console.error('Error setting tokens in localStorage:', e);
      }
    }
    
    // Set cookie for immediate use in HTTP requests
    if (typeof document !== 'undefined') {
      // Get domain for cookie
      const domain = window.location.hostname;
      const secure = window.location.protocol === 'https:';
      
      // Set cookies with path and secure flags
      document.cookie = `accessToken=${accessToken}; path=/; ${secure ? 'secure; ' : ''}samesite=strict;`;
      document.cookie = `refreshToken=${refreshToken}; path=/; ${secure ? 'secure; ' : ''}samesite=strict;`;
    }
    
    // @ts-ignore - TokenManager is defined in window-auth.d.ts but TypeScript still complains
    if (window.TokenManager && typeof window.TokenManager.setTokens === 'function') {
      // @ts-ignore
      window.TokenManager.setTokens(accessToken, refreshToken, expiresAt);
    } else {
      // Set individually if setTokens isn't available
      setAccessToken(accessToken);
      setRefreshToken(refreshToken);
    }
    
    // Record the time we set tokens
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('lastTokenSetTime', Date.now().toString());
    }
  } catch (e) {
    console.error('Error setting tokens:', e);
  }
}

// Set access token safely
export function setAccessToken(token: string): void {
  if (typeof window === 'undefined') return;
  
  // @ts-ignore - TokenManager is defined in window-auth.d.ts but TypeScript still complains
  if (window.TokenManager && typeof window.TokenManager.setAccessToken === 'function') {
    // @ts-ignore
    window.TokenManager.setAccessToken(token);
  }
}

// Set refresh token safely
export function setRefreshToken(token: string): void {
  if (typeof window === 'undefined') return;
  
  // @ts-ignore - TokenManager is defined in window-auth.d.ts but TypeScript still complains
  if (window.TokenManager && typeof window.TokenManager.setRefreshToken === 'function') {
    // @ts-ignore
    window.TokenManager.setRefreshToken(token);
  }
}

// Get device ID safely
export function getDeviceId(): string | null {
  if (typeof window === 'undefined') return null;
  
  // @ts-ignore - TokenManager is defined in window-auth.d.ts but TypeScript still complains
  if (window.TokenManager && typeof window.TokenManager.getDeviceId === 'function') {
    // @ts-ignore
    return window.TokenManager.getDeviceId();
  }
  
  return null;
}

// Set device ID safely
export function setDeviceId(deviceId: string): void {
  if (typeof window === 'undefined') return;
  
  // @ts-ignore - TokenManager is defined in window-auth.d.ts but TypeScript still complains
  if (window.TokenManager && typeof window.TokenManager.setDeviceId === 'function') {
    // @ts-ignore
    window.TokenManager.setDeviceId(deviceId);
  }
}

// Store navigation state safely
export function storeNavigationState(path: string): void {
  if (typeof window === 'undefined') return;
  
  // @ts-ignore - TokenManager is defined in window-auth.d.ts but TypeScript still complains
  if (window.TokenManager && typeof window.TokenManager.storeNavigationState === 'function') {
    // @ts-ignore
    window.TokenManager.storeNavigationState(path);
  }
}

// Redirect to login safely
export function redirectToLogin(returnPath?: string): void {
  if (typeof window === 'undefined') return;
  
  // @ts-ignore - AuthNavigation is defined in window-auth.d.ts but TypeScript still complains
  if (window.AuthNavigation && typeof window.AuthNavigation.redirectToLogin === 'function') {
    // @ts-ignore
    window.AuthNavigation.redirectToLogin(returnPath);
  } else if (returnPath) {
    window.location.href = `/login?redirect=${encodeURIComponent(returnPath)}`;
  } else {
    window.location.href = '/login';
  }
}

// Refresh token safely
export async function refreshToken(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  try {
    // Record the refresh time
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('lastTokenRefreshTime', Date.now().toString());
    }
    
    // Clear the refresh needed cookie
    if (typeof document !== 'undefined') {
      document.cookie = 'refreshNeeded=false; path=/; max-age=300';
    }
    
    // @ts-ignore - AuthNavigation is defined in window-auth.d.ts but TypeScript still complains
    if (window.AuthNavigation && typeof window.AuthNavigation.refreshToken === 'function') {
      // @ts-ignore
      await window.AuthNavigation.refreshToken();
      
      // Wait a small amount of time for tokens to propagate through the system
      await new Promise(resolve => setTimeout(resolve, 50));
      
      return true;
    }
    
    // Fallback to direct refresh if AuthNavigation is not available
    const refreshToken = getRefreshToken();
    const deviceId = getDeviceId();
    
    if (!refreshToken) {
      console.warn('No refresh token available for token refresh');
      return false;
    }
    
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Source': 'window-safe-auth-refresh'
      },
      body: JSON.stringify({
        refreshToken,
        deviceId
      }),
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.tokens) {
        setTokens(
          data.tokens.accessToken,
          data.tokens.refreshToken,
          Date.now() + (15 * 60 * 1000) // Default to 15 minutes
        );
        return true;
      }
    }
    
    return false;
  } catch (e) {
    console.error('Error refreshing token:', e);
    return false;
  }
}

// Check if token refresh is needed for navigation
export function isRefreshNeededForNavigation(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    // First check for the refreshNeeded cookie - most reliable indicator
    if (typeof document !== 'undefined' && document.cookie.includes('refreshNeeded=true')) {
      console.log('WindowAuth: Refresh needed based on refreshNeeded cookie');
      return true;
    }

    // Check for the last fetch time and enforce a minimum time between refreshes
    try {
      const lastRefreshTime = parseInt(sessionStorage.getItem('lastTokenRefreshTime') || '0', 10);
      const currentTime = Date.now();
      // If we refreshed in the last 5 seconds, don't refresh again
      if (lastRefreshTime && (currentTime - lastRefreshTime < 5000)) {
        console.log('WindowAuth: Skipping refresh, last refresh was too recent');
        return false;
      }
    } catch (e) {
      console.warn('WindowAuth: Error checking last refresh time:', e);
    }

    // Then check TokenManager
    // @ts-ignore - TokenManager is defined in window-auth.d.ts but TypeScript still complains
    if (window.TokenManager && typeof window.TokenManager.isRefreshNeededForNavigation === 'function') {
      try {
        // @ts-ignore
        const needsRefresh = window.TokenManager.isRefreshNeededForNavigation();
        if (needsRefresh) {
          console.log('WindowAuth: Refresh needed based on TokenManager');
          return true;
        }
      } catch (e) {
        console.warn('WindowAuth: Error checking TokenManager for refresh needed:', e);
      }
    }
    
    // Check for token expiration directly
    const accessToken = getAccessToken();
    if (!accessToken) {
      console.log('WindowAuth: Refresh needed - no access token available');
      return true;
    }
    
    // Check token expiration if possible
    try {
      const tokenParts = accessToken.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        if (payload.exp) {
          const expMs = payload.exp * 1000; // Convert seconds to milliseconds
          const timeUntilExpiry = expMs - Date.now();
          
          // If token expires in less than 5 minutes, refresh
          // Increased from 2 minutes for safety margin
          if (timeUntilExpiry < 300000) {
            console.log(`WindowAuth: Refresh needed - token expires in ${Math.floor(timeUntilExpiry/1000)} seconds`);
            return true;
          }
        }
      }
    } catch (tokenError) {
      console.warn('WindowAuth: Error checking token expiration:', tokenError);
      // Assume we need refresh if we can't parse the token
      return true;
    }

    // Check session storage for manual refresh flag
    try {
      if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('forceTokenRefresh') === 'true') {
        console.log('WindowAuth: Refresh needed based on forced refresh flag');
        // Clear the flag
        sessionStorage.removeItem('forceTokenRefresh');
        return true;
      }
    } catch (storageError) {
      console.warn('WindowAuth: Error checking session storage:', storageError);
    }
    
    return false;
  } catch (e) {
    console.warn('WindowAuth: Error checking if refresh is needed:', e);
    // Conservative approach - return true to trigger refresh on error
    return true;
  }
}

// Safely execute logout
export function logout(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  
  // @ts-ignore - AuthLogout is defined in window-auth.d.ts but TypeScript still complains
  if (window.AuthLogout && typeof window.AuthLogout.logout === 'function') {
    try {
      // @ts-ignore
      return window.AuthLogout.logout();
    } catch (e) {
      console.error('Error during logout:', e);
      return Promise.resolve();
    }
  }
  
  return Promise.resolve();
}

// Mark BFCache restoration safely
export function markBfCacheRestoration(): void {
  if (typeof window === 'undefined') return;
  
  // @ts-ignore - TokenManager is defined in window-auth.d.ts but TypeScript still complains
  if (window.TokenManager && typeof window.TokenManager.markBfCacheRestoration === 'function') {
    // @ts-ignore
    window.TokenManager.markBfCacheRestoration();
  }
}

/**
 * Helper to handle token refresh errors consistently
 * @param error The error message or object
 * @param returnPath The path to return to after authentication
 */
export function handleTokenRefreshError(error: any, returnPath?: string): void {
  if (typeof window === 'undefined') return;
  
  console.error('WindowAuth: Token refresh error:', error);
  
  // Convert error to string if it's an object
  const errorMessage = typeof error === 'object' 
    ? (error.message || error.error || JSON.stringify(error)) 
    : String(error);
  
  // Check if this is a token expiration
  const isExpiredError = 
    errorMessage.toLowerCase().includes('expired') || 
    errorMessage.toLowerCase().includes('invalid token');
  
  // Set cookie to indicate refresh needed
  document.cookie = `refreshNeeded=true; path=/; max-age=300`;
    // Store return path
  if (returnPath) {
    storeNavigationState(returnPath);
    sessionStorage.setItem('lastAuthenticatedPath', returnPath);
  }
  
  // Use the token-expired event for consistent handling
  if (typeof document !== 'undefined') {
    document.dispatchEvent(new CustomEvent('token-expired', {
      detail: {
        message: errorMessage,
        returnPath: returnPath || window.location.pathname
      }
    }));
  }
}

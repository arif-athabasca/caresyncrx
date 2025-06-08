/**
 * Token Storage Implementation
 * 
 * Provides a class-based implementation of token storage with singleton pattern
 * to avoid circular dependencies and ensure consistent token access.
 */

interface TokenData {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
}

/**
 * Class-based implementation of token storage
 */
class TokenStorageClass {
  private static instance: TokenStorageClass;
  private tokenData: TokenData = {
    accessToken: null,
    refreshToken: null,
    expiresAt: null
  };
  
  /**
   * Private constructor to prevent direct instantiation
   */
  private constructor() {
    // Initialize with stored tokens if available
    if (typeof window !== 'undefined') {
      this.loadTokensFromStorage();
    }
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): TokenStorageClass {
    if (!TokenStorageClass.instance) {
      TokenStorageClass.instance = new TokenStorageClass();
    }
    return TokenStorageClass.instance;
  }
  
  /**
   * Load tokens from storage (browser environment only)
   */
  private loadTokensFromStorage(): void {
    try {
      const storedAccessToken = localStorage.getItem('accessToken');
      const storedRefreshToken = localStorage.getItem('refreshToken');
      const storedExpiresAt = localStorage.getItem('expiresAt');
      
      if (storedAccessToken) {
        this.tokenData.accessToken = storedAccessToken;
      }
      
      if (storedRefreshToken) {
        this.tokenData.refreshToken = storedRefreshToken;
      }
      
      if (storedExpiresAt) {
        this.tokenData.expiresAt = parseInt(storedExpiresAt, 10);
      }
    } catch (error) {
      console.error('Failed to load tokens from storage:', error);
    }
  }
  
  /**
   * Store tokens in storage (browser environment only)
   */
  private saveTokensToStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        if (this.tokenData.accessToken) {
          localStorage.setItem('accessToken', this.tokenData.accessToken);
        } else {
          localStorage.removeItem('accessToken');
        }
        
        if (this.tokenData.refreshToken) {
          localStorage.setItem('refreshToken', this.tokenData.refreshToken);
        } else {
          localStorage.removeItem('refreshToken');
        }
        
        if (this.tokenData.expiresAt) {
          localStorage.setItem('expiresAt', this.tokenData.expiresAt.toString());
        } else {
          localStorage.removeItem('expiresAt');
        }
      }
    } catch (error) {
      console.error('Failed to save tokens to storage:', error);
    }
  }
  
  /**
   * Get the access token
   */
  public getAccessToken(): string | null {
    return this.tokenData.accessToken;
  }
  
  /**
   * Set the access token
   */
  public setAccessToken(token: string | null): void {
    this.tokenData.accessToken = token;
    this.saveTokensToStorage();
  }
  
  /**
   * Get the refresh token
   */
  public getRefreshToken(): string | null {
    return this.tokenData.refreshToken;
  }
  
  /**
   * Set the refresh token
   */
  public setRefreshToken(token: string | null): void {
    this.tokenData.refreshToken = token;
    this.saveTokensToStorage();
  }
  
  /**
   * Get the expiration timestamp
   */
  public getExpiresAt(): number | null {
    return this.tokenData.expiresAt;
  }
  
  /**
   * Set the expiration timestamp
   */
  public setExpiresAt(timestamp: number | null): void {
    this.tokenData.expiresAt = timestamp;
    this.saveTokensToStorage();
  }
  
  /**
   * Check if the access token is expired
   */
  public isTokenExpired(): boolean {
    const expiresAt = this.getExpiresAt();
    if (!expiresAt) return true;
    
    // Add a 30-second buffer to account for network latency
    return Date.now() >= (expiresAt - 30000);
  }
  
  /**
   * Check if the access token is expired
   * Alias for isTokenExpired for better readability in some contexts
   */
  public isAccessTokenExpired(): boolean {
    return this.isTokenExpired();
  }

  /**
   * Set all token data at once
   */
  public setTokens(accessToken: string | null, refreshToken: string | null, expiresAt: number | null): void {
    this.tokenData = {
      accessToken,
      refreshToken,
      expiresAt
    };
    this.saveTokensToStorage();
  }
  
  /**
   * Clear all tokens
   */
  public clearTokens(): void {
    this.tokenData = {
      accessToken: null,
      refreshToken: null,
      expiresAt: null
    };
    this.saveTokensToStorage();
  }
  
  /**
   * Validate the format of a token
   * Ensures the token is a non-empty string with the correct JWT structure
   * @param token The token to validate
   * @returns Whether the token has a valid format
   */
  public validateTokenFormat(token: string | null): boolean {
    // Check if the token is not null and is a string
    if (!token || typeof token !== 'string') {
      return false;
    }
    
    // Check if the token has a reasonable minimum length
    if (token.length < 20) {
      return false;
    }
    
    // Check if the token has the basic JWT structure (three parts separated by dots)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }
    
    // Check if each part is non-empty and contains valid base64 characters
    const validBase64Regex = /^[A-Za-z0-9_-]+$/;
    for (const part of parts) {
      if (!part || !validBase64Regex.test(part)) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Store navigation state for better back/forward navigation handling
   * @param path The current path including search params
   */
  public storeNavigationState(path: string): void {
    try {
      if (typeof sessionStorage === 'undefined') return;
      sessionStorage.setItem('lastNavigationPath', path);
      sessionStorage.setItem('lastNavigationTime', Date.now().toString());
    } catch (error) {
      console.error('Failed to store navigation state:', error);
    }
  }
    /**
   * Check if a token refresh is needed during navigation
   * Enhanced with additional heuristics and improved timing checks
   */
  public isRefreshNeededForNavigation(): boolean {
    try {
      // Check explicit cookie signal first (most reliable)
      if (typeof document !== 'undefined' && document.cookie.includes('refreshNeeded=true')) {
        console.log('Refresh needed: refreshNeeded cookie detected');
        return true;
      }
      
      // Check for x-needs-token-refresh header in local storage
      if (typeof localStorage !== 'undefined') {
        const needsRefresh = localStorage.getItem('needsTokenRefresh');
        if (needsRefresh) {
          const refreshTimestamp = parseInt(needsRefresh, 10);
          // Increased time window to 10 seconds to handle more navigation cases
          if (Date.now() - refreshTimestamp < 10000) {
            console.log('Refresh needed: needsTokenRefresh timestamp is recent');
            return true;
          }
        }
      }
      
      // Check for ongoing navigation that might need a refresh
      if (typeof sessionStorage !== 'undefined') {
        const lastNavTime = sessionStorage.getItem('lastNavTime');
        if (lastNavTime) {
          const navTimestamp = parseInt(lastNavTime, 10);
          // If navigation was very recent (within 2 seconds) and token is nearing expiry
          // This helps with rapid back/forward navigation
          if (Date.now() - navTimestamp < 2000) {
            const tokenTimestamp = this.getAccessTokenTimestamp();
            if (tokenTimestamp) {
              // If token is more than 80% through its lifetime, refresh preemptively
              const tokenAge = Date.now() - tokenTimestamp;
              const tokenLifetime = 1000 * 60 * 15; // 15 minutes in milliseconds
              if (tokenAge > (tokenLifetime * 0.8)) {
                console.log('Refresh needed: Recent navigation with aging token');
                return true;
              }
            }
          }
        }
      }
      
      // Finally, check if access token is definitely expired
      const isExpired = this.isTokenExpired();
      if (isExpired) {
        console.log('Refresh needed: Access token is expired');
      }
      return isExpired;
    } catch (e) {
      console.warn('Error checking if refresh needed for navigation:', e);
      return false;
    }
  }
  
  /**
   * Update the last activity timestamp for idle timeout tracking
   */
  public updateLastActivity(): void {
    try {
      const now = Date.now();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('lastActivity', now.toString());
      }
    } catch (error) {
      console.error('Failed to update last activity timestamp:', error);
    }
  }
  
  /**
   * Check if the session has timed out due to inactivity
   */
  public isSessionTimedOut(): boolean {
    try {
      if (typeof localStorage === 'undefined') return false;
      
      const lastActivityStr = localStorage.getItem('lastActivity');
      if (!lastActivityStr) return false;
      
      const lastActivity = parseInt(lastActivityStr, 10);
      const idleTimeoutMs = 30 * 60 * 1000; // 30 minutes by default
      
      return Date.now() - lastActivity > idleTimeoutMs;
    } catch (error) {
      console.error('Failed to check session timeout:', error);
      return false;
    }
  }
  
  /**
   * Get the device ID
   */
  public getDeviceId(): string | null {
    try {
      if (typeof localStorage === 'undefined') return null;
      return localStorage.getItem('deviceId');
    } catch (error) {
      console.error('Failed to get device ID from storage:', error);
      return null;
    }
  }
  
  /**
   * Set the device ID
   */
  public setDeviceId(deviceId: string): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('deviceId', deviceId);
      }
    } catch (error) {
      console.error('Failed to save device ID to storage:', error);
    }
  }

  /**
   * Get the access token timestamp (when it was created)
   */
  public getAccessTokenTimestamp(): number | null {
    try {
      if (typeof localStorage === 'undefined') return null;
      const timestamp = localStorage.getItem('accessTokenTimestamp');
      return timestamp ? parseInt(timestamp, 10) : null;
    } catch (error) {
      console.error('Failed to get access token timestamp:', error);
      return null;
    }
  }
  
  /**
   * Set the access token timestamp
   */
  public setAccessTokenTimestamp(timestamp: number): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('accessTokenTimestamp', timestamp.toString());
      }
    } catch (error) {
      console.error('Failed to save access token timestamp:', error);
    }
  }

  /**
   * Mark a refresh attempt as completed
   */
  public markRefreshComplete(): void {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('refreshInProgress');
      }
      
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('needsTokenRefresh');
      }
      
      // Clear any refresh needed cookie
      if (typeof document !== 'undefined') {
        document.cookie = 'refreshNeeded=; max-age=0; path=/;';
      }
    } catch (e) {
      console.warn('Error marking refresh complete:', e);
    }
  }
  
  /**
   * Clear all navigation state
   */
  public clearNavigationState(): void {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('lastNavPath');
        sessionStorage.removeItem('lastNavTime');
        sessionStorage.removeItem('navigationHistory');
        sessionStorage.removeItem('lastAuthenticatedPath');
        sessionStorage.removeItem('refreshInProgress');
      }
      
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('needsTokenRefresh');
      }
      
      // Clear refresh needed cookie
      if (typeof document !== 'undefined') {
        document.cookie = 'refreshNeeded=; max-age=0; path=/;';
      }
    } catch (e) {
      console.warn('Error clearing navigation state:', e);
    }
  }
  
  /**
   * Mark when page is restored from back-forward cache (bfcache)
   * This is important for proper token refresh handling
   */
  public markBfCacheRestoration(): void {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('bfCacheRestored', Date.now().toString());
      }
    } catch (e) {
      console.warn('Error marking bfcache restoration:', e);
    }
  }
  
  /**
   * Get the appropriate path to return to after authentication
   */
  public getReturnPath(): string | null {
    try {
      if (typeof sessionStorage === 'undefined') return null;
      
      // First check for explicitly stored authenticated path
      const lastAuthPath = sessionStorage.getItem('lastAuthenticatedPath');
      if (lastAuthPath) {
        console.log('Using explicitly stored authenticated path:', lastAuthPath);
        return lastAuthPath;
      }
      
      // Then check navigation history
      const navHistory = sessionStorage.getItem('navigationHistory');
      if (!navHistory) return null;
      
      interface NavHistoryEntry {
        path: string;
        timestamp: number;
        isAuthPath: boolean;
      }
      
      const history = JSON.parse(navHistory) as NavHistoryEntry[];
      if (!history.length) return null;
      
      // Find the most recent valid navigation within time window
      const now = Date.now();
      const NAV_TIME_WINDOW_MS = 60 * 1000; // 1 minute
      
      // Filter out login page and authentication-related paths
      const validPaths = history.filter((nav: NavHistoryEntry) => {
        return !nav.isAuthPath && (now - nav.timestamp < NAV_TIME_WINDOW_MS);
      });
      
      if (validPaths.length > 0) {
        // Get the most recent valid navigation
        const lastNav = validPaths[validPaths.length - 1];
        console.log('Using navigation history path:', lastNav.path);
        
        // Store this as the authenticated path for future use
        sessionStorage.setItem('lastAuthenticatedPath', lastNav.path);
        
        return lastNav.path;
      }
      
      // Fallback to dashboard if no valid path found
      return '/admin/dashboard';
    } catch (e) {
      console.warn('Error getting return path:', e);
      return null;
    }
  }
}

// Create the singleton instance
const tokenStorageInstance = TokenStorageClass.getInstance();

// Export the instance as TokenStorage
export const TokenStorage = tokenStorageInstance;
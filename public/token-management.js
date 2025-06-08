/**
 * Unified Token Management
 * 
 * A consolidated approach to token storage and management that ensures consistency
 * and prevents common issues like validation errors and redirect loops.
 */

(function() {
  if (typeof window === 'undefined') return;
  
  console.log('Initializing unified token management system...');
  
  // Create a global TokenManager namespace
  window.TokenManager = {
    // Storage keys
    KEYS: {
      ACCESS_TOKEN: 'accessToken',
      REFRESH_TOKEN: 'refreshToken',
      EXPIRES_AT: 'expiresAt',
      DEVICE_ID: 'deviceId',
      LAST_ACTIVITY: 'lastActivity',
      ACCESS_TOKEN_TIMESTAMP: 'accessTokenTimestamp'
    },
    
    // Session storage keys
    SESSION_KEYS: {
      REFRESH_IN_PROGRESS: 'refreshInProgress',
      LAST_NAV_PATH: 'lastNavPath',
      LAST_NAV_TIME: 'lastNavTime',
      BF_CACHE_RESTORED: 'bfCacheRestored',
      LAST_LOGIN_REDIRECT: 'lastLoginRedirect'
    },
    
    // Get token values
    getAccessToken: function() {
      try {
        return localStorage.getItem(this.KEYS.ACCESS_TOKEN);
      } catch (e) {
        console.error('Error getting access token:', e);
        return null;
      }
    },
    
    getRefreshToken: function() {
      try {
        return localStorage.getItem(this.KEYS.REFRESH_TOKEN);
      } catch (e) {
        console.error('Error getting refresh token:', e);
        return null;
      }
    },
    
    getExpiresAt: function() {
      try {
        const expiresAt = localStorage.getItem(this.KEYS.EXPIRES_AT);
        return expiresAt ? parseInt(expiresAt, 10) : null;
      } catch (e) {
        console.error('Error getting token expiration:', e);
        return null;
      }
    },
    
    getDeviceId: function() {
      try {
        return localStorage.getItem(this.KEYS.DEVICE_ID);
      } catch (e) {
        console.error('Error getting device ID:', e);
        return null;
      }
    },
    
    // Set token values
    setAccessToken: function(token) {
      if (!token) {
        localStorage.removeItem(this.KEYS.ACCESS_TOKEN);
        return;
      }
      
      try {
        localStorage.setItem(this.KEYS.ACCESS_TOKEN, token);
        localStorage.setItem(this.KEYS.ACCESS_TOKEN_TIMESTAMP, Date.now().toString());
      } catch (e) {
        console.error('Error setting access token:', e);
      }
    },
    
    setRefreshToken: function(token) {
      if (!token) {
        localStorage.removeItem(this.KEYS.REFRESH_TOKEN);
        return;
      }
      
      try {
        localStorage.setItem(this.KEYS.REFRESH_TOKEN, token);
      } catch (e) {
        console.error('Error setting refresh token:', e);
      }
    },
    
    setExpiresAt: function(timestamp) {
      if (!timestamp) {
        localStorage.removeItem(this.KEYS.EXPIRES_AT);
        return;
      }
      
      try {
        localStorage.setItem(this.KEYS.EXPIRES_AT, timestamp.toString());
      } catch (e) {
        console.error('Error setting token expiration:', e);
      }
    },
    
    setDeviceId: function(deviceId) {
      if (!deviceId) {
        localStorage.removeItem(this.KEYS.DEVICE_ID);
        return;
      }
      
      try {
        localStorage.setItem(this.KEYS.DEVICE_ID, deviceId);
      } catch (e) {
        console.error('Error setting device ID:', e);
      }
    },
    
    // Token operations
    setTokens: function(accessToken, refreshToken, expiresAt) {
      this.setAccessToken(accessToken);
      this.setRefreshToken(refreshToken);
      this.setExpiresAt(expiresAt);
      this.updateLastActivity();
    },
    
    clearTokens: function() {
      try {
        localStorage.removeItem(this.KEYS.ACCESS_TOKEN);
        localStorage.removeItem(this.KEYS.REFRESH_TOKEN);
        localStorage.removeItem(this.KEYS.EXPIRES_AT);
        localStorage.removeItem(this.KEYS.ACCESS_TOKEN_TIMESTAMP);
      } catch (e) {
        console.error('Error clearing tokens:', e);
      }
    },
    
    // Token validation
    isAccessTokenExpired: function() {
      try {
        const expiresAt = this.getExpiresAt();
        const accessToken = this.getAccessToken();
        
        // If there's no expiration time or access token, consider it expired
        if (!expiresAt || !accessToken) {
          return true;
        }
        
        // Add a 30-second buffer to account for network latency
        const now = Date.now();
        const bufferMs = 30 * 1000; // 30 seconds
        
        return now >= (expiresAt - bufferMs);
      } catch (e) {
        console.error('Error checking token expiration:', e);
        return true; // Assume expired on error
      }
    },
    
    validateTokenFormat: function(token) {
      try {
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
      } catch (e) {
        console.error('Error validating token format:', e);
        return false;
      }
    },
    
    // Navigation state management
    storeNavigationState: function(path) {
      try {
        if (typeof sessionStorage === 'undefined') return;
        
        sessionStorage.setItem(this.SESSION_KEYS.LAST_NAV_PATH, path);
        sessionStorage.setItem(this.SESSION_KEYS.LAST_NAV_TIME, Date.now().toString());
      } catch (e) {
        console.error('Error storing navigation state:', e);
      }
    },
    
    markBfCacheRestoration: function() {
      try {
        if (typeof sessionStorage === 'undefined') return;
        
        sessionStorage.setItem(this.SESSION_KEYS.BF_CACHE_RESTORED, Date.now().toString());
      } catch (e) {
        console.error('Error marking BF cache restoration:', e);
      }
    },
    
    // Activity tracking
    updateLastActivity: function() {
      try {
        localStorage.setItem(this.KEYS.LAST_ACTIVITY, Date.now().toString());
      } catch (e) {
        console.error('Error updating last activity:', e);
      }
    },
    
    // Refresh state management
    markRefreshInProgress: function() {
      try {
        if (typeof sessionStorage === 'undefined') return;
        
        sessionStorage.setItem(this.SESSION_KEYS.REFRESH_IN_PROGRESS, Date.now().toString());
      } catch (e) {
        console.error('Error marking refresh in progress:', e);
      }
    },
    
    clearRefreshInProgress: function() {
      try {
        if (typeof sessionStorage === 'undefined') return;
        
        sessionStorage.removeItem(this.SESSION_KEYS.REFRESH_IN_PROGRESS);
      } catch (e) {
        console.error('Error clearing refresh in progress:', e);
      }
    },
    
    isRefreshInProgress: function() {
      try {
        if (typeof sessionStorage === 'undefined') return false;
        
        const refreshInProgress = sessionStorage.getItem(this.SESSION_KEYS.REFRESH_IN_PROGRESS);
        if (!refreshInProgress) return false;
        
        const refreshStartTime = parseInt(refreshInProgress, 10);
        const now = Date.now();
        
        // If refresh started less than 5 seconds ago, consider it in progress
        return (now - refreshStartTime) < 5000;
      } catch (e) {
        console.error('Error checking if refresh is in progress:', e);
        return false;
      }
    },
    
    // Return path management
    getReturnPath: function() {
      try {
        if (typeof sessionStorage === 'undefined') return null;
        
        return sessionStorage.getItem(this.SESSION_KEYS.LAST_NAV_PATH) || '/dashboard';
      } catch (e) {
        console.error('Error getting return path:', e);
        return '/dashboard';
      }
    },
    
    // Login redirect management
    recordLoginRedirect: function() {
      try {
        if (typeof sessionStorage === 'undefined') return;
        
        sessionStorage.setItem(this.SESSION_KEYS.LAST_LOGIN_REDIRECT, Date.now().toString());
      } catch (e) {
        console.error('Error recording login redirect:', e);
      }
    },
    
    // Initialize the token management system
    init: function() {
      // Create backward compatibility with TokenStorage
      if (!window.TokenStorage) {
        window.TokenStorage = {};
      }
      
      // Map TokenManager methods to TokenStorage for backward compatibility
      const methods = [
        'getAccessToken', 'getRefreshToken', 'getExpiresAt', 'getDeviceId',
        'setAccessToken', 'setRefreshToken', 'setExpiresAt', 'setDeviceId',
        'setTokens', 'clearTokens', 'isAccessTokenExpired', 'validateTokenFormat',
        'storeNavigationState', 'updateLastActivity', 'markBfCacheRestoration'
      ];
      
      for (const method of methods) {
        if (typeof window.TokenStorage[method] !== 'function') {
          window.TokenStorage[method] = this[method].bind(this);
        }
      }
      
      // Alias isTokenExpired to isAccessTokenExpired for compatibility
      if (typeof window.TokenStorage.isTokenExpired !== 'function') {
        window.TokenStorage.isTokenExpired = this.isAccessTokenExpired.bind(this);
      }
      
      console.log('Unified token management system initialized successfully');
      
      return this;
    }
  };
  
  // Initialize the token management system
  window.TokenManager.init();
})();

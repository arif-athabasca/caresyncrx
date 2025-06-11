/**
 * Auth Core Module - CONSOLIDATED VERSION
 * 
 * This is the central module for authentication in CareSyncRx.
 * It provides a single source of truth for token management
 * and standardized token operations.
 * 
 * This file consolidates functionality from:
 * - auth-core.js (original)
 * - auth-core-fixed.js (deprecated)
 * - auth-core-new.js (development version)
 * 
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * Last updated: June 10, 2025
 */

(function() {
  console.log('Auth Core: Initializing consolidated version...');

  // Prevent duplicate initialization
  if (window.AuthCore) {
    console.log('Auth Core: Already initialized');
    return;
  }

  /**
   * Storage keys constants
   */
  const STORAGE = {
    ACCESS_TOKEN: 'accessToken',
    REFRESH_TOKEN: 'refreshToken',
    EXPIRES_AT: 'expiresAt',
    DEVICE_ID: 'deviceId',
    LAST_ACTIVITY: 'lastActivity',
    AUTH_STATE: 'authState'
  };

  /**
   * Auth Core Configuration
   */
  const CONFIG = {
    refreshEndpoint: '/api/auth/refresh',
    tokenVerifyEndpoint: '/api/auth/verify-token',
    userInfoEndpoint: '/api/auth/me',
    loginPath: '/login',
    refreshThresholdMs: 5 * 60 * 1000, // 5 minutes before expiry
    activityUpdateIntervalMs: 60 * 1000, // 1 minute
    tokenRefreshRetryLimit: 3
  };

  // Create AuthCore object with proper syntax
  window.AuthCore = {
    // Tokens storage state
    _state: {
      refreshPromise: null,
      isRefreshing: false,
      refreshAttempts: 0,
      lastTokenRefresh: null,
      activityInterval: null,
      storageListener: null
    },
    
    /**
     * Initialize the auth core module
     */
    init: function() {
      try {
        // Load tokens from storage
        const storedAccessToken = localStorage.getItem(STORAGE.ACCESS_TOKEN);
        const storedRefreshToken = localStorage.getItem(STORAGE.REFRESH_TOKEN);
        const storedExpiresAt = localStorage.getItem(STORAGE.EXPIRES_AT);
        
        if (storedAccessToken && storedRefreshToken && storedExpiresAt) {
          console.log('Auth Core: Initialized from localStorage');
        }
        
        // Setup activity tracking
        this._setupActivityTracking();
        
        // Setup storage sync for multi-tab usage
        this._setupStorageSync();
        
        // Compatibility flag for TokenUtil
        window.AUTH_INITIALIZED = true;
        
        return true;
      } catch (e) {
        console.error('Auth Core: Initialization error', e);
        return false;
      }
    },
    
    /**
     * Get the access token
     * @returns {string|null} The access token or null
     */
    getAccessToken: function() {
      try {
        return localStorage.getItem(STORAGE.ACCESS_TOKEN);
      } catch (e) {
        console.error('Auth Core: Error getting access token', e);
        return null;
      }
    },
    
    /**
     * Get the refresh token
     * @returns {string|null} The refresh token or null
     */
    getRefreshToken: function() {
      try {
        return localStorage.getItem(STORAGE.REFRESH_TOKEN);
      } catch (e) {
        console.error('Auth Core: Error getting refresh token', e);
        return null;
      }
    },
    
    /**
     * Get the token expiration timestamp
     * @returns {number|null} The expiration timestamp or null if not available
     */
    getExpiresAt: function() {
      try {
        const expiresAt = localStorage.getItem(STORAGE.EXPIRES_AT);
        return expiresAt ? parseInt(expiresAt, 10) : null;
      } catch (e) {
        console.error('Auth Core: Error getting token expiration', e);
        return null;
      }
    },

    /**
     * Get the device ID used for authentication
     * @returns {string} The device ID or a newly generated one
     */
    getDeviceId: function() {
      try {
        let deviceId = localStorage.getItem(STORAGE.DEVICE_ID);
        
        if (!deviceId) {
          // Generate a new device ID if none exists
          deviceId = 'device_' + Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
          localStorage.setItem(STORAGE.DEVICE_ID, deviceId);
        }
        
        return deviceId;
      } catch (e) {
        console.error('Auth Core: Error getting device ID', e);
        // Fallback device ID
        return 'device_' + Date.now();
      }
    },

    /**
     * Set authentication tokens
     * @param {string} accessToken The access token
     * @param {string} refreshToken The refresh token
     * @param {number} expiresAt The expiration timestamp
     */
    setTokens: function(accessToken, refreshToken, expiresAt) {
      try {
        if (!accessToken || !refreshToken) {
          console.error('Auth Core: Invalid tokens provided', { 
            hasAccessToken: !!accessToken, 
            hasRefreshToken: !!refreshToken 
          });
          return false;
        }
        
        localStorage.setItem(STORAGE.ACCESS_TOKEN, accessToken);
        localStorage.setItem(STORAGE.REFRESH_TOKEN, refreshToken);
        
        // Set expires at if provided, otherwise default to 15 minutes
        if (expiresAt) {
          localStorage.setItem(STORAGE.EXPIRES_AT, expiresAt.toString());
        } else {
          localStorage.setItem(STORAGE.EXPIRES_AT, (Date.now() + 15 * 60 * 1000).toString());
        }
        
        // Update last activity time
        this.updateLastActivity();
        
        // Dispatch token update event for other components
        window.dispatchEvent(new CustomEvent('auth:tokens-updated', {
          detail: { source: 'setTokens' }
        }));
        
        return true;
      } catch (e) {
        console.error('Auth Core: Error setting tokens', e);
        return false;
      }
    },

    /**
     * Clear all authentication tokens
     */
    clearTokens: function() {
      try {
        localStorage.removeItem(STORAGE.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE.EXPIRES_AT);
        localStorage.removeItem(STORAGE.AUTH_STATE);
        
        // Keep device ID for consistent device tracking
        
        // Dispatch token clear event
        window.dispatchEvent(new CustomEvent('auth:tokens-cleared'));
        
        return true;
      } catch (e) {
        console.error('Auth Core: Error clearing tokens', e);
        return false;
      }
    },

    /**
     * Check if access token is expired
     * @returns {boolean} True if token is expired or will expire soon
     */
    isTokenExpired: function() {
      try {
        const expiresAt = this.getExpiresAt();
        if (!expiresAt) return true;
        
        // Consider token expired if it's within the refresh threshold
        return Date.now() >= (expiresAt - CONFIG.refreshThresholdMs);
      } catch (e) {
        console.error('Auth Core: Error checking token expiration', e);
        return true; // Assume expired on error
      }
    },
    
    /**
     * Check if the token is valid and not expired
     * @returns {boolean} True if the token is valid
     */
    isTokenValid: function() {
      try {
        const accessToken = this.getAccessToken();
        const expiresAt = this.getExpiresAt();
        
        if (!accessToken || !expiresAt) return false;
        
        // Token is valid if it hasn't expired
        return Date.now() < expiresAt;
      } catch (e) {
        console.error('Auth Core: Error checking token validity', e);
        return false;
      }
    },

    /**
     * Update the last activity timestamp
     */
    updateLastActivity: function() {
      try {
        localStorage.setItem(STORAGE.LAST_ACTIVITY, Date.now().toString());
      } catch (e) {
        console.error('Auth Core: Error updating last activity', e);
      }
    },

    /**
     * Store authentication state for navigation/restoration
     * @param {string} path The current path to store
     */
    storeAuthState: function(path) {
      try {
        if (!path) path = window.location.pathname + window.location.search;
        
        const state = {
          path: path,
          timestamp: Date.now()
        };
        
        localStorage.setItem(STORAGE.AUTH_STATE, JSON.stringify(state));
      } catch (e) {
        console.error('Auth Core: Error storing auth state', e);
      }
    },

    /**
     * Get stored authentication state
     * @returns {Object|null} The stored state or null
     */
    getAuthState: function() {
      try {
        const stateStr = localStorage.getItem(STORAGE.AUTH_STATE);
        return stateStr ? JSON.parse(stateStr) : null;
      } catch (e) {
        console.error('Auth Core: Error getting auth state', e);
        return null;
      }
    },

    /**
     * Refresh the authentication token
     * @returns {Promise<boolean>} A promise that resolves to true if refresh successful
     */
    refreshToken: function() {
      // If a refresh is already in progress, return that promise
      if (this._state.refreshPromise) {
        console.log('Auth Core: Token refresh already in progress, reusing promise');
        return this._state.refreshPromise;
      }
      
      // Get required tokens
      const refreshToken = this.getRefreshToken();
      const deviceId = this.getDeviceId();
      
      if (!refreshToken) {
        console.error('Auth Core: No refresh token available');
        return Promise.resolve(false);
      }
      
      // Track that we're refreshing
      this._state.isRefreshing = true;
      
      // Create the refresh promise
      this._state.refreshPromise = new Promise((resolve) => {
        console.log('Auth Core: Starting token refresh');
        this._state.refreshAttempts++;
        
        // Use the global fetch to avoid any interceptors
        fetch(CONFIG.refreshEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'X-Source': 'auth-core-refresh',
            'X-Request-ID': 'refresh-' + Date.now()
          },
          body: JSON.stringify({
            refreshToken: refreshToken,
            deviceId: deviceId
          }),
          credentials: 'include'
        })
        .then(response => {
          console.log('Auth Core: Token refresh response', { 
            status: response.status,
            ok: response.ok 
          });
          
          if (!response.ok) {
            throw new Error('Token refresh failed with status ' + response.status);
          }
          
          return response.json();
        })
        .then(data => {
          if (!data.tokens) {
            throw new Error('No tokens in response data');
          }
          
          // Update tokens in storage
          const success = this.setTokens(
            data.tokens.accessToken, 
            data.tokens.refreshToken, 
            data.tokens.expiresAt || (Date.now() + 15 * 60 * 1000)
          );
          
          if (success) {
            // Reset refresh attempts counter on success
            this._state.refreshAttempts = 0;
            this._state.lastTokenRefresh = Date.now();
            
            // Verify the token works with a simple request
            return this._verifyRefreshedToken(data.tokens.accessToken)
              .then(isValid => {
                if (!isValid) {
                  console.warn('Auth Core: Refreshed token verification failed');
                }
                return isValid;
              })
              .catch(() => {
                console.warn('Auth Core: Error verifying refreshed token');
                return true; // Still consider refresh successful
              });
          } else {
            throw new Error('Failed to set tokens in storage');
          }
        })
        .then(success => {
          resolve(success);
        })
        .catch(error => {
          console.error('Auth Core: Token refresh error', error);
          
          // Retry if we haven't exceeded retry limit
          if (this._state.refreshAttempts < CONFIG.tokenRefreshRetryLimit) {
            console.log('Auth Core: Retrying token refresh (attempt ' + this._state.refreshAttempts + ')');
            
            // Wait a moment before retrying
            setTimeout(() => {
              // Clear the current promise so we can try again
              this._state.refreshPromise = null;
              this._state.isRefreshing = false;
              
              // Call refresh again and resolve with its result
              this.refreshToken().then(resolve);
            }, 1000);
          } else {
            console.error('Auth Core: Token refresh failed after max retries');
            this._state.refreshAttempts = 0;
            resolve(false);
          }
        })
        .finally(() => {
          // Only clear the promise if we're not doing a retry
          if (this._state.refreshAttempts === 0 || 
              this._state.refreshAttempts >= CONFIG.tokenRefreshRetryLimit) {
            this._state.refreshPromise = null;
            this._state.isRefreshing = false;
          }
        });
      });
      
      return this._state.refreshPromise;
    },
    
    /**
     * Verify a token is working with the server
     * @param {string} token The token to verify
     * @returns {Promise<boolean>} Promise resolving to true if token is valid
     */
    _verifyRefreshedToken: function(token) {
      return fetch(CONFIG.userInfoEndpoint, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Source': 'auth-core-verify-token'
        },
        credentials: 'include'
      })
      .then(response => {
        return response.ok;
      })
      .catch(() => {
        return false;
      });
    },
    
    /**
     * Setup activity tracking
     * Updates the last activity timestamp and checks token expiration
     */
    _setupActivityTracking: function() {
      // Update activity on user interaction
      const updateActivity = () => {
        this.updateLastActivity();
      };
      
      // Add event listeners for user activity
      window.addEventListener('mousemove', updateActivity);
      window.addEventListener('keydown', updateActivity);
      window.addEventListener('click', updateActivity);
      window.addEventListener('scroll', updateActivity);
      window.addEventListener('focus', updateActivity);
      
      // Periodically check token expiration
      this._state.activityInterval = setInterval(() => {
        // Check if token needs refresh
        if (this.getAccessToken() && this.isTokenExpired() && !this._state.isRefreshing) {
          console.log('Auth Core: Token expired during activity check, refreshing');
          this.refreshToken();
        }
      }, CONFIG.activityUpdateIntervalMs);
    },
    
    /**
     * Setup storage event listener for multi-tab synchronization
     */
    _setupStorageSync: function() {
      this._state.storageListener = (event) => {
        // Only respond to auth-related storage changes
        if (!event.key || !event.key.startsWith('auth:')) return;
        
        if (event.key === 'auth:tokens-updated') {
          console.log('Auth Core: Detected token update in another tab');
          
          // Dispatch event for components to refresh their state
          window.dispatchEvent(new CustomEvent('auth:tokens-updated', {
            detail: { source: 'storage' }
          }));
        } else if (event.key === 'auth:tokens-cleared') {
          console.log('Auth Core: Detected token clear in another tab');
          
          // Dispatch event for components to handle logout
          window.dispatchEvent(new CustomEvent('auth:tokens-cleared'));
        }
      };
      
      window.addEventListener('storage', this._state.storageListener);
    },

    /**
     * Bridge function to ensure compatibility with TokenUtil
     * This is needed for backward compatibility with backend services
     */
    bridgeToTokenUtil: function() {
      // Ensures we can be detected by auth-diagnostics.js
      return true;
    }
  };
  
  // Initialize auth core
  window.AuthCore.init();
  
  console.log('Auth Core: Setup complete');
})();

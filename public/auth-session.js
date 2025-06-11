/**
 * Auth Session Manager
 * 
 * Manages user sessions, handles login/logout flows,
 * and provides session persistence across page navigations.
 * 
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 */

(function() {
  console.log('Auth Session Manager: Initializing...');
  
  // Ensure AuthCore is available
  if (!window.AuthCore) {
    console.error('Auth Session Manager: AuthCore not found! Make sure auth-core.js is loaded first.');
    return;
  }
  
  // Prevent duplicate initialization
  if (window.AuthSession) {
    console.log('Auth Session Manager: Already initialized');
    return;
  }
  
  /**
   * Session Storage Keys
   */
  const SESSION_KEYS = {
    USER: 'auth:user',
    SESSION_ID: 'auth:sessionId',
    LAST_PATH: 'auth:lastPath',
    LOGIN_REDIRECT: 'auth:loginRedirect',
    SESSION_START: 'auth:sessionStart',
    SESSION_EXPIRES: 'auth:sessionExpires'
  };
  
  /**
   * Configuration
   */
  const CONFIG = {
    loginPath: '/login',
    logoutPath: '/api/auth/logout',
    userInfoPath: '/api/auth/me',
    sessionCheckInterval: 60 * 1000, // 1 minute
    sessionMaxInactivity: 30 * 60 * 1000, // 30 minutes
    redirectThrottleTime: 5000, // 5 seconds
    criticalPaths: [
      '/admin/triage/new',
      '/api/admin/triage'
    ]
  };
  
  /**
   * Auth Session Manager
   */
  window.AuthSession = {
    // Track internal state
    _state: {
      initialized: false,
      user: null,
      sessionInterval: null,
      lastRedirectTime: 0,
      loginRedirectPending: false,
      sessionCheckFailures: 0
    },
    
    /**
     * Initialize the session manager
     */
    init: function() {
      if (this._state.initialized) return;
      
      // Try to load the user from session storage
      this._loadUser();
      
      // Set up session check interval
      this._setupSessionCheck();
      
      // Set up auth event listeners
      this._setupAuthListeners();
      
      // Set up navigation tracking
      this._setupNavigationTracking();
      
      this._state.initialized = true;
      console.log('Auth Session Manager: Initialized');
      
      // Start with a session check
      this._checkSession();
        return this;
    },
    
    /**
     * Check current session validity
     */
    _checkSession: function() {
      try {
        // Load user from session storage
        this._loadUser();
        
        // If we have a user, check token validity
        if (this._state.user) {
          const tokenValid = !!window.AuthCore.getAccessToken() && !window.AuthCore.isTokenExpired();
          
          if (!tokenValid) {
            console.log('Auth Session Manager: Token invalid during initial session check');
            
            // Try to refresh token
            window.AuthCore.refreshToken()
              .then(refreshSuccess => {
                if (!refreshSuccess) {
                  console.warn('Auth Session Manager: Token refresh failed during initial session check');
                  // Clear invalid session
                  this.clearUser();
                }
              })
              .catch(error => {
                console.error('Auth Session Manager: Error during token refresh in session check', error);
                this.clearUser();
              });
          } else {
            console.log('Auth Session Manager: Session check passed - user is authenticated');
          }
        } else {
          console.log('Auth Session Manager: No user found in session storage');
        }
      } catch (error) {
        console.error('Auth Session Manager: Error during session check', error);
      }
    },
    
    /**
     * Get the current user
     * @returns {Object|null} The user object or null if not logged in
     */
    getUser: function() {
      return this._state.user;
    },
    
    /**
     * Check if the user is authenticated
     * @returns {boolean} True if the user is authenticated
     */
    isAuthenticated: function() {
      return !!this._state.user && !!window.AuthCore.getAccessToken();
    },
    
    /**
     * Load user data from API
     * @returns {Promise<Object|null>} The user data
     */
    loadUser: async function() {
      try {
        const accessToken = await window.AuthCore.getAccessToken();
        
        if (!accessToken) {
          console.log('Auth Session Manager: No access token available for user load');
          this.clearUser();
          return null;
        }
        
        const response = await fetch(CONFIG.userInfoPath, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          credentials: 'include'
        });
        
        if (!response.ok) {
          console.warn(`Auth Session Manager: User info request failed with status ${response.status}`);
          
          if (response.status === 401) {
            console.log('Auth Session Manager: Unauthorized response from user info endpoint');
            this.clearUser();
            return null;
          }
          
          // For other errors, keep the current user if we have one
          return this._state.user;
        }
        
        const userData = await response.json();
        
        if (userData && userData.id) {
          this._state.user = userData;
          this._saveUser(userData);
          return userData;
        } else {
          console.warn('Auth Session Manager: Invalid user data received');
          this.clearUser();
          return null;
        }
      } catch (error) {
        console.error('Auth Session Manager: Error loading user', error);
        
        // Network errors shouldn't clear the user
        if (error.message && error.message.includes('network')) {
          return this._state.user;
        }
        
        this.clearUser();
        return null;
      }
    },
    
    /**
     * Save the user data to session storage
     * @param {Object} user The user data
     * @private
     */
    _saveUser: function(user) {
      try {
        sessionStorage.setItem(SESSION_KEYS.USER, JSON.stringify(user));
        
        // Set session start time if not already set
        if (!sessionStorage.getItem(SESSION_KEYS.SESSION_START)) {
          sessionStorage.setItem(SESSION_KEYS.SESSION_START, Date.now().toString());
        }
        
        // Update session expiry
        this._updateSessionExpiry();
        
        // Generate a session ID if needed
        if (!sessionStorage.getItem(SESSION_KEYS.SESSION_ID)) {
          const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2);
          sessionStorage.setItem(SESSION_KEYS.SESSION_ID, sessionId);
        }
      } catch (e) {
        console.error('Auth Session Manager: Error saving user', e);
      }
    },
    
    /**
     * Load the user data from session storage
     * @private
     */
    _loadUser: function() {
      try {
        const userJson = sessionStorage.getItem(SESSION_KEYS.USER);
        if (userJson) {
          const user = JSON.parse(userJson);
          this._state.user = user;
          console.log('Auth Session Manager: Loaded user from session storage');
        }
      } catch (e) {
        console.error('Auth Session Manager: Error loading user from session storage', e);
        this.clearUser();
      }
    },
    
    /**
     * Clear the user data
     */
    clearUser: function() {
      this._state.user = null;
      
      try {
        sessionStorage.removeItem(SESSION_KEYS.USER);
        console.log('Auth Session Manager: User cleared');
      } catch (e) {
        console.error('Auth Session Manager: Error clearing user', e);
      }
    },
    
    /**
     * Update the session expiry time
     * @private
     */
    _updateSessionExpiry: function() {
      try {
        // Session expires after inactivity period
        const expiryTime = Date.now() + CONFIG.sessionMaxInactivity;
        sessionStorage.setItem(SESSION_KEYS.SESSION_EXPIRES, expiryTime.toString());
      } catch (e) {
        console.error('Auth Session Manager: Error updating session expiry', e);
      }
    },
    
    /**
     * Store the login redirect path
     * @param {string} path The path to redirect to after login
     */
    storeLoginRedirect: function(path) {
      try {
        sessionStorage.setItem(SESSION_KEYS.LOGIN_REDIRECT, path);
      } catch (e) {
        console.error('Auth Session Manager: Error storing login redirect', e);
      }
    },
    
    /**
     * Get the stored login redirect path
     * @returns {string|null} The redirect path or null
     */
    getLoginRedirect: function() {
      try {
        return sessionStorage.getItem(SESSION_KEYS.LOGIN_REDIRECT);
      } catch (e) {
        console.error('Auth Session Manager: Error getting login redirect', e);
        return null;
      }
    },
    
    /**
     * Clear the stored login redirect
     */    clearLoginRedirect: function() {
      try {
        sessionStorage.removeItem(SESSION_KEYS.LOGIN_REDIRECT);
      } catch (e) {
        console.error('Auth Session Manager: Error clearing login redirect', e);
      }
    },
    
    /**
     * Set the current user
     * @param {Object} user The user object
     */
    setUser: function(user) {
      if (!user) {
        this.clearUser();
        return;
      }
      
      this._state.user = user;
      
      try {
        // Store in session storage
        sessionStorage.setItem(SESSION_KEYS.USER, JSON.stringify(user));
        
        // Generate a session ID if none exists
        if (!sessionStorage.getItem(SESSION_KEYS.SESSION_ID)) {
          const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
          sessionStorage.setItem(SESSION_KEYS.SESSION_ID, sessionId);
        }
        
        // Set session start time if not set
        if (!sessionStorage.getItem(SESSION_KEYS.SESSION_START)) {
          sessionStorage.setItem(SESSION_KEYS.SESSION_START, Date.now().toString());
        }
        
        // Update session expiry
        this._updateSessionExpiry();
        
        // Dispatch user updated event
        window.dispatchEvent(new CustomEvent('auth:user-updated', {
          detail: { user }
        }));
      } catch (e) {
        console.error('Auth Session Manager: Error setting user', e);
      }
    },
    
    /**
     * Log the user out
     * @returns {Promise<boolean>} Promise resolving to true if logout successful
     */
    logout: function() {
      return new Promise((resolve) => {
        console.log('Auth Session Manager: Logging out user');
        
        // Clear auth tokens first
        window.AuthCore.clearTokens();
        
        // Clear user
        this.clearUser();
        
        // Clear session data
        try {
          sessionStorage.removeItem(SESSION_KEYS.SESSION_ID);
          sessionStorage.removeItem(SESSION_KEYS.SESSION_START);
          sessionStorage.removeItem(SESSION_KEYS.SESSION_EXPIRES);
        } catch (e) {
          console.error('Auth Session Manager: Error clearing session data', e);
        }
        
        // Call logout API if available
        fetch(CONFIG.logoutPath, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        .then(() => {
          console.log('Auth Session Manager: Logout API call successful');
          resolve(true);
        })
        .catch(error => {
          console.error('Auth Session Manager: Error calling logout API', error);
          resolve(true); // Still consider logout successful
        });
      });
    },
    
    /**
     * Store the current path for post-login redirect
     * @param {string} path The path to redirect to after login
     */
    storeLoginRedirect: function(path) {
      try {
        if (!path) path = window.location.pathname + window.location.search;
        
        // Don't store login page as redirect
        if (path.includes(CONFIG.loginPath)) return;
        
        sessionStorage.setItem(SESSION_KEYS.LOGIN_REDIRECT, path);
        console.log('Auth Session Manager: Stored login redirect path', path);
      } catch (e) {
        console.error('Auth Session Manager: Error storing login redirect', e);
      }
    },
    
    /**
     * Get the stored login redirect path
     * @returns {string|null} The path or null if none stored
     */
    getLoginRedirect: function() {
      try {
        return sessionStorage.getItem(SESSION_KEYS.LOGIN_REDIRECT);
      } catch (e) {
        console.error('Auth Session Manager: Error getting login redirect', e);
        return null;
      }
    },
    
    /**
     * Clear the stored login redirect
     */
    clearLoginRedirect: function() {
      try {
        sessionStorage.removeItem(SESSION_KEYS.LOGIN_REDIRECT);
      } catch (e) {
        console.error('Auth Session Manager: Error clearing login redirect', e);
      }
    },
    
    /**
     * Redirect to login page
     * @param {string} returnPath Optional path to return to after login
     */
    redirectToLogin: function(returnPath) {
      const currentTime = Date.now();
      
      // Throttle redirects to prevent loops
      if (currentTime - this._state.lastRedirectTime < CONFIG.redirectThrottleTime) {
        console.log('Auth Session Manager: Login redirect throttled to prevent loops');
        return;
      }
      
      // Store the return path
      if (returnPath) {
        this.storeLoginRedirect(returnPath);
      } else {
        this.storeLoginRedirect(window.location.pathname + window.location.search);
      }
      
      // Set redirect flag
      this._state.loginRedirectPending = true;
      this._state.lastRedirectTime = currentTime;
      
      // Build redirect URL
      const redirectUrl = `${CONFIG.loginPath}?t=${currentTime}`;
      
      console.log('Auth Session Manager: Redirecting to login', redirectUrl);
      window.location.href = redirectUrl;
    },
    
    /**
     * Check if the current session is valid
     * @returns {boolean} True if the session is valid
     */
    isSessionValid: function() {
      try {
        // Check if we have a user and tokens
        if (!this._state.user || !window.AuthCore.getAccessToken()) {
          return false;
        }
        
        // Check session expiry
        const sessionExpires = sessionStorage.getItem(SESSION_KEYS.SESSION_EXPIRES);
        if (!sessionExpires) return false;
        
        return Date.now() < parseInt(sessionExpires, 10);
      } catch (e) {
        console.error('Auth Session Manager: Error checking session validity', e);
        return false;
      }
    },
    
    /**
     * Update the session expiry time
     */
    _updateSessionExpiry: function() {
      try {
        const expiryTime = Date.now() + CONFIG.sessionMaxInactivity;
        sessionStorage.setItem(SESSION_KEYS.SESSION_EXPIRES, expiryTime.toString());
      } catch (e) {
        console.error('Auth Session Manager: Error updating session expiry', e);
      }
    },
    
    /**
     * Load the user from session storage
     */
    _loadUser: function() {
      try {
        const userStr = sessionStorage.getItem(SESSION_KEYS.USER);
        if (userStr) {
          this._state.user = JSON.parse(userStr);
          console.log('Auth Session Manager: Loaded user from session storage');
        }
      } catch (e) {
        console.error('Auth Session Manager: Error loading user from session storage', e);
      }
    },
    
    /**
     * Set up session check interval
     */
    _setupSessionCheck: function() {
      this._state.sessionInterval = setInterval(() => {
        // Only check if we have a user
        if (this._state.user) {
          // Check token validity
          const tokenValid = !!window.AuthCore.getAccessToken() && !window.AuthCore.isTokenExpired();
          
          if (!tokenValid) {
            console.log('Auth Session Manager: Token invalid during session check');
            
            // Try to refresh token
            window.AuthCore.refreshToken()
              .then(refreshSuccess => {
                if (!refreshSuccess) {
                  console.warn('Auth Session Manager: Token refresh failed during session check');
                  
                  // Token refresh failed, clear user and redirect to login
                  this.clearUser();
                  
                  // Redirect to login if we're not already there and not already redirecting
                  if (!window.location.pathname.includes(CONFIG.loginPath) && 
                      !this._state.loginRedirectPending) {
                    this.redirectToLogin();
                  }
                }
              });
          }
          
          // Update session expiry
          this._updateSessionExpiry();
        }
      }, CONFIG.sessionCheckInterval);
    },
    
    /**
     * Set up auth event listeners
     */
    _setupAuthListeners: function() {
      // Listen for token updates
      window.addEventListener('auth:tokens-updated', () => {
        // If we have tokens but no user, try to fetch user
        if (window.AuthCore.getAccessToken() && !this._state.user) {
          this._fetchCurrentUser();
        }
      });
      
      // Listen for token clear
      window.addEventListener('auth:tokens-cleared', () => {
        // Clear user when tokens are cleared
        this.clearUser();
      });
      
      // Listen for auth errors
      window.addEventListener('auth:error', (event) => {
        console.warn('Auth Session Manager: Auth error event', event.detail);
        
        // Handle fatal auth errors
        if (event.detail.status === 401 || event.detail.message.includes('Authentication failed')) {
          // Clear user
          this.clearUser();
          
          // Redirect to login if we're not already there and not already redirecting
          if (!window.location.pathname.includes(CONFIG.loginPath) && 
              !this._state.loginRedirectPending) {
            this.redirectToLogin();
          }
        }
      });
    },
    
    /**
     * Set up navigation tracking
     */
    _setupNavigationTracking: function() {
      // Track page visibility changes
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          // Page became visible, check session and token
          if (this._state.user && window.AuthCore.isTokenExpired()) {
            console.log('Auth Session Manager: Token expired on page visibility change');
            window.AuthCore.refreshToken();
          }
        }
      });
      
      // Track page show events (back/forward cache)
      window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
          console.log('Auth Session Manager: Page restored from back/forward cache');
          
          // Check tokens on restoration
          if (this._state.user && window.AuthCore.isTokenExpired()) {
            console.log('Auth Session Manager: Token expired on page restoration');
            window.AuthCore.refreshToken();
          }
        }
      });
      
      // Track navigation events to update last path
      window.addEventListener('beforeunload', () => {
        try {
          // Store current path
          const currentPath = window.location.pathname + window.location.search;
          sessionStorage.setItem(SESSION_KEYS.LAST_PATH, currentPath);
        } catch (e) {
          console.error('Auth Session Manager: Error storing last path', e);
        }
      });
    },
    
    /**
     * Fetch the current user from the API
     * @returns {Promise<Object|null>} Promise resolving to user object or null
     */
    _fetchCurrentUser: function() {
      // Only fetch if we have a token
      if (!window.AuthCore.getAccessToken()) {
        return Promise.resolve(null);
      }
      
      return fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch user: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data && data.user) {
          this.setUser(data.user);
          return data.user;
        }
        return null;
      })
      .catch(error => {
        console.error('Auth Session Manager: Error fetching current user', error);
        return null;
      });
    }
  };
  
  // Initialize session manager
  window.AuthSession.init();
  
  console.log('Auth Session Manager: Setup complete');
})();

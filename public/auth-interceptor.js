/**
 * Auth Request Interceptor
 * 
 * Intercepts all fetch requests and adds authentication tokens
 * when needed. Handles token refresh and auth error recovery.
 * 
 * This is a robust implementation with:
 * - Single refresh operation tracking with promise chaining
 * - Proper 401 response handling with retry logic
 * - Comprehensive error handling
 * - Diagnostics for troubleshooting
 * 
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 */

(function() {
  console.log('Auth Request Interceptor: Initializing...');
  
  // Ensure AuthCore is available
  if (!window.AuthCore) {
    console.error('Auth Request Interceptor: AuthCore not found! Make sure auth-core.js is loaded first.');
    return;
  }
  
  // Prevent duplicate initialization
  if (window.AuthInterceptor) {
    console.log('Auth Request Interceptor: Already initialized');
    return;
  }
  
  // Save reference to the original fetch
  const originalFetch = window.fetch;
  
  // Track stats for monitoring
  const stats = {
    requestsIntercepted: 0,
    tokensApplied: 0,
    refreshesTriggered: 0,
    authErrors: 0,
    successfulRequests: 0,
    failedRequests: 0,
    retriesAttempted: 0,
    retriesSuccessful: 0,
    lastRequestTime: null
  };
  
  /**
   * Configuration
   */
  const CONFIG = {
    // Paths that always require authentication
    authenticatedPaths: [
      '/api/auth/me',
      '/api/admin/',
      '/admin/',
      '/dashboard',
      '/api/user/'
    ],
    
    // Paths that should be excluded from authentication
    excludedPaths: [
      '/api/auth/login',
      '/api/auth/register',
      '/login',
      '/register',
      '/reset-password',
      '/forgot-password',
      '/api/health'
    ],
    
    // Routes that have experienced auth issues and need special handling
    sensitiveRoutes: [
      { path: '/admin/triage/new', name: 'New Triage Page', priority: 'critical' },
      { path: '/api/admin/triage', name: 'Triage API', priority: 'high' },
      { path: '/api/auth/me', name: 'User Info API', priority: 'high' }
    ],
    
    // Maximum number of retry attempts after token refresh
    maxRetryAttempts: 2,
    
    // Retry delay in milliseconds
    retryDelayMs: 300
  };
  
  /**
   * Auth Interceptor API
   */
  window.AuthInterceptor = {
    stats: stats,
    
    /**
     * Check if a URL requires authentication
     * @param {string} url The URL to check
     * @returns {boolean} True if the URL requires authentication
     */
    requiresAuthentication: function(url) {
      try {
        // Skip checking non-string URLs
        if (typeof url !== 'string') return false;
        
        // Check excluded paths first
        for (const excludedPath of CONFIG.excludedPaths) {
          if (url.includes(excludedPath)) {
            return false;
          }
        }
        
        // Check authenticated paths
        for (const authPath of CONFIG.authenticatedPaths) {
          if (url.includes(authPath)) {
            return true;
          }
        }
        
        // Default to requiring auth for internal API paths
        if (url.includes('/api/') && !url.includes('/api/public/')) {
          return true;
        }
        
        // Check for admin paths
        if (url.includes('/admin/')) {
          return true;
        }
        
        return false;
      } catch (e) {
        console.error('Auth Interceptor: Error checking if URL requires authentication', e);
        return false;
      }
    },
    
    /**
     * Check if a URL is a sensitive route that needs special handling
     * @param {string} url The URL to check
     * @returns {Object|null} The sensitive route info or null
     */
    isSensitiveRoute: function(url) {
      try {
        // Skip checking non-string URLs
        if (typeof url !== 'string') return null;
        
        // Check for known sensitive routes
        for (const route of CONFIG.sensitiveRoutes) {
          if (url.includes(route.path)) {
            return route;
          }
        }
        
        return null;
      } catch (e) {
        console.error('Auth Interceptor: Error checking for sensitive route', e);
        return null;
      }
    },
    
    /**
     * Retry a failed request with a fresh token
     * 
     * @param {string|Request} resource The resource to fetch
     * @param {Object} options The fetch options
     * @param {string} freshToken The fresh token to use
     * @returns {Promise<Response>} The fetch response
     */
    retryRequestWithFreshToken: function(resource, options = {}, freshToken) {
      stats.retriesAttempted++;
      
      // Clone options to avoid modifying the original
      const newOptions = { ...options };
      
      // Ensure headers object exists
      newOptions.headers = newOptions.headers || {};
      
      // Convert Headers object to plain object if needed
      if (newOptions.headers instanceof Headers) {
        const plainHeaders = {};
        for (const [key, value] of newOptions.headers.entries()) {
          plainHeaders[key] = value;
        }
        newOptions.headers = plainHeaders;
      }
      
      // Set the fresh token
      newOptions.headers['Authorization'] = `Bearer ${freshToken}`;
      
      // Add retry marker to avoid infinite retry loops
      newOptions.headers['X-Auth-Retry'] = 'true';
      
      console.log('Auth Interceptor: Retrying request with fresh token');
      
      // Make the request with the original fetch
      return originalFetch(resource, newOptions)
        .then(response => {
          if (response.ok) {
            stats.retriesSuccessful++;
          }
          return response;
        });
    },
    
    /**
     * Get the current statistics
     * @returns {Object} The current stats
     */
    getStats: function() {
      return { ...stats };
    },
    
    /**
     * Reset the statistics
     */
    resetStats: function() {
      stats.requestsIntercepted = 0;
      stats.tokensApplied = 0;
      stats.refreshesTriggered = 0;
      stats.authErrors = 0;
      stats.successfulRequests = 0;
      stats.failedRequests = 0;
      stats.retriesAttempted = 0;
      stats.retriesSuccessful = 0;
    }
  };
  
  /**
   * The intercepted fetch function
   */
  window.fetch = async function(resource, options = {}) {
    stats.requestsIntercepted++;
    stats.lastRequestTime = Date.now();
    
    // Handle Request objects or non-string resources
    if (resource instanceof Request || typeof resource !== 'string') {
      return originalFetch.apply(this, arguments);
    }
    
    // Get the URL
    const url = resource;
    
    // Check if the request needs authentication
    const needsAuth = window.AuthInterceptor.requiresAuthentication(url);
    const sensitiveRoute = window.AuthInterceptor.isSensitiveRoute(url);
    
    // Skip authentication for non-auth URLs
    if (!needsAuth) {
      return originalFetch.apply(this, arguments);
    }
    
    // Get access token - this will handle refresh if token is expired
    try {
      // Check if we have a valid token or need to refresh
      let accessToken = null;
      
      // If it's a sensitive route, we need to be extra careful
      if (sensitiveRoute && sensitiveRoute.priority === 'critical') {
        // For critical routes, always get a fresh token with auto-refresh
        accessToken = await window.AuthCore.getAccessToken(true);
        
        // If we still don't have a token after potential refresh, this is serious
        if (!accessToken) {
          console.error(`Auth Interceptor: No valid token available for critical route ${sensitiveRoute.name}`);
          stats.authErrors++;
          
          // Dispatch a critical auth error event
          window.dispatchEvent(new CustomEvent('auth:critical-error', {
            detail: {
              message: 'Authentication failed for critical route',
              url: url,
              route: sensitiveRoute
            }
          }));
          
          // Try one last forced refresh
          try {
            const forcedRefresh = await window.AuthCore.refreshToken();
            if (forcedRefresh) {
              accessToken = window.AuthCore.getAccessToken();
            }
          } catch (e) {
            console.error('Auth Interceptor: Forced refresh failed for critical route', e);
          }
        }
      } else {
        // Standard token acquisition with auto-refresh
        accessToken = await window.AuthCore.getAccessToken(true);
      }
      
      // If we have a token, add it to the request
      if (accessToken) {
        // Initialize headers if needed
        options.headers = options.headers || {};
        
        // Convert Headers object to plain object if needed
        if (options.headers instanceof Headers) {
          const plainHeaders = {};
          for (const [key, value] of options.headers.entries()) {
            plainHeaders[key] = value;
          }
          options.headers = plainHeaders;
        }
        
        // Add the token to the request
        options.headers['Authorization'] = `Bearer ${accessToken}`;
        
        // Ensure credentials are included
        options.credentials = 'include';
        
        stats.tokensApplied++;
      } else if (needsAuth) {
        // No token available for an authenticated request
        console.warn(`Auth Interceptor: No token available for authenticated request to ${url}`);
        stats.authErrors++;
        
        // Dispatch auth error event
        window.dispatchEvent(new CustomEvent('auth:error', {
          detail: {
            message: 'No authentication token available',
            url: url
          }
        }));
      }
    } catch (tokenError) {
      console.error('Auth Interceptor: Error getting access token', tokenError);
      stats.authErrors++;
    }
    
    try {
      // Make the request with any auth headers added
      const response = await originalFetch(resource, options);
      
      // Check for auth errors in the response
      if (response.status === 401) {
        console.warn(`Auth Interceptor: Received 401 Unauthorized response from ${url}`);
        stats.authErrors++;
        stats.failedRequests++;
        
        // Check if we've already retried - look for the X-Auth-Retry header
        const hasRetried = options.headers && options.headers['X-Auth-Retry'] === 'true';
        
        if (!hasRetried) {
          console.log('Auth Interceptor: Attempting token refresh after 401 response');
          stats.refreshesTriggered++;
          
          try {
            // Force token refresh
            const refreshSuccess = await window.AuthCore.refreshToken();
            
            if (refreshSuccess) {
              // Get fresh token
              const freshToken = window.AuthCore.getAccessToken();
              
              if (freshToken) {
                // Retry the request with the new token
                return window.AuthInterceptor.retryRequestWithFreshToken(resource, options, freshToken);
              }
            }
            
            // If we get here, refresh failed or we couldn't get a fresh token
            console.error('Auth Interceptor: Token refresh failed, cannot retry request');
            
            // Dispatch auth error
            window.dispatchEvent(new CustomEvent('auth:error', {
              detail: {
                message: 'Authentication failed after token refresh',
                url: url,
                status: 401
              }
            }));
          } catch (refreshError) {
            console.error('Auth Interceptor: Error refreshing token after 401', refreshError);
            
            // Dispatch auth error
            window.dispatchEvent(new CustomEvent('auth:error', {
              detail: {
                message: 'Error during token refresh',
                url: url,
                error: refreshError.message
              }
            }));
          }
        } else {
          // We already tried refreshing, this is a terminal auth failure
          console.error('Auth Interceptor: Request failed even after token refresh');
          
          // Dispatch severe auth error event for the application to handle
          window.dispatchEvent(new CustomEvent('auth:fatal-error', {
            detail: {
              message: 'Authentication failed even after token refresh',
              url: url,
              status: 401
            }
          }));
        }
      } else {
        // Non-401 response is considered successful for auth
        stats.successfulRequests++;
      }
      
      return response;
    } catch (error) {
      console.error(`Auth Interceptor: Fetch error for ${url}`, error);
      stats.failedRequests++;
      
      // Check if it's a network error for an authenticated endpoint
      if (error.message && error.message.includes('network') && needsAuth) {
        // Dispatch network error event
        window.dispatchEvent(new CustomEvent('auth:network-error', {
          detail: {
            message: 'Network error during authenticated request',
            url: url,
            error: error.message
          }
        }));
      }
      
      throw error;
    }
  };
  
  // Set up event listeners for auth events
  window.addEventListener('auth:tokens-updated', function(event) {
    console.log('Auth Interceptor: Tokens updated', event.detail ? { source: event.detail.source } : '');
  });
  
  window.addEventListener('auth:tokens-cleared', function() {
    console.log('Auth Interceptor: Tokens cleared');
  });
  
  // Register with AuthCore if it has an event system
  if (window.AuthCore.on) {
    window.AuthCore.on('tokensChanged', function(data) {
      console.log('Auth Interceptor: Tokens changed event received');
    });
    
    window.AuthCore.on('tokensCleared', function() {
      console.log('Auth Interceptor: Tokens cleared event received');
    });
  }
  
  // Periodically log stats if there's activity
  setInterval(function() {
    if (stats.requestsIntercepted > 0) {
      // Only log if there's been a request in the last hour
      if (stats.lastRequestTime && (Date.now() - stats.lastRequestTime) < 3600000) {
        console.log('Auth Interceptor Stats:', {
          intercepted: stats.requestsIntercepted,
          tokensApplied: stats.tokensApplied,
          refreshes: stats.refreshesTriggered,
          authErrors: stats.authErrors,
          successRate: Math.round((stats.successfulRequests / stats.requestsIntercepted) * 100) + '%',
          retries: {
            attempted: stats.retriesAttempted,
            successful: stats.retriesSuccessful
          }
        });
      }
    }
  }, 60000); // Log every minute
  
  console.log('Auth Request Interceptor: Initialized');
})();
    /**
   * Auth Interceptor API
   */
  window.AuthInterceptor = {
    stats: stats,
    
    /**
     * Check if a URL requires authentication
     * @param {string} url The URL to check
     * @returns {boolean} True if the URL requires authentication
     */
    requiresAuthentication: function(url) {
      try {
        // Skip checking non-string URLs
        if (typeof url !== 'string') return false;
        
        // Check excluded paths first
        for (const excludedPath of CONFIG.excludedPaths) {
          if (url.includes(excludedPath)) {
            return false;
          }
        }
        
        // Check authenticated paths
        for (const authPath of CONFIG.authenticatedPaths) {
          if (url.includes(authPath)) {
            return true;
          }
        }
        
        // Default to requiring auth for internal API paths
        if (url.includes('/api/') && !url.includes('/api/public/')) {
          return true;
        }
        
        // Check for admin paths
        if (url.includes('/admin/')) {
          return true;
        }
        
        return false;
      } catch (e) {
        console.error('Auth Interceptor: Error checking if URL requires authentication', e);
        return false;
      }
    },
    
    /**
     * Check if a URL is a sensitive route that needs special handling
     * @param {string} url The URL to check
     * @returns {Object|null} The sensitive route info or null
     */
    isSensitiveRoute: function(url) {
      try {
        // Skip checking non-string URLs
        if (typeof url !== 'string') return null;
        
        // Check for known sensitive routes
        for (const route of CONFIG.sensitiveRoutes) {
          if (url.includes(route.path)) {
            return route;
          }
        }
        
        return null;
      } catch (e) {
        console.error('Auth Interceptor: Error checking for sensitive route', e);
        return null;
      }
    },
    
    /**
     * Retry a failed request with a fresh token
     * 
     * @param {string|Request} resource The resource to fetch
     * @param {Object} options The fetch options
     * @param {string} freshToken The fresh token to use
     * @returns {Promise<Response>} The fetch response
     */
    retryRequestWithFreshToken: function(resource, options = {}, freshToken) {
      stats.retriesAttempted++;
      
      // Clone options to avoid modifying the original
      const newOptions = { ...options };
      
      // Ensure headers object exists
      newOptions.headers = newOptions.headers || {};
      
      // Convert Headers object to plain object if needed
      if (newOptions.headers instanceof Headers) {
        const plainHeaders = {};
        for (const [key, value] of newOptions.headers.entries()) {
          plainHeaders[key] = value;
        }
        newOptions.headers = plainHeaders;
      }
      
      // Set the fresh token
      newOptions.headers['Authorization'] = `Bearer ${freshToken}`;
      
      // Add retry marker to avoid infinite retry loops
      newOptions.headers['X-Auth-Retry'] = 'true';
      
      console.log('Auth Interceptor: Retrying request with fresh token');
      
      // Make the request with the original fetch
      return originalFetch(resource, newOptions)
        .then(response => {
          if (response.ok) {
            stats.retriesSuccessful++;
          }
          return response;
        });
    },
    
    /**
     * Get the current statistics
     * @returns {Object} The current stats
     */
    getStats: function() {
      return { ...stats };
    },
    
    /**
     * Reset the statistics
     */
    resetStats: function() {
      stats.requestsIntercepted = 0;
      stats.tokensApplied = 0;
      stats.refreshesTriggered = 0;
      stats.authErrors = 0;
      stats.successfulRequests = 0;
      stats.failedRequests = 0;
      stats.retriesAttempted = 0;
      stats.retriesSuccessful = 0;
    }
  };

  // Check if a URL requires authentication
  window.AuthInterceptor._requiresAuth = function(url) {
    try {
        if (url.startsWith('/api/') || url.includes('/api/')) {
          return true;
        }
        
        return false;
      } catch (e) {
        console.error('Auth Interceptor: Error checking auth requirement', e);
        return false;
      }
    },
    
    /**
     * Check if a URL is a sensitive route that needs special handling
     * @param {string} url The URL to check
     * @returns {Object|null} The sensitive route or null
     */
    isSensitiveRoute: function(url) {
      try {
        if (typeof url !== 'string') return null;
        
        // Try to normalize the URL
        let normalizedUrl = url;
        if (url.startsWith('/')) {
          normalizedUrl = new URL(url, window.location.origin).pathname;
        } else if (url.includes('://')) {
          normalizedUrl = new URL(url).pathname;
        }
        
        // Check if it matches any sensitive routes
        for (const route of CONFIG.sensitiveRoutes) {
          if (normalizedUrl.includes(route.path)) {
            return route;
          }
        }
        
        return null;
      } catch (e) {
        console.error('Auth Interceptor: Error checking sensitive route', e);
        return null;
      }
    },
    
    /**
     * Get auth statistics
     * @returns {Object} The current stats
     */
    getStats: function() {
      return { ...stats };
    },
    
    /**
     * Reset the stats counters
     */
    resetStats: function() {
      stats.requestsIntercepted = 0;
      stats.tokensApplied = 0;
      stats.refreshesTriggered = 0;
      stats.authErrors = 0;
      stats.successfulRequests = 0;
      stats.failedRequests = 0;
    }
  };
  
  /**
   * The intercepted fetch function
   */
  window.fetch = async function(resource, options = {}) {
    stats.requestsIntercepted++;
    
    // Handle Request objects or non-string resources
    if (resource instanceof Request || typeof resource !== 'string') {
      return originalFetch.apply(this, arguments);
    }
    
    // Get the URL
    const url = resource;
    
    // Check if the request needs authentication
    const needsAuth = window.AuthInterceptor.requiresAuthentication(url);
    const sensitiveRoute = window.AuthInterceptor.isSensitiveRoute(url);
    
    // Skip authentication for non-auth URLs
    if (!needsAuth) {
      return originalFetch.apply(this, arguments);
    }
    
    // Check if we need to refresh the token
    const tokenExpired = window.AuthCore.isTokenExpired();
    if (tokenExpired) {
      try {
        console.log(`Auth Interceptor: Token expired, refreshing before request to ${url}`);
        stats.refreshesTriggered++;
        
        // Wait for token refresh to complete
        const refreshSuccess = await window.AuthCore.refreshToken();
        
        if (!refreshSuccess) {
          console.error(`Auth Interceptor: Token refresh failed for request to ${url}`);
          stats.authErrors++;
          
          // If this is a sensitive route, we need to handle the failure carefully
          if (sensitiveRoute) {
            console.warn(`Auth Interceptor: Sensitive route ${sensitiveRoute.name} with failed token refresh`);
            
            // Dispatch an auth error event for the application to handle
            window.dispatchEvent(new CustomEvent('auth:error', {
              detail: {
                message: 'Failed to refresh authentication token',
                url: url,
                sensitiveRoute: sensitiveRoute
              }
            }));
          }
        }
      } catch (e) {
        console.error('Auth Interceptor: Error during token refresh', e);
        stats.authErrors++;
      }
    }
    
    // Get access token from AuthCore
    const accessToken = window.AuthCore.getAccessToken();
    
    // If we have a token, add it to the request
    if (accessToken) {
      // Initialize headers if needed
      options.headers = options.headers || {};
      
      // Convert Headers object to plain object if needed
      if (options.headers instanceof Headers) {
        const plainHeaders = {};
        for (const [key, value] of options.headers.entries()) {
          plainHeaders[key] = value;
        }
        options.headers = plainHeaders;
      }
      
      // Add the token to the request
      options.headers['Authorization'] = `Bearer ${accessToken}`;
      
      // Ensure credentials are included
      options.credentials = 'include';
      
      stats.tokensApplied++;
    } else if (needsAuth) {
      // No token available for an authenticated request
      console.warn(`Auth Interceptor: No token available for authenticated request to ${url}`);
      stats.authErrors++;
      
      // Dispatch auth error event
      window.dispatchEvent(new CustomEvent('auth:error', {
        detail: {
          message: 'No authentication token available',
          url: url
        }
      }));
    }
    
    try {
      // Make the request with any auth headers added
      const response = await originalFetch(resource, options);
      
      // Check for auth errors in the response
      if (response.status === 401) {
        console.warn(`Auth Interceptor: Received 401 Unauthorized response from ${url}`);
        stats.authErrors++;
        stats.failedRequests++;
        
        // Try to refresh the token only if we haven't just refreshed it
        if (!tokenExpired) {
          console.log('Auth Interceptor: Attempting token refresh after 401 response');
          
          try {
            const refreshSuccess = await window.AuthCore.refreshToken();
            
            if (refreshSuccess) {
              // Get fresh token
              const freshToken = window.AuthCore.getAccessToken();
              
              if (freshToken) {
                // Clone options and update the token
                const newOptions = { ...options };
                newOptions.headers = { ...options.headers };
                newOptions.headers['Authorization'] = `Bearer ${freshToken}`;
                
                console.log('Auth Interceptor: Retrying request with fresh token');
                
                // Retry the request with the new token
                return originalFetch(resource, newOptions);
              }
            } else {
              // Token refresh failed, dispatch auth error
              window.dispatchEvent(new CustomEvent('auth:error', {
                detail: {
                  message: 'Authentication failed after token refresh',
                  url: url,
                  status: 401
                }
              }));
            }
          } catch (refreshError) {
            console.error('Auth Interceptor: Error refreshing token after 401', refreshError);
            
            // Dispatch auth error
            window.dispatchEvent(new CustomEvent('auth:error', {
              detail: {
                message: 'Error during token refresh',
                url: url,
                error: refreshError.message
              }
            }));
          }
        } else {
          // We already tried refreshing, dispatch auth error
          window.dispatchEvent(new CustomEvent('auth:error', {
            detail: {
              message: 'Authentication failed even after token refresh',
              url: url,
              status: 401
            }
          }));
        }
      } else {
        // Non-401 response is considered successful
        stats.successfulRequests++;
      }
      
      return response;
    } catch (error) {
      console.error(`Auth Interceptor: Fetch error for ${url}`, error);
      stats.failedRequests++;
      
      // Check if it's a network error for an authenticated endpoint
      if (error.message && error.message.includes('network') && needsAuth) {
        stats.authErrors++;
        
        // Dispatch network error event
        window.dispatchEvent(new CustomEvent('auth:network-error', {
          detail: {
            message: 'Network error during authenticated request',
            url: url,
            error: error.message
          }
        }));
      }
      
      throw error;
    }
  };
  
  // Set up event listeners for auth events
  window.addEventListener('auth:tokens-updated', function(event) {
    console.log('Auth Interceptor: Tokens updated', event.detail);
  });
  
  window.addEventListener('auth:tokens-cleared', function() {
    console.log('Auth Interceptor: Tokens cleared');
  });
  
  // Periodically log stats
  setInterval(function() {
    if (stats.requestsIntercepted > 0) {
      console.log('Auth Interceptor Stats:', {
        intercepted: stats.requestsIntercepted,
        tokensApplied: stats.tokensApplied,
        refreshes: stats.refreshesTriggered,
        authErrors: stats.authErrors,
        successRate: Math.round((stats.successfulRequests / stats.requestsIntercepted) * 100) + '%'
      });
    }
  }, 60000); // Log every minute
  
  console.log('Auth Request Interceptor: Initialized');
})();

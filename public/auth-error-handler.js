/**
 * Auth Error Handler
 * 
 * This script provides global error handling for authentication-related errors.
 * It captures token validation errors, network issues, and API errors,
 * providing consistent error handling and recovery.
 */

(function() {
  if (typeof window === 'undefined') return;
  
  console.log('Auth error handler initializing...');
  
  window.AuthErrorHandler = {
    // Configuration
    config: {
      errorTypes: {
        tokenValidation: [
          'validateTokenFormat',
          'TokenStorage',
          'is not a function'
        ],
        authorization: [
          'Token refresh failed',
          'Refresh token has expired',
          '401',
          'Unauthorized'
        ]
      }
    },
    
    // Handle global errors
    handleGlobalError: function(event) {
      const errorMsg = event.message || '';
      
      // Check if the error is auth-related
      if (this.isAuthError(errorMsg)) {
        console.log('Auth error detected:', errorMsg);
        
        // Clear tokens on auth errors
        TokenManager.clearTokens();
        
        // Redirect to login
        if (window.AuthNavigation) {
          window.AuthNavigation.redirectToLogin();
        }
      }
    },
    
    // Check if an error is auth-related
    isAuthError: function(errorMsg) {
      // Check token validation errors
      for (const pattern of this.config.errorTypes.tokenValidation) {
        if (errorMsg.includes(pattern)) {
          return true;
        }
      }
      
      // Check authorization errors
      for (const pattern of this.config.errorTypes.authorization) {
        if (errorMsg.includes(pattern)) {
          return true;
        }
      }
      
      return false;
    },
    
    // Handle XHR response errors
    setupXhrInterceptor: function() {
      const originalOpen = XMLHttpRequest.prototype.open;
      const self = this;
      
      XMLHttpRequest.prototype.open = function() {
        // Store the original onreadystatechange
        const originalOnReadyStateChange = this.onreadystatechange;
        
        // Override onreadystatechange
        this.onreadystatechange = function() {
          if (this.readyState === 4) {
            // Check for 401 Unauthorized responses
            if (this.status === 401) {
              console.log('XHR received 401 response, handling auth error');
              
              // Check if response indicates token expiration
              let isTokenIssue = false;
              
              try {
                const responseText = this.responseText;
                isTokenIssue = 
                  responseText.includes('token') || 
                  responseText.includes('expired') || 
                  responseText.includes('auth');
              } catch (e) {
                // If we can't check the response, assume it might be a token issue
                isTokenIssue = true;
              }
              
              if (isTokenIssue) {
                console.log('XHR 401 response appears to be token-related');
                
                // Dispatch a token expired event
                document.dispatchEvent(new CustomEvent('token-expired', {
                  detail: {
                    message: 'XHR request returned 401 Unauthorized',
                    returnPath: window.location.pathname + window.location.search
                  }
                }));
              }
            }
          }
          
          // Call the original onreadystatechange
          if (originalOnReadyStateChange) {
            originalOnReadyStateChange.apply(this, arguments);
          }
        };
        
        // Call the original open method
        originalOpen.apply(this, arguments);
      };
    },
    
    // Handle fetch API errors
    setupFetchInterceptor: function() {
      if (!window.fetch) return;
      
      // Store the original fetch function
      const originalFetch = window.fetch;
      const self = this;
      
      // Override fetch
      window.fetch = async function(input, init) {
        try {
          // Call the original fetch
          const response = await originalFetch.apply(this, arguments);
          
          // Check for 401 responses
          if (response.status === 401 && !input.toString().includes('/api/auth/')) {
            console.log('Fetch received 401 response, handling auth error');
            
            // Clone the response to allow reading it multiple times
            const clone = response.clone();
            
            try {
              // Try to parse the response as JSON
              const data = await clone.json();
              
              // Check if response indicates token expiration
              if (data.error && (
                data.error.includes('token') || 
                data.error.includes('expired') || 
                data.error.includes('auth')
              )) {
                console.log('Fetch 401 response appears to be token-related:', data.error);
                
                // Dispatch a token expired event
                document.dispatchEvent(new CustomEvent('token-expired', {
                  detail: {
                    message: data.error || 'Fetch request returned 401 Unauthorized',
                    returnPath: window.location.pathname + window.location.search
                  }
                }));
              }
            } catch (e) {
              // If we can't parse the response, just continue
              console.warn('Could not parse 401 response as JSON:', e);
            }
          }
          
          return response;
        } catch (error) {
          // Handle network errors
          console.error('Fetch error:', error);
          
          // If it's a network error during an auth request, trigger auth error handling
          if (error.message?.includes('network') && 
              input.toString().includes('/api/auth/')) {
            document.dispatchEvent(new CustomEvent('token-expired', {
              detail: {
                message: 'Network error during authentication request',
                returnPath: window.location.pathname + window.location.search
              }
            }));
          }
          
          throw error;
        }
      };
    },
    
    // Handle token expiration events
    handleTokenExpired: function(event) {
      console.log('Token expired event received:', event.detail);
      
      // Clear tokens
      TokenManager.clearTokens();
      
      // Redirect to login
      if (window.AuthNavigation) {
        window.AuthNavigation.redirectToLogin();
      }
    },
    
    // Initialize the error handler
    init: function() {
      // Set up event listeners
      window.addEventListener('error', this.handleGlobalError.bind(this));
      document.addEventListener('token-expired', this.handleTokenExpired.bind(this));
      
      // Set up XHR interceptor
      this.setupXhrInterceptor();
      
      // Set up fetch interceptor
      this.setupFetchInterceptor();
      
      console.log('Auth error handler initialized');
      
      return this;
    }
  };
  
  // Initialize the error handler
  window.AuthErrorHandler.init();
})();

/**
 * Auth Logout Handler
 * 
 * This script provides a clean logout implementation that ensures
 * all tokens are properly cleared and the user is redirected to login.
 */

(function() {
  if (typeof window === 'undefined') return;
  
  console.log('Auth logout handler initializing...');
  
  window.AuthLogout = {
    // Configuration
    config: {
      logoutEndpoint: '/api/auth/logout',
      loginPath: '/login'
    },
    
    // Perform logout
    logout: async function() {
      console.log('Logging out...');
      
      try {
        // Get refresh token for server-side invalidation
        const refreshToken = TokenManager ? 
          TokenManager.getRefreshToken() : 
          localStorage.getItem('refreshToken');
        
        // Call logout endpoint
        await fetch(this.config.logoutEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          body: JSON.stringify({
            refreshToken: refreshToken
          }),
          credentials: 'include'
        });
      } catch (error) {
        console.error('Logout error:', error);
        // Continue with client-side logout even if server request fails
      }
      
      // Clear tokens
      if (TokenManager) {
        TokenManager.clearTokens();
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('expiresAt');
        localStorage.removeItem('deviceId');
        localStorage.removeItem('accessTokenTimestamp');
        localStorage.removeItem('lastActivity');
      }
      
      // Clear session storage
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('refreshInProgress');
        sessionStorage.removeItem('lastNavPath');
        sessionStorage.removeItem('lastNavTime');
        sessionStorage.removeItem('bfCacheRestored');
      }
      
      // Redirect to login with timestamp to prevent caching
      const timestamp = Date.now();
      const redirectUrl = `${this.config.loginPath}?t=${timestamp}`;
      
      console.log(`Logout complete, redirecting to: ${redirectUrl}`);
      window.location.href = redirectUrl;
    },
    
    // Initialize the logout handler
    init: function() {
      // Expose global logout function
      window.performLogout = this.logout.bind(this);
      
      console.log('Auth logout handler initialized');
      
      return this;
    }
  };
  
  // Initialize the logout handler
  window.AuthLogout.init();
})();

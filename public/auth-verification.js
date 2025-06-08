/**
 * Auth Verification
 * 
 * This script verifies the user's authentication status and redirects
 * to the login page if needed. It runs on page load for protected pages.
 */

(function() {
  if (typeof window === 'undefined') return;
  
  console.log('Auth verification initializing...');
  
  window.AuthVerification = {
    // Configuration
    config: {
      authEndpoint: '/api/auth/me',
      loginPath: '/login',
      publicPaths: ['/login', '/register', '/', '/forgot-password', '/reset-password'],      bypassPaths: [
        '/auth-integration-test.html',
        '/health-check.html'
      ]
    },
    
    // Check if the current path is public (doesn't require authentication)
    isPublicPath: function(path) {
      if (!path) path = window.location.pathname;
      
      // Check if the path is in bypass paths
      for (const bypassPath of this.config.bypassPaths) {
        if (path.includes(bypassPath)) {
          return true;
        }
      }
      
      // Check if the path starts with any of the public paths
      return this.config.publicPaths.some(publicPath => 
        path === publicPath || 
        path.startsWith(`${publicPath}/`) ||
        path.includes('/public/')
      );
    },
    
    // Verify authentication status
    verifyAuth: async function() {
      // Skip verification on public pages
      if (this.isPublicPath()) {
        console.log('Skipping auth verification on public page');
        return;
      }
      
      console.log('Verifying authentication status...');
      
      // Check for access token
      const accessToken = TokenManager.getAccessToken();
      const refreshToken = TokenManager.getRefreshToken();
      
      if (!accessToken || !refreshToken) {
        console.log('No tokens found, redirecting to login');
        this.redirectToLogin();
        return;
      }
      
      // Check if access token is expired
      if (TokenManager.isAccessTokenExpired()) {
        console.log('Access token expired, attempting refresh');
        
        // Try to refresh the token
        if (window.AuthNavigation) {
          try {
            await window.AuthNavigation.refreshToken();
          } catch (error) {
            console.error('Token refresh failed during verification:', error);
            this.redirectToLogin();
            return;
          }
        } else {
          console.log('AuthNavigation not available, redirecting to login');
          this.redirectToLogin();
          return;
        }
      }
      
      // Verify with the server
      try {
        const response = await fetch(this.config.authEndpoint, {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (!response.ok) {
          console.log('Authentication verification failed, redirecting to login');
          this.redirectToLogin();
          return;
        }
        
        const data = await response.json();
        console.log('Authentication verified successfully');
        
        // Update last activity timestamp
        TokenManager.updateLastActivity();
      } catch (error) {
        console.error('Authentication verification error:', error);
        
        // Only redirect on auth errors, not network errors
        if (error.message?.includes('Unauthorized') || 
            error.message?.includes('401')) {
          this.redirectToLogin();
        }
      }
    },
    
    // Redirect to login
    redirectToLogin: function() {
      // Skip if already on login page
      if (window.location.pathname.includes(this.config.loginPath)) {
        return;
      }
      
      // Throttle redirects to prevent loops
      if (this.isRedirectThrottled()) {
        console.log('Login redirect throttled to prevent loops');
        return;
      }
      
      // Record the redirect
      if (TokenManager) {
        TokenManager.recordLoginRedirect();
      }
      
      // Clear tokens
      if (TokenManager) {
        TokenManager.clearTokens();
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('expiresAt');
      }
      
      // Get the current path for return after login
      const currentPath = window.location.pathname + window.location.search;
      
      // Build the redirect URL with timestamp to prevent caching
      const timestamp = Date.now();
      const redirectUrl = `${this.config.loginPath}?redirect=${encodeURIComponent(currentPath)}&t=${timestamp}`;
      
      // Redirect to login
      console.log(`Redirecting to login: ${redirectUrl}`);
      window.location.href = redirectUrl;
    },
    
    // Check if redirects are being throttled
    isRedirectThrottled: function() {
      try {
        if (typeof sessionStorage === 'undefined') return false;
        
        const lastRedirect = sessionStorage.getItem('lastLoginRedirect');
        if (!lastRedirect) return false;
        
        const lastRedirectTime = parseInt(lastRedirect, 10);
        const now = Date.now();
        
        // Throttle redirects that happen within 5 seconds
        return (now - lastRedirectTime) < 5000;
      } catch (e) {
        console.error('Error checking redirect throttle:', e);
        return false;
      }
    },
    
    // Initialize the verification
    init: function() {
      // Wait for the DOM to be loaded
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', this.verifyAuth.bind(this));
      } else {
        this.verifyAuth();
      }
      
      console.log('Auth verification initialized');
      
      return this;
    }
  };
  
  // Initialize the verification
  window.AuthVerification.init();
})();

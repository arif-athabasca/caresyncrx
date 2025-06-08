/**
 * Auth Navigation Handler
 * 
 * This script handles authentication-related navigation and browser history events.
 * It ensures proper token refresh and session persistence during navigation.
 */

(function() {
  if (typeof window === 'undefined') return;
  
  console.log('Auth navigation handler initializing...');
  
  window.AuthNavigation = {
    // Configuration
    config: {
      refreshEndpoint: '/api/auth/refresh',
      loginPath: '/login',
      publicPaths: ['/login', '/register', '/', '/forgot-password', '/reset-password'],
      tokenRefreshThresholdMs: 2 * 60 * 1000 // Refresh tokens 2 minutes before expiry
    },
    
    // Check if the current path is public (doesn't require authentication)
    isPublicPath: function(path) {
      if (!path) path = window.location.pathname;
      
      // Check if the path starts with any of the public paths
      return this.config.publicPaths.some(publicPath => 
        path === publicPath || 
        path.startsWith(`${publicPath}/`) ||
        path.includes('/public/') ||
        path.endsWith('.html')
      );
    },
    
    // Check if a token refresh is needed
    isRefreshNeeded: function() {
      // Don't refresh on public paths
      if (this.isPublicPath()) {
        return false;
      }
      
      // If there's no access token, no need to refresh
      const accessToken = TokenManager.getAccessToken();
      if (!accessToken) {
        return false;
      }
      
      // If the token is expired or about to expire, refresh it
      const expiresAt = TokenManager.getExpiresAt();
      if (!expiresAt) {
        return false;
      }
      
      const now = Date.now();
      return now >= (expiresAt - this.config.tokenRefreshThresholdMs);
    },
    
    // Handle page navigation
    handleNavigation: function(event) {
      // Store the current path for return after login if needed
      const currentPath = window.location.pathname + window.location.search;
      TokenManager.storeNavigationState(currentPath);
      
      // Update last activity timestamp
      TokenManager.updateLastActivity();
      
      // Check if token refresh is needed
      if (this.isRefreshNeeded()) {
        this.refreshToken();
      }
    },
    
    // Handle back/forward navigation
    handlePopState: function(event) {
      console.log('Back/forward navigation detected');
      this.handleNavigation(event);
    },
    
    // Handle page show event (when page is restored from back-forward cache)
    handlePageShow: function(event) {
      if (event.persisted) {
        console.log('Page restored from back-forward cache');
        TokenManager.markBfCacheRestoration();
        
        // Check if token refresh is needed
        if (this.isRefreshNeeded()) {
          this.refreshToken();
        }
      }
    },
    
    // Refresh the access token
    refreshToken: async function() {
      // Skip if already in progress
      if (TokenManager.isRefreshInProgress()) {
        console.log('Token refresh already in progress, skipping');
        return;
      }
      
      // Get refresh token
      const refreshToken = TokenManager.getRefreshToken();
      if (!refreshToken) {
        console.log('No refresh token available');
        return;
      }
      
      // Mark refresh as in progress
      TokenManager.markRefreshInProgress();
      
      try {
        console.log('Refreshing access token...');
        
        // Make the refresh request
        const response = await fetch(this.config.refreshEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          body: JSON.stringify({
            refreshToken: refreshToken,
            deviceId: TokenManager.getDeviceId()
          }),
          credentials: 'include' // Include cookies
        });
        
        // Check for success
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Token refresh failed');
        }
        
        // Process the response
        const data = await response.json();
        
        // Store the new tokens
        TokenManager.setTokens(
          data.tokens.accessToken,
          data.tokens.refreshToken,
          Date.now() + (15 * 60 * 1000) // 15 minutes default expiry
        );
        
        console.log('Token refresh successful');
      } catch (error) {
        console.error('Token refresh error:', error);
        
        // Handle expired refresh token
        if (error.message?.includes('expired')) {
          this.redirectToLogin();
        }
      } finally {
        // Clear the in-progress flag
        TokenManager.clearRefreshInProgress();
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
      TokenManager.recordLoginRedirect();
      
      // Clear tokens
      TokenManager.clearTokens();
      
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
        
        const lastRedirect = sessionStorage.getItem(TokenManager.SESSION_KEYS.LAST_LOGIN_REDIRECT);
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
    
    // Initialize the navigation handler
    init: function() {
      // Set up event listeners
      window.addEventListener('popstate', this.handlePopState.bind(this));
      window.addEventListener('pageshow', this.handlePageShow.bind(this));
      window.addEventListener('focus', this.handleNavigation.bind(this));
      
      // Handle navigation on initial load
      if (!this.isPublicPath()) {
        this.handleNavigation();
      }
      
      console.log('Auth navigation handler initialized');
      
      return this;
    }
  };
  
  // Initialize the navigation handler
  window.AuthNavigation.init();
})();

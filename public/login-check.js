/**
 * Auth Login Check Script
 * 
 * This script checks if the user is properly logged in when visiting protected pages
 * and redirects to login if authentication is not valid.
 */

(function() {
  // This script runs in the client, so we need to check if we're in a browser
  if (typeof window === 'undefined') return;
  
  console.log('Login check script running...');
    // Execute immediately and also on DOMContentLoaded
  const checkAuth = async function() {
    try {
      // Skip auth check on login and public pages
      const currentPath = window.location.pathname;      if (
        currentPath.includes('/login') || 
        currentPath.includes('/register') || 
        currentPath === '/' ||
        currentPath.includes('/public') ||
        currentPath.includes('/forgot-password') ||
        currentPath.includes('/reset-password') ||
        currentPath.includes('/auth-integration-test.html') // Skip test page
      ) {
        console.log('Skipping auth check on public page:', currentPath);
        return;
      }
      
      console.log('Performing auth check on protected page:', currentPath);
      
      // Check for access token - if missing, redirect to login
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!accessToken || !refreshToken) {
        console.log('No tokens found, redirecting to login');
        redirectToLogin(currentPath);
        return;
      }      // Verify token format
      let tokenFormatValid = true; // Default to true to avoid unnecessary redirects
      if (
        typeof window.TokenStorage !== 'undefined' && 
        typeof window.TokenStorage.validateTokenFormat === 'function'
      ) {
        try {
          tokenFormatValid = window.TokenStorage.validateTokenFormat(accessToken);
          if (!tokenFormatValid) {
            console.warn('Token format validation failed, attempting refresh instead of immediate redirect');
            // Instead of redirecting immediately, we'll try a refresh first
            // This helps prevent redirect loops
          }
        } catch (error) {
          console.error('Error validating token format:', error);
          // Continue execution with default true value, don't redirect yet
        }
      } else {
        console.warn('TokenStorage.validateTokenFormat not available, skipping format validation');
      }
        // Check if access token is expired
      let isExpired = false;
      
      // First try using TokenStorage method
      if (window.TokenStorage && typeof window.TokenStorage.isAccessTokenExpired === 'function') {
        isExpired = window.TokenStorage.isAccessTokenExpired();
      } else {
        // Fallback to direct check using localStorage
        const expiresAt = localStorage.getItem('expiresAt');
        if (expiresAt) {
          isExpired = Date.now() >= parseInt(expiresAt, 10);
        } else {
          // If we can't determine, assume it's expired to be safe
          isExpired = true;
        }
      }
      
      if (isExpired) {
        console.log('Access token expired, attempting refresh...');
        
        // Try to refresh the token
        try {
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
              'Expires': '0'
            },
            body: JSON.stringify({
              refreshToken: refreshToken,
              deviceId: localStorage.getItem('deviceId') || undefined
            }),
            credentials: 'include'
          });
            if (!response.ok) {
            console.log('Token refresh failed with status:', response.status);
            
            // If we're getting lots of refresh failures, add a timestamp to prevent infinite loops
            const timestamp = Date.now();
            const redirectUrl = `/login?redirect=${encodeURIComponent(currentPath)}&t=${timestamp}`;
            
            // Set a flag to indicate recent redirect to prevent loops
            try {
              sessionStorage.setItem('lastLoginRedirect', timestamp.toString());
            } catch (e) {
              console.error('Error setting redirect timestamp:', e);
            }
            
            // Redirect to login
            console.log(`Redirecting to login: ${redirectUrl}`);
            window.location.href = redirectUrl;
            return;
          }
          
          // Store new tokens
          const data = await response.json();
          localStorage.setItem('accessToken', data.tokens.accessToken);
          localStorage.setItem('refreshToken', data.tokens.refreshToken);
          localStorage.setItem('expiresAt', data.tokens.expiresAt || (Date.now() + 15 * 60 * 1000));
          
          console.log('Token refreshed successfully');
        } catch (error) {
          console.error('Error refreshing token:', error);
          redirectToLogin(currentPath);
          return;
        }
      }
      
      // At this point, we have a valid token or successfully refreshed it
      console.log('Auth check passed, user is logged in');
    } catch (error) {
      console.error('Error in login check script:', error);
    }
  };
    function redirectToLogin(returnPath) {
    // Only redirect if we're not already on the login page
    if (window.location.pathname.includes('/login')) return;
    
    // Store the return path in session storage
    sessionStorage.setItem('lastNavigationPath', returnPath);
    
    // Build the redirect URL - IMPORTANT: Add timestamp to prevent caching
    const timestamp = Date.now();
    const redirectUrl = `/login?redirect=${encodeURIComponent(returnPath)}&t=${timestamp}`;
    
    // Redirect to login
    console.log('Login check redirecting to:', redirectUrl);
    window.location.href = redirectUrl;
  }
  
  // Run immediately
  checkAuth();
  
  // Also run when DOM is fully loaded
  document.addEventListener('DOMContentLoaded', checkAuth);
  
  // Run on page navigation events
  window.addEventListener('popstate', checkAuth);
  window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
      console.log('Page restored from cache, checking auth...');
      checkAuth();
    }
  });
})();

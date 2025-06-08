/**
 * Logout Helper Script
 * 
 * This script provides a global function to handle logging out and redirecting to login
 */

window.logout = function(returnPath) {
  console.log('Logout script triggered');
  
  // Clear tokens from local storage
  if (window.localStorage) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('expiresAt');
    
    // Clear any other auth-related storage
    localStorage.removeItem('deviceId');
    localStorage.removeItem('accessTokenTimestamp');
    localStorage.removeItem('lastActivity');
    localStorage.removeItem('needsTokenRefresh');
  }
  
  // Clear session storage items
  if (window.sessionStorage) {
    sessionStorage.removeItem('refreshInProgress');
    sessionStorage.removeItem('lastNavTime');
    sessionStorage.removeItem('lastNavPath');
    sessionStorage.removeItem('navigationHistory');
    sessionStorage.removeItem('lastAuthenticatedPath');
    sessionStorage.removeItem('bfCacheRestored');
    
    // Store return path if provided
    if (returnPath) {
      sessionStorage.setItem('lastNavigationPath', returnPath);
    }
  }
  
  // Clear any auth cookies
  document.cookie = 'refreshNeeded=; max-age=0; path=/;';
    // Redirect to login page
  const currentPath = returnPath || (window.location.pathname + window.location.search);
  
  // Add timestamp to prevent caching issues
  const timestamp = Date.now();
  const redirectQuery = currentPath && !currentPath.includes('/login') ? 
    `?redirect=${encodeURIComponent(currentPath)}&token_expired=true&t=${timestamp}` : `?token_expired=true&t=${timestamp}`;
  
  console.log(`Redirecting to login: /login${redirectQuery}`);
  
  // Force a clean redirect by resetting the URL
  window.location.href = `/login${redirectQuery}`;
};

// Add a global event listener for expired token errors
document.addEventListener('expired-token-error', function(e) {
  console.log('Expired token error detected, logging out');
  window.logout(window.location.pathname + window.location.search);
});

// Add a specific token-expired event listener
document.addEventListener('token-expired', function(e) {
  console.log('Token expired event detected, logging out');
  const detail = e.detail || {};
  window.logout(detail.returnPath || (window.location.pathname + window.location.search));
});

// Also listen for console errors related to token expiration
if (window.console) {
  const originalConsoleError = console.error;
  console.error = function() {
    // Call the original console.error
    originalConsoleError.apply(console, arguments);
    
    // Check if the error is related to token refresh
    const errorString = Array.from(arguments).join(' ');
    if (
      errorString.includes('Token refresh failed') ||
      errorString.includes('Refresh token has expired') ||
      (errorString.includes('401') && errorString.includes('token'))
    ) {
      console.log('Detected token error in console, triggering logout');
      // Dispatch a token expired event
      document.dispatchEvent(new CustomEvent('token-expired', {
        detail: {
          message: errorString,
          returnPath: window.location.pathname + window.location.search
        }
      }));
    }
  };
}

console.log('Logout helper script loaded');

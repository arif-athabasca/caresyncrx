/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Token Refresh Error Handler
 * 
 * This module provides specialized error handling for token refresh errors
 * and manages redirects to login when tokens expire.
 */

/**
 * Handle token refresh errors consistently across the application
 */
export function handleTokenRefreshError(error: unknown, returnPath?: string): void {
  console.error('Token refresh error:', error);
  
  // Get the error message
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Determine if this is an expired token error or validation error
  const isExpiredTokenError = 
    errorMessage.includes('expired') || 
    errorMessage.includes('invalid token') ||
    errorMessage.includes('401') ||
    errorMessage.includes('Unauthorized');
    
  const isValidationError = 
    errorMessage.includes('validateTokenFormat') ||
    errorMessage.includes('is not a function') ||
    errorMessage.includes('TokenStorage');
  
  // Get current location
  const currentPath = typeof window !== 'undefined' 
    ? (returnPath || window.location.pathname + window.location.search)
    : '/';
  
  // Clean up tokens and storage for any auth-related error
  if (typeof window !== 'undefined' && (isExpiredTokenError || isValidationError)) {
    // Clear tokens from localStorage
    if (window.localStorage) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('expiresAt');
      localStorage.removeItem('deviceId');
      localStorage.removeItem('accessTokenTimestamp');
      localStorage.removeItem('lastActivity');
      localStorage.removeItem('needsTokenRefresh');
    }
    
    // Clear session storage items
    if (window.sessionStorage) {
      sessionStorage.removeItem('refreshInProgress');
      sessionStorage.removeItem('bfCacheRestored');
      
      // Save the return path for after login
      if (currentPath && !currentPath.includes('/login')) {
        sessionStorage.setItem('lastNavigationPath', currentPath);
      }
    }
    
    // Trigger a token expired event that our global handler can catch
    const expiredEvent = new CustomEvent('token-expired', {
      detail: {
        message: errorMessage,
        returnPath: currentPath
      }
    });
    
    document.dispatchEvent(expiredEvent);
    
    // Also try the global logout function if available
    if (typeof window.logout === 'function') {
      window.logout(currentPath);
    } else {
      // Fallback logout implementation
      // Only redirect if we're not already on the login page
      if (!currentPath.includes('/login')) {
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}&token_expired=true`;
      }
    }
  }
}

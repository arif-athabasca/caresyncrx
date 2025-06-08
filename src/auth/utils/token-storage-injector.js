/**
 * TokenStorage Method Injector
 * 
 * This module ensures that all required methods are available in the TokenStorage object
 * by adding them if they're missing.
 */

// Function to check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Only run this in browser environments
if (isBrowser) {
  (function() {
    // Wait for DOM to be fully loaded
    document.addEventListener('DOMContentLoaded', function() {
      console.log('TokenStorage Method Injector running...');
      
      // We need to wait a bit to ensure the TokenStorage is fully loaded
      setTimeout(() => {
        try {
          // Get the TokenStorage from window global or require it
          const TokenStorage = window.TokenStorage || 
                              (window.auth && window.auth.TokenStorage);
          
          if (!TokenStorage) {
            console.error('TokenStorage not found in global scope');
            return;
          }
          
          // Check and add validateTokenFormat if missing
          if (typeof TokenStorage.validateTokenFormat !== 'function') {
            console.log('Adding missing validateTokenFormat method');
            TokenStorage.validateTokenFormat = function(token) {
              // Check if the token is not null and is a string
              if (!token || typeof token !== 'string') {
                return false;
              }
              
              // Check if the token has a reasonable minimum length
              if (token.length < 20) {
                return false;
              }
              
              // Check if the token has the basic JWT structure (three parts separated by dots)
              const parts = token.split('.');
              if (parts.length !== 3) {
                return false;
              }
              
              // Check if each part is non-empty and contains valid base64 characters
              const validBase64Regex = /^[A-Za-z0-9_-]+$/;
              for (const part of parts) {
                if (!part || !validBase64Regex.test(part)) {
                  return false;
                }
              }
              
              return true;
            };
          }
          
          // Check and add isAccessTokenExpired if missing
          if (typeof TokenStorage.isAccessTokenExpired !== 'function') {
            console.log('Adding missing isAccessTokenExpired method');
            TokenStorage.isAccessTokenExpired = function() {
              // If isTokenExpired exists, use it as the implementation
              if (typeof TokenStorage.isTokenExpired === 'function') {
                return TokenStorage.isTokenExpired();              }
              
              // Fallback implementation
              const expiresAt = TokenStorage.getExpiresAt ? TokenStorage.getExpiresAt() : null;
              if (!expiresAt && typeof localStorage !== 'undefined') {
                const storedExpiresAt = localStorage.getItem('expiresAt');
                if (storedExpiresAt) {
                  return Date.now() >= (parseInt(storedExpiresAt, 10) - 30000);
                }
              }
              
              if (!expiresAt) return true;
              return Date.now() >= (expiresAt - 30000);
            };
          }
          
          // Check and add markBfCacheRestoration if missing
          if (typeof TokenStorage.markBfCacheRestoration !== 'function') {
            console.log('Adding missing markBfCacheRestoration method');
            TokenStorage.markBfCacheRestoration = function() {
              try {
                if (typeof sessionStorage !== 'undefined') {
                  sessionStorage.setItem('bfCacheRestored', Date.now().toString());
                }
              } catch (e) {
                console.warn('Error marking bfcache restoration:', e);
              }
            };
          }
            console.log('TokenStorage Method Injector complete');
          
          // Ensure TokenStorage is added to window global
          if (!window.TokenStorage) {
            console.log('Adding TokenStorage to window global');
            window.TokenStorage = TokenStorage;
          }
        } catch (error) {
          console.error('Error in TokenStorage Method Injector:', error);
        }      }, 500);
    });
    
    // Also run if document is already loaded
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      console.log('Document already loaded, running TokenStorage Method Injector immediately');
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);
    }
  })();
}

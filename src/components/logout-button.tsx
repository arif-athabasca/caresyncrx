'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * LogoutButton component
 * Provides a UI button for logging out and redirecting to login page
 */
export default function LogoutButton({ className = '', redirectPath = '' }) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    
    try {
      // Call the logout API
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        // Clear any client-side storage
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('expiresAt');
          localStorage.removeItem('deviceId');
          localStorage.removeItem('accessTokenTimestamp');
          localStorage.removeItem('lastActivity');
          localStorage.removeItem('needsTokenRefresh');
        }
        
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem('refreshInProgress');
          sessionStorage.removeItem('lastNavTime');
          sessionStorage.removeItem('lastNavPath');
          sessionStorage.removeItem('navigationHistory');
          sessionStorage.removeItem('lastAuthenticatedPath');
          sessionStorage.removeItem('bfCacheRestored');
        }
        
        // Store the current path for redirection after login if specified
        const currentPath = redirectPath || window.location.pathname;
        if (currentPath && !currentPath.includes('/login')) {
          sessionStorage.setItem('lastNavigationPath', currentPath);
        }
        
        // Redirect to login
        const timestamp = Date.now();
        const redirectQuery = currentPath && !currentPath.includes('/login') 
          ? `?redirect=${encodeURIComponent(currentPath)}&t=${timestamp}` 
          : `?t=${timestamp}`;
        
        router.push(`/login${redirectQuery}`);
      } else {
        console.error('Logout failed:', await response.text());
        // Redirect to login anyway
        router.push('/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Redirect to login anyway
      router.push('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <button      onClick={handleLogout}
      disabled={isLoggingOut}
      className={`logout-button ${className}`}
      aria-label="Logout"
    >
      {isLoggingOut ? 'Logging out...' : 'Logout'}
    </button>
  );
}

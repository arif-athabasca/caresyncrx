'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Higher-Order Component to protect routes based on user roles
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
// Import UserRole from directly from the source file
import { UserRole } from '../index';
import { TokenStorage } from '../utils/token-storage';

type WithRoleProtectionProps = {
  allowedRoles: UserRole[];
  redirectPath?: string;
};

/**
 * Higher-Order Component (HOC) that protects routes based on user roles.
 * @param Component - The component to wrap with role-based protection
 * @param options - Configuration options including allowed roles and redirect path
 */
export function withRoleProtection<T extends object>(
  Component: React.ComponentType<T>,
  options: WithRoleProtectionProps
) {  
  return function ProtectedRoute(props: T) {
    const { user, isLoading, isAuthenticated } = useAuth();
    const router = useRouter();
    const { allowedRoles, redirectPath = '/login' } = options;
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
      // Check authentication status on component mount
    useEffect(() => {
      const checkAuthStatus = async () => {
        try {
          // If we already know we're not authenticated, no need to check
          if (!isLoading && !isAuthenticated) {
            setIsCheckingAuth(false);
            return;
          }
          
          // Check if token refresh is needed for navigation
          if (TokenStorage.isRefreshNeededForNavigation()) {
            console.log('Token refresh needed in protected route');
            
            // Store current path for potential return after login
            if (typeof window !== 'undefined') {
              TokenStorage.storeNavigationState(window.location.pathname + window.location.search);
            }
            
            try {
              // Attempt to refresh token
              const refreshToken = TokenStorage.getRefreshToken();
              const deviceId = TokenStorage.getDeviceId();
              
              if (refreshToken) {
                console.log('Attempting token refresh in withRoleProtection');
                const response = await fetch('/api/auth/refresh', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'private, max-age=0, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                    'X-Navigation-Source': 'role-protection'
                  },
                  body: JSON.stringify({
                    refreshToken,
                    deviceId
                  }),
                  credentials: 'include'
                });
                
                if (!response.ok) {
                  console.warn('Token refresh failed in protected route');
                }
              }
            } catch (refreshError) {
              console.error('Error during token refresh:', refreshError);
            }
          }
          
          // Get current user info with latest tokens
          try {
            const response = await fetch('/api/auth/me', {
              credentials: 'include',
              headers: {
                'Cache-Control': 'private, max-age=0, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'X-Request-Time': Date.now().toString(),
                'X-Request-Source': 'withRoleProtection'
              }
            });
            
            if (!response.ok) {
              // Store navigation state before potential redirect
              TokenStorage.storeNavigationState(window.location.pathname + window.location.search);
            }
          } catch (userError) {
            console.error('Error fetching user data:', userError);
          }
          
          setIsCheckingAuth(false);
        } catch (error) {
          console.error('Error checking auth status in HOC:', error);
          setIsCheckingAuth(false);
        }
      };
      
      checkAuthStatus();
        // Set up pageshow event listener for back/forward navigation
      const handlePageShow = (event: PageTransitionEvent) => {
        if (event.persisted) {
          console.log('Page restored from back/forward cache in withRoleProtection');
          
          // Mark that the page was restored from BFCache
          TokenStorage.markBfCacheRestoration();
          
          // Always refresh when coming from BFCache to ensure we have fresh tokens
          const refreshToken = TokenStorage.getRefreshToken();
          const deviceId = TokenStorage.getDeviceId();
          
          // Store current path for potential return after login
          if (typeof window !== 'undefined') {
            TokenStorage.storeNavigationState(window.location.pathname + window.location.search);
          }
          
          if (refreshToken) {
            console.log('Automatically refreshing token on BFCache restoration');
            
            // Immediately attempt token refresh on BFCache restoration
            fetch('/api/auth/refresh', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Expires': '0',
                'X-Navigation-Source': 'bfcache-restoration'
              },
              body: JSON.stringify({
                refreshToken,
                deviceId
              }),
              credentials: 'include'
            }).then(response => {
              if (response.ok) {
                console.log('Token successfully refreshed after BFCache restoration');
                // After successful refresh, run the full auth check
                checkAuthStatus();
              } else {
                console.warn('Token refresh failed after BFCache restoration');
                checkAuthStatus();
              }
            }).catch(error => {
              console.error('Error refreshing token after BFCache restoration:', error);
              checkAuthStatus();
            });
          } else {
            checkAuthStatus();
          }
        }
      };
      
      window.addEventListener('pageshow', handlePageShow);
      
      return () => {
        window.removeEventListener('pageshow', handlePageShow);
      };
    }, [isAuthenticated, isLoading]);
    
    // Handle routing based on authentication status
    useEffect(() => {
      // Wait until we're done checking authentication status
      if (isLoading || isCheckingAuth) return;
      
      // If not authenticated, redirect to login
      if (!isAuthenticated) {
        // Store the current URL in sessionStorage to enable return after login
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('lastAuthenticatedPath', window.location.pathname);
        }
        
        const redirectUrl = `${redirectPath}?redirect=${encodeURIComponent(window.location.pathname)}`;
        
        // Add timestamp to prevent caching issues
        const timestampedRedirect = redirectUrl + (redirectUrl.includes('?') ? '&' : '?') + `t=${Date.now()}`;
        
        // Use router.replace instead of push to avoid breaking the back button flow
        router.replace(timestampedRedirect);
        return;
      }
      
      // If authenticated but not in allowed roles, redirect to default dashboard
      if (user && !allowedRoles.includes(user.role)) {
        // For admin users being redirected, always go to admin dashboard
        if (user.role === UserRole.ADMIN) {
          // Add timestamp to prevent caching issues with navigation
          const timestamp = Date.now();
          const url = `/admin/dashboard?t=${timestamp}`;
          
          // Use replace instead of push to prevent back button issues
          router.replace(url);
        } else {
          // Add timestamp to prevent caching issues with navigation
          const timestamp = Date.now();
          const url = `/dashboard?t=${timestamp}`;
          
          // Use replace instead of push to prevent back button issues
          router.replace(url);
        }
        return;
      }
    }, [isAuthenticated, isLoading, router, redirectPath, user, allowedRoles, isCheckingAuth]);
    
    // Show loading spinner while authenticating or redirecting
    if (isLoading || isCheckingAuth || !isAuthenticated || (user && !allowedRoles.includes(user.role))) {
      return <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>;
    }
    
    // Render the component if the user is authorized
    return <Component {...props} />;
  };
}

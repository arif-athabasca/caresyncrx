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
// Import UserRole directly from the enums file
import { UserRole } from '../enums';

type WithRoleProtectionProps = {
  allowedRoles: UserRole[];
  redirectTo?: string;
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
    const { allowedRoles, redirectTo = '/login' } = options;
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    
    // Check authentication status on component mount
    useEffect(() => {
      const checkAuthStatus = async () => {
        try {
          // Wait for auth to finish loading
          if (isLoading) {
            return;
          }
          
          // If not authenticated, redirect to login
          if (!isAuthenticated) {
            setIsCheckingAuth(false);
            
            // Store the current path for redirection after login
            if (typeof window !== 'undefined') {
              if (window.AuthSession) {
                const currentPath = window.location.pathname;
                window.AuthSession.storeLoginRedirect(currentPath);
              }
              
              // Also store in sessionStorage for backwards compatibility
              sessionStorage.setItem('lastAuthenticatedPath', window.location.pathname);
            }
            
            // Redirect to login page with return URL
            const redirectUrl = `${redirectTo}?redirect=${encodeURIComponent(window.location.pathname)}`;
            router.push(redirectUrl);
            return;
          }
          
          // Check if the user has the required role
          if (user && !allowedRoles.includes(user.role)) {
            // User is authenticated but doesn't have the required role
            router.push('/unauthorized');
            return;
          }
          
          // User is authenticated and has the required role
          setIsCheckingAuth(false);
        } catch (error) {
          console.error('Error checking authentication status:', error);
          setIsCheckingAuth(false);
        }
      };
      
      checkAuthStatus();
      
      // Handle page showing from back/forward cache
      const handlePageShow = (event: PageTransitionEvent) => {
        if (event.persisted) {
          console.log('Page restored from back/forward cache in withRoleProtection');
          checkAuthStatus();
        }
      };
      
      // Set up event listeners for navigation events
      window.addEventListener('pageshow', handlePageShow);
      
      return () => {
        window.removeEventListener('pageshow', handlePageShow);
      };
    }, [isLoading, isAuthenticated, user, router, allowedRoles, redirectTo]);
    
    // Show loading state while checking authentication
    if (isLoading || isCheckingAuth) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }
    
    // Render the component if the user is authorized
    return <Component {...props} />;
  };
}

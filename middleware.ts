/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Next.js middleware for authentication and route protection
 */

import { NextResponse, NextRequest } from 'next/server';
import { TokenType } from './src/auth';
import { TokenUtil } from './src/auth/utils';
import { applySecurityMiddleware } from './src/shared/middleware/security';

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/auth/password-reset',
];

// Static assets that don't require authentication
const STATIC_ASSET_PATHS = [
  '/_next/',
  '/favicon.ico',
  '/images/',
  '/assets/',
];

/**
 * Check if a path is public (doesn't require authentication)
 */
function isPublicPath(pathname: string): boolean {
  // Check exact matches
  if (PUBLIC_PATHS.includes(pathname)) {
    return true;
  }
  
  // Check static assets
  for (const assetPath of STATIC_ASSET_PATHS) {
    if (pathname.startsWith(assetPath)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Helper function to extract tokens from request
 */
function getTokensFromRequest(request: NextRequest) {
  const accessToken = request.cookies.get('accessToken')?.value || 
                     request.headers.get('authorization')?.replace('Bearer ', '');
  const refreshToken = request.cookies.get('refreshToken')?.value ||
                      request.cookies.get('authRefreshToken')?.value;
  
  return { accessToken, refreshToken };
}

/**
 * Middleware to handle authentication and route protection
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Apply security middleware first
  try {
    // For protected routes, apply all security middlewares
    if (!isPublicPath(pathname)) {
      const securityResult = await applySecurityMiddleware(request);
      
      // If the security middleware returns a response (e.g., blocked request),
      // return that response immediately
      if (securityResult.status !== 200) {
        return securityResult;
      }
    }
    // For public paths, we still want security headers but not authentication
  } catch (securityError) {
    console.error('Security middleware error:', securityError);
    // Continue with authentication flow despite security errors
  }

  // Skip authentication for public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Get the access token from cookies or authorization header
  const { accessToken, refreshToken } = getTokensFromRequest(request);

  if (!accessToken) {
    // For API routes, return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { message: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // For other routes, redirect to login
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }  try {
    // Verify token
    const payload = TokenUtil.verifyToken(accessToken, TokenType.ACCESS);
    
    if (!payload) {
      throw new Error('Invalid token');
    }    // Set user info in request headers for downstream use
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', (payload as { id: string }).id);
    requestHeaders.set('x-user-email', (payload as { email: string }).email);
    requestHeaders.set('x-user-role', (payload as { role: string }).role);
    requestHeaders.set('x-request-time', Date.now().toString()); // Add timestamp for each request    // Continue with the request and set cache headers for better back-button behavior
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      }
    });
    
    // Update last activity timestamp for idle timeout tracking
    const lastActivity = Date.now().toString();
    response.cookies.set('lastActivity', lastActivity, { 
      path: '/',
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false // Need client access for idle timeout
    });
    
    // Set optimized cache-control headers for browser history navigation
    // Allow browser caching but require revalidation
    // This enables back/forward navigation while ensuring content freshness
    response.headers.set('Cache-Control', 'private, max-age=0, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Vary', 'Authorization, x-request-time, x-user-id'); // Vary header to prevent shared caching
    
    return response;} catch (error) {
    // Silence the error
    console.error('Token validation error:', error);      // Check if there's a refresh token in the cookies or from the helper
    if (refreshToken) {
      // For non-API routes, allow the request to continue and rely on client-side refresh
      if (!pathname.startsWith('/api/')) {
        // Set headers to indicate that a token refresh might be needed
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-needs-token-refresh', 'true');
        requestHeaders.set('x-request-time', Date.now().toString()); // Add timestamp for each request
          // Continue with the request but add headers to signal refresh
        const response = NextResponse.next({
          request: {
            headers: requestHeaders,
          }
        });
        
        // Add a special header to signal token refresh is needed
        // The client will check for this header and trigger refresh
        response.headers.set('x-needs-token-refresh', 'true');
        response.headers.set('x-token-state', 'needs-refresh');
        
        // Set optimized cache-control headers for browser history navigation
        // Allow browser caching but require revalidation
        response.headers.set('Cache-Control', 'private, max-age=0, must-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
        response.headers.set('Vary', 'Authorization, x-needs-token-refresh, x-request-time, x-user-id');
          // Set a cookie to indicate refresh needed
        // This helps when the client can't read response headers due to redirects
        response.cookies.set('refreshNeeded', 'true', { 
          maxAge: 30, // Extended to 30 seconds to ensure it's processed even with slow navigation
          path: '/',
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        });
        
        return response;
      }
    }
    
    // For API routes or when no refresh token is available
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { message: 'Unauthorized - Invalid or expired token' },
        { status: 401 }
      );
    }

    // For other routes, redirect to login
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }
}

// Specify which paths this middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
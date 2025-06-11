/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Authentication middleware for the CareSyncRx platform.
 * This file implements JWT token validation and enforcement of authentication
 * requirements for protected routes.
 */

import { NextRequest, NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';
import { TokenType } from '../../auth';
import { TokenUtil } from '../../auth/utils';
import prisma from '../../lib/prisma';
import { DeviceStatus } from '../../enums/device-status';
import { SecurityEventType, SecurityEventSeverity } from '../services/security-audit';

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

// Maximum session idle time before requiring revalidation (30 minutes)
const MAX_SESSION_IDLE_TIME = 30 * 60 * 1000; 

// Maximum absolute session time before forced re-login (8 hours)
const MAX_SESSION_ABSOLUTE_TIME = 8 * 60 * 60 * 1000;

// Different security tiers with session requirements
const SECURITY_TIERS = {
  LOW: {
    paths: ['/dashboard'],
    idleTimeout: 60 * 60 * 1000, // 1 hour
    absoluteTimeout: 24 * 60 * 60 * 1000, // 24 hours
    requireTrustedDevice: false
  },
  MEDIUM: {
    paths: ['/prescriptions', '/patient-records', '/treatment-plans'],
    idleTimeout: 30 * 60 * 1000, // 30 minutes
    absoluteTimeout: 8 * 60 * 60 * 1000, // 8 hours
    requireTrustedDevice: false
  },
  HIGH: {
    paths: ['/api/admin', '/settings/billing', '/settings/organization'],
    idleTimeout: 15 * 60 * 1000, // 15 minutes
    absoluteTimeout: 4 * 60 * 60 * 1000, // 4 hours
    requireTrustedDevice: true
  }
};

/**
 * Check if a path is public (doesn't require authentication)
 * 
 * @param path - The path to check
 * @returns True if the path is public, false otherwise
 */
function isPublicPath(path: string): boolean {
  // Check exact matches
  if (PUBLIC_PATHS.includes(path)) {
    return true;
  }
  
  // Check static assets
  for (const assetPath of STATIC_ASSET_PATHS) {
    if (path.startsWith(assetPath)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Determines if a path is subject to high security requirements
 * @param pathname - The URL path to check
 * @returns boolean indicating if high security checks are needed
 */
function isHighSecurityPath(pathname: string): boolean {
  // Check if path matches any high security paths
  return SECURITY_TIERS.HIGH.paths.some(path => 
    pathname.startsWith(path) || pathname === path
  );
}

/**
 * Gets the security tier for a given path
 * @param pathname - The URL path to check  
 * @returns The security tier configuration
 */
function getSecurityTierForPath(pathname: string) {
  if (SECURITY_TIERS.HIGH.paths.some(path => pathname.startsWith(path) || pathname === path)) {
    return SECURITY_TIERS.HIGH;
  }
  
  if (SECURITY_TIERS.MEDIUM.paths.some(path => pathname.startsWith(path) || pathname === path)) {
    return SECURITY_TIERS.MEDIUM;
  }
  
  return SECURITY_TIERS.LOW;
}

/**
 * Generate fingerprint from request data
 * Used to verify the token belongs to the original device
 * 
 * @param request - The Next.js request object
 * @returns Fingerprint string
 */
function generateRequestFingerprint(request: NextRequest): string {
  const components = [
    request.headers.get('user-agent') || 'unknown',
    request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    // Extract client hints if available for better identification
    request.headers.get('sec-ch-ua-platform') || '',
    request.headers.get('sec-ch-ua') || ''
  ];
    // Edge-safe hashing approach
  const input = components.join('|');
  
  // Simple hash function that works in Edge Runtime
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert to hex-like string 
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Check if the session needs to be refreshed based on activity and security tier
 * @param lastActivity - Timestamp of last session activity
 * @param sessionCreated - Timestamp when session was created
 * @param securityTier - Security tier configuration
 * @returns Object with refresh requirements
 */
function checkSessionRefreshNeeded(lastActivity: Date, sessionCreated: Date, securityTier: typeof SECURITY_TIERS.LOW) {
  const now = new Date();
  const idleTime = now.getTime() - lastActivity.getTime();
  const sessionAge = now.getTime() - sessionCreated.getTime();
  
  return {
    idleRefreshNeeded: idleTime > securityTier.idleTimeout,
    absoluteRefreshNeeded: sessionAge > securityTier.absoluteTimeout,
    sessionAge,
    idleTime
  };
}

/**
 * Updates the last activity timestamp for a user session
 * @param userId - The user ID
 * @param sessionToken - The session token identifier
 * @returns Promise resolving to the updated session
 */
async function updateSessionActivity(userId: string, sessionToken: string) {
  return prisma.refreshToken.updateMany({
    where: {
      userId,
      token: {
        contains: sessionToken.substring(sessionToken.length - 10)
      }
    },    
    data: {
      isValid: true
    }
  });
}

/**
 * Authentication middleware function
 * Validates JWT tokens and handles redirects for unauthenticated users
 * 
 * @param request - The Next.js request object
 * @returns Next.js response or passes to the next middleware
 */
export async function authMiddleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Skip authentication for public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }
  
  // Get token from cookies or authorization header
  const accessToken = request.cookies.get('accessToken')?.value || 
                      request.headers.get('authorization')?.replace('Bearer ', '');
                      
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
  }
  
  try {
    // Generate fingerprint from request data
    const fingerprint = generateRequestFingerprint(request);
    
    // Verify token with fingerprint
    const payload = TokenUtil.verifyToken(accessToken, TokenType.ACCESS, fingerprint);
    
    if (!payload) {
      throw new Error('Invalid token or fingerprint mismatch');
    }

    // Get security tier for the requested path
    const securityTier = getSecurityTierForPath(pathname);

    // Get additional user data for high security routes
    if (isHighSecurityPath(pathname)) {      
      const userId = (payload as any).id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          refreshTokens: true,
          devices: {
            where: { deviceId: (payload as any).deviceId || '' }
          }
        }
      });

      if (!user) {
        throw new Error('User not found');
      }      
      
      // Check if session is active and not expired
      const hasValidSession = user.refreshTokens.some(token => 
        token.token.includes(accessToken.substring(accessToken.length - 10)) && 
        new Date(token.expiresAt) > new Date() &&
        token.isValid
      );      
      
      if (!hasValidSession) {
        throw new Error('Session expired or invalid');
      }
      
      // For high security paths, verify this is a known device with active status
      if (user.devices.length === 0 || user.devices[0].status !== DeviceStatus.ACTIVE) {
        // Log suspicious activity for unknown or inactive device
        const { AuthSecurityLogger } = require('../../auth/services/utils/auth-security-logger');
        await AuthSecurityLogger.log({
          userId,
          username: user.email,
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || undefined,
          path: pathname,
          method: request.method,
          action: 'SUSPICIOUS_ACCESS',
          securityEventType: SecurityEventType.ACCESS_DENIED,
          severity: SecurityEventSeverity.WARNING,
          description: `Suspicious access attempt from unknown or inactive device for user ${user.email}`,
          details: {
            deviceId: (payload as any).deviceId,
          }
        });

        // For admin paths, reject untrusted devices entirely
        if (pathname.startsWith('/api/admin/')) {
          throw new Error('Administrative access requires a trusted device');
        }
      }
    }
    
    // Set user info in request headers for downstream use
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', (payload as any).id);
    requestHeaders.set('x-user-email', (payload as any).email);
    requestHeaders.set('x-user-role', (payload as any).role);
    
    // Check if session continuation is needed
    const userId = (payload as any).id;    
    const sessionToken = accessToken;
    const refreshToken = await prisma.refreshToken.findFirst({
      where: {
        userId,
        token: {
          contains: sessionToken.substring(sessionToken.length - 10)
        },
        isValid: true
      }
    });

    if (refreshToken) {      
      const { idleRefreshNeeded, absoluteRefreshNeeded } = checkSessionRefreshNeeded(
        refreshToken.createdAt,
        refreshToken.createdAt,
        securityTier
      );

      if (idleRefreshNeeded || absoluteRefreshNeeded) {
        // Refresh token logic here if needed, e.g., issuing a new token
        // For now, we just update the last activity
        await updateSessionActivity(userId, sessionToken);
      }
    }
    
    // Continue with the request
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      }
    });
  } catch (error) {
    // Log authentication failure with specialized security logger
    const { AuthSecurityLogger } = require('../../auth/services/utils/auth-security-logger');
    await AuthSecurityLogger.log({
      userId: undefined,
      username: undefined,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      path: pathname,
      method: request.method,
      action: 'AUTH_FAILURE',
      securityEventType: SecurityEventType.ACCESS_DENIED,
      severity: SecurityEventSeverity.WARNING,
      description: `Authentication failure: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: {
        path: pathname
      }
    });
    
    // Token is invalid or expired
    // For API routes, return 401
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

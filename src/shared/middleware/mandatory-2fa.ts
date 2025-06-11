/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Mandatory 2FA Middleware
 * Enforces two-factor authentication for administrative users and sensitive operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { TokenType, UserRole } from '../../enums'; // Import from central enums
import { TokenUtil } from '../../auth/utils';
import prisma from '../../lib/prisma';

// Paths that require 2FA for all users
const REQUIRE_2FA_PATHS = [
  '/api/users/admin/',
  '/api/settings/',
  '/api/system/',
  '/api/security/'
];

// Roles that require 2FA for all actions
const REQUIRE_2FA_ROLES = [
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN // Using the newly defined SUPER_ADMIN role with value 'SUDO'
];

/**
 * Check if a user has 2FA enabled
 * 
 * @param userId - The user ID to check
 * @returns Whether 2FA is enabled for this user
 */
async function has2FAEnabled(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true }
    });
    
    return !!user?.twoFactorEnabled;
  } catch (error) {
    console.error('Error checking 2FA status:', error);
    return false;
  }
}

/**
 * Check if a user has completed 2FA verification for this session
 * 
 * @param request - The Next.js request
 * @returns Whether 2FA is verified for this session
 */
function is2FAVerifiedForSession(request: NextRequest): boolean {
  // Check for 2FA verification token in cookies
  const twoFactorToken = request.cookies.get('twoFactorToken')?.value;
  
  if (!twoFactorToken) {
    return false;
  }
  
  try {    // Verify the 2FA session token using temporary token type
    const payload = TokenUtil.verifyToken(twoFactorToken, TokenType.TEMP);
    
    if (!payload) {
      return false;
    }
    
    // Token is valid if we get here
    return true;  } catch {
    // Ignore error and return false
    return false;
  }
}

/**
 * Check if a path requires 2FA
 * 
 * @param path - The path to check
 * @returns Whether 2FA is required for this path
 */
function isPathRequiring2FA(path: string): boolean {
  return REQUIRE_2FA_PATHS.some(prefix => path.startsWith(prefix));
}

/**
 * Check if a user role requires 2FA
 * 
 * @param role - The user role to check
 * @returns Whether 2FA is required for this role
 */
function isRoleRequiring2FA(role: string): boolean {
  return REQUIRE_2FA_ROLES.includes(role as UserRole);
}

/**
 * Main middleware function for enforcing 2FA requirements
 * 
 * @param request - The incoming request
 * @returns Response redirecting to 2FA setup/verification or null to continue
 */
export async function mandatory2FAMiddleware(
  request: NextRequest
): Promise<NextResponse | null> {
  // Get user info from request headers (set by the auth middleware)
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role');
  const path = new URL(request.url).pathname;
  
  // Skip if not authenticated or no user ID
  if (!userId) {
    return null;
  }
  
  // Determine if 2FA is required for this request
  const requiresRoleBased2FA = userRole && isRoleRequiring2FA(userRole);
  const requiresPathBased2FA = isPathRequiring2FA(path);
  
  // Skip if 2FA is not required
  if (!requiresRoleBased2FA && !requiresPathBased2FA) {
    return null;
  }
  
  // Check if user has 2FA enabled
  const has2FA = await has2FAEnabled(userId);
  
  // If 2FA not set up, redirect to setup
  if (!has2FA) {
    // For API routes, return 403
    if (path.startsWith('/api/')) {
      return NextResponse.json(
        {
          message: 'Two-factor authentication is required for your account.',
          action: 'setup2FA',
          setupUrl: '/setup-2fa'
        },
        { status: 403 }
      );
    }
    
    // For other routes, redirect to setup
    const url = new URL('/setup-2fa', request.url);
    url.searchParams.set('redirect', path);
    return NextResponse.redirect(url);
  }
  
  // Check if 2FA is verified for this session
  const verified = is2FAVerifiedForSession(request);
  
  // If not verified, redirect to verify
  if (!verified) {
    // For API routes, return 403
    if (path.startsWith('/api/')) {
      return NextResponse.json(
        {
          message: 'Two-factor authentication verification required.',
          action: 'verify2FA',
          verifyUrl: '/verify-2fa'
        },
        { status: 403 }
      );
    }
    
    // For other routes, redirect to verify
    const url = new URL('/verify-2fa', request.url);
    url.searchParams.set('redirect', path);
    return NextResponse.redirect(url);
  }
  
  // 2FA is enabled and verified, allow access
  return null;
}

export default mandatory2FAMiddleware;

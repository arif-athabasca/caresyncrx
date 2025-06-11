/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * API route for user logout
 */

import { NextRequest, NextResponse } from 'next/server';
import { authContainer } from '@/auth/services/container';
import { AuditLogger } from '@/shared/services/audit-logger';
import { TokenType } from '@/auth';
import { TokenUtil } from '@/auth';
import { clearAuthCookies, getAuthCookies } from '@/shared/utils/cookie-util';

/**
 * Handle user logout requests
 */
export async function POST(request: NextRequest) {
  try {
    // Get all auth cookies
    const cookies = getAuthCookies(request);
    const accessToken = cookies.accessToken || 
                      request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!accessToken) {
      const response = NextResponse.json({ message: 'Already logged out' }, { status: 200 });
      return clearAuthCookies(response); // Clear cookies anyway just to be safe
    }
    
    // Verify the token to get user information
    const payload = TokenUtil.verifyToken<{ id: string; email: string }>(accessToken, TokenType.ACCESS);
    
    if (!payload) {
      // Clear cookies even if token is invalid
      const response = NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });
      return clearAuthCookies(response);
    }// Get refreshToken from request body if provided
    let refreshToken;
    try {
      const body = await request.json();
      refreshToken = body.refreshToken;
    } catch {
      // No body or invalid body, continue without refreshToken
    }

    // Log out the user via auth service
    const authService = authContainer.getAuthService();
    
    // Use token data to log out the correct user
    if (payload.id) {
      await authService.logout(payload.id, 'current-session');
        // Log successful logout
      await AuditLogger.log({
        userId: payload.id,
        action: 'USER_LOGOUT',
        details: {
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          timestamp: new Date(),
          resourceType: 'AUTH'
        }
      });
    }

    // If a refresh token was provided, invalidate it specifically
    if (refreshToken && payload.id) {
      try {
        // This would call a method to invalidate the specific token, 
        // but we're already invalidating all tokens in logout
      } catch (err) {
        // Continue even if refresh token invalidation fails
        console.warn('Failed to invalidate refresh token:', err);
      }
    }    // Clear auth cookies
    const response = NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });
    return clearAuthCookies(response);
  } catch (error) {
    console.error('Logout error:', error);
    
    // Even if there's an error, try to clear the cookies
    const response = NextResponse.json(
      { error: 'Logout failed', message: 'You have been logged out, but there was an error.' },
      { status: 500 }
    );
    
    return clearAuthCookies(response);
  }
}
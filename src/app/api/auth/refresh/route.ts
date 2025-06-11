/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * API route for refreshing authentication tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as jwt from 'jsonwebtoken';
import { authContainer } from '@/auth/services/container';
import { AuditLogger } from '@/shared/services/audit-logger';
import { TokenType } from '@/auth';
import { TokenUtil } from '@/auth';

// Refresh token validation schema
const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
  deviceId: z.string().optional()
});

// Rate limiting to prevent abuse
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;
const ipRequestCounts = new Map<string, {count: number, timestamp: number}>();

/**
 * Basic rate limiting function
 */
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const ipData = ipRequestCounts.get(ip) || { count: 0, timestamp: now };
  
  // Reset count if window has passed
  if (now - ipData.timestamp > RATE_LIMIT_WINDOW) {
    ipData.count = 1;
    ipData.timestamp = now;
  } else {
    ipData.count += 1;
  }
  
  ipRequestCounts.set(ip, ipData);
  
  // Clean up old entries periodically
  if (ipRequestCounts.size > 10000) {
    const cutoff = now - RATE_LIMIT_WINDOW;
    for (const [key, value] of ipRequestCounts.entries()) {
      if (value.timestamp < cutoff) {
        ipRequestCounts.delete(key);
      }
    }
  }
  
  return ipData.count > MAX_REQUESTS_PER_WINDOW;
}

/**
 * Handle token refresh requests
 */
export async function POST(request: NextRequest) {
  // Get IP for rate limiting and logging
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';
             
  // Apply rate limiting
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests', details: 'Please try again later' },
      { status: 429 }
    );
  }
  
  try {
    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      console.error('Error parsing JSON body:', error);
      return NextResponse.json(
        { error: 'Invalid request body - missing or malformed JSON' },
        { status: 400 }
      );
    }
    
    try {
      refreshSchema.parse(body);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { error: err.errors[0].message },
          { status: 400 }
        );
      }
      throw err;
    }
    
    // Get refresh token from body or cookies as fallback
    const { refreshToken, deviceId } = body;
    
    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }
    
    // Get auth service
    const authService = authContainer.getAuthService();
    
    try {
      // Use the refreshTokens method from the auth service
      const { accessToken, refreshToken: newRefreshToken } = await authService.refreshTokens(refreshToken, deviceId);
      
      // Create response with tokens
      const response = NextResponse.json({
        success: true,
        tokens: {
          accessToken,
          refreshToken: newRefreshToken
        }
      });
        // Set cookies for the new tokens
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        path: '/',
        maxAge: 7 * 24 * 60 * 60 // 7 days
      };
      
      response.cookies.set('accessToken', accessToken, cookieOptions);
      response.cookies.set('authToken', accessToken, cookieOptions); // For backward compatibility
      response.cookies.set('refreshToken', newRefreshToken, {
        ...cookieOptions,
        path: '/api/auth', // Restrict refresh token to auth endpoints
        maxAge: 30 * 24 * 60 * 60 // 30 days
      });
      
      // Store navigation path from request headers if present
      const lastNavPath = request.headers.get('X-Last-Navigation-Path');
      if (lastNavPath) {
        response.headers.set('X-Auth-Refreshed', 'true');
        response.headers.set('X-Last-Navigation-Path', lastNavPath);
      }
      
      // Add refresh success header to prevent multiple refreshes
      response.headers.set('X-Refresh-Success', 'true');
      
      // Log successful token refresh
      await AuditLogger.log({
        action: 'TOKEN_REFRESH_SUCCESS',
        userId: 'unknown', // We don't have the user ID in this context
        details: {
          ip,
          deviceId: deviceId || 'none',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      });
      
      return response;
    } catch (error) {
      console.error('Token refresh error:', error);
      
      // Detailed error logging for easier debugging
      const errorDetails = {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        ip,
      };
      
      console.error('Token refresh error details:', JSON.stringify(errorDetails, null, 2));
      
      // Log to audit log
      await AuditLogger.log({
        action: 'TOKEN_REFRESH_ERROR',
        userId: 'unknown',
        details: errorDetails
      });
      
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('expired')) {
          return NextResponse.json(
            { error: 'Refresh token has expired', details: 'Please log in again' },
            { status: 401 }
          );
        } else if (error.message.includes('Invalid device')) {
          return NextResponse.json(
            { error: 'Device mismatch detected', details: 'Security violation detected' },
            { status: 403 }
          );
        }
      }
      
      return NextResponse.json(
        { error: 'Failed to refresh token' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unhandled exception in refresh route:', error);
    return NextResponse.json(
      { error: 'Server error', details: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

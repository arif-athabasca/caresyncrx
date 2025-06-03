/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Authenticated route helper for API routes.
 * This utility wraps Next.js API route handlers to ensure they only
 * execute for authenticated users.
 */

import { NextRequest, NextResponse } from 'next/server';
import { TokenType } from '@/auth';
import { TokenUtil } from '@/auth';
import { AuditLogger } from '../services/audit-logger';

// Session data provided to authenticated route handlers
export interface AuthenticatedSession {
  userId: string;
  email: string;
  role: string;
}

/**
 * Higher-order function to protect API routes with authentication
 * 
 * @param req - Next.js request object
 * @param handler - Function to execute if authentication is successful
 * @returns Response from the handler if authenticated, 401 otherwise
 */
export async function authenticatedRoute<T>(
  req: NextRequest,
  handler: (session: AuthenticatedSession) => Promise<T>
): Promise<T | NextResponse> {
  try {
    // Get token from cookies or authorization header
    const accessToken = req.cookies.get('accessToken')?.value || 
                       req.headers.get('authorization')?.replace('Bearer ', '');
                      
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify token
    const payload = TokenUtil.verifyToken<{
      id: string;
      email: string;
      role: string;
    }>(accessToken, TokenType.ACCESS);
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Create session with user data from token
    const session: AuthenticatedSession = {
      userId: payload.id,
      email: payload.email,
      role: payload.role
    };

    // Execute the handler with the authenticated session
    return await handler(session);
  } catch (error) {
    // Log authentication failure
    console.error('API authentication error:', error);
    
    await AuditLogger.log({
      userId: 'unknown',
      action: 'API_AUTH_FAILURE',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        path: req.nextUrl.pathname,
        resourceType: 'AUTH'
      }
    });

    // Return authentication error
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }
}

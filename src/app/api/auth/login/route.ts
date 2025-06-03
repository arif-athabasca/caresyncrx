/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * API route for user login
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authContainer } from '@/auth/services/container';
import { RateLimiter } from '@/shared/middleware/rate-limit';
import { AuditLogger } from '@/shared/services/audit-logger';

// Login input validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  deviceId: z.string().optional(),
  rememberMe: z.boolean().optional()
});

/**
 * Handle login requests
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting to prevent brute force attacks
    const rateLimitResponse = await RateLimiter.check(request, {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per IP per 15 minutes
      message: 'Too many login attempts, please try again later.'
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Parse and validate request body
    const body = await request.json();
    
    try {
      loginSchema.parse(body);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { error: err.errors[0].message },
          { status: 400 }
        );
      }
      throw err;
    }    const { email, password, deviceId } = body;

    // Get client info for security tracking
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Attempt login with the auth service
    const authService = authContainer.getAuthService();
    const result = await authService.login({
      email,
      password,
      deviceId,
      ipAddress,
      userAgent
    });

    // Log successful authentication
    await AuditLogger.log({
      userId: result.user.id,
      action: 'LOGIN_SUCCESS',
      details: {
        email,
        ipAddress,
        userAgent,
        deviceId,
        timestamp: new Date(),
        requiresTwoFactor: result.requiresTwoFactor,
        resourceType: 'AUTH'
      }
    });

    // Set authentication cookies
    const response = NextResponse.json({
      user: result.user,
      tokens: result.tokens,
      requiresTwoFactor: result.requiresTwoFactor
    });

    // Set cookies if not requiring 2FA
    if (!result.requiresTwoFactor) {
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        path: '/',
        // Set cookie expiration based on rememberMe
        maxAge: body.rememberMe 
          ? 7 * 24 * 60 * 60 // 7 days
          : 24 * 60 * 60 // 1 day
      };

      response.cookies.set('accessToken', result.tokens.accessToken, cookieOptions);
      
      // Also set a non-HttpOnly cookie for the front-end to know auth status
      response.cookies.set('isAuthenticated', 'true', {
        ...cookieOptions,
        httpOnly: false
      });
    }

    return response;
  } catch (error) {
    console.error('Login error:', error);

    // Log failed login attempt
    await AuditLogger.log({
      userId: 'unknown', // We don't have a user ID for failed logins
      action: 'LOGIN_FAILED',      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date(),
        resourceType: 'AUTH'
      }
    });

    // Return appropriate error response
    if (error instanceof Error) {
      if (error.message.includes('Invalid credentials')) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      } else if (error.message.includes('Account is locked')) {
        return NextResponse.json(
          { error: 'Account is temporarily locked. Please try again later.' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
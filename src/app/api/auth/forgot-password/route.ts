/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * API route for handling forgot password requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter } from '@/shared/middleware/rate-limit';
import { AuditLogger } from '@/shared/services/audit-logger';
import { TokenType } from '@/auth';
import { AUTH_CONFIG } from '@/auth';

/**
 * POST /api/auth/forgot-password
 * 
 * Initiates the password reset process by sending a reset link to the user's email
 * In a production environment, this would:
 * 1. Validate the email exists in the database
 * 2. Generate a temporary token
 * 3. Send an email with a link containing the token
 * 
 * For development/testing, we simply return success and use test tokens
 */
export async function POST(req: NextRequest) {
  try {
    // Check rate limiting first
    const rateLimitResponse = await RateLimiter.check(req, {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 requests per window
      message: 'Too many password reset attempts, please try again later',
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Parse request body
    const body = await req.json();
    const { email } = body;

    // Validate email
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // In production, we would:
    // 1. Check if email exists in database
    // 2. Generate a reset token with appropriate expiry
    // 3. Store token in database
    // 4. Send email with reset link

    // For development/testing, we'll log and return success
    console.log(`[DEV] Password reset requested for: ${email}`);
      // Log security event with the specialized AuthSecurityLogger
    // In production, we would use the user's ID here
    const { AuthSecurityLogger } = await import('@/auth/services/utils/auth-security-logger');
    await AuthSecurityLogger.logPasswordResetRequest({
      username: email,
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
      path: req.nextUrl.pathname,
      method: req.method,
      details: { source: 'Password reset request flow' }
    });

    // Return successful response
    // In production, we would always return success to prevent email enumeration
    return NextResponse.json(
      { 
        success: true,
        message: 'If an account exists with this email, password reset instructions will be sent'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Password reset request error:', error);
    
    // Return generic error
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    );
  }
}

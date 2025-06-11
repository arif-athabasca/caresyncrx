/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * API route for handling password reset
 */

import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter } from '@/shared/middleware/rate-limit';
import { AuditLogger } from '@/shared/services/audit-logger';
import { passwordValidator } from '../../../../auth/utils/password-validator';
import { hash } from '../../../../auth/utils/bcrypt-browser';

/**
 * POST /api/auth/reset-password
 * 
 * Resets a user's password given a valid reset token and new password
 * In a production environment, this would:
 * 1. Validate the token exists and hasn't expired
 * 2. Update the user's password in the database
 * 3. Invalidate all refresh tokens for the user
 * 
 * For development/testing, we simply return success
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
    const { token, password, confirmPassword } = body;

    // Validate input
    if (!token) {
      return NextResponse.json(
        { error: 'Missing or invalid token' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    // Validate password against our requirements
    const passwordErrors = PasswordValidator.getValidationErrors(password);
    if (passwordErrors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Password does not meet requirements',
          validationErrors: passwordErrors
        },
        { status: 400 }
      );
    }

    // For testing purposes, accept any token that starts with 'test-'
    if (process.env.NODE_ENV === 'development' && token === 'test-token') {      // Just pretend we've reset the password      console.log('[DEV] Password reset with test token - simulating success');

      // In a real app, we would hash the new password
      const hashedPassword = await hash(password, 10);
      console.log('[DEV] New hashed password:', hashedPassword);      // Log security event with the specialized AuthSecurityLogger
      const { AuthSecurityLogger } = await import('@/auth/services/utils/auth-security-logger');
      await AuthSecurityLogger.logPasswordResetComplete({
        userId: 'test-user-001', // In production this would be the real user ID
        username: 'test@example.com', // In production this would be the actual email
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
        path: req.nextUrl.pathname,
        method: req.method,
        details: { source: 'Password reset completion flow' }
      });

      return NextResponse.json(
        { success: true, message: 'Password has been reset successfully' },
        { status: 200 }
      );
    }

    // In production, we would:
    // 1. Verify the token in the database
    // 2. Check that it hasn't expired
    // 3. Hash the new password
    // 4. Update the user's password in the database
    // 5. Invalidate the token
    // 6. Invalidate all refresh tokens for the user

    // Return invalid token error for non-test tokens
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Password reset error:', error);
    
    // Return generic error
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    );
  }
}
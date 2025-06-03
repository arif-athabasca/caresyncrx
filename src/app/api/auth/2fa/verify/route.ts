/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * API endpoint for verifying two-factor authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticatedRoute } from '@/shared/utils/authenticated-route';
import { AuthService } from '@/auth/services/implementations/AuthService';
import { AuthSecurityLogger } from '@/auth/services/utils/auth-security-logger';
import { SecurityEventType, SecurityEventSeverity } from '@/shared/services/security-audit';
import { RateLimiter } from '@/shared/middleware/rate-limit';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Validate input with Zod
const verifySchema = z.object({
  code: z.string().length(6, 'Verification code must be 6 digits').regex(/^\d+$/, 'Code must contain only digits')
});

/**
 * POST /api/auth/2fa/verify
 * Verifies and enables two-factor authentication for a user
 */
export async function POST(req: NextRequest) {
  try {
    // Check rate limiting first with more strict limits for verification attempts
    const rateLimitResponse = await RateLimiter.check(req, {
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 5, // 5 attempts per 5 minutes
      message: 'Too many verification attempts, please try again later.'
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    
    return await authenticatedRoute(req, async (session) => {
      const { userId } = session;
      
      // Parse and validate request body
      let body;
      try {
        body = await req.json();
        verifySchema.parse(body);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return NextResponse.json(
            { success: false, message: err.errors[0].message },
            { status: 400 }
          );
        }
        throw err;
      }
      
      const { code } = body;
      
      // Initialize auth service
      const authService = new AuthService();
      
      // Verify and enable 2FA for the user
      const success = await authService.enable2FA(userId, code);
      
      if (!success) {
        // Log failed verification attempt with enhanced security logger
        await AuthSecurityLogger.logTwoFactorFailure({
          userId,
          username: session.email || 'unknown',
          method: '2FA-TOTP',
          reason: 'Invalid verification code',
          ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown',
          path: req.url,
          httpMethod: req.method,
          details: { 
            resourceType: 'AUTH'
          }
        });
        
        return NextResponse.json(
          { success: false, message: 'Invalid verification code' },
          { status: 400 }
        );
      }
      
      // Get user to fetch backup codes
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { backupCodes: true }
      });
      
      // Return backup codes
      return NextResponse.json({
        success: true,
        backupCodes: user?.backupCodes || []
      });
    });
  } catch (error) {
    console.error('Error verifying 2FA:', error);
    
    // Log the error with enhanced security logger
    await AuthSecurityLogger.log({
      userId: 'unknown',
      username: 'unknown',
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
      path: req.url,
      method: req.method,
      action: 'TWO_FACTOR_VERIFICATION_ERROR',
      securityEventType: SecurityEventType.TWO_FACTOR_FAILURE,
      severity: SecurityEventSeverity.WARNING,
      description: 'Error during 2FA verification',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date()
      }
    });
    
    return NextResponse.json(
      { success: false, message: 'Failed to verify 2FA' },
      { status: 500 }
    );
  }
}

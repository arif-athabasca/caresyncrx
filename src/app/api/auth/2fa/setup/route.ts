/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * API endpoint for setting up two-factor authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticatedRoute } from '@/shared/utils/authenticated-route';
import { AuthService } from '@/auth/services/implementations/AuthService';
import { AuthSecurityLogger } from '@/auth/services/utils/auth-security-logger';
import { SecurityEventType, SecurityEventSeverity } from '@/shared/services/security-audit';
import { RateLimiter } from '@/shared/middleware/rate-limit';

/**
 * POST /api/auth/2fa/setup
 * Initiates two-factor authentication setup for a user
 */
export async function POST(req: NextRequest) {
  try {
    // Check rate limiting first
    const rateLimitResponse = await RateLimiter.check(req, {
      windowMs: 60 * 1000, // 1 minute
      max: 5, // 5 attempts per minute
      message: 'Too many 2FA setup attempts, please try again later.'
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    
    // Process the authenticated request
    return await authenticatedRoute(req, async (session) => {
      const { userId } = session;
      
      // Initialize auth service
      const authService = new AuthService();
      
      // Setup 2FA for the user
      const setupResponse = await authService.setup2FA(userId);
      
      // Return the setup response without backup codes (will be provided after verification)
      return NextResponse.json({
        success: true,
        secret: setupResponse.secret,
        qrCodeUrl: setupResponse.qrCodeUrl,
        otpauthUrl: setupResponse.otpauthUrl
      });
    });
  } catch (error) {
    console.error('Error setting up 2FA:', error);    // Log the error using the enhanced security logger
    await AuthSecurityLogger.logSecurityEvent(
      SecurityEventType.TWO_FACTOR_FAILURE,
      SecurityEventSeverity.WARNING,
      {
        userId: 'unknown',
        username: 'unknown',
        action: 'TWO_FACTOR_SETUP_FAILED',
        description: 'Failed to set up 2FA',
        details: { 
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          resourceType: 'AUTH'
        }
      }
    );
    
    return NextResponse.json(
      { success: false, message: 'Failed to set up 2FA' },
      { status: 500 }
    );
  }
}
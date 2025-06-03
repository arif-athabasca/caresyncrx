/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * API endpoint for generating a temporary token for 2FA verification during login
 */

import { NextRequest, NextResponse } from 'next/server';
import { authContainer } from '@/auth/services/container';
import { TokenUtil } from '@/auth';
import { UserRole } from '@/auth';
import { AuditLogger } from '@/shared/services/audit-logger';
import { z } from 'zod';

// Validate input with Zod
const tempTokenSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  deviceId: z.string().optional()
});

/**
 * POST /api/auth/temp-token
 * Generates a temporary token for two-factor authentication
 */
export async function POST(req: NextRequest) {
  try {
    // Parse and validate request body
    let body;
    try {
      body = await req.json();
      tempTokenSchema.parse(body);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, message: err.errors[0].message },
          { status: 400 }
        );
      }
      throw err;
    }
      const { userId, deviceId } = body;    // Use generateTempToken instead which is already implemented
    const { token } = TokenUtil.generateTempToken({ 
      id: userId, 
      email: '', // Required by type but not used for temp tokens
      role: UserRole.PATIENT // Required by type but not used for temp tokens
    });
      // Log the token generation
    await AuditLogger.log({
      userId,
      action: 'TEMP_TOKEN_GENERATED',
      details: { 
        purpose: 'TWO_FACTOR_AUTH',
        resourceType: 'AUTH',
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown'
      }
    });
    
    return NextResponse.json({
      success: true,
      token
    });
  } catch (error) {
    console.error('Error generating temp token:', error);
    
    // Log the error
    await AuditLogger.log({
      userId: 'unknown',
      action: 'TEMP_TOKEN_ERROR',
      details: { 
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        resourceType: 'AUTH'
      }
    });
    
    return NextResponse.json(
      { success: false, message: 'Failed to generate token' },
      { status: 500 }
    );
  }
}

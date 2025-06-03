import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authContainer } from '@/auth/services/container';
import { SecurityEventType, SecurityEventSeverity } from '@/shared/services/security-audit';
import { AuthSecurityLogger } from '@/auth/services/utils/auth-security-logger';

// Define validation schema
const verifySchema = z.object({
  tempToken: z.string().min(1, 'Temporary token is required'),
  code: z.string().min(1, 'Verification code is required'),
  deviceId: z.string().optional(),
  rememberMe: z.boolean().optional().default(false)
});

/**
 * Handle 2FA verification during login
 * This endpoint verifies the 2FA code provided by the user 
 * after they have successfully authenticated with username/password
 */
export async function POST(req: NextRequest) {
  try {
    // Validate request body
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
    
    const { tempToken, code, deviceId, rememberMe } = body;
      // Get client info for security tracking
    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    
    // Initialize auth service
    const authService = authContainer.getAuthService();
    
    // Verify the 2FA code
    const result = await authService.verify2FALogin(tempToken, code, {
      deviceId: deviceId || undefined,
      ipAddress,
      userAgent
    });
    
    if (!result.success) {
      // Log failed verification attempt with enhanced security logger
      await AuthSecurityLogger.logTwoFactorFailure({
        userId: result.userId || 'unknown',
        username: 'unknown', // We don't have the username if verification failed
        method: '2FA-TOTP',
        reason: 'Invalid verification code during login',
        ipAddress,
        userAgent,
        path: req.url,
        httpMethod: req.method,
        details: { 
          timestamp: new Date(),
          resourceType: 'AUTH'
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'Invalid verification code' },
        { status: 400 }
      );
    }
    
    // Log successful verification with enhanced security logger
    await AuthSecurityLogger.logTwoFactorSuccess({
      userId: result.user?.id || 'unknown',
      username: result.user?.email || 'unknown',
      method: '2FA-TOTP',
      ipAddress,
      userAgent,
      path: req.url,
      httpMethod: req.method,
      details: { 
        deviceId,
        resourceType: 'AUTH'
      }
    });
    
    // Create response with user data
    const response = NextResponse.json({
      success: true,
      message: 'Two-factor authentication successful',
      user: {
        id: result.user?.id,
        email: result.user?.email,
        role: result.user?.role
      },
      tokens: result.tokens
    });

    // Set cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
      // Set cookie expiration based on rememberMe
      maxAge: rememberMe 
        ? 7 * 24 * 60 * 60 // 7 days
        : 24 * 60 * 60 // 1 day
    };

    // Safely set cookies if tokens exist
    if (result.tokens && result.tokens.accessToken) {
      response.cookies.set('accessToken', result.tokens.accessToken, cookieOptions);
      
      // Also set a non-HttpOnly cookie for the front-end to know auth status
      response.cookies.set('isAuthenticated', 'true', {
        ...cookieOptions,
        httpOnly: false
      });
    }

    return response;
  } catch (error) {
    console.error('Error in 2FA login verification:', error);    // Log the error with enhanced security logger
    const errorIpAddress = req.headers.get('x-forwarded-for') || 'unknown';
    const errorUserAgent = req.headers.get('user-agent') || 'unknown';
    
    await AuthSecurityLogger.log({
      userId: 'unknown',
      username: 'unknown',
      ipAddress: errorIpAddress,
      userAgent: errorUserAgent,
      path: req.url,
      method: req.method,
      action: 'TWO_FACTOR_AUTHENTICATION_ERROR',
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
      { success: false, message: 'Server error during verification' },
      { status: 500 }
    );
  }
}
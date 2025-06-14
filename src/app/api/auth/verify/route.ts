/**
 * API route for checking authentication status
 * This is a protected route that requires authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthCookies } from '../../../../shared/utils/cookie-util';
import { TokenUtil } from '../../../../auth/utils/token-util';
import { TokenType } from '../../../../auth/enums';

export async function GET(request: NextRequest) {
  try {
    // Get authentication cookies and tokens
    const cookies = getAuthCookies(request);
    
    // Get access token from cookies or authorization header
    const accessToken = cookies.accessToken || 
                      request.headers.get('authorization')?.replace('Bearer ', '') || '';
    
    // Get fingerprint if available
    const fingerprint = cookies.deviceFingerprint;
    
    // Verify token
    const payload = TokenUtil.verifyToken(
      accessToken, 
      TokenType.ACCESS,
      fingerprint
    );
    
    if (!payload) {
      return NextResponse.json({ 
        authenticated: false,
        message: 'Not authenticated - Invalid token'
      }, { status: 401 });
    }
    
    // Return user information
    return NextResponse.json({
      authenticated: true,
      user: {
        id: (payload as any).id,
        email: (payload as any).email,
        role: (payload as any).role,
        clinicId: (payload as any).clinicId || null
      },
      tokenInfo: {
        type: (payload as any).type,
        expiresAt: new Date((payload as any).exp * 1000).toISOString(),
        issuedAt: new Date((payload as any).iat * 1000).toISOString()
      }
    });
  } catch (error) {
    console.error('Authentication check error:', error);
    
    return NextResponse.json({ 
      authenticated: false,
      message: 'Not authenticated - ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 401 });
  }
}

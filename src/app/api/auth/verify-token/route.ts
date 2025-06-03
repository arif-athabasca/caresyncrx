/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * API route to verify token validity without performing a full refresh
 * Used primarily during browser navigation to validate tokens
 */

import { NextResponse, NextRequest } from 'next/server';
import { TokenType } from '@/auth';
import { TokenUtil } from '@/auth';

/**
 * Verify token validity
 * 
 * @param request The Next.js request object
 */
export async function GET(request: NextRequest) {
  try {
    // Get the access token from cookies or authorization header
    const accessToken = request.cookies.get('accessToken')?.value || 
                      request.headers.get('authorization')?.replace('Bearer ', '');
                     
    if (!accessToken) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'No access token provided' 
        },
        { status: 401 }
      );
    }
    
    // Verify the token
    const payload = TokenUtil.verifyToken(accessToken, TokenType.ACCESS);
    
    if (!payload) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Invalid or expired token' 
        },
        { status: 401 }
      );
    }
    
    // Return success with minimal payload to keep response size small
    return NextResponse.json(
      { 
        status: 'success',
        valid: true
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (error) {
    console.error('Error verifying token:', error);
    
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Error verifying token' 
      },
      { status: 500 }
    );
  }
}

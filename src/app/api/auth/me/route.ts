/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * API route for retrieving currently authenticated user
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/auth/services/utils/session-utils';
import { deviceIdentityService } from '@/auth/utils/device-identity-service';

/**
 * GET handler for retrieving current user information
 */
export async function GET() {  try {
    // Initialize device identity service to ensure it's ready for token operations
    try {
      const deviceId = await deviceIdentityService.initialize();
      console.log('Device identity initialized on /me endpoint:', {
        deviceIdPrefix: deviceId ? deviceId.substring(0, 8) + '...' : 'none'
      });
      
      // Ensure the device identity is synchronized with token storage
      // This helps prevent token refresh issues with mismatched device IDs
      if (deviceId) {
        const session = await getSession();
        if (session && session.user && session.user.id) {
          // Log that we're initializing device identity for this user
          console.log('Initializing device identity for user:', {
            userId: session.user.id,
            deviceIdPrefix: deviceId.substring(0, 8) + '...'
          });
        }
      }
    } catch (error) {
      console.warn('Failed to initialize device identity service:', error);
      // Continue anyway - this is not critical for the /me endpoint
    }
    
    // Get session from cookie/header
    const session = await getSession();
    
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user from database, excluding sensitive information
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        twoFactorEnabled: true,
        clinicId: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      user,
      isAuthenticated: true 
    });
  } catch (error) {
    console.error('Error retrieving current user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

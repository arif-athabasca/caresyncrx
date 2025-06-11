/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Session utilities for handling user authentication sessions
 */

import { cookies } from 'next/headers';
import { JWTVerifier } from '../implementations/jwt-verifier';
import { authContainer } from '../container';

/**
 * Session object structure
 */
export interface Session {
  user: {
    id: string;
    email: string;
    role: string;
    clinicId: string;
  };
  exp?: number;
  iat?: number;
}

/**
 * Retrieves the current authenticated session from cookies or authorization header
 */
export async function getSession(): Promise<Session | null> {  
  try {
    // For API routes - get token from cookie or authorization header
    const cookieStore = await cookies();
    
    // Check for access token in any of the possible cookie names
    const accessTokenCookie = cookieStore.get('accessToken') || cookieStore.get('authToken');
    
    if (!accessTokenCookie?.value) {
      console.log('[Session Utils] No access token found in cookies');
      return null;
    }
    
    const token = accessTokenCookie.value;
    
    // Verify and decode the token
    const jwtVerifier = authContainer.resolve('jwtVerifier') as JWTVerifier;
    const payload = await jwtVerifier.verify(token);
    
    if (!payload || !payload.user) {
      console.log('[Session Utils] Token verification failed or missing user data', 
        payload ? 'Invalid payload structure' : 'Token verification failed');
      return null;
    }
    
    return payload as Session;
  } catch (error) {
    console.error('Error retrieving session:', error);
    return null;
  }
}

/**
 * Check if the current user has a specific role
 */
export async function hasRole(role: string | string[]): Promise<boolean> {
  const session = await getSession();
  
  if (!session || !session.user) {
    return false;
  }
  
  const roles = Array.isArray(role) ? role : [role];
  return roles.includes(session.user.role);
}

/**
 * Check if the current user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null && !!session.user;
}

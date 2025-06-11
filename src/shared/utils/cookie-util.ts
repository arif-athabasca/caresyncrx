/**
 * Cookie Utility for Auth System
 * 
 * This utility provides functions for working with cookies in Next.js,
 * with special attention to authentication cookies.
 */

import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Parse cookie string into an object
 * Works in both server and client environments
 */
export function parseCookies(cookieString: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  
  if (!cookieString) {
    return cookies;
  }
  
  const pairs = cookieString.split(';');
  
  for (const pair of pairs) {
    const [name, value] = pair.trim().split('=');
    if (name) {
      cookies[name] = value || '';
    }
  }
  
  return cookies;
}

/**
 * Get specific auth cookies from a request
 */
export function getAuthCookies(request: NextRequest) {
  return {
    accessToken: request.cookies.get('accessToken')?.value,
    refreshToken: request.cookies.get('refreshToken')?.value,
    authRefreshToken: request.cookies.get('authRefreshToken')?.value,
    deviceFingerprint: request.cookies.get('deviceFingerprint')?.value,
    lastActivity: request.cookies.get('lastActivity')?.value,
    refreshNeeded: request.cookies.get('refreshNeeded')?.value,
  };
}

/**
 * Set auth cookies on a response
 */
export function setAuthCookies(
  response: NextResponse,
  { 
    accessToken, 
    refreshToken, 
    expiresIn = 900 // 15 minutes
  }: { 
    accessToken: string; 
    refreshToken: string; 
    expiresIn?: number;
  }
) {
  // Set access token cookie
  response.cookies.set({
    name: 'accessToken',
    value: accessToken,
    maxAge: expiresIn,
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  
  // Set refresh token cookie
  response.cookies.set({
    name: 'refreshToken',
    value: refreshToken,
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  
  // Also set legacy cookie name for backward compatibility
  response.cookies.set({
    name: 'authRefreshToken',
    value: refreshToken,
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  
  return response;
}

/**
 * Clear all auth cookies from a response
 */
export function clearAuthCookies(response: NextResponse) {
  const cookiesToClear = [
    'accessToken',
    'refreshToken',
    'authRefreshToken',
    'lastActivity',
    'refreshNeeded'
  ];
  
  for (const name of cookiesToClear) {
    response.cookies.set({
      name,
      value: '',
      maxAge: 0,
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
  }
  
  return response;
}

/**
 * Check if a cookie exists in the server component context
 */
export function hasCookie(name: string): boolean {
  return cookies().has(name);
}

/**
 * Get a cookie value in the server component context
 */
export function getCookie(name: string): string | undefined {
  return cookies().get(name)?.value;
}

/**
 * Check if auth cookies are present in the server component context
 */
export function hasAuthCookies(): boolean {
  return hasCookie('accessToken') || hasCookie('refreshToken');
}

/**
 * Client-side function to safely get a cookie value
 */
export function getClientCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  
  const cookies = parseCookies(document.cookie);
  return cookies[name] || null;
}

// Export default for backward compatibility
export default {
  parseCookies,
  getAuthCookies,
  setAuthCookies,
  clearAuthCookies,
  hasCookie,
  getCookie,
  hasAuthCookies,
  getClientCookie
};

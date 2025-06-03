/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Security Headers Middleware
 * Adds important security headers to all responses to protect against common web vulnerabilities
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware function to add security headers to responses
 * 
 * @param request - The incoming request
 * @param response - The outgoing response to modify
 * @returns Modified response with security headers
 */
export function addSecurityHeaders(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  // Content Security Policy - Controls resources the browser is allowed to load
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'"
  );
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Protection against clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Cross-site scripting protection
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Control browser features and APIs
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );
  
  // HSTS - Forces browsers to use HTTPS for future requests
  // Only in production to avoid issues with local development
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  
  // Referrer Policy - Controls information sent in the Referer header
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}

/**
 * Middleware handler function to add security headers
 * 
 * @param request - The incoming request
 * @returns Response with security headers
 */
export default function securityHeadersMiddleware(
  request: NextRequest
): NextResponse {
  const response = NextResponse.next();
  return addSecurityHeaders(request, response);
}

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Security Middleware Composition
 * Integrates all security middleware components for unified protection
 */

import { NextRequest, NextResponse } from 'next/server';
import securityHeadersMiddleware from './security-headers';
import sanitizationMiddleware from './sanitization';
import csrfMiddleware from './csrf';
import contentTypeMiddleware from './content-type';
import { enhancedRateLimitMiddleware } from './rate-limit';
import mandatory2FAMiddleware from './mandatory-2fa';
import { logSecurityEventFromRequest } from '../services/security-audit';
import { SecurityEventType, SecurityEventSeverity } from '../services/security-audit';

/**
 * Combined security middleware handler that applies all security layers
 * 
 * @param request - The incoming request
 * @returns Processed response with all security measures applied
 */
export async function applySecurityMiddleware(
  request: NextRequest
): Promise<NextResponse> {
  const path = new URL(request.url).pathname;
  
  try {
    // 1. Check rate limits and IP blocks first
    const rateLimitResult = await enhancedRateLimitMiddleware(request);
    if (rateLimitResult) {
      // Log rate limit exceeded event
      await logSecurityEventFromRequest(
        request,
        SecurityEventType.RATE_LIMIT_EXCEEDED,
        SecurityEventSeverity.WARNING,
        `Rate limit exceeded for path: ${path}`
      );
      return rateLimitResult;
    }
    
    // 2. Validate content type - reject immediately if invalid
    const contentTypeResult = contentTypeMiddleware(request);
    if (contentTypeResult) {
      // Log content type violation
      await logSecurityEventFromRequest(
        request,
        SecurityEventType.ACCESS_DENIED,
        SecurityEventSeverity.WARNING,
        `Invalid content type for path: ${path}`
      );
      return contentTypeResult;
    }
      // 3. Check CSRF protection - if it returns a response, there's an error
    const csrfResult = await csrfMiddleware(request);
    if (csrfResult) {
      // Log CSRF violation
      await logSecurityEventFromRequest(
        request,
        SecurityEventType.ACCESS_DENIED,
        SecurityEventSeverity.WARNING,
        `CSRF validation failed for path: ${path}`
      );
      return csrfResult;
    }
    
    // 4. Check mandatory 2FA requirements
    const twoFactorResult = await mandatory2FAMiddleware(request);
    if (twoFactorResult) {
      // Log 2FA requirement
      await logSecurityEventFromRequest(
        request,
        SecurityEventType.TWO_FACTOR_FAILURE,
        SecurityEventSeverity.INFO,
        `2FA verification required for path: ${path}`
      );
      return twoFactorResult;
    }
    
    // 5. Apply input sanitization
    const sanitizedResponse = await sanitizationMiddleware(request);
    
    // 6. Add security headers to the response
    const securityHeadersResponse = securityHeadersMiddleware(request);
    
    // Merge the headers from both middleware
    for (const [key, value] of securityHeadersResponse.headers.entries()) {
      sanitizedResponse.headers.set(key, value);
    }
    
    return sanitizedResponse;
  } catch (error) {
    // Log the error
    await logSecurityEventFromRequest(
      request,
      SecurityEventType.OTHER,
      SecurityEventSeverity.WARNING,
      `Error applying security middleware: ${error instanceof Error ? error.message : 'Unknown error'}`
    ).catch(console.error);
    
    console.error('Error applying security middleware:', error);
    
    // Fallback to adding at least security headers
    const securedResponse = securityHeadersMiddleware(request);
    
    return securedResponse;
  }
}

export default applySecurityMiddleware;

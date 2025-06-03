/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Unit tests for security middleware
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { addSecurityHeaders } from '../src/shared/middleware/security-headers';
import { sanitizeString, sanitizeObject } from '../src/shared/middleware/sanitization';
import { isCSRFExempt, generateCSRFToken, validateCSRFToken } from '../src/shared/middleware/csrf';
import { isValidContentType, hasSafeContentType } from '../src/shared/middleware/content-type';
import { applySecurityMiddleware } from '../src/shared/middleware/security';

describe('Security Middleware Tests', () => {
  // Security Headers Tests
  describe('Security Headers Middleware', () => {
    it('should add all required security headers', () => {
      // Mock request and response
      const request = new NextRequest('https://example.com');
      const response = NextResponse.next();
      
      // Apply security headers
      const result = addSecurityHeaders(request, response);
      
      // Verify headers were added
      expect(result.headers.has('Content-Security-Policy')).toBe(true);
      expect(result.headers.has('X-Content-Type-Options')).toBe(true);
      expect(result.headers.has('X-Frame-Options')).toBe(true);
      expect(result.headers.has('X-XSS-Protection')).toBe(true);
      expect(result.headers.has('Permissions-Policy')).toBe(true);
      expect(result.headers.has('Referrer-Policy')).toBe(true);
    });
    
  it('should add HSTS header only in production environment', () => {
      // Save original env
      const originalEnv = process.env.NODE_ENV;
      
      // Use a mock approach instead of direct assignment
      const mockEnv = vi.spyOn(process.env, 'NODE_ENV', 'get');
      
      // Test in production
      mockEnv.mockReturnValue('production');
      const request = new NextRequest('https://example.com');
      const prodResponse = NextResponse.next();
      const prodResult = addSecurityHeaders(request, prodResponse);
      expect(prodResult.headers.has('Strict-Transport-Security')).toBe(true);
      
      // Test in development
      mockEnv.mockReturnValue('development');
      const devResponse = NextResponse.next();
      const devResult = addSecurityHeaders(request, devResponse);
      expect(devResult.headers.has('Strict-Transport-Security')).toBe(false);
      
      // Restore mock
      mockEnv.mockRestore();
    });
  });

  // Sanitization Tests
  describe('Sanitization Middleware', () => {
    it('should sanitize input strings with XSS payloads', () => {
      const malicious = '<script>alert("XSS")</script>Hello world';
      const sanitized = sanitizeString(malicious);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Hello world');
    });
    
    it('should recursively sanitize objects with XSS payloads', () => {
      const obj = {
        name: 'User <script>alert("XSS")</script>',
        details: {
          bio: 'Bio <img src="x" onerror="alert(1)">',
          website: 'https://example.com'
        }
      };
      
      const sanitized = sanitizeObject(obj);
      
      expect(sanitized.name).not.toContain('<script>');
      expect(sanitized.details.bio).not.toContain('onerror');
      expect(sanitized.details.website).toBe('https://example.com');
    });
  });

  // CSRF Tests
  describe('CSRF Middleware', () => {
    it('should identify paths exempt from CSRF protection', () => {
      expect(isCSRFExempt('/api/auth/login')).toBe(true);
      expect(isCSRFExempt('/api/auth/logout')).toBe(true);
      expect(isCSRFExempt('/webhook/stripe')).toBe(true);
      expect(isCSRFExempt('/api/prescriptions/create')).toBe(false);
      expect(isCSRFExempt('/api/users/update')).toBe(false);
    });
    
    it('should generate different CSRF tokens for different users', () => {
      const token1 = generateCSRFToken('user1');
      const token2 = generateCSRFToken('user2');
      
      expect(token1).not.toBe(token2);
    });
      it('should validate matching CSRF tokens', async () => {
      const token = await generateCSRFToken('user1');
      
      expect(validateCSRFToken(token, token)).toBe(true);
      expect(validateCSRFToken(token, 'invalid-token')).toBe(false);
      expect(validateCSRFToken(token, '')).toBe(false);
    });
  });

  // Content Type Tests
  describe('Content Type Middleware', () => {
    it('should validate content types correctly', () => {
      expect(isValidContentType('application/json', 'json')).toBe(true);
      expect(isValidContentType('application/json; charset=utf-8', 'json')).toBe(true);
      expect(isValidContentType('text/plain', 'json')).toBe(false);
      expect(isValidContentType('multipart/form-data', 'form')).toBe(true);
    });
    
    it('should detect unsafe content types', () => {
      const safeRequest = new NextRequest('https://example.com/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const unsafeRequest = new NextRequest('https://example.com/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-malicious'
        }
      });
      
      expect(hasSafeContentType(safeRequest)).toBe(true);
      expect(hasSafeContentType(unsafeRequest)).toBe(false);
    });
  });

  // Integrated Security Middleware Tests
  describe('Integrated Security Middleware', () => {
    it('should apply all security measures', async () => {
      const request = new NextRequest('https://example.com/api/data', {
        method: 'GET'
      });
      
      const response = await applySecurityMiddleware(request);
      
      // Verify security headers were applied
      expect(response.headers.has('Content-Security-Policy')).toBe(true);
      expect(response.headers.has('X-Frame-Options')).toBe(true);
    });
  });
});

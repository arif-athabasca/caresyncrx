/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Sanitization Middleware
 * Provides input/output sanitization to protect against XSS and injection attacks
 */

import { NextRequest, NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';
import * as validator from 'validator';

// Initialize DOMPurify with a DOM implementation
const window = new JSDOM('').window;
const purify = DOMPurify(window);

// Configure DOMPurify to be very strict
purify.setConfig({
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'ol', 'li', 'br', 'span'],
  ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class', 'data-id'],
  ALLOW_DATA_ATTR: false,
  ADD_ATTR: ['target="_blank"', 'rel="noopener noreferrer"'],
  SANITIZE_DOM: true,
  WHOLE_DOCUMENT: false,
});

/**
 * Sanitize a string value to prevent XSS attacks
 * 
 * @param value - The string to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(value: string): string {
  if (typeof value !== 'string') return '';
  return purify.sanitize(value);
}

/**
 * Recursively sanitize an object's string values
 * 
 * @param obj - The object to sanitize
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = {} as T;
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key as keyof T] = sanitizeString(value) as any;
    } else if (value && typeof value === 'object') {
      result[key as keyof T] = sanitizeObject(value) as any;
    } else {
      result[key as keyof T] = value as any;
    }
  }
  
  return result;
}

/**
 * Validate content based on expected type
 * 
 * @param value - The value to validate
 * @param type - The expected type (email, url, numeric, etc)
 * @returns Boolean indicating if valid
 */
export function validateContent(value: string, type: string): boolean {
  if (typeof value !== 'string') return false;
  
  switch (type.toLowerCase()) {
    case 'email':
      return validator.isEmail(value);
    case 'url':
      return validator.isURL(value);
    case 'numeric':
      return validator.isNumeric(value);
    case 'alphanumeric':
      return validator.isAlphanumeric(value);
    case 'date':
      return validator.isISO8601(value);
    default:
      return true; // No specific validation
  }
}

/**
 * Middleware to sanitize request body content
 *
 * @param request - The incoming request
 * @returns Modified request with sanitized body
 */
export async function sanitizeRequestData(request: NextRequest): Promise<NextRequest> {
  // Clone the request to make it mutable
  const mutableRequest = request.clone();
  
  try {
    // If there's a JSON body, sanitize it
    if (request.headers.get('content-type')?.includes('application/json')) {
      const body = await request.json();
      const sanitizedBody = sanitizeObject(body);
      
      // Create a new request with the sanitized body
      const newRequest = new NextRequest(request.url, {
        method: request.method,
        headers: request.headers,
        body: JSON.stringify(sanitizedBody),
      });
      
      return newRequest;
    }
  } catch (error) {
    console.error('Error sanitizing request:', error);
  }
  
  return mutableRequest as NextRequest;
}

/**
 * Middleware to sanitize response data
 *
 * @param response - The outgoing response
 * @returns Modified response with sanitized content
 */
export async function sanitizeResponseData(response: NextResponse): Promise<NextResponse> {
  try {
    // Check if the response has JSON content
    if (response.headers.get('content-type')?.includes('application/json')) {
      const body = await response.json();
      const sanitizedBody = sanitizeObject(body);
      
      // Create a new response with sanitized content
      return NextResponse.json(sanitizedBody, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }
  } catch (error) {
    console.error('Error sanitizing response:', error);
  }
  
  return response;
}

/**
 * Main sanitization middleware handler
 * 
 * @param request - The incoming request
 * @returns Sanitized response
 */
export default async function sanitizationMiddleware(
  request: NextRequest
): Promise<NextResponse> {
  // Sanitize incoming request data
  const sanitizedRequest = await sanitizeRequestData(request);
  
  // Pass the sanitized request to the next middleware/handler
  const response = NextResponse.next({
    request: sanitizedRequest,
  });
  
  // Sanitize outgoing response data
  const sanitizedResponse = await sanitizeResponseData(response);
  
  return sanitizedResponse;
}

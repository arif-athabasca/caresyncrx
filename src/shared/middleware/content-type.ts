/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Content Type Middleware
 * Validates and enforces proper content types for API requests/responses
 */

import { NextRequest, NextResponse } from 'next/server';

// Valid MIME types for different content categories
const VALID_MIME_TYPES = {
  // Common JSON types
  json: [
    'application/json',
    'application/ld+json'
  ],
  // Form submissions
  form: [
    'application/x-www-form-urlencoded',
    'multipart/form-data'
  ],
  // Text content
  text: [
    'text/plain',
    'text/html',
    'text/css',
    'text/javascript',
    'text/markdown'
  ],
  // Image content
  image: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ],
  // Document content
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
};

// Content type requirements for different paths
const PATH_CONTENT_REQUIREMENTS = [
  {
    pathPattern: /^\/api\/(?!auth)/,  // All API paths except auth
    allowedTypes: ['json'],
    methods: ['POST', 'PUT', 'PATCH']
  },
  {
    pathPattern: /^\/api\/files\/upload/,
    allowedTypes: ['form'],
    methods: ['POST']
  },
  {
    pathPattern: /^\/api\/documents/,
    allowedTypes: ['json', 'document'],
    methods: ['POST', 'PUT']
  }
];

/**
 * Check if a content type is valid for a given category
 * 
 * @param contentType - The content type to check
 * @param category - The category to validate against
 * @returns True if valid, false otherwise
 */
export function isValidContentType(contentType: string, category: string): boolean {
  const validTypes = VALID_MIME_TYPES[category as keyof typeof VALID_MIME_TYPES];
  if (!validTypes) return false;
  
  // Check if the content type starts with any of the valid types
  // This handles types with parameters like application/json; charset=UTF-8
  return validTypes.some(valid => contentType.startsWith(valid));
}

/**
 * Get all valid content types as a flattened array
 */
export function getAllValidContentTypes(): string[] {
  return Object.values(VALID_MIME_TYPES).flat();
}

/**
 * Check if a content type is allowed for a specific path and method
 * 
 * @param pathname - The request path
 * @param method - The request method
 * @param contentType - The content type to check
 * @returns True if allowed, false otherwise
 */
export function isAllowedContentType(
  pathname: string, 
  method: string, 
  contentType: string
): boolean {
  // If no content type, check isn't relevant
  if (!contentType) return true;
  
  // Find matching path requirements
  const matchingPath = PATH_CONTENT_REQUIREMENTS.find(
    path => path.pathPattern.test(pathname) && path.methods.includes(method)
  );
  
  // If no specific requirements, allow any valid content type
  if (!matchingPath) return true;
  
  // Check if the content type matches any of the allowed categories
  return matchingPath.allowedTypes.some(
    category => isValidContentType(contentType, category)
  );
}

/**
 * Set the appropriate content type header on the response
 * 
 * @param response - The response to modify
 * @param contentType - The content type to set
 * @returns Modified response with content type header
 */
export function setResponseContentType(
  response: NextResponse,
  contentType: string
): NextResponse {
  if (!response.headers.has('content-type')) {
    response.headers.set('Content-Type', contentType);
  }
  return response;
}

/**
 * Check if a request has a safe content type
 * 
 * @param request - The request to check
 * @returns True if safe, false otherwise
 */
export function hasSafeContentType(request: NextRequest): boolean {
  const contentType = request.headers.get('content-type') || '';
  
  // For GET requests, content type is less relevant
  if (request.method === 'GET') return true;
  
  // For POST/PUT requests, check against our list of valid types
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    // If no content type is specified for data-changing methods, that's suspicious
    if (!contentType && request.body) return false;
    
    // If specified, it should be one we recognize
    if (contentType) {
      const isValid = getAllValidContentTypes().some(valid => 
        contentType.startsWith(valid)
      );
      return isValid;
    }
  }
  
  return true;
}

/**
 * Middleware function for content type validation
 * 
 * @param request - The incoming request
 * @returns Response or null if validation passes
 */
export default function contentTypeMiddleware(request: NextRequest): NextResponse | null {
  const pathname = new URL(request.url).pathname;
  const contentType = request.headers.get('content-type') || '';
  
  // Skip content type check for GET, HEAD and OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return null; // Continue request processing
  }
  
  // For methods that typically have a body, enforce safe content types
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    if (!hasSafeContentType(request)) {
      return NextResponse.json(
        { message: 'Unsupported or missing content type' },
        { status: 415 }
      );
    }
    
    // Check if content type is allowed for this specific path
    if (contentType && !isAllowedContentType(pathname, request.method, contentType)) {
      return NextResponse.json(
        { message: `Content type ${contentType} not allowed for this endpoint` },
        { status: 415 }
      );
    }
  }
  
  // All checks passed
  return null;
}

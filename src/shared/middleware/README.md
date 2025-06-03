# CareSyncRx Security Middleware

This directory contains security middleware components for the CareSyncRx platform.

## Overview

The security middleware provides several layers of protection for the application:

1. **Security Headers**: Sets important security headers on all responses to protect against common web vulnerabilities.
2. **Content Type Validation**: Ensures that requests use appropriate content types for different endpoints.
3. **CSRF Protection**: Defends against Cross-Site Request Forgery attacks.
4. **Sanitization**: Cleanses input and output to prevent XSS and injection attacks.
5. **Enhanced Rate Limiting**: Implements advanced rate limiting based on endpoint types.
6. **IP Blocking**: Automatically blocks suspicious IP addresses.
7. **Mandatory 2FA**: Enforces two-factor authentication for administrative users and sensitive operations.
8. **Security Auditing**: Records and analyzes security events for regular review.

## Components

### Security Headers (`security-headers.ts`)

Adds security headers to responses:

- Content Security Policy: Controls resources the browser is allowed to load
- X-Content-Type-Options: Prevents MIME type sniffing
- X-Frame-Options: Protection against clickjacking
- X-XSS-Protection: Cross-site scripting protection
- Permissions-Policy: Controls browser features and APIs
- Strict-Transport-Security: Forces browsers to use HTTPS (in production)
- Referrer-Policy: Controls information sent in the Referer header

### Content Type Validation (`content-type.ts`)

Validates and enforces proper content types for API requests/responses:

- Ensures endpoints receive the expected content types
- Rejects requests with unexpected or invalid content types
- Specifies content type requirements for different paths

### CSRF Protection (`csrf.ts`)

Implements Cross-Site Request Forgery protection:

- Generates and validates CSRF tokens for sensitive operations
- Adds CSRF tokens to responses as secure cookies
- Extracts and validates tokens from incoming requests

### Sanitization (`sanitization.ts`)

Provides input/output sanitization:

- Sanitizes string values to prevent XSS attacks
- Recursively sanitizes object properties
- Validates content based on expected types (email, URL, etc.)

### Advanced Rate Limiting

Implements advanced rate limiting based on endpoint categories:

- Different limits for authentication, 2FA, data mutations, and data reads
- Automatically detects and blocks suspicious IP addresses
- Tracks failed login attempts to prevent brute force attacks

### Mandatory 2FA (`mandatory-2fa.ts`)

Enforces two-factor authentication:

- Requires 2FA for administrative users
- Enforces 2FA for sensitive operations and endpoints
- Redirects users to set up or verify 2FA when necessary

### Security Integration (`security.ts`)

Combines all security middleware components:

1. Applies rate limiting and IP blocking
2. Validates content type
3. Checks CSRF protection
4. Enforces 2FA requirements
5. Applies input sanitization
6. Adds security headers to the response
7. Logs security events for auditing

## Usage

The security middleware is automatically integrated into the Next.js middleware pipeline.
Each component can also be used independently if needed.

### Example: Using Security Headers Middleware

```typescript
import { addSecurityHeaders } from '@/shared/middleware/security-headers';

// In an API route or middleware
export async function GET(request) {
  const response = NextResponse.json({ data: 'example' });
  return addSecurityHeaders(request, response);
}
```

## Configuration

Security settings are defined within each middleware component. Default configurations are provided,
but can be adjusted based on application needs.

## Testing and Auditing

The CareSyncRx platform includes comprehensive security testing and auditing tools:

```bash
# Run security middleware unit tests
npm run test:security

# Test the security implementation (requires database)
npm run security:test

# Generate a security audit report
npm run security:audit

# Ensure database schema is in sync and run security tests
npm run db:sync
```

Security events are automatically logged to the database and can be analyzed using the security audit report tool.

# CareSyncRx Security Documentation

This document consolidates all security-related documentation for the CareSyncRx application.


## Security

# CareSyncRx Security Documentation

This directory contains documentation for the security features of the CareSyncRx platform.

## Security Documentation Files

- **[security-guide.md](./security-guide.md)**: Comprehensive overview of all security measures
- **[security-testing.md](./security-testing.md)**: Instructions for security testing

## Key Security Components

The CareSyncRx platform implements multiple layers of security:

### 1. Security Middleware

- **Security Headers**: Protection against common web vulnerabilities
- **Content Type Validation**: Ensures appropriate content types for requests
- **CSRF Protection**: Defends against Cross-Site Request Forgery
- **Input/Output Sanitization**: Prevents XSS and injection attacks

### 2. Advanced Security Features

- **Enhanced Rate Limiting**: Protection against abuse based on endpoint type
- **IP Blocking**: Automatic blocking of suspicious activity
- **Mandatory 2FA**: Required two-factor authentication for administrative access
- **Security Auditing**: Recording and analysis of security-related events

### 3. Security Tools

The platform includes several security-related tools:

```bash
# Test all security middleware components
npm run test:security

# Test the security implementation with the database (fixed version)
npm run security:test

# Generate a security audit report
npm run security:audit

# Ensure database schema is in sync for security features
npm run prisma:security

# Run all security checks (sync DB and test implementation)
npm run db:sync
```

### Windows PowerShell Testing

On Windows systems, you can also use the PowerShell script:

```powershell
# Run the security implementation test using PowerShell
.\scripts\Test-SecurityImplementation.ps1
```

## Implementation Details

For implementation details, refer to:

- Security middleware: `src/shared/middleware/`
- Security services: `src/shared/services/`
- Security testing: `test/security-middleware.test.ts`
- Security audit tools: `scripts/run-security-audit.js`
- Security implementation test: 
  - Fixed version: `scripts/test-security-implementation.fixed.js`
  - Original version: `scripts/test-security-implementation.js`
  - PowerShell helper: `scripts/Test-SecurityImplementation.ps1`


---


## Security Guide

# CareSyncRx Security Guide

This document provides a comprehensive overview of the security measures implemented in the CareSyncRx platform.

## Security Layers

The CareSyncRx platform implements multiple layers of security:

1. **Security Headers** - Protection against common web vulnerabilities
2. **Content Type Validation** - Ensures appropriate request content types
3. **CSRF Protection** - Defends against Cross-Site Request Forgery attacks 
4. **Input/Output Sanitization** - Prevents XSS and injection attacks
5. **Enhanced Rate Limiting** - Protects against abuse and brute force attacks
6. **IP Blocking** - Blocks suspicious IP addresses
7. **Mandatory 2FA** - Requires two-factor authentication for administrative access
8. **Security Auditing** - Records and analyzes security events

## Rate Limiting and IP Blocking

Different endpoints have different rate limiting configurations:

| Endpoint Type | Time Window | Max Requests | Purpose |
|--------------|------------|-------------|---------|
| Auth Endpoints | 15 minutes | 10 | Prevent brute force login attempts |
| 2FA Endpoints | 5 minutes | 5 | Prevent brute force 2FA attempts |
| Mutation APIs | 1 minute | 30 | Protect data-changing operations |
| Read APIs | 1 minute | 60 | Allow more read operations than writes |
| Default | 1 minute | 100 | General protection for all endpoints |

IP blocking is automatically triggered after:
- 10 failed login attempts within 30 minutes
- Exceeding rate limits repeatedly
- Other suspicious activity patterns

## Two-Factor Authentication (2FA)

Two-factor authentication is:
- **Optional** for standard users
- **Mandatory** for users with administrative roles
- **Required** for accessing sensitive endpoints

2FA methods supported:
- Time-based One-Time Password (TOTP) via authenticator apps
- Recovery codes for backup access

## Security Events Auditing

The platform records security events such as:
- Authentication attempts (successful and failed)
- Two-factor authentication events
- Access denied events
- Rate limiting and IP blocking
- Sensitive data access
- System configuration changes

Security audit reports can be generated using:

```bash
npm run security:audit
```

This will generate a report with:
- Summary statistics
- Critical security events
- Suspicious IP addresses
- Suspicious user activity
- Recommendations for improving security

## Security Configuration

### Headers

The following security headers are applied to all responses:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload (production only)
Referrer-Policy: strict-origin-when-cross-origin
```

### CSRF Protection

CSRF protection is applied to all POST, PUT, PATCH, and DELETE requests except for:
- Authentication endpoints
- Webhooks
- External APIs

## Regular Security Practices

### Regular Audits

It is recommended to:
1. Run security audits weekly
2. Review critical events daily
3. Analyze login patterns monthly
4. Test the security configuration quarterly

### Security Response

Follow these steps when security events occur:
1. Investigate critical events immediately
2. Analyze the context and potential impact
3. Implement appropriate remediation
4. Document the event and response
5. Update security measures if needed

## Development Guidelines

When developing new features:

1. Always validate and sanitize input
2. Apply proper access controls
3. Include appropriate rate limiting
4. Write tests for security measures
5. Document security considerations

## Security Testing

To run security tests:

```bash
npm run test:security
```

## Recommended Security Tools

Additional recommended security tools:
- OWASP ZAP for vulnerability scanning
- SonarQube for code quality and security analysis
- Snyk for dependency vulnerability scanning
- Burp Suite for manual penetration testing


---


## Security Improvements

# CareSyncRx Security Improvements

## Recent Security Enhancements

### 1. Browser Back Button Fix
We've implemented a comprehensive solution to fix the issue where users were being redirected to the login page when using the browser back button. This was achieved by:

- Creating a centralized `TokenStorage` utility to manage authentication tokens consistently
- Adding proper cache control headers to prevent caching of authenticated pages
- Improving token refresh mechanisms to handle expired tokens more gracefully
- Ensuring admin users are directed to the admin dashboard after login

### 2. Idle Session Timeout Implementation
We've implemented a security feature that automatically logs users out after a period of inactivity:

#### Configuration
- Timeout duration is set to 30 minutes by default in `auth-config.ts`
- This can be adjusted using the `IDLE_TIMEOUT_MS` environment variable

#### How It Works
1. **Activity Tracking**:
   - User activity is monitored via mouse movements, keyboard actions, etc.
   - A timestamp is stored in both localStorage and cookies
   - The middleware updates the activity timestamp on every authenticated request

2. **Timeout Detection**:
   - A timer checks for user inactivity
   - If no activity is detected for the configured timeout period, the user is logged out
   - The user is redirected to the login page with a timeout message

3. **Security Benefits**:
   - Protects sensitive information if a user leaves their workstation
   - Reduces the risk of unauthorized access to the application
   - Complies with healthcare security best practices for authentication

## Security Compliance

All security implementations are aligned with the CareSyncRx security requirements and industry best practices:

1. **Token Security**:
   - Short-lived access tokens (15 minutes)
   - Secure token storage with both HTTP-only cookies and localStorage
   - Token verification in middleware
   - Proper handling of refresh tokens

2. **Authentication Security**:
   - Configurable password policies
   - Account lockout after failed attempts
   - Two-factor authentication support
   - Comprehensive security audit logging

3. **Session Security**:
   - HTTPS enforcement in production
   - Secure cookie settings
   - Cache control headers
   - Idle session timeout

## Testing

The browser back button fix and idle timeout feature have been tested in multiple scenarios:

1. **Navigation Testing**:
   - Login and navigation between various pages
   - Forward and back button navigation
   - Direct URL access

2. **Timeout Testing**:
   - Confirmed timeout after the configured period of inactivity
   - Verified activity tracking resets the timer
   - Tested that server requests are counted as activity

## Next Steps

1. **Monitor Effectiveness**: Watch for any user reports of authentication issues
2. **Consider Timeout Warning**: Implement a warning dialog before automatic logout
3. **Security Dashboard**: Create an admin view to monitor security events including session timeouts


---


## Security Logging

# CareSyncRx Security Logging Documentation

## Overview

CareSyncRx implements comprehensive security logging across the application to track all security-relevant events. This document outlines the security logging architecture and provides guidance on how to use it effectively.

## Security Logging Architecture

### Dual Logging System

The system implements a dual logging approach:

1. **AuditLog** - General purpose activity logging
2. **SecurityAuditLog** - Specialized security-focused logging with enhanced details

### Key Components

- **SecurityAuditService** (`src/shared/services/security-audit.ts`) - Core service for security event logging
- **AuthSecurityLogger** (`src/auth/services/utils/auth-security-logger.ts`) - Specialized logger for auth events
- **Security Audit Scripts** - Tools for analyzing security logs and generating reports

## Security Event Types

The system logs various security event types, including:

- Authentication events (login success/failure, logout)
- Password management events (reset, change)
- Two-factor authentication events (setup, success, failure)
- Access control events (permission changes, access denied)
- System configuration events (setting changes, policy updates)
- Rate limiting and blocking events

## Using the Security Logging System

### Logging Authentication Events

```typescript
import { AuthSecurityLogger } from '../auth/services/utils/auth-security-logger';

// Log successful login
await AuthSecurityLogger.logLoginSuccess({
  userId: user.id,
  username: user.email,
  ipAddress: req.ip,
  userAgent: req.headers.get('user-agent')
});

// Log failed login
await AuthSecurityLogger.logLoginFailure({
  username: email,
  reason: 'Invalid credentials',
  ipAddress: req.ip,
  userAgent: req.headers.get('user-agent')
});
```

### Logging Direct Security Events

```typescript
import { SecurityEventType, SecurityEventSeverity, logSecurityEvent } from '../shared/services/security-audit';

// Log a security event
await logSecurityEvent({
  type: SecurityEventType.SECURITY_POLICY_CHANGE,
  severity: SecurityEventSeverity.WARNING,
  userId: adminId,
  username: adminEmail,
  description: 'Password policy updated',
  metadata: { policyChanges: changes }
});
```

## Security Audit Reports

Run the security audit report to analyze security events:

```bash
npm run security:audit
```

The report provides:
- Summary statistics of security events
- List of critical security events
- Detection of suspicious IP addresses
- Detection of suspicious user activity
- Security recommendations

## Testing Security Logging

To test the security logging implementation:

```bash
npm run security:test:logs
```

This script simulates different security events and verifies the logs are created correctly.

## Best Practices

1. **Always log security events** - Ensure all security-relevant activities are logged
2. **Include contextual information** - Add details like IP address, user agent, timestamps
3. **Regular audits** - Review security logs regularly to identify suspicious patterns
4. **Don't log sensitive data** - Avoid logging passwords, tokens, or other sensitive information
5. **Use correct severity levels** - INFO for normal activities, WARNING for suspicious events, CRITICAL for immediate threats

## Troubleshooting

If security events aren't being logged properly:

1. Check the database connection to ensure logs can be written
2. Verify the correct logging methods are being called
3. Run the security logging test script to diagnose issues
4. Check for errors in the server logs related to security logging

## Additional Resources

- See `docs/security-guide.md` for general security practices
- See `docs/security-testing.md` for guidance on security testing
- Review the `SecurityAuditLog` schema in `prisma/schema.prisma`


---


## Security Testing

# Security Testing Documentation

This document outlines how to test the security middleware components in CareSyncRx.

## Unit Tests

The security middleware components have unit tests in `test/security-middleware.test.ts`. These tests verify:

1. Security Headers: Headers are correctly applied to responses
2. Sanitization: Input strings and objects are properly sanitized
3. CSRF Protection: Tokens are correctly generated and validated
4. Content Type Validation: Content types are correctly validated
5. Integrated Security: All components work together correctly

### Running Unit Tests

To run the security middleware tests:

```bash
# Run all tests
npm test

# Run only security middleware tests
npm test -- -t "Security Middleware Tests"
```

## Manual Testing

### Security Headers

You can verify security headers are being applied using browser developer tools:

1. Open your browser's developer tools (F12)
2. Navigate to any page in the application
3. Select the "Network" tab
4. Click on the page request (typically the first HTML request)
5. Examine the "Response Headers" section
6. Verify the presence of security headers:
   - Content-Security-Policy
   - X-Content-Type-Options
   - X-Frame-Options
   - X-XSS-Protection
   - Permissions-Policy
   - Referrer-Policy

### CSRF Protection

To test CSRF protection:

1. Try submitting forms with and without proper CSRF tokens
2. Verify that form submissions without valid CSRF tokens are rejected
3. Use a tool like Burp Suite to modify CSRF tokens and confirm protection

### Content Type Validation

To test content type validation:

1. Use a tool like Postman or curl to send requests with invalid content types
2. Verify that the API correctly rejects requests with inappropriate content types
3. Test with valid content types to ensure proper functionality

### Input Sanitization

To test input sanitization:

1. Try submitting forms with potential XSS payloads
2. Verify that the rendered output does not execute malicious scripts
3. Inspect the stored data to ensure it has been properly sanitized


---


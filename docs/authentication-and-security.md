# CareSyncRx Authentication and Security Documentation

*Last Updated: June 15, 2025*

This comprehensive document covers the authentication system and security implementations in the CareSyncRx application.

## Table of Contents

1. [Authentication System Overview](#authentication-system-overview)
2. [Security Architecture](#security-architecture)
3. [Current Security Features](#current-security-features)
4. [Token Management](#token-management)
5. [Device Fingerprinting](#device-fingerprinting)
6. [Cookie Management](#cookie-management)
7. [Middleware Implementation](#middleware-implementation)
8. [Two-Factor Authentication](#two-factor-authentication)
9. [Rate Limiting](#rate-limiting)
10. [Security Best Practices](#security-best-practices)
11. [Testing and Validation](#testing-and-validation)
12. [Future Recommendations](#future-recommendations)

## Authentication System Overview

The CareSyncRx authentication system uses a hybrid approach combining client-side auth scripts with backend TokenUtil services to provide secure, stateless authentication.

### Core Components

#### Client-Side Authentication

- **auth-core.js**: Central client-side authentication manager
- **auth-session.js**: Handles user session management
- **auth-interceptor.js**: Intercepts API requests to add auth headers
- **auth-integration.js**: Integrates auth system with the application

#### Server-Side Authentication

- **TokenUtil**: Service for generating and verifying JWT tokens
- **Middleware**: NextJS middleware for route protection
- **API Routes**: Endpoints for login, logout, refresh, and verification
- **TwoFactorAuthService**: Service for managing 2FA setup and verification

#### Storage Strategy

Authentication uses a multi-layered storage approach:
- HTTP-only cookies for secure token storage
- Local storage as fallback for specific scenarios
- Device fingerprinting for enhanced security

## Security Architecture

The CareSyncRx application implements a comprehensive security architecture:

1. **Authentication**: JWT-based authentication with proper token management
2. **Authorization**: Role-based access control for different user types
3. **Data Protection**: Encryption for sensitive data
4. **API Security**: Advanced rate limiting and input validation
5. **Two-Factor Authentication**: TOTP-based 2FA with backup codes
6. **Security Headers**: Proper HTTP security headers
7. **CSRF Protection**: Protection against cross-site request forgery
8. **Audit Logging**: Comprehensive security event logging

## Current Security Features

### 1. Rate Limiting and Protection

The application implements a robust rate limiting system to protect against brute force attacks and API abuse:

- IP-based rate limiting on authentication endpoints (10 requests per 15 minutes)
- Rate limiting for 2FA verification (5 requests per 5 minutes)
- API rate limiting for mutations (30 requests per minute) and reads (60 requests per minute)
- Account lockout mechanism after failed login attempts
- Distributed rate limiting with Redis (falls back to in-memory storage if Redis is unavailable)
- Separate configurations for different endpoint sensitivities

### 2. Two-Factor Authentication

A complete two-factor authentication system is implemented with the following features:

- TOTP-based 2FA implementation using the speakeasy library
- QR code generation for easy setup with authenticator apps
- Backup codes for account recovery
- Mandatory 2FA for sensitive operations and admin roles
- Support for multiple 2FA methods (TOTP with plans for SMS and Email)
- Rate limiting of 2FA verification attempts

### 3. Audit Logging

Comprehensive logging of security events:

- Detailed authentication event logging
- Security audit trail for suspicious activities
- Login attempt tracking with IP and device information
- Token usage and refresh logging
- 2FA setup and verification attempts

## Token Management

The token system uses a dual-token approach:

- **Access Token**: Short-lived token (15 minutes) for API authorization
- **Refresh Token**: Longer-lived token (7 days) for obtaining new access tokens

### Token Generation

```javascript
// Generate tokens with user payload and device fingerprint
const tokens = TokenUtil.generateTokens(userPayload, deviceFingerprint);
```

### Token Verification

```javascript
// Verify token with appropriate type and fingerprint
const payload = TokenUtil.verifyToken(accessToken, TokenType.ACCESS, userFingerprint);
```

### JWT Token Structure

```javascript
{
  "id": "user-uuid",
  "email": "user@example.com",
  "role": "DOCTOR",
  "clinicId": "clinic-uuid",
  "fingerprint": "device-fingerprint-hash",
  "iat": 1685432000,
  "exp": 1685435600,
  "type": "ACCESS"
}
```

## Device Fingerprinting

Device fingerprinting enhances security by binding tokens to specific devices:

- Generated from browser characteristics (user-agent, language, platform)
- Stored in cookies and embedded in tokens
- Verified during token validation
- Helps prevent token theft and replay attacks

## Cookie Management

Cookies are managed securely with the following properties:

- **httpOnly**: Prevents JavaScript access to cookies containing tokens
- **secure**: Only transmitted over HTTPS
- **sameSite**: Strict or Lax setting to prevent CSRF
- **maxAge**: Appropriate expiration times

### Cookie Utility Functions

```javascript
// Get auth cookies from request
export function getAuthCookies(request) {
  return {
    accessToken: request.cookies.get('accessToken')?.value,
    refreshToken: request.cookies.get('refreshToken')?.value,
    deviceFingerprint: request.cookies.get('deviceFingerprint')?.value
  };
}

// Clear auth cookies in response
export function clearAuthCookies(response) {
  // Clear all auth-related cookies
  response.cookies.delete('accessToken');
  response.cookies.delete('refreshToken');
  // Additional cookies...
  return response;
}
```

## Middleware Implementation

The NextJS middleware handles authentication for protected routes:

- Extracts tokens from cookies or headers
- Verifies token validity and type
- Checks device fingerprint
- Enforces mandatory 2FA where required
- Redirects to login for invalid tokens
- Applies security headers

## Two-Factor Authentication

The application implements TOTP-based two-factor authentication:

### Setup Process

1. User initiates 2FA setup from account settings
2. System generates a secret key and QR code
3. User scans QR code with authenticator app
4. User verifies setup by entering a code from the app
5. System enables 2FA and provides backup codes

### Verification Process

1. User logs in with username and password
2. System challenges user for 2FA code
3. User enters code from authenticator app
4. System verifies code and completes authentication
5. Backup codes can be used if authenticator is unavailable

### Backup Codes

- 10 single-use backup codes are generated during setup
- Codes are formatted as XXXXX-XXXXX for readability
- Used codes are immediately invalidated
- Users can regenerate backup codes if needed

### Mandatory 2FA

- Enforced for administrative users (ADMIN, SUPER_ADMIN)
- Required for sensitive operations
- Configured through environment variables

## Rate Limiting

The rate limiting system provides protection against abuse:

### Implementation Details

- Distributed rate limiting using Redis
- In-memory fallback when Redis is unavailable
- IP-based rate limiting for anonymous requests
- Combined user+IP rate limiting for authenticated requests
- Different limits for different endpoint types

### Rate Limit Configurations

- **Authentication**: 10 requests per 15 minutes
- **Two-Factor Authentication**: 5 requests per 5 minutes
- **API Mutations**: 30 requests per minute
- **API Reads**: 60 requests per minute
- **Token Refresh**: 5 requests per 10 minutes

### Protection Mechanisms

- Account lockout after 10 failed login attempts in 30 minutes
- IP blocking for suspicious activity
- Graduated response to repeated failures
- Comprehensive logging of rate limit events

## Security Best Practices

The application follows these security best practices:

1. **Password Security**:
   - Bcrypt hashing with appropriate work factor
   - Password complexity requirements
   - Brute force protection

2. **Input Validation**:
   - Server-side validation using Zod schemas
   - Client-side validation for UX
   - Sanitization of user inputs

3. **Security Headers**:
   - Content-Security-Policy
   - X-XSS-Protection
   - X-Content-Type-Options
   - Referrer-Policy
   - Strict-Transport-Security

4. **Secure Defaults**:
   - Conservative permissions
   - Least privilege principle
   - Defense in depth approach

## Testing and Validation

The authentication system has been tested with:

- Unit tests for token generation and verification
- Integration tests for authentication flow
- Rate limit testing under load conditions
- Two-factor authentication flow testing
- Security audits and penetration testing

## Future Recommendations

1. **Token Improvements**:
   - Implement token rotation for enhanced security
   - Consider shorter token lifetimes with automatic silent refresh
   - Add JTI (JWT ID) for token revocation

2. **Security Enhancements**:
   - Implement real-time security analytics dashboard
   - Conduct regular penetration testing (quarterly)
   - Consider hardware security key support (WebAuthn/FIDO2)

3. **Monitoring and Alerting**:
   - Enhance real-time monitoring of authentication failures
   - Implement automated security alerts for suspicious patterns
   - Create scheduled security report generation

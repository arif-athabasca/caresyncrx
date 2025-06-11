# CareSyncRx Authentication and Security Documentation

*Last Updated: June 10, 2025*

This comprehensive document covers the authentication system and security implementations in the CareSyncRx application.

## Table of Contents

1. [Authentication System Overview](#authentication-system-overview)
2. [Recent Authentication Fixes](#recent-authentication-fixes)
3. [Security Architecture](#security-architecture)
4. [Implementation Details](#implementation-details)
5. [Token Management](#token-management)
6. [Device Fingerprinting](#device-fingerprinting)
7. [Cookie Management](#cookie-management)
8. [Middleware Implementation](#middleware-implementation)
9. [UI Components](#ui-components)
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

#### Storage Strategy

Authentication uses a multi-layered storage approach:
- HTTP-only cookies for secure token storage
- Local storage as fallback for specific scenarios
- Device fingerprinting for enhanced security

## Recent Authentication Fixes

*June 10, 2025*

The following issues were fixed in the authentication system:

1. **Token Verification Failures**: Fixed issues with JWT token verification in middleware
2. **Cookie Handling**: Improved cookie management to ensure tokens are properly stored and retrieved
3. **Fingerprint Tracking**: Added device fingerprinting for enhanced security and consistent token verification
4. **Diagnostics**: Created diagnostic tools to help debug future authentication issues
5. **Logout Button**: Fixed missing logout button in the UI

### Changes Made

#### Middleware Improvements

- Enhanced token verification in `middleware.ts` to use fingerprinting for added security
- Improved error handling with detailed logging of token issues
- Added consistent fingerprint generation and storage in cookies
- Fixed proper extraction of tokens from various sources (cookies, headers)

#### Cookie Utility

Created a dedicated cookie utility (`src/shared/utils/cookie-util.ts`) that provides:

- Consistent cookie parsing and management
- Helper functions for getting and setting auth cookies
- Support for both client and server-side cookie access
- Proper cookie security settings (httpOnly, sameSite, secure)

#### UI Improvements

- Added a persistent logout button to the main application layout
- Implemented a dedicated `LogoutButton` component for consistent logout behavior
- Updated the logout flow to properly clear cookies and local storage
- Fixed the logout API endpoint to clear all auth-related cookies

## Security Architecture

The CareSyncRx application implements a comprehensive security architecture:

1. **Authentication**: JWT-based authentication with proper token management
2. **Authorization**: Role-based access control for different user types
3. **Data Protection**: Encryption for sensitive data
4. **API Security**: Rate limiting and input validation
5. **Security Headers**: Proper HTTP security headers
6. **CSRF Protection**: Protection against cross-site request forgery
7. **Audit Logging**: Comprehensive security event logging

## Implementation Details

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

### Authentication Flow

1. **Login**: User submits credentials to `/api/auth/login`
2. **Token Generation**: Server validates credentials and generates access and refresh tokens
3. **Token Storage**: Tokens are stored in HTTP-only cookies
4. **Token Verification**: Middleware verifies token validity on protected routes
5. **Token Refresh**: Client automatically refreshes tokens when needed
6. **Logout**: Tokens are invalidated and cookies cleared

### Role-Based Access Control

Access control is implemented using role-based permissions:

- **ADMIN**: Full system access
- **DOCTOR**: Patient and prescription management
- **NURSE**: Patient data view and limited updates
- **PATIENT**: Personal information and prescriptions only
- **PHARMACY**: Prescription fulfillment and inventory

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
- Redirects to login for invalid tokens
- Applies security headers

## UI Components

### LogoutButton Component

A reusable component for consistent logout behavior across the application:

```jsx
export default function LogoutButton({ className = '', redirectPath = '' }) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    // Call logout API and handle redirection
    // Clear client-side storage
  };
  
  return (
    <button
      onClick={handleLogout}
      className={`logout-button ${className}`}
    >
      {isLoggingOut ? 'Logging out...' : 'Logout'}
    </button>
  );
}
```

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

3. **Rate Limiting**:
   - IP-based rate limiting on authentication endpoints
   - Account lockout after failed attempts
   - Graduated response to suspicious activity

4. **Security Headers**:
   - Content-Security-Policy
   - X-XSS-Protection
   - X-Content-Type-Options
   - Referrer-Policy
   - Strict-Transport-Security

5. **Secure Defaults**:
   - Conservative permissions
   - Least privilege principle
   - Defense in depth approach

## Testing and Validation

The authentication system has been tested with:

- Unit tests for token generation and verification
- Integration tests for authentication flow
- Real-world scenario testing
- Security audits and penetration testing

## Future Recommendations

1. **Token Improvements**:
   - Implement token rotation for enhanced security
   - Consider shorter token lifetimes with automatic silent refresh
   - Add JTI (JWT ID) for token revocation

2. **Security Enhancements**:
   - Add rate limiting to authentication endpoints
   - Implement comprehensive auth flow logging
   - Consider adding two-factor authentication for sensitive operations
   - Regular security audits and penetration testing

3. **Monitoring and Alerting**:
   - Real-time monitoring of authentication failures
   - Alerts for suspicious activities
   - Regular review of security logs

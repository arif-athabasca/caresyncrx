# CareSyncRx Authentication System

## Overview

This document serves as the main entry point for the CareSyncRx authentication system. The authentication system has been completely overhauled to address persistent issues with unexpected redirects to the login page.

## Architecture

The authentication system consists of:

1. **Client-side Components**:
   - **TokenManager**: JavaScript-based token management in `public/token-management.js`
   - **AuthNavigation**: Handles auth-related navigation in `public/auth-navigation.js`
   - **AuthVerification**: Verifies auth status on page load in `public/auth-verification.js`
   - **AuthErrorHandler**: Handles auth errors in `public/auth-error-handler.js`
   - **AuthLogout**: Manages logout operations in `public/auth-logout.js`

2. **Server-side Components**:
   - API routes for login, logout, refresh, and user information
   - Middleware for protecting API routes

3. **React Integration**:
   - `useAuth` hook in `src/auth/hooks/useAuth.tsx`
   - `withRoleProtection` HOC in `src/auth/components/withRoleProtection.tsx`
   - Authentication context provider in `src/auth/hooks/useAuth.tsx`

## Key Features

- **Unified Token Management**: Consolidated approach to token storage and validation
- **TypeScript Integration**: TypeScript definitions for all JavaScript-based auth objects
- **Device Identity**: Enhanced device fingerprinting and identification
- **Browser Navigation Handling**: Proper handling of back/forward navigation
- **Error Handling**: Improved error detection and recovery

## Documentation

1. [Authentication System Overhaul](./overhaul.md) - Comprehensive overview of the authentication system changes
2. [Testing Guide](./testing-guide.md) - Guide for testing the authentication system
3. [Cleanup Summary](./cleanup-summary.md) - Summary of the cleanup process
4. [Device Identity Guide](./device-identity-guide.md) - Guide for the device identity system
5. [Usage Guide](./usage-guide.md) - Guide for using the authentication system in your components

## Testing

To test the authentication system:

1. Run `Test-AuthIntegration.ps1` to test individual components
2. Run `Test-AuthRealWorldFlow.ps1` to test real-world user flows

## Validation

To validate the authentication system:

1. Run `node scripts/validate-auth-module.cjs` to verify that all required files are present

## Troubleshooting

If you encounter issues with the authentication system:

1. Check the browser console for errors
2. Review the documentation
3. Run the validation script to ensure all components are present
4. Run the test scripts to verify functionality

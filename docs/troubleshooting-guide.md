# Troubleshooting Guide for Browser Navigation and Idle Timeout

This document provides guidance for troubleshooting common issues with browser back button navigation and idle timeout functionality in the CareSyncRx application.

## Browser Back Button Issues

### Issue: User is redirected to login page when using back button

**Possible causes and solutions:**

1. **Cache Control Headers Misconfiguration**
   - Check the cache control headers in `middleware.ts`
   - Ensure they are set to `private, max-age=0, must-revalidate` rather than `no-store`
   - Verify that the Vary header includes necessary values like `Authorization` and `x-user-id`

2. **Token Refresh Failure**
   - Check browser console for token refresh API errors
   - Verify that the refresh token is being properly stored in both cookies and localStorage
   - Check `useAuth.tsx` to ensure token refresh logic is working correctly

3. **Navigation State Not Persisting**
   - Verify that `TokenStorage.storeNavigationState()` is being called on page navigation
   - Check that `sessionStorage` is being used correctly to store navigation paths
   - Ensure `router.replace()` is being used for auth redirects instead of `router.push()`

4. **Browser Cache Issues**
   - Try clearing browser cache and cookies
   - Test in an incognito/private window
   - Try a different browser to isolate browser-specific issues

## Idle Timeout Issues

### Issue: Idle timeout not working correctly

**Possible causes and solutions:**

1. **Timer Functions Not Working**
   - Check console for errors related to `resetIdleTimer` or other timeout functions
   - Verify that the `useIdleTimeout` hook is exporting the correct function names
   - Check that `IdleTimeoutProvider` is correctly using these functions

2. **Activity Events Not Registered**
   - Verify that user activity events (mouse movement, clicks, etc.) are being captured
   - Check that event listeners are properly added in the `useIdleTimeout` hook
   - Ensure that `TokenStorage.updateLastActivity()` is being called on activity

3. **Timeout Configuration**
   - Check the `AUTH_CONFIG.SECURITY.IDLE_TIMEOUT_MS` value in `auth-config.ts`
   - Verify that environment variables are being correctly loaded if used
   - Try a shorter timeout duration for testing (e.g., 1 minute instead of 30 minutes)

4. **Component Order/Hierarchy**
   - Ensure that `IdleTimeoutProvider` is correctly wrapping the application in `layout.tsx`
   - Verify that it's placed inside the `AuthProvider` to have access to authentication state

## React Hook Issues

### Issue: "ReferenceError: useEffect is not defined" or similar hook errors

**Possible causes and solutions:**

1. **Missing React Hook Import**
   - Check that React hooks (useState, useEffect, etc.) are properly imported at the top of component files
   - Add the missing import, e.g.: `import { useState, useEffect } from 'react';`
   - Common missing imports are in dashboard or admin pages

2. **Hook Rules Violation**
   - Ensure hooks are only called at the top level of functional components
   - Hooks should not be called inside loops, conditions, or nested functions
   - Make sure hooks are called in the same order on every render

3. **Component Type Issues**
   - Verify that hooks are only used in functional components, not class components
   - Check if the component is accidentally defined as a class or arrow function that doesn't support hooks

4. **Server Component vs. Client Component**
   - Ensure that components using hooks are properly marked with `'use client';` at the top of the file
   - Hooks can only be used in client components, not server components

## Testing and Verification

### Quick Tests for Browser Navigation:

```powershell
# Run the back button navigation test script
.\scripts\Test-BackButtonNavigation.ps1
```

### Quick Tests for Idle Timeout:

```powershell
# Run the idle timeout test script with a short timeout
.\scripts\Test-IdleTimeout.ps1
```

## Collecting Debugging Information

If you need to gather more information for troubleshooting:

1. **Enable Browser Console Logging**
   - Open browser developer tools (F12)
   - Go to the Console tab
   - Set log level to include all messages (Verbose)
   - Look for errors or warnings related to authentication, tokens, or timeouts

2. **Check Network Requests**
   - In browser developer tools, go to the Network tab
   - Filter for API requests to `/api/auth/refresh` or `/api/auth/me`
   - Check request headers, response headers, and response data

3. **Examine Local and Session Storage**
   - In browser developer tools, go to the Application tab
   - Look under Storage > Local Storage and Session Storage
   - Check for authentication-related items and their values

4. **Review Cookie Values**
   - In browser developer tools, go to the Application tab
   - Look under Storage > Cookies
   - Verify that auth-related cookies are present with correct expiration times

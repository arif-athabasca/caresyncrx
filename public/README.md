# Authentication Scripts

This directory contains the client-side authentication scripts for CareSyncRx.

## Files Overview

- **auth-core.js**: Core authentication module that manages tokens and authentication state
- **auth-integration.js**: Compatibility layer between frontend auth and backend TokenUtil
- **auth-interceptor.js**: HTTP request interceptor that adds auth headers and handles token refresh
- **auth-session.js**: Manages user sessions and idle timeout detection
- **auth-diagnostics.js**: Diagnostic tool to help identify auth system issues

## Important Notes

1. These scripts must be loaded in the order listed above.
2. `auth-core.js` was previously named `auth-core-fixed.js` and replaced the original file with syntax errors.
3. Do not modify these files without thorough testing as they are critical to the authentication system.

## Maintenance

When updating these scripts:

1. Test changes thoroughly in both development and staging environments
2. Ensure compatibility with backend authentication services
3. Update the auth-system-architecture.md documentation if significant changes are made
4. Consider adding additional diagnostic logging for any new functionality

## History

- June 10, 2025: Removed redundant auth-core files (auth-core-fixed.js, auth-core-new.js, auth-core-consolidated.js)
- June 10, 2025: Consolidated all auth-core files into a single auth-core.js file
- June 9, 2025: Consolidated auth-core-fixed.js into auth-core.js
- May 25, 2025: Added auth-diagnostics.js to help troubleshoot auth issues
- May 22, 2025: Restored TokenUtil compatibility with auth-integration.js
- May 20, 2025: Created auth-core-fixed.js to fix syntax errors in auth-core.js
- May 15, 2025: Initial implementation of the new authentication system

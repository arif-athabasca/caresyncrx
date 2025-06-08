# Using the Authentication System

This guide explains how to use the authentication system in your components and pages.

## Basic Authentication

### 1. Using the useAuth Hook

The simplest way to access authentication data is through the `useAuth` hook:

```tsx
import { useAuth } from '@/auth/hooks/useAuth';

function MyComponent() {
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <div>Please log in to access this content.</div>;
  }
  
  return (
    <div>
      <h1>Welcome, {user?.email}</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### 2. Protecting Routes with withRoleProtection

To protect entire pages or components based on user roles:

```tsx
import { withRoleProtection } from '@/auth/components/withRoleProtection';
import { UserRole } from '@/auth';

function AdminDashboard() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      {/* Admin-only content */}
    </div>
  );
}

// Only allow admins to access this component
export default withRoleProtection(AdminDashboard, {
  allowedRoles: [UserRole.ADMIN],
  redirectPath: '/login'
});
```

## Authentication Functions

### Login

```tsx
const { login } = useAuth();

const handleLogin = async (email, password) => {
  try {
    const result = await login(email, password);
    
    // Handle 2FA if required
    if (result.requiresTwoFactor) {
      // Redirect to 2FA page
      router.push(`/verify-2fa?token=${result.tempToken}`);
      return;
    }
    
    // Normal login success
    router.push('/dashboard');
  } catch (error) {
    console.error('Login failed:', error);
    // Handle login error
  }
};
```

### Logout

```tsx
const { logout } = useAuth();

const handleLogout = async () => {
  await logout();
  // Redirect happens automatically in the logout function
};
```

### Verify 2FA

```tsx
const { verify2FALogin } = useAuth();

const handleVerify2FA = async (tempToken, code) => {
  try {
    const result = await verify2FALogin(tempToken, code);
    
    if (result.success) {
      router.push('/dashboard');
    } else {
      // Handle verification error
      setError(result.error || 'Verification failed');
    }
  } catch (error) {
    console.error('2FA verification failed:', error);
    // Handle verification error
  }
};
```

## Working with Token Storage

In most cases, you should use the `useAuth` hook for authentication operations. However, if you need direct access to tokens, you can use the `TokenStorage` utility:

```tsx
import { TokenStorage } from '@/auth/utils/token-storage';

// Get tokens
const accessToken = TokenStorage.getAccessToken();
const refreshToken = TokenStorage.getRefreshToken();

// Check token expiration
const isExpired = TokenStorage.isAccessTokenExpired();

// Store navigation state (for returning after login)
TokenStorage.storeNavigationState(window.location.pathname);
```

## Browser Support

The authentication system is designed to work with all modern browsers and handles:

- Browser back/forward navigation
- Page refresh
- Opening new tabs
- Browser caching

## Troubleshooting

If you encounter authentication issues:

1. Check the browser console for errors
2. Verify that all required auth scripts are loaded
3. Run the validation script: `npm run validate:auth`
4. Test the auth system: `npm run test:auth`
5. Refer to the [authentication system documentation](./README.md) for more information

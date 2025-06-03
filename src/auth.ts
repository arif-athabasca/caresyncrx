/**
 * Main Auth Module Entry Point
 * 
 * This file serves as the main entry point for the auth module.
 * It re-exports components from specific files to avoid circular dependencies.
 */

// Config exports
export { AUTH_CONFIG } from './auth/config';

// Utils exports
export { TokenStorage } from './auth/utils/token-storage';
export { TokenUtil } from './auth/utils/token-util';
export { DeviceIdentityService } from './auth/utils/device-identity-service';
export { passwordValidator } from './auth/utils/password-validator';

// Service exports
export { AuthService } from './auth/services/implementations/AuthService';
export { TwoFactorAuthService } from './auth/services/implementations/TwoFactorAuthService';

// Type exports
export type { User, UserRole, LoginRequest, LoginResponse, RefreshTokenRequest, RefreshTokenResponse } 
  from './auth/services/models/auth-models';

// Constants
export const AUTH_VERSION = '2.0.0';
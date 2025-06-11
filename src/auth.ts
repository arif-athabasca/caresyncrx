/**
 * Main Auth Module Entry Point
 * 
 * This file serves as the main entry point for the auth module.
 * It re-exports components from specific files to avoid circular dependencies.
 */

// Config exports
export { AUTH_CONFIG } from './auth/config';

// Utils exports
export { DeviceIdentityService } from './auth/utils/device-identity-service';
export { passwordValidator, passwordSchema } from './auth/utils/password-validator';
export { TokenUtil } from './auth/utils/token-util';

// Service exports
export { AuthService } from './auth/services/implementations/AuthService';
export { TwoFactorAuthService } from './auth/services/implementations/TwoFactorAuthService';

// Enum exports
export { UserRole, TokenType, LoginStatus, TwoFactorMethod, AuthEventType } from './auth/enums';

// Type exports
export type { AuthTokens, UserCredentials, AuthResponse, UserProfile } 
  from './auth/services/models/auth-models';

// Constants
export const AUTH_VERSION = '2.0.0';
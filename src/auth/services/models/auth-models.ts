/**
 * Auth Models
 * 
 * This file contains TypeScript interfaces and types for the authentication system.
 */

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken?: string;
  expiresAt: number;
}

export interface UserCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  success: boolean;
  tokens?: AuthTokens;
  error?: string;
  user?: UserProfile;
  requiresTwoFactor?: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  permissions: string[];
  lastLogin?: Date;
}

export interface DeviceInfo {
  deviceId: string;
  userAgent: string;
  ipAddress?: string;
  lastUsed: Date;
  isTrusted: boolean;
}

export interface TwoFactorAuthRequest {
  username: string;
  code: string;
  deviceId?: string;
}

export enum AuthErrorType {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN = 'UNKNOWN'
}

export type AuthEventType = 
  | 'login'
  | 'logout' 
  | 'token_refresh'
  | 'login_failed'
  | 'session_expired'
  | '2fa_required'
  | '2fa_success'
  | '2fa_failed';

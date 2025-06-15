/**
 * Auth Models
 * 
 * This file contains TypeScript interfaces and types for the authentication system.
 */
import { UserRole } from '@/enums';

/**
 * Input for login operations
 */
export interface LoginInput {
  email: string;
  password: string;
  deviceId?: string;
  rememberMe?: boolean;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Input for user registration
 */
export interface RegisterInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  clinicId?: string;
}

/**
 * Token pair containing access and refresh tokens
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * Token payload structure
 */
export interface TokenPayload {
  id: string;
  email: string;
  role: UserRole;
  clinicId?: string;
  twoFactorEnabled?: boolean;
}

/**
 * Basic authenticated user information
 */
export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  clinicId?: string;
  twoFactorEnabled?: boolean;
}

/**
 * Authentication result returned after successful login
 */
export interface AuthResult {
  user: AuthUser;
  tokens: TokenPair;
  requiresTwoFactor?: boolean;
}

/**
 * Password change input
 */
export interface PasswordChange {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

/**
 * Device information
 */
export interface Device {
  id: string;
  name?: string;
  deviceId?: string;
  userAgent?: string;
  lastUsed: Date;
}

/**
 * Legacy interfaces maintained for compatibility
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

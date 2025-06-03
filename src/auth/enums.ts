/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Authentication enumerations for the CareSyncRx platform.
 */

/**
 * Types of tokens used in the authentication system
 */
export enum TokenType {
  ACCESS = 'ACCESS',
  REFRESH = 'REFRESH',
  TEMP = 'TEMP'
}

/**
 * Authentication event types for auditing and logging
 */
export enum AuthEventType {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  REGISTER = 'REGISTER',
  PASSWORD_RESET = 'PASSWORD_RESET',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  TWO_FACTOR_SETUP = 'TWO_FACTOR_SETUP',
  TWO_FACTOR_VERIFY = 'TWO_FACTOR_VERIFY',
  ACCOUNT_LOCK = 'ACCOUNT_LOCK',
  ACCOUNT_UNLOCK = 'ACCOUNT_UNLOCK',
  TOKEN_REFRESH = 'TOKEN_REFRESH'
}

/**
 * Login status codes returned from authentication attempts
 */
export enum LoginStatus {
  SUCCESS = 'SUCCESS',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  REQUIRES_2FA = 'REQUIRES_2FA',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',
  PASSWORD_EXPIRED = 'PASSWORD_EXPIRED'
}

/**
 * Two-factor authentication methods
 */
export enum TwoFactorMethod {
  TOTP = 'TOTP',
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  BACKUP_CODE = 'BACKUP_CODE'
}

/**
 * Enum defining the available user roles in the system.
 * These roles control access permissions throughout the application.
 */
export enum UserRole {
  DOCTOR = 'DOCTOR',
  NURSE = 'NURSE',
  PHARMACIST = 'PHARMACIST',
  ADMIN = 'ADMIN',
  PATIENT = 'PATIENT'
}

// Default exports for backward compatibility
export default {
  UserRole,
  TokenType,
  AuthEventType,
  LoginStatus,
  TwoFactorMethod
};
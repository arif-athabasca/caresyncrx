/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Re-export auth enums for easier imports
 */

// Define enums directly to avoid module resolution issues
export enum TokenType {
  ACCESS = 'ACCESS',
  REFRESH = 'REFRESH',
  TEMP = 'TEMP'
}

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

export enum LoginStatus {
  SUCCESS = 'SUCCESS',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  REQUIRES_2FA = 'REQUIRES_2FA',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',
  PASSWORD_EXPIRED = 'PASSWORD_EXPIRED'
}

export enum TwoFactorMethod {
  TOTP = 'TOTP',
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  BACKUP_CODE = 'BACKUP_CODE'
}

export enum UserRole {
  DOCTOR = 'DOCTOR',
  NURSE = 'NURSE',
  PHARMACIST = 'PHARMACIST',
  ADMIN = 'ADMIN',
  PATIENT = 'PATIENT'
}

// Also export as default for backward compatibility
export default {
  UserRole,
  TokenType,
  AuthEventType,
  LoginStatus,
  TwoFactorMethod
};

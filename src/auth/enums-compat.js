/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Backwards compatibility module for enums
 * This file ensures CommonJS compatibility for TypeScript enums
 */

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRole = exports.TokenType = exports.TwoFactorMethod = exports.LoginStatus = exports.AuthEventType = void 0;

// Define the enums directly
const UserRole = {
  DOCTOR: 'DOCTOR',
  NURSE: 'NURSE',
  PHARMACIST: 'PHARMACIST',
  ADMIN: 'ADMIN',
  PATIENT: 'PATIENT'
};
exports.UserRole = UserRole;

const TokenType = {
  ACCESS: 'ACCESS',
  REFRESH: 'REFRESH',
  TEMP: 'TEMP'
};
exports.TokenType = TokenType;

const AuthEventType = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  REGISTER: 'REGISTER',
  PASSWORD_RESET: 'PASSWORD_RESET',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  TWO_FACTOR_SETUP: 'TWO_FACTOR_SETUP',
  TWO_FACTOR_VERIFY: 'TWO_FACTOR_VERIFY',
  ACCOUNT_LOCK: 'ACCOUNT_LOCK',
  ACCOUNT_UNLOCK: 'ACCOUNT_UNLOCK',
  TOKEN_REFRESH: 'TOKEN_REFRESH'
};
exports.AuthEventType = AuthEventType;

const LoginStatus = {
  SUCCESS: 'SUCCESS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  REQUIRES_2FA: 'REQUIRES_2FA',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  PASSWORD_EXPIRED: 'PASSWORD_EXPIRED'
};
exports.LoginStatus = LoginStatus;

const TwoFactorMethod = {
  TOTP: 'TOTP',
  SMS: 'SMS',
  EMAIL: 'EMAIL',
  BACKUP_CODE: 'BACKUP_CODE'
};
exports.TwoFactorMethod = TwoFactorMethod;

// Export default for compatibility
exports.default = {
  UserRole,
  TokenType,
  AuthEventType,
  LoginStatus,
  TwoFactorMethod
};
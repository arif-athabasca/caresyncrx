/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Backwards compatibility module for enums
 * This file ensures CommonJS compatibility for TypeScript enums
 */

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwoFactorMethod = exports.LoginStatus = exports.AuthEventType = exports.TokenType = exports.NotificationType = exports.RxStatus = exports.DeviceStatus = exports.UserRole = void 0;

// Define the enums directly
const UserRole = {
  SUPER_ADMIN: 'SUDO',
  ADMIN: 'ADMIN',
  DOCTOR: 'DOCTOR',
  NURSE: 'NURSE',
  PHARMACIST: 'PHARMACIST',
  PATIENT: 'PATIENT',
  CAREGIVER: 'CAREGIVER',
  TECHNICIAN: 'TECHNICIAN',
  GUEST: 'GUEST'
};
exports.UserRole = UserRole;

// Re-export other enums from their respective files
var device_status_1 = require("./device-status");
Object.defineProperty(exports, "DeviceStatus", { enumerable: true, get: function () { return device_status_1.DeviceStatus; } });

var rx_status_1 = require("./rx-status");
Object.defineProperty(exports, "RxStatus", { enumerable: true, get: function () { return rx_status_1.RxStatus; } });

var notification_types_1 = require("./notification-types");
Object.defineProperty(exports, "NotificationType", { enumerable: true, get: function () { return notification_types_1.NotificationType; } });

// Auth related enums
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
  DeviceStatus: device_status_1.DeviceStatus,
  RxStatus: rx_status_1.RxStatus,
  NotificationType: notification_types_1.NotificationType,
  TokenType,
  AuthEventType,
  LoginStatus,
  TwoFactorMethod
};

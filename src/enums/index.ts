/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Central export point for all enums to ensure consistent imports
 */

// Re-export all enums from their respective files
export { UserRole } from './user-roles';
export { DeviceStatus } from './device-status';
export { RxStatus } from './rx-status';
export { NotificationType } from './notification-types';
export { TokenType, AuthEventType, LoginStatus, TwoFactorMethod } from './auth-types';

// Export default for compatibility with default imports
export default {
  UserRole: require('./user-roles').UserRole,
  DeviceStatus: require('./device-status').DeviceStatus,
  RxStatus: require('./rx-status').RxStatus,
  NotificationType: require('./notification-types').NotificationType,
  TokenType: require('./auth-types').TokenType,
  AuthEventType: require('./auth-types').AuthEventType,
  LoginStatus: require('./auth-types').LoginStatus,
  TwoFactorMethod: require('./auth-types').TwoFactorMethod
};

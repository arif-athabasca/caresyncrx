"use strict";
/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Central export point for all enums to ensure consistent imports
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwoFactorMethod = exports.LoginStatus = exports.AuthEventType = exports.TokenType = exports.RxStatus = exports.NotificationType = exports.DeviceStatus = exports.UserRole = void 0;

/**
 * Enum defining the available user roles in the system.
 * These roles control access permissions throughout the application.
 */
var UserRole;
(function (UserRole) {
  UserRole["SUPER_ADMIN"] = "SUDO";
  UserRole["ADMIN"] = "ADMIN";
  UserRole["DOCTOR"] = "DOCTOR";
  UserRole["NURSE"] = "NURSE";
  UserRole["PHARMACIST"] = "PHARMACIST";
  UserRole["PATIENT"] = "PATIENT";
  UserRole["CAREGIVER"] = "CAREGIVER";
  UserRole["TECHNICIAN"] = "TECHNICIAN";
  UserRole["GUEST"] = "GUEST";
})(UserRole = exports.UserRole || (exports.UserRole = {}));

var device_status_1 = require("./device-status");
Object.defineProperty(exports, "DeviceStatus", { enumerable: true, get: function () { return device_status_1.DeviceStatus; } });

var notification_types_1 = require("./notification-types");
Object.defineProperty(exports, "NotificationType", { enumerable: true, get: function () { return notification_types_1.NotificationType; } });

var rx_status_1 = require("./rx-status");
Object.defineProperty(exports, "RxStatus", { enumerable: true, get: function () { return rx_status_1.RxStatus; } });

// Auth related enums
var auth_types_1 = require("./auth-types");
Object.defineProperty(exports, "TokenType", { enumerable: true, get: function () { return auth_types_1.TokenType; } });
Object.defineProperty(exports, "AuthEventType", { enumerable: true, get: function () { return auth_types_1.AuthEventType; } });
Object.defineProperty(exports, "LoginStatus", { enumerable: true, get: function () { return auth_types_1.LoginStatus; } });
Object.defineProperty(exports, "TwoFactorMethod", { enumerable: true, get: function () { return auth_types_1.TwoFactorMethod; } });

// Export default for CommonJS compatibility
exports.default = {
  UserRole,
  DeviceStatus: device_status_1.DeviceStatus,
  NotificationType: notification_types_1.NotificationType,
  RxStatus: rx_status_1.RxStatus,
  TokenType: auth_types_1.TokenType,
  AuthEventType: auth_types_1.AuthEventType,
  LoginStatus: auth_types_1.LoginStatus,
  TwoFactorMethod: auth_types_1.TwoFactorMethod
};

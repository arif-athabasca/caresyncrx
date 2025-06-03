"use strict";
/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Central export point for all enums to ensure consistent imports
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RxStatus = exports.NotificationType = exports.DeviceStatus = exports.UserRole = void 0;

/**
 * Enum defining the available user roles in the system.
 * These roles control access permissions throughout the application.
 */
var UserRole;
(function (UserRole) {
  UserRole["DOCTOR"] = "DOCTOR";
  UserRole["NURSE"] = "NURSE";
  UserRole["PHARMACIST"] = "PHARMACIST";
  UserRole["ADMIN"] = "ADMIN";
  UserRole["PATIENT"] = "PATIENT";
})(UserRole = exports.UserRole || (exports.UserRole = {}));

var device_status_1 = require("./device-status");
Object.defineProperty(exports, "DeviceStatus", { enumerable: true, get: function () { return device_status_1.DeviceStatus; } });

var notification_types_1 = require("./notification-types");
Object.defineProperty(exports, "NotificationType", { enumerable: true, get: function () { return notification_types_1.NotificationType; } });

var rx_status_1 = require("./rx-status");
Object.defineProperty(exports, "RxStatus", { enumerable: true, get: function () { return rx_status_1.RxStatus; } });

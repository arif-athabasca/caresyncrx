"use strict";
/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * User role definitions for the CareSyncRx platform.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRole = void 0;
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
})(UserRole || (exports.UserRole = UserRole = {}));

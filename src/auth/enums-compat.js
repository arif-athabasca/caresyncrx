/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Backwards compatibility module for enums
 * This file forwards to the central enums for backward compatibility
 */

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRole = exports.TokenType = exports.TwoFactorMethod = exports.LoginStatus = exports.AuthEventType = void 0;

// Import from the central enums location
var enums_1 = require("../enums/enums-compat");

// Re-export for backward compatibility
Object.defineProperty(exports, "UserRole", { enumerable: true, get: function () { return enums_1.UserRole; } });
Object.defineProperty(exports, "TokenType", { enumerable: true, get: function () { return enums_1.TokenType; } });
Object.defineProperty(exports, "AuthEventType", { enumerable: true, get: function () { return enums_1.AuthEventType; } });
Object.defineProperty(exports, "LoginStatus", { enumerable: true, get: function () { return enums_1.LoginStatus; } });
Object.defineProperty(exports, "TwoFactorMethod", { enumerable: true, get: function () { return enums_1.TwoFactorMethod; } });

// Export default for compatibility
exports.default = {
  UserRole: enums_1.UserRole,
  TokenType: enums_1.TokenType,
  AuthEventType: enums_1.AuthEventType,
  LoginStatus: enums_1.LoginStatus,
  TwoFactorMethod: enums_1.TwoFactorMethod
};
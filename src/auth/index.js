"use strict";
/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * CommonJS compatibility layer for @/auth imports
 * This file handles module resolution for imports using the @/auth alias
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.simpleHash = exports.AUTH_CONFIG = exports.createEdgeSafeHash = exports.TokenUtil = exports.UserRole = exports.LoginStatus = exports.TwoFactorMethod = exports.AuthEventType = exports.TokenType = void 0;

// Import enums from enums-compat.js to avoid circular dependencies
var enums = require('./enums-compat');
exports.TokenType = enums.TokenType;
exports.AuthEventType = enums.AuthEventType;
exports.TwoFactorMethod = enums.TwoFactorMethod;
exports.LoginStatus = enums.LoginStatus;
exports.UserRole = enums.UserRole;

// Import utilities from utils.js
var utils = require("./utils");
exports.TokenUtil = utils.TokenUtil;
exports.createEdgeSafeHash = utils.createEdgeSafeHash;
exports.simpleHash = utils.simpleHash;

// Import config from config.js
var config = require("./config");
exports.AUTH_CONFIG = config.AUTH_CONFIG;

// Export as default for dynamic imports
exports.default = {
  ...enums,
  TokenUtil: exports.TokenUtil,
  createEdgeSafeHash: exports.createEdgeSafeHash,
  simpleHash: exports.simpleHash,
  AUTH_CONFIG: exports.AUTH_CONFIG
};

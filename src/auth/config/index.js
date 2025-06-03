"use strict";
/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Central export point for auth configuration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTH_CONFIG = void 0;
var auth_config_1 = require("./auth-config");
Object.defineProperty(exports, "AUTH_CONFIG", { enumerable: true, get: function () { return auth_config_1.AUTH_CONFIG; } });
// Also export as default for maximum compatibility
exports.default = { AUTH_CONFIG: auth_config_1.AUTH_CONFIG };

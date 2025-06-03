"use strict";
/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Central export point for enums folder
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.simpleHash = exports.createEdgeSafeHash = void 0;
var edge_safe_hash_js_1 = require("./edge-safe-hash.js");
exports.createEdgeSafeHash = edge_safe_hash_js_1.createEdgeSafeHash;
exports.simpleHash = edge_safe_hash_js_1.simpleHash;

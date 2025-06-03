"use strict";
/**
 * Edge-safe hashing utility functions that don't rely on Node.js crypto module
 * This allows our code to run in Edge Runtime environments
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEdgeSafeHash = exports.simpleHash = void 0;

/**
 * Simple string hashing function that works in Edge Runtime
 *
 * @param input - String to hash
 * @returns A hex-like string hash
 */
function simpleHash(input) {
    var hash = 0;
    for (var i = 0; i < input.length; i++) {
        var char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    // Convert to hex-like string
    return Math.abs(hash).toString(16).padStart(8, '0');
}
exports.simpleHash = simpleHash;

/**
 * Creates a SHA-256 like hash that's safe for Edge Runtime
 * This is a simplified version that returns an 8-character hash
 *
 * @param input - String to hash
 * @returns An 8-character hex-like hash string
 */
function createEdgeSafeHash(input) {
    return simpleHash(input).substring(0, 8);
}
exports.createEdgeSafeHash = createEdgeSafeHash;

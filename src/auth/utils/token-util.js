"use strict";
/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Token utility for handling JWT operations
 * 
 * WARNING: This utility is primarily for backend authentication services.
 * Frontend code should use the new auth system (auth-core.js, auth-session.js)
 * instead of directly calling these methods.
 * 
 * This utility was restored after the auth system cleanup to support
 * backend services that depend on it.
 */

const jwt = require('jsonwebtoken');
const { TokenType } = require('../enums');

// Load JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'caresyncrx-dev-secret-placeholder';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || `${JWT_SECRET}-refresh`;
const JWT_TEMP_SECRET = process.env.JWT_TEMP_SECRET || `${JWT_SECRET}-temp`;

// Time constants
const ONE_MINUTE = 60;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;

/**
 * Token utility for handling JWT operations
 */
class TokenUtilImpl {
  /**
   * Generate access and refresh tokens for a user
   * 
   * @param {Object} payload - Data to include in the tokens
   * @param {string} [deviceId] - Optional device ID to associate with tokens
   * @returns {Object} Object containing accessToken and refreshToken
   */
  generateTokens(payload, deviceId) {
    // Generate access token - valid for 15 minutes
    const accessToken = this.generateToken(payload, TokenType.ACCESS, '15m', deviceId);
    
    // Generate refresh token - valid for 7 days
    const refreshToken = this.generateToken(payload, TokenType.REFRESH, '7d', deviceId);
    
    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * ONE_MINUTE // 15 minutes
    };
  }
  
  /**
   * Generate a specific token
   * 
   * @param {Object} payload - Data to include in the token
   * @param {string} type - Token type (access, refresh, temp)
   * @param {string} expiry - Token expiry (e.g., '15m', '7d')
   * @param {string} [deviceId] - Optional device ID to associate with token
   * @returns {string} JWT token
   */  generateToken(payload, type, expiry, deviceId) {
    const secret = this.getSecretForType(type);
    
    // Add standard claims
    const tokenPayload = {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      type: type
    };
    
    // Add device ID if provided
    if (deviceId) {
      tokenPayload.deviceId = deviceId;
    }
      // Ensure the payload has a user property
    if (!tokenPayload.user) {
      tokenPayload.user = {
        id: payload.id,
        email: payload.email,
        role: payload.role,
        clinicId: payload.clinicId
      };
    }
    
    // Sign the token
    return jwt.sign(tokenPayload, secret, { expiresIn: expiry });
  }
  
  /**
   * Generate a temporary token for auth flows
   * 
   * @param {Object} payload - Data to include in the token
   * @param {string} [deviceId] - Optional device ID to associate with token
   * @returns {string} Temporary JWT token
   */
  generateTempToken(payload, deviceId) {
    return this.generateToken({ ...payload, temp: true }, TokenType.TEMP, '5m', deviceId);
  }
  
  /**
   * Verify and decode a token
   * 
   * @param {string} token - Token to verify
   * @param {string} type - Expected token type
   * @param {string} [fingerprint] - Optional fingerprint for additional verification
   * @returns {Object|null} Decoded token payload or null if invalid
   */
  verifyToken(token, type, fingerprint) {
    if (!token) return null;
    
    try {
      const secret = this.getSecretForType(type);
      
      // Verify the token
      const decoded = jwt.verify(token, secret);
      
      // Verify token type
      if (decoded.type !== type) {
        console.warn(`Token type mismatch: expected ${type}, got ${decoded.type}`);
        return null;
      }
      
      // Verify fingerprint if provided
      if (fingerprint && decoded.fingerprint && decoded.fingerprint !== fingerprint) {
        console.warn('Token fingerprint mismatch');
        return null;
      }
      
      return decoded;
    } catch (error) {
      console.error('Token verification failed:', error.message);
      return null;
    }
  }
  
  /**
   * Get the secret key for the specified token type
   * 
   * @param {string} type - Token type
   * @returns {string} Secret key
   */
  getSecretForType(type) {
    switch(type) {
      case TokenType.ACCESS:
        return JWT_SECRET;
      case TokenType.REFRESH:
        return JWT_REFRESH_SECRET;
      case TokenType.TEMP:
        return JWT_TEMP_SECRET;
      default:
        return JWT_SECRET;
    }
  }
}

// Export as singleton
exports.TokenUtil = new TokenUtilImpl();

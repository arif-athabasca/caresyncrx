"use strict";
/**
 * JWT token utilities for CareSyncRx authentication system.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenUtil = void 0;

const jwt = require("jsonwebtoken");
const config_1 = require("../config/index");
const enums_1 = require("../enums");
const edge_safe_hash_1 = require("./edge-safe-hash");

// Get JWT secrets from environment variables
function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is not set');
    }
    
    return secret;
}

function getRefreshTokenSecret() {
    const secret = process.env.JWT_REFRESH_SECRET;
    
    if (!secret) {
        throw new Error('JWT_REFRESH_SECRET environment variable is not set');
    }
    
    return secret;
}

/**
 * Generate a fingerprint from request details to enhance token security
 * This is a simplified version that works in Edge Runtime (no crypto)
 * 
 * @param userAgent - User agent string from request headers
 * @param ipAddress - IP address of client
 * @returns Simple fingerprint string
 */
function generateFingerprint(userAgent, ipAddress) {
    const fingerprint = `${userAgent || ''}:${ipAddress || ''}:${process.env.FINGERPRINT_SALT || 'default-salt'}`;
    
    // Add some entropy to make the fingerprint more stable across minor browser updates
    const stableComponents = [];
    
    if (userAgent) {
        // Extract just the browser family and major version which is more stable
        const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge|MSIE|Trident)\/(\d+)/i);
        if (browserMatch) {
            stableComponents.push(`${browserMatch[1]}-${browserMatch[2]}`);
        }
        
        // Extract OS information which is more stable
        const osMatch = userAgent.match(/(Windows|Mac OS X|iOS|Android|Linux)[^;)]*?(\d+[._]\d+)?/i);
        if (osMatch) {
            stableComponents.push(osMatch[0]);
        }
    }
    
    // Add stable components to fingerprint if we found any
    const enhancedFingerprint = stableComponents.length > 0 
        ? `${fingerprint}:${stableComponents.join(':')}`
        : fingerprint;
    
    // Use our edge-safe hash function instead of manual implementation
    return (0, edge_safe_hash_1.createEdgeSafeHash)(enhancedFingerprint);
}

/**
 * Utility class for JWT token operations
 */
class TokenUtil {
    /**
     * Generate access and refresh token pair for authenticated user
     * 
     * @param payload - User information to include in the token
     * @param deviceId - Optional device ID for token binding
     * @param userAgent - Optional user agent for fingerprinting
     * @param ipAddress - Optional IP address for fingerprinting
     * @returns Token pair containing access and refresh tokens and fingerprint
     */
    static generateTokens(payload, deviceId, userAgent, ipAddress) {
        // Create token payload with standard claims
        const tokenPayload = {
            id: payload.id,
            email: payload.email,
            role: payload.role,
            twoFactorEnabled: payload.twoFactorEnabled || false
        };
        
        // Add device ID if provided for enhanced security
        if (deviceId) {
            tokenPayload.deviceId = deviceId;
        }
        
        // Generate fingerprint for enhanced security if client data is available
        let fingerprint;
        
        if (userAgent || ipAddress) {
            fingerprint = generateFingerprint(userAgent, ipAddress);
            tokenPayload.fpHash = (0, edge_safe_hash_1.createEdgeSafeHash)(fingerprint).substring(0, 8);
        }
        
        // Generate the access token
        const accessToken = this.generateToken(
            tokenPayload,
            enums_1.TokenType.ACCESS,
            config_1.AUTH_CONFIG.TOKENS.ACCESS_TOKEN_EXPIRY
        );
        
        // Generate the refresh token
        const refreshToken = this.generateToken(
            tokenPayload,
            enums_1.TokenType.REFRESH,
            config_1.AUTH_CONFIG.TOKENS.REFRESH_TOKEN_EXPIRY
        );
        
        return {
            accessToken,
            refreshToken,
            fingerprint
        };
    }
    
    /**
     * Generate a temporary token for password reset, email verification, etc.
     * 
     * @param payload - Token payload data
     * @param deviceId - Optional device ID for binding the token to a specific device
     * @param userAgent - Optional user agent string for fingerprinting
     * @param ipAddress - Optional IP address for fingerprinting
     * @returns Temporary token string and optional fingerprint
     */
    static generateTempToken(payload, deviceId, userAgent, ipAddress) {
        // Create token payload with standard claims
        const tokenPayload = {
            id: payload.id,
            email: payload.email,
            role: payload.role,
        };
        
        // Add device ID if provided for enhanced security
        if (deviceId) {
            tokenPayload.deviceId = deviceId;
        }
        
        // Generate fingerprint for enhanced security if client data is available
        let fingerprint;
        
        if (userAgent || ipAddress) {
            fingerprint = generateFingerprint(userAgent, ipAddress);
            tokenPayload.fpHash = fingerprint ? (0, edge_safe_hash_1.createEdgeSafeHash)(fingerprint).substring(0, 8) : undefined;
        }
        
        // Generate the temporary token
        const token = this.generateToken(
            tokenPayload,
            enums_1.TokenType.TEMP,
            config_1.AUTH_CONFIG.TOKENS.TEMP_TOKEN_EXPIRY
        );
        
        return {
            token,
            fingerprint
        };
    }
    
    /**
     * Verify and decode a JWT token
     * 
     * @param token - JWT token string to verify
     * @param type - Type of token (access, refresh, temp)
     * @param fingerprint - Optional fingerprint for enhanced security
     * @returns Decoded token payload or null if verification fails
     */
    static verifyToken(token, type, fingerprint) {
        try {
            // Basic token format validation
            if (!token || typeof token !== 'string' || token.length < 20) {
                console.error(`Invalid token format for ${type} token: token too short or invalid type`);
                return null;
            }
            
            const parts = token.split('.');
            if (parts.length !== 3) {
                console.error(`Invalid JWT format for ${type} token: not in the format header.payload.signature`);
                return null;
            }
            
            // Normalize token type
            const typeString = typeof type === 'string' ? type.toUpperCase() : type;
            
            // Select the correct secret based on token type
            const secret = typeString === enums_1.TokenType.REFRESH || typeString === 'REFRESH'
                ? getRefreshTokenSecret()
                : getJwtSecret();
            
            try {
                // Verify the token with the appropriate secret
                const payload = jwt.verify(token, secret);
                
                // If fingerprint was provided and token has fpHash, verify it matches
                if (fingerprint && payload.fpHash) {
                    const fpHash = (0, edge_safe_hash_1.createEdgeSafeHash)(fingerprint).substring(0, 8);
                    
                    if (fpHash !== payload.fpHash) {
                        console.warn('Token fingerprint mismatch:', {
                            tokenType: type,
                            providedFingerprintHash: fpHash,
                            tokenFingerprintHash: payload.fpHash
                        });
                        
                        // For security-critical tokens (not refresh tokens), fail on fingerprint mismatch
                        if (type !== enums_1.TokenType.REFRESH && type !== 'REFRESH') {
                            return null;
                        }
                    }
                }
                
                return payload;
            } catch (jwtError) {
                if (typeof jwtError === 'object' && jwtError !== null && 'name' in jwtError) {
                    if (jwtError.name === 'TokenExpiredError') {
                        console.error(`${type} token expired:`, {
                            expiredAt: jwtError.name === 'TokenExpiredError' && 'expiredAt' in jwtError 
                                ? jwtError.expiredAt
                                : 'unknown'
                        });
                    } else {
                        console.error(`JWT verification error for ${type} token:`, {
                            error: 'message' in jwtError ? jwtError.message : 'Unknown error',
                            name: jwtError.name
                        });
                    }
                } else {
                    console.error(`Error processing ${type} token:`, {
                        message: jwtError instanceof Error ? jwtError.message : 'Unknown error',
                        name: jwtError instanceof Error ? jwtError.name : 'Unknown error type',
                        stack: jwtError instanceof Error ? jwtError.stack : 'No stack trace',
                        tokenLength: token ? token.length : 0,
                        tokenPrefix: token ? token.substring(0, 10) + '...' : 'undefined',
                    });
                }
                return null;
            }
        } catch (error) {
            console.error(`Unknown error verifying ${type} token:`, error);
            return null;
        }
    }
    
    /**
     * Generate a JWT token for given payload and type
     * 
     * @param payload - Data to include in the token
     * @param type - Type of token to generate
     * @param expiry - Optional custom expiry time
     * @returns JWT token string
     */
    static generateToken(payload, type, expiry) {
        // Select the appropriate secret based on token type
        const secret = type === enums_1.TokenType.REFRESH
            ? getRefreshTokenSecret()
            : getJwtSecret();
            
        // Set expiry based on token type if not explicitly provided
        let expiresIn = expiry || '1h'; // Default to 1 hour if not specified
        
        if (!expiry) {
            switch (type) {
                case enums_1.TokenType.ACCESS:
                    expiresIn = config_1.AUTH_CONFIG.TOKENS.ACCESS_TOKEN_EXPIRY;
                    break;
                case enums_1.TokenType.REFRESH:
                    expiresIn = config_1.AUTH_CONFIG.TOKENS.REFRESH_TOKEN_EXPIRY;
                    break;
                case enums_1.TokenType.TEMP:
                    expiresIn = config_1.AUTH_CONFIG.TOKENS.TEMP_TOKEN_EXPIRY;
                    break;
            }
        }
        
        // Create the final token payload with the token type
        const tokenPayload = {
            ...payload,
            tokenType: type
        };
        
        // Sign options including expiry time
        const signOptions = {
            algorithm: 'HS256'
        };
        
        // Handle expiry time format
        if (typeof expiresIn === 'number') {
            signOptions.expiresIn = expiresIn;
        } else if (typeof expiresIn === 'string') {
            // If it's just a number as string, interpret as seconds
            if (/^\d+$/.test(expiresIn)) {
                signOptions.expiresIn = parseInt(expiresIn, 10);
            } else {
                // If it has time units like '1h', '7d', etc.
                const timeUnitRegex = /^\d+[smhdwMy]$/;
                if (timeUnitRegex.test(expiresIn)) {
                    signOptions.expiresIn = expiresIn;
                } else {
                    // Default fallback
                    signOptions.expiresIn = 3600; // 1 hour in seconds
                }
            }
        }
        
        // Generate and return the signed JWT token
        return jwt.sign(tokenPayload, secret, signOptions);
    }
}
exports.TokenUtil = TokenUtil;

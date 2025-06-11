/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * TypeScript definitions for the Token utility
 */

import { TokenType } from '@/enums';
import { TokenPair, TokenPayload } from '../services/models/auth-models';

declare class TokenUtilImpl {
  /**
   * Generate access and refresh tokens for a user
   * 
   * @param payload - Data to include in the tokens
   * @param deviceId - Optional device ID to associate with tokens
   * @returns Object containing accessToken, refreshToken and expiresIn
   */
  generateTokens(payload: TokenPayload, deviceId?: string): TokenPair;
    /**
   * Generate a single token
   * 
   * @param payload - Data to include in the token
   * @param type - Type of token to generate
   * @param expiresIn - Token expiration time
   * @param deviceId - Optional device ID to associate with token
   * @returns Generated token string
   */
  generateToken(payload: TokenPayload, type: TokenType, expiresIn: string, deviceId?: string): string;
  
  /**
   * Generate a temporary token for auth flows
   * 
   * @param payload - Data to include in the token
   * @param deviceId - Optional device ID to associate with token
   * @returns Generated temporary token string
   */
  generateTempToken(payload: TokenPayload, deviceId?: string): string;
  
  /**
   * Verify and decode a token
   * 
   * @param token - Token to verify
   * @param type - Type of token
   * @param fingerprint - Optional fingerprint for additional verification
   * @returns Decoded token payload or null if invalid
   */
  verifyToken(token: string, type: TokenType, fingerprint?: string): TokenPayload | null;
  
  /**
   * Extract token from authorization header
   * 
   * @param authHeader - Authorization header value
   * @returns Token string or null if not found
   */
  extractTokenFromHeader(authHeader: string): string | null;
}

declare const TokenUtil: TokenUtilImpl;

export default TokenUtil;
export { TokenUtil };

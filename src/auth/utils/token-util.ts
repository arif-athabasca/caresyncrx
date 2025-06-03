/**
 * Token Utility Implementation
 * 
 * Provides a class-based implementation of token utilities with singleton pattern
 * to avoid circular dependencies and ensure consistent token handling.
 */

import { TokenStorage } from './token-storage';
import { jwtVerify, SignJWT } from 'jose';
import { AUTH_CONFIG } from '../config';

interface TokenPayload {
  sub: string;
  role: string;
  exp?: number;
  iat?: number;
  jti?: string;
  deviceId?: string;
  [key: string]: any;
}

/**
 * Class-based implementation of token utilities
 */
class TokenUtilClass {
  private static instance: TokenUtilClass;
  
  /**
   * Private constructor to prevent direct instantiation
   */
  private constructor() {}
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): TokenUtilClass {
    if (!TokenUtilClass.instance) {
      TokenUtilClass.instance = new TokenUtilClass();
    }
    return TokenUtilClass.instance;
  }
  
  /**
   * Parse a JWT token
   */
  public async parseToken(token: string): Promise<TokenPayload | null> {
    try {
      const encoder = new TextEncoder();
      const secretKey = encoder.encode(AUTH_CONFIG.jwtSecret);
      
      const { payload } = await jwtVerify(token, secretKey, {
        algorithms: ['HS256']
      });
      
      return payload as unknown as TokenPayload;
    } catch (error) {
      console.error('Failed to parse token:', error);
      return null;
    }
  }
  
  /**
   * Create a new JWT token
   */
  public async createToken(payload: TokenPayload, expiresIn: string | number): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const secretKey = encoder.encode(AUTH_CONFIG.jwtSecret);
      
      const token = await new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .sign(secretKey);
      
      return token;
    } catch (error) {
      console.error('Failed to create token:', error);
      throw new Error('Token creation failed');
    }
  }
  
  /**
   * Validate a token and return the decoded payload
   */
  public async validateToken(token: string): Promise<TokenPayload | null> {
    try {
      const payload = await this.parseToken(token);
      
      if (!payload) {
        return null;
      }
      
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Check if token is expired
      if (payload.exp && payload.exp < currentTime) {
        return null;
      }
      
      return payload;
    } catch (error) {
      console.error('Token validation failed:', error);
      return null;
    }
  }
  
  /**
   * Get the current user ID from the stored token
   */
  public async getCurrentUserId(): Promise<string | null> {
    const token = TokenStorage.getAccessToken();
    
    if (!token) {
      return null;
    }
    
    try {
      const payload = await this.parseToken(token);
      return payload?.sub || null;
    } catch (error) {
      console.error('Failed to get current user ID:', error);
      return null;
    }
  }
  
  /**
   * Get the current user role from the stored token
   */
  public async getCurrentUserRole(): Promise<string | null> {
    const token = TokenStorage.getAccessToken();
    
    if (!token) {
      return null;
    }
    
    try {
      const payload = await this.parseToken(token);
      return payload?.role || null;
    } catch (error) {
      console.error('Failed to get current user role:', error);
      return null;
    }
  }
  
  /**
   * Check if the current user has a specific role
   */
  public async hasRole(role: string | string[]): Promise<boolean> {
    const currentRole = await this.getCurrentUserRole();
    
    if (!currentRole) {
      return false;
    }
    
    if (Array.isArray(role)) {
      return role.includes(currentRole);
    }
    
    return currentRole === role;
  }
}

// Create the singleton instance
const tokenUtilInstance = TokenUtilClass.getInstance();

// Export the instance as TokenUtil
export const TokenUtil = tokenUtilInstance;
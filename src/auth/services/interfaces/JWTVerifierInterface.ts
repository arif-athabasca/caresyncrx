/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Interface for JWT verification services
 */

export interface JWTVerifierInterface {
  /**
   * Sign a payload and create a JWT token
   * @param payload - Data to encode in the token
   * @returns Promise resolving to the JWT token string
   */
  sign(payload: any): Promise<string>;
  
  /**
   * Verify and decode a JWT token
   * @param token - JWT token to verify
   * @returns Promise resolving to the decoded payload or null if invalid
   */
  verify(token: string): Promise<any>;
}

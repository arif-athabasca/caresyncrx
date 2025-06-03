/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * JWT verification service implementation
 */

import { SignJWT, jwtVerify } from 'jose';
import { JWTVerifierInterface } from '../interfaces/JWTVerifierInterface';

export class JWTVerifier implements JWTVerifierInterface {
  private readonly secretKey: Uint8Array;
  private readonly expiresIn: string;

  constructor(secret: string, expiresIn: string = '1h') {
    this.secretKey = new TextEncoder().encode(secret);
    this.expiresIn = expiresIn;
  }

  /**
   * Sign a payload and create a JWT token
   */
  async sign(payload: any): Promise<string> {
    const jwt = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(this.expiresIn)
      .setIssuedAt()
      .sign(this.secretKey);

    return jwt;
  }

  /**
   * Verify and decode a JWT token
   */
  async verify(token: string): Promise<any> {
    try {
      const { payload } = await jwtVerify(token, this.secretKey, {
        algorithms: ['HS256'],
      });
      
      return payload;
    } catch (error) {
      console.error('JWT verification failed:', error);
      return null;
    }
  }
}

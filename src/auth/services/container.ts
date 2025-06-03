/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Dependency injection container for authentication services.
 * This file provides access to authentication services throughout the application.
 */

import { IAuthService } from './interfaces/IAuthService';
import { AuthService } from './implementations/AuthService';
import { JWTVerifier } from './implementations/jwt-verifier';
import { JWTVerifierInterface } from './interfaces/JWTVerifierInterface';

/**
 * Simple dependency injection container for auth-related services
 */
class AuthContainer {
  private authService: IAuthService | null = null;
  private jwtVerifier: JWTVerifierInterface | null = null;
  private services: Record<string, any> = {};
    /**
   * Get the authentication service instance
   * Uses a singleton pattern to ensure only one auth service instance exists
   */
  getAuthService(): IAuthService {
    if (!this.authService) {
      this.authService = new AuthService();
    }
    return this.authService;
  }
  
  /**
   * Get the JWT verifier instance
   */
  getJWTVerifier(): JWTVerifierInterface {
    if (!this.jwtVerifier) {
      const jwtSecret = process.env.JWT_SECRET || 'default_secret_key_for_jwt_verification_only_for_development';
      this.jwtVerifier = new JWTVerifier(jwtSecret, '1h');
    }
    return this.jwtVerifier;
  }
  
  /**
   * Generic service resolution method
   */
  resolve(serviceName: string): any {
    if (this.services[serviceName]) {
      return this.services[serviceName];
    }
    
    switch (serviceName) {
      case 'authService':
        this.services[serviceName] = this.getAuthService();
        break;
      case 'jwtVerifier':
        this.services[serviceName] = this.getJWTVerifier();
        break;
    }
    
    return this.services[serviceName];
  }
  
  /**
   * For testing: Set a mock service implementation
   */
  setAuthService(mockService: IAuthService) {
    this.authService = mockService;
  }
}

// Export a singleton instance of the container
export const authContainer = new AuthContainer();
/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Authentication service implementation for the CareSyncRx platform.
 * This file contains the core logic for user authentication, including:
 * - User registration
 * - Login and authentication
 * - Two-factor authentication
 * - Token management and refresh
 * - Password validation and changes
 * - Security features (account locking, audit logging)
 */

import { PrismaClient, User, RefreshToken } from '@prisma/client';
import { IAuthService } from '../interfaces/IAuthService';
import { LoginInput, RegisterInput, TokenPair, TokenPayload, AuthResult, PasswordChange, Device } from '../models/auth-models';
import { UserRole, TokenType, TwoFactorMethod } from '../../enums';
import { AUTH_CONFIG } from '@/auth';
import { TokenUtil } from '@/auth';
// Use browser-compatible bcrypt wrapper instead of importing directly
import bcrypt from '../../utils/bcrypt-browser';
import { v4 as uuidv4 } from 'uuid';
import { passwordValidator } from '../../utils/password-validator';
import { AuditLogger } from '../../../shared/services/audit-logger';
import { ITwoFactorSetupResponse, ITwoFactorVerifyResponse } from '../interfaces/IAuthService';
import prisma from '../../../lib/prisma';
import { AuthSecurityLogger } from '../utils/auth-security-logger';
import { SecurityEventType, SecurityEventSeverity } from '../../../shared/services/security-audit';
import * as jwt from 'jsonwebtoken';
import { deviceIdentityService } from '../../utils/device-identity-service';
import { TwoFactorAuthService } from '../implementations/TwoFactorAuthService';

/**
 * Implementation of the authentication service
 */
export class AuthService implements IAuthService {
  /**
   * Register a new user
   * 
   * @param data - User registration data
   * @returns The newly created user with auth tokens
   */
  async register(data: RegisterInput): Promise<AuthResult> {
    // Validate password
    if (!PasswordValidator.validatePassword(data.password)) {
      throw new Error('Password does not meet complexity requirements');
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });
    
    if (existingUser) {
      throw new Error('User already exists');
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(data.password, AUTH_CONFIG.PASSWORD.SALT_ROUNDS);
    
    // Calculate password expiry date
    const passwordExpiresAt = new Date();
    passwordExpiresAt.setDate(passwordExpiresAt.getDate() + AUTH_CONFIG.PASSWORD.EXPIRY_DAYS);
    
    // Require clinic ID for registration
    if (!data.clinicId) {
      throw new Error('Clinic ID is required for user registration');
    }
    
    // Create the user
    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        email: data.email,
        password: hashedPassword,
        role: data.role === UserRole.PATIENT ? 'NURSE' : data.role, // Convert PATIENT to NURSE since Prisma schema doesn't have PATIENT
        twoFactorEnabled: false,
        backupCodes: [],
        passwordExpiresAt,
        lastPasswordChange: new Date(),
        clinic: {
          connect: { id: data.clinicId }
        }
      }
    });
    
    // Log the registration
    await AuditLogger.log({
      userId: user.id,
      action: 'USER_REGISTERED',
      details: { 
        email: user.email,
        resourceType: 'AUTH'
      }
    });
    
    // Generate tokens for the newly registered user
    const tokenPayload: TokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role as unknown as UserRole
    };
    
    const tokens = TokenUtil.generateTokens(tokenPayload);
    
    // Store refresh token
    await this.storeRefreshToken(user.id, tokens.refreshToken);
    
    // Return session data
    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role as unknown as UserRole,
        twoFactorEnabled: user.twoFactorEnabled
      },
      tokens,
      requiresTwoFactor: false
    };
  }

  /**
   * Authenticate a user with email and password
   * 
   * @param credentials - Login credentials
   * @returns Authentication session with tokens if successful
   * @throws Error if credentials are invalid or account is locked
   */
  async login(credentials: LoginInput): Promise<AuthResult> {
    try {
      // Find the user
      const user = await prisma.user.findUnique({
        where: { email: credentials.email },
        select: {
          id: true,
          email: true,
          password: true,
          role: true,
          twoFactorEnabled: true,
          failedLoginAttempts: true,
          lastFailedLogin: true,
          lockedUntil: true,
          passwordExpiresAt: true,
          lastPasswordChange: true,
        }
      });
      
      if (!user) {
        // For security, simulate bcrypt timing to prevent user enumeration
        await bcrypt.compare(credentials.password, '$2b$10$randomhashwillnotmatchanythingPLpS6');
        throw new Error('Invalid credentials');
      }
      
      // Check if account is locked
      const now = new Date();
      if (user.lockedUntil && user.lockedUntil > now) {
        // Log to both audit logs
        await AuditLogger.log({
          userId: user.id,
          action: 'LOGIN_ATTEMPT_LOCKED',
          details: {
            email: user.email,
            lockedUntil: user.lockedUntil,
            attempt: Date.now(),
            resourceType: 'AUTH'
          }
        });
        
        // Also log to security audit log
        await AuthSecurityLogger.logLoginFailure({
          userId: user.id,
          username: user.email,
          reason: 'Account is locked',
          ipAddress: credentials.ipAddress,
          userAgent: credentials.userAgent,
          details: {
            lockedUntil: user.lockedUntil,
            attempt: Date.now()
          }
        });
        
        throw new Error('Account is locked');
      }
      
      // Verify the password
      const passwordMatch = await bcrypt.compare(credentials.password, user.password);
      
      if (!passwordMatch) {
        // Update failed login attempts
        const failedAttempts = (user.failedLoginAttempts || 0) + 1;
        const updateData: Record<string, any> = {
          failedLoginAttempts: { increment: 1 },
          lastFailedLogin: new Date()
        };        // Lock account if threshold exceeded
        if (failedAttempts >= AUTH_CONFIG.SECURITY.MAX_LOGIN_ATTEMPTS) {
          const lockPeriod = AUTH_CONFIG.SECURITY.LOCKOUT_DURATION;
          updateData.lockedUntil = new Date(now.getTime() + lockPeriod);
          
          // Log to both audit logs
          await AuditLogger.log({
            userId: user.id,
            action: 'ACCOUNT_LOCKED',
            details: {
              email: user.email,
              failedAttempts,
              lockedUntil: updateData.lockedUntil,
              resourceType: 'AUTH'
            }
          });
          
          // Update the user first to store the lock
          await prisma.user.update({
            where: { id: user.id },
            data: updateData
          });
          
          // Then throw the specific error message for locked accounts
          throw new Error('Account has been locked due to too many failed attempts');
        }
        
        // Only update attempts if not locked yet
        await prisma.user.update({
          where: { id: user.id },
          data: updateData
        });
        
        // Log to both systems
        await AuditLogger.log({
          userId: user.id,
          action: 'LOGIN_FAILED',
          details: {
            email: user.email,
            failedAttempts,
            reason: 'Invalid password',
            resourceType: 'AUTH'
          }
        });
        
        // Also log to security audit log
        await AuthSecurityLogger.logLoginFailure({
          userId: user.id,
          username: user.email,
          reason: 'Invalid password',
          ipAddress: credentials.ipAddress,
          userAgent: credentials.userAgent,
          details: {
            failedAttempts,
            attemptNumber: failedAttempts
          }
        });
        
        throw new Error('Invalid credentials');
      }
      
      // Check if 2FA is required
      if (user.twoFactorEnabled) {
        // Generate a temporary token pair for 2FA flow
        const tempTokens: TokenPair = {
          accessToken: '', // Empty token since we're waiting for 2FA
          refreshToken: '' // Empty token since we're waiting for 2FA
        };
        
        return {
          user: {
            id: user.id,
            email: user.email,
            role: user.role as unknown as UserRole,
            twoFactorEnabled: user.twoFactorEnabled
          },
          requiresTwoFactor: true,
          tokens: tempTokens // Provide empty tokens to satisfy the type requirement
        };
      }
      
      // Reset failed login attempts on successful login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lastFailedLogin: null,
          lockedUntil: null
        }
      });
      
      // Generate tokens
      const tokenPayload: TokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role as unknown as UserRole
      };
      
      const tokens = TokenUtil.generateTokens(tokenPayload, credentials.deviceId);
      
      // Store refresh token
      await this.storeRefreshToken(user.id, tokens.refreshToken, credentials.deviceId);
      
      // Log successful login to both logging systems
      await AuditLogger.log({
        userId: user.id,
        action: 'LOGIN_SUCCESS',
        details: {
          email: user.email,
          resourceType: 'AUTH'
        }
      });
      
      // Also log to security audit log
      await AuthSecurityLogger.logLoginSuccess({
        userId: user.id,
        username: user.email,
        ipAddress: credentials.ipAddress,
        userAgent: credentials.userAgent,
        details: {
          deviceId: credentials.deviceId,
          role: user.role as unknown as UserRole
        }
      });
      
      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role as unknown as UserRole,
          twoFactorEnabled: user.twoFactorEnabled
        },
        tokens,
        requiresTwoFactor: false
      };
    } catch (error) {
      // Handle specific errors
      if (error instanceof Error) {
        if (error.message.includes('Invalid credentials') || 
            error.message.includes('Account has been locked') ||
            error.message.includes('Account is locked')) {
          throw error;
        }
      }
      
      console.error('[AuthService.login] Error during login:', error);
      throw new Error('Authentication failed');
    }
  }

  /**
   * Refresh access token using a valid refresh token
   * 
   * @param refreshToken - Current refresh token
   * @param deviceId - Optional device ID for verification
   * @returns New token pair if successful
   * @throws Error if refresh token is invalid or expired
   */  
  async refreshTokens(refreshToken: string, deviceId?: string): Promise<TokenPair> {
    try {
      // Basic validation of input
      if (!refreshToken || typeof refreshToken !== 'string' || refreshToken.length < 20) {
        console.error('Refresh token validation failed: Invalid format', {
          tokenPrefix: refreshToken ? refreshToken.substring(0, 10) + '...' : 'undefined',
          tokenLength: refreshToken ? refreshToken.length : 0
        });
        throw new Error('Invalid refresh token format');
      }
      
      // Extract token claims before database check (for logging purposes)
      let tokenClaims = null;
      try {
        // Use TokenUtil to decode the token
        tokenClaims = TokenUtil.verifyToken(refreshToken, TokenType.REFRESH);        console.log('Decoded token claims:', {
          id: tokenClaims && typeof tokenClaims === 'object' ? (tokenClaims as any).id : 'unknown',
          tokenType: tokenClaims && typeof tokenClaims === 'object' ? (tokenClaims as any).tokenType : 'unknown'
        });
      } catch (decodeError) {
        console.error('Failed to decode token:', decodeError);
      }
      
      // First check if the token has valid JWT format through our utility
      if (!TokenUtil.verifyToken(refreshToken, TokenType.REFRESH)) {
        console.error('JWT verification failed for refresh token');
      }
      
      // Next, try to find the token in the database - this is our source of truth
      const storedToken = await prisma.refreshToken.findFirst({
        where: {
          token: refreshToken,
          isValid: true,
          expiresAt: {
            gt: new Date()
          }
        },
        include: {
          user: true
        }
      });
      
      // If token not found in database, it's invalid or expired
      if (!storedToken) {        console.error('Refresh token not found in database or expired', {
          tokenId: tokenClaims && typeof tokenClaims === 'object' ? (tokenClaims as any).id : 'unknown'
        });
        throw new Error('Refresh token not found or expired');
      }
      
      // Check user exists
      if (!storedToken.user) {
        await this.invalidateRefreshToken(refreshToken);
        
        await AuditLogger.log({
          userId: storedToken.userId,
          action: 'TOKEN_REFRESH_REJECTED',
          details: {
            reason: 'User not found',
            resourceType: 'AUTH'
          }
        });
        
        throw new Error('User not found');
      }
      
      // Verify device ID if provided - but be more permissive for UI
      if (deviceId && storedToken.deviceId && storedToken.deviceId !== deviceId) {
        // Log the device ID mismatch but don't reject immediately
        console.warn('Device ID mismatch during token refresh', {
          expectedDeviceId: storedToken.deviceId,
          providedDeviceId: deviceId,
          userId: storedToken.userId
        });
        
        // Check if the provided device ID is valid by comparing fingerprints
        // We'll be permissive here to accommodate browser updates, OS updates, etc.
        // This is why we created the device identity system with fingerprinting support
        
        // We'll always allow the refresh to proceed for now, but log the mismatch
        // The actual verification happens in the device-identity.ts module
        await AuditLogger.log({
          userId: storedToken.userId,
          action: 'DEVICE_ID_MISMATCH_ALLOWED',
          details: {
            reason: 'Token refresh permissive policy',
            expectedDeviceId: storedToken.deviceId,
            providedDeviceId: deviceId,
            resourceType: 'AUTH'
          }
        });
        
        // No error thrown - we're allowing the refresh despite the mismatch
      }
      
      // Generate new tokens
      const newTokens = TokenUtil.generateTokens({
        id: storedToken.user.id,
        email: storedToken.user.email,
        role: storedToken.user.role as unknown as UserRole
      }, deviceId);
      
      // Invalidate old token and store new one
      await this.invalidateRefreshToken(refreshToken);
      await this.storeRefreshToken(storedToken.userId, newTokens.refreshToken, deviceId);
      
      // Log the token refresh
      await AuditLogger.log({
        userId: storedToken.userId,
        action: 'TOKEN_REFRESHED',
        details: {
          deviceId,
          resourceType: 'AUTH'
        }
      });
      
      console.log('Token refresh successful', {
        userId: storedToken.userId,
        newTokenPrefix: newTokens.refreshToken.substring(0, 10) + '...'
      });
      
      return newTokens;
    } catch (error) {
      // Enhanced error logging with more details
      if (error instanceof Error) {
        console.error('Token refresh error:', {
          message: error.message,
          stack: error.stack,
          tokenPrefix: refreshToken ? refreshToken.substring(0, 10) + '...' : 'undefined',
          deviceId: deviceId || 'none'
        });
      } else {
        console.error('Unknown token refresh error:', error);
      }
      
      // Rethrow the error to be handled by the caller
      throw error;
    }
  }

  /**
   * Verify a user's current password
   * 
   * @param userId - The user ID
   * @param password - The password to verify
   * @returns True if password is valid
   */
  async verifyPassword(userId: string, password: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true }
      });
      
      if (!user) {
        return false;
      }
      
      return bcrypt.compare(password, user.password);
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }
  
  /**
   * Change a user's password
   * 
   * @param input - Password change details including current and new passwords
   * @returns void
   * @throws Error if password change fails
   */
  async changePassword(input: PasswordChange): Promise<void> {
    try {
      const { userId, currentPassword, newPassword } = input;
      
      // Get the user
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }
      
      // Validate new password complexity
      if (!PasswordValidator.validatePassword(newPassword)) {
        throw new Error('Password does not meet complexity requirements');
      }
      
      // Ensure new password is different from current
      if (currentPassword === newPassword) {
        throw new Error('New password must be different from current password');
      }
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, AUTH_CONFIG.PASSWORD.SALT_ROUNDS);
      
      // Calculate new expiry date
      const passwordExpiresAt = new Date();
      passwordExpiresAt.setDate(passwordExpiresAt.getDate() + AUTH_CONFIG.PASSWORD.EXPIRY_DAYS);
      
      // Update the user
      await prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          lastPasswordChange: new Date(),
          passwordExpiresAt
        }
      });
      
      // Invalidate all existing refresh tokens for security
      await prisma.refreshToken.updateMany({
        where: { userId },
        data: { isValid: false }
      });
      
      // Log password change
      await AuditLogger.log({
        userId,
        action: 'PASSWORD_CHANGED',
        details: { 
          initiated: 'USER',
          resourceType: 'AUTH'
        }
      });
    } catch (error) {
      if (error instanceof Error) {
        // Rethrow known errors
        if (error.message.includes('Current password is incorrect') ||
            error.message.includes('Password does not meet complexity requirements') ||
            error.message.includes('New password must be different') ||
            error.message.includes('User not found')) {
          throw error;
        }
      }
      
      console.error('Error changing password:', error);
      throw new Error('Failed to change password');
    }
  }

  /**
   * Verify a temporary token (e.g., for password reset)
   * 
   * @param token - The temporary token to verify
   * @returns User ID if the token is valid, null otherwise
   */
  async verifyTempToken(token: string): Promise<string | null> {
    try {
      const payload = TokenUtil.verifyToken<TokenPayload>(token, 'temp');
      
      if (!payload) {
        return null;
      }
      
      return payload.id;
    } catch (error) {
      console.error('Error verifying temp token:', error);
      return null;
    }
  }
  
  /**
   * Generate a temporary token for an operation
   * 
   * @param userId - The user ID for whom the token is generated
   * @param deviceId - Optional device identifier for token binding
   * @returns The generated temporary token
   */
  async generateTempToken(userId: string, deviceId?: string): Promise<string> {
    // Get user to include necessary data in the token
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, role: true }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
      // Generate a temporary token with short expiry
    const tokenPayload: TokenPayload = {
      id: userId,
      email: user.email,
      role: user.role as unknown as UserRole
    };
    
    const result = TokenUtil.generateTempToken(tokenPayload, deviceId);
    return result.token;
  }
  
  /**
   * Log out a user (invalidate tokens/session)
   * 
   * @param userId - The user ID to log out
   * @param sessionId - The session ID to invalidate
   * @returns void
   */
  async logout(userId: string, sessionId: string): Promise<void> {
    try {
      // Invalidate all refresh tokens for the user
      await prisma.refreshToken.updateMany({
        where: { userId },
        data: { isValid: false }
      });
      
      // Get user email for complete logging
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true }
      });
      
      // Log the logout to both systems
      await AuditLogger.log({
        userId,
        action: 'USER_LOGOUT',
        details: { 
          sessionId,
          resourceType: 'AUTH'
        }
      });
      
      // Also log to security audit log
      await AuthSecurityLogger.logLogout({
        userId,
        username: user?.email || 'unknown',
        details: { sessionId }
      });
    } catch (error) {
      console.error('Error during logout:', error);
      throw new Error('Failed to log out user');
    }
  }
  
  /**
   * Get devices associated with a user
   * 
   * @param userId - The user ID whose devices are to be retrieved
   * @returns List of devices associated with the user
   */
  async getDevices(userId: string): Promise<Device[]> {
    try {
      // Get all valid refresh tokens with device info for this user
      const refreshTokens = await prisma.refreshToken.findMany({
        where: { 
          userId,
          isValid: true,
          deviceId: { not: null }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      // Map to device objects
      const devices = refreshTokens
        .filter(token => token.deviceId) // Ensure deviceId exists
        .map(token => ({
          id: token.id,
          deviceId: token.deviceId as string,
          userAgent: 'Unknown', // Use a default value since userAgent doesn't exist
          lastUsed: token.createdAt
        }));
      
      // Remove duplicates based on deviceId
      const uniqueDevices = devices.filter((device, index, self) => 
        index === self.findIndex(d => d.deviceId === device.deviceId)
      );
      
      return uniqueDevices;
    } catch (error) {
      console.error('Error getting user devices:', error);
      throw new Error('Failed to retrieve user devices');
    }
  }
  
  /**
   * Revoke a device and its associated tokens
   * 
   * @param userId - The user ID whose device is to be revoked
   * @param deviceId - The device ID to revoke
   * @returns void
   */
  async revokeDevice(userId: string, deviceId: string): Promise<void> {
    try {
      // Invalidate all refresh tokens for this device
      const updateResult = await prisma.refreshToken.updateMany({
        where: { 
          userId,
          deviceId,
          isValid: true
        },
        data: { isValid: false }
      });
      
      if (updateResult.count === 0) {
        throw new Error('Device not found or already revoked');
      }
      
      // Log the device revocation
      await AuditLogger.log({
        userId,
        action: 'DEVICE_REVOKED',
        details: { 
          deviceId,
          resourceType: 'AUTH'
        }
      });
    } catch (error) {
      console.error('Error revoking device:', error);
      throw new Error('Failed to revoke device');
    }
  }

  // Placeholder methods for two-factor authentication
  // These would be implemented with a proper 2FA service in a full implementation
  /**
   * Set up two-factor authentication for a user
   * 
   * @param userId - The user ID to set up 2FA for
   * @returns Response with QR code data URI, secret key, and backup codes
   */
  async setup2FA(userId: string): Promise<ITwoFactorSetupResponse> {
    try {
      // Get user to ensure they exist and get their email
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true }
      });
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Use the TwoFactorAuthService to generate setup data
      const twoFactorService = new TwoFactorAuthService();
      const setupResponse = await twoFactorService.generateSetup(userId, user.email);
      
      // Log the setup attempt
      await AuditLogger.log({
        userId,
        action: 'TWO_FACTOR_SETUP_INITIATED',
        details: { 
          resourceType: 'AUTH',
          method: 'TOTP'
        }
      });
      
      return setupResponse;
    } catch (error) {
      console.error('Error setting up 2FA:', error);
      throw error;
    }
  }
  
  /**
   * Enable two-factor authentication for a user
   * 
   * @param userId - The user ID to enable 2FA for
   * @param token - The TOTP token to verify before enabling 2FA
   * @returns True if 2FA was successfully enabled, false otherwise
   */
  async enable2FA(userId: string, token: string): Promise<boolean> {
    try {
      // Use the TwoFactorAuthService to verify and enable 2FA
      const twoFactorService = new TwoFactorAuthService();
      const result = await twoFactorService.verifyAndEnableTOTP(userId, token);
      
      return result.success;
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      throw error;
    }
  }
  
  /**
   * Disable two-factor authentication for a user
   * 
   * @param userId - The user ID to disable 2FA for
   * @param token - The TOTP token to verify before disabling 2FA
   * @returns True if 2FA was successfully disabled, false otherwise
   */
  async disable2FA(userId: string, token: string): Promise<boolean> {
    try {
      // Use the TwoFactorAuthService to disable 2FA
      const twoFactorService = new TwoFactorAuthService();
      return await twoFactorService.disable2FA(userId, token);
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      throw error;
    }
  }
  
  /**
   * Verify 2FA during login
   * 
   * @param tempToken - The temporary token issued after initial login
   * @param code - The TOTP verification code
   * @param options - Additional verification options
   * @returns Authentication result if successful
   * @throws Error if verification fails
   */
  async verify2FALogin(
    tempToken: string, 
    code: string, 
    options?: { 
      deviceId?: string; 
      ipAddress?: string; 
      userAgent?: string;
    }
  ): Promise<ITwoFactorVerifyResponse> {
    try {
      // First, verify the temp token to get the user ID
      const payload = TokenUtil.verifyToken<{ id: string; temp: boolean }>(tempToken, TokenType.TEMP);
      
      if (!payload || !payload.id || !payload.temp) {
        return { success: false };
      }
      
      const userId = payload.id;
      
      // Find the user
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          twoFactorEnabled: true,
          twoFactorMethod: true
        }
      });
      
      if (!user || !user.twoFactorEnabled) {
        return { success: false, userId };
      }
        // Create an instance of TwoFactorAuthService
      const twoFactorService = new TwoFactorAuthService();
      const twoFactorMethodType = user.twoFactorMethod ? 
        (user.twoFactorMethod as unknown as TwoFactorMethod) : 
        TwoFactorMethod.TOTP;
      
      // Determine if this is a TOTP code or backup code
      const isBackupCode = code.includes('-');
      const method = isBackupCode ? TwoFactorMethod.BACKUP_CODE : twoFactorMethodType;
      
      const verified = await twoFactorService.verifyToken(userId, code, method);
      
      if (!verified) {
        return { success: false, userId };
      }
      
      // Reset failed login attempts on successful verification
      await prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: 0,
          lastFailedLogin: null,
          lockedUntil: null
        }
      });
      
      // Generate tokens
      const tokenPayload: TokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role as unknown as UserRole,
        twoFactorEnabled: true
      };
      
      const tokens = TokenUtil.generateTokens(tokenPayload, options?.deviceId);
      
      // Store refresh token
      await this.storeRefreshToken(user.id, tokens.refreshToken, options?.deviceId);
      
      // Log successful 2FA login
      await AuditLogger.log({
        userId: user.id,
        action: 'TWO_FACTOR_LOGIN_SUCCESS',
        details: {
          email: user.email,
          methodType: method,
          ipAddress: options?.ipAddress || 'unknown',
          userAgent: options?.userAgent || 'unknown',
          resourceType: 'AUTH'
        }
      });
      
      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role as unknown as UserRole,
          twoFactorEnabled: true
        },
        tokens
      };
    } catch (error) {
      console.error('[AuthService.verify2FALogin] Error during 2FA verification:', error);
      
      return { 
        success: false,
        userId: error instanceof Error && error.message.includes('id:') 
          ? error.message.split('id:')[1]?.trim() 
          : undefined
      };
    }
  }

  /**
   * Store a refresh token in the database
   * 
   * @param userId - The user ID
   * @param refreshToken - The refresh token to store
   * @param deviceId - Optional device ID for the token
   */
  private async storeRefreshToken(userId: string, refreshToken: string, deviceId?: string): Promise<RefreshToken> {
    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setTime(expiresAt.getTime() + AUTH_CONFIG.TOKENS.REFRESH_TOKEN_EXPIRY * 1000);
    
    // Create the refresh token record
    return prisma.refreshToken.create({
      data: {
        id: uuidv4(),
        userId,
        token: refreshToken,
        deviceId, // Ensure deviceId is properly passed through
        isValid: true,
        expiresAt
      }
    });
  }

  /**
   * Invalidate a refresh token
   * 
   * @param refreshToken - The token to invalidate
   */
  private async invalidateRefreshToken(refreshToken: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { isValid: false }
    });
  }
}


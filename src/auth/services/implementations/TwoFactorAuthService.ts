/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Two-factor authentication service implementation.
 */

import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { ITwoFactorSetupResponse } from '../interfaces/IAuthService';
import { TwoFactorSetupResult } from '../models/auth-models';
import { TwoFactorMethod } from '../../index';
import { AUTH_CONFIG } from '@/auth';
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import prisma from '../../../lib/prisma';
import { AuditLogger } from '../../../shared/services/audit-logger';

/**
 * Service to handle two-factor authentication operations
 */
export class TwoFactorAuthService {
  /**
   * Generate a new secret key for TOTP setup
   * 
   * @param userId User ID for whom the 2FA is being set up
   * @param label Identifier label (usually email or username)
   * @returns Setup response with secret and QR code
   */
  public async generateSetup(userId: string, label: string): Promise<ITwoFactorSetupResponse> {
    // Find user to ensure they exist
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Use speakeasy to generate a secret key
    const secret = speakeasy.generateSecret({
      length: 20,
      name: `CareSyncRx:${label}`
    });

    // Generate QR code
    const otpauthUrl = secret.otpauth_url || '';
    const qrCodeUrl = await qrcode.toDataURL(otpauthUrl);
    
    // Generate backup codes
    const backupCodes = this.generateBackupCodes(
      AUTH_CONFIG.SECURITY.TWO_FACTOR.BACKUP_CODES_COUNT
    );

    // Store the secret temporarily until verified
    await prisma.twoFactorSetup.upsert({
      where: { userId },
      update: {
        secret: secret.base32,
        verified: false,
        backupCodes: backupCodes,
        updatedAt: new Date()
      },
      create: {
        userId,
        secret: secret.base32,
        verified: false,
        backupCodes: backupCodes
      }
    });

    // Log the setup attempt
    await AuditLogger.log({
      userId,
      action: 'TWO_FACTOR_SETUP_INITIATED',
      details: {
        resourceType: 'AUTH',
        method: TwoFactorMethod.TOTP
      }
    });

    return {
      secret: secret.base32,
      otpauthUrl,
      qrCodeUrl,
      backupCodes: []  // Don't return backup codes until verified
    };
  }

  /**
   * Verify a TOTP token and enable 2FA if valid
   * 
   * @param userId User ID
   * @param token TOTP token from authenticator app
   * @returns Success status and backup codes if successful
   */
  public async verifyAndEnableTOTP(userId: string, token: string): Promise<{ success: boolean; backupCodes?: string[] }> {
    // Find the temporary setup data
    const setupData = await prisma.twoFactorSetup.findUnique({
      where: { userId }
    });

    if (!setupData) {
      throw new Error('Two-factor setup not found. Please initiate setup first.');
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: setupData.secret,
      encoding: 'base32',
      token,
      window: 1  // Allow 1 period before and after for clock skew
    });

    if (!verified) {
      // Log failed verification
      await AuditLogger.log({
        userId,
        action: 'TWO_FACTOR_VERIFICATION_FAILED',
        details: {
          resourceType: 'AUTH',
          method: TwoFactorMethod.TOTP
        }
      });
      return { success: false };
    }

    // Update user to enable 2FA
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorMethod: TwoFactorMethod.TOTP,
        twoFactorSecret: setupData.secret,
        backupCodes: setupData.backupCodes
      }
    });

    // Mark setup as verified and log success
    await prisma.twoFactorSetup.update({
      where: { userId },
      data: { verified: true }
    });

    await AuditLogger.log({
      userId,
      action: 'TWO_FACTOR_ENABLED',
      details: {
        resourceType: 'AUTH',
        method: TwoFactorMethod.TOTP
      }
    });

    return { 
      success: true,
      backupCodes: setupData.backupCodes
    };
  }

  /**
   * Verify a TOTP token during login
   * 
   * @param userId User ID
   * @param token TOTP token or backup code
   * @param method Authentication method (TOTP or BACKUP_CODE)
   * @returns Whether verification was successful
   */
  public async verifyToken(userId: string, token: string, method: TwoFactorMethod): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.twoFactorEnabled) {
      return false;
    }

    // Handle different verification methods
    if (method === TwoFactorMethod.TOTP) {
      // Verify TOTP token
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret || '',
        encoding: 'base32',
        token,
        window: 1
      });

      if (verified) {
        await AuditLogger.log({
          userId,
          action: 'TWO_FACTOR_VERIFICATION_SUCCESS',
          details: {
            resourceType: 'AUTH',
            method: TwoFactorMethod.TOTP
          }
        });
      } else {
        await AuditLogger.log({
          userId,
          action: 'TWO_FACTOR_VERIFICATION_FAILED',
          details: {
            resourceType: 'AUTH',
            method: TwoFactorMethod.TOTP
          }
        });
      }

      return verified;
    } 
    else if (method === TwoFactorMethod.BACKUP_CODE) {
      // Verify and consume backup code
      const backupCodes = user.backupCodes as string[];
      
      if (!backupCodes || !backupCodes.includes(token)) {
        await AuditLogger.log({
          userId,
          action: 'TWO_FACTOR_VERIFICATION_FAILED',
          details: {
            resourceType: 'AUTH',
            method: TwoFactorMethod.BACKUP_CODE
          }
        });
        return false;
      }

      // Remove the used backup code
      const updatedBackupCodes = backupCodes.filter(code => code !== token);
      
      await prisma.user.update({
        where: { id: userId },
        data: { backupCodes: updatedBackupCodes }
      });

      await AuditLogger.log({
        userId,
        action: 'TWO_FACTOR_VERIFICATION_SUCCESS',
        details: {
          resourceType: 'AUTH',
          method: TwoFactorMethod.BACKUP_CODE,
          remainingCodes: updatedBackupCodes.length
        }
      });

      return true;
    }

    return false;
  }

  /**
   * Disable two-factor authentication for a user
   * 
   * @param userId User ID
   * @param token Verification token to confirm identity
   * @returns Success status
   */
  public async disable2FA(userId: string, token: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.twoFactorEnabled) {
      return false;
    }

    // Verify the token first
    const verified = await this.verifyToken(userId, token, TwoFactorMethod.TOTP);
    
    if (!verified) {
      return false;
    }

    // Disable 2FA
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: []
      }
    });

    await AuditLogger.log({
      userId,
      action: 'TWO_FACTOR_DISABLED',
      details: {
        resourceType: 'AUTH'
      }
    });

    return true;
  }

  /**
   * Generate secure backup codes
   * 
   * @param count Number of backup codes to generate
   * @returns Array of backup codes
   */
  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      // Generate a random 10-character alphanumeric code
      const code = crypto.randomBytes(5).toString('hex');
      
      // Format as XXXXX-XXXXX
      const formattedCode = `${code.substring(0, 5)}-${code.substring(5, 10)}`;
      codes.push(formattedCode);
    }
    
    return codes;
  }
}

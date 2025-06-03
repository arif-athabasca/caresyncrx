/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Interface for the authentication service
 */

import { 
  LoginInput, 
  RegisterInput, 
  TokenPair, 
  AuthResult, 
  PasswordChange, 
  Device,
  AuthUser
} from '../models/auth-models';

export interface ITwoFactorSetupResponse {
  secret: string;
  otpauthUrl: string;
  qrCodeUrl?: string;
  backupCodes: string[];
}

export interface ITwoFactorVerifyResponse {
  success: boolean;
  user?: AuthUser;
  userId?: string;
  tokens?: TokenPair;
}

/**
 * Interface for the authentication service that defines the contract
 * for authentication, authorization, and account security operations
 * throughout the CareSyncRx platform.
 */
export interface IAuthService {
  /**
   * Verify 2FA during login
   * 
   * @param tempToken - The temporary token issued after initial login
   * @param code - The TOTP verification code
   * @param options - Additional verification options
   * @returns Authentication result if successful
   * @throws Error if verification fails
   */
  verify2FALogin(
    tempToken: string, 
    code: string, 
    options?: { 
      deviceId?: string; 
      ipAddress?: string; 
      userAgent?: string;
    }
  ): Promise<ITwoFactorVerifyResponse>;
  
  /**
   * Register a new user
   * 
   * @param data - User registration data
   * @returns The newly created user with auth tokens
   * @throws Error if registration fails
   */
  register(data: RegisterInput): Promise<AuthResult>;
  
  /**
   * Authenticate a user with email and password
   * 
   * @param credentials - Login credentials
   * @returns Authentication session with tokens if successful
   * @throws Error if credentials are invalid or account is locked
   */
  login(credentials: LoginInput): Promise<AuthResult>;

  /**
   * Refresh access token using a valid refresh token
   * 
   * @param refreshToken - Current refresh token
   * @param deviceId - Optional device ID for verification
   * @returns New token pair if successful
   * @throws Error if refresh token is invalid or expired
   */
  refreshTokens(refreshToken: string, deviceId?: string): Promise<TokenPair>;
  
  /**
   * Verify a user's current password
   * 
   * @param userId - The user ID
   * @param password - The password to verify
   * @returns True if password is valid
   */
  verifyPassword(userId: string, password: string): Promise<boolean>;
  
  /**
   * Change a user's password
   * 
   * @param input - Password change details including current and new passwords
   * @returns void
   * @throws Error if password change fails
   */
  changePassword(input: PasswordChange): Promise<void>;
  
  /**
   * Verify a temporary token (e.g., for password reset)
   * 
   * @param token - The temporary token to verify
   * @returns User ID if the token is valid, null otherwise
   */
  verifyTempToken(token: string): Promise<string | null>;
  
  /**
   * Generate a temporary token for an operation
   * 
   * @param userId - The user ID for whom the token is generated
   * @param deviceId - Optional device identifier for token binding
   * @returns The generated temporary token
   * @throws Error if token generation fails
   */
  generateTempToken(userId: string, deviceId?: string): Promise<string>;
  
  /**
   * Log out a user (invalidate tokens/session)
   * 
   * @param userId - The user ID to log out
   * @param sessionId - The session ID to invalidate
   * @returns void
   * @throws Error if logout fails
   */
  logout(userId: string, sessionId: string): Promise<void>;
  
  /**
   * Get devices associated with a user
   * 
   * @param userId - The user ID whose devices are to be retrieved
   * @returns List of devices associated with the user
   * @throws Error if device retrieval fails
   */
  getDevices(userId: string): Promise<Device[]>;
  
  /**
   * Revoke a device and its associated tokens
   * 
   * @param userId - The user ID whose device is to be revoked
   * @param deviceId - The device ID to revoke
   * @returns void
   * @throws Error if device revocation fails
   */
  revokeDevice(userId: string, deviceId: string): Promise<void>;
  
  /**
   * Set up two-factor authentication for a user
   * 
   * @param userId - The user ID to set up 2FA for
   * @returns Response with QR code data URI, secret key, and backup codes
   * @throws Error if 2FA setup fails
   */
  setup2FA(userId: string): Promise<ITwoFactorSetupResponse>;
  
  /**
   * Enable two-factor authentication for a user
   * 
   * @param userId - The user ID to enable 2FA for
   * @param token - The TOTP token to verify before enabling 2FA
   * @returns True if 2FA was successfully enabled, false otherwise
   * @throws Error if 2FA enablement fails
   */
  enable2FA(userId: string, token: string): Promise<boolean>;
  
  /**
   * Disable two-factor authentication for a user
   * 
   * @param userId - The user ID to disable 2FA for
   * @param token - The TOTP token to verify before disabling 2FA
   * @returns True if 2FA was successfully disabled, false otherwise
   * @throws Error if 2FA disablement fails
   */
  disable2FA(userId: string, token: string): Promise<boolean>;
}
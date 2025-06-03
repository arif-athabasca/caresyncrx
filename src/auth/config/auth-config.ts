/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Authentication configuration for the CareSyncRx platform.
 * This file centralizes authentication settings to ensure consistency.
 */

/**
 * Authentication configuration object.
 * Contains settings for tokens, security, passwords, etc.
 */
const AUTH_CONFIG = {
  /**
   * JWT token configuration
   */
  TOKENS: {
    /**
     * Access token expiry time in seconds
     * Default: 15 minutes (900 seconds)
     */
    ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY_SECONDS 
      ? parseInt(process.env.ACCESS_TOKEN_EXPIRY_SECONDS, 10) 
      : 900,
    
    /**
     * Refresh token expiry time in seconds
     * Default: 7 days (604800 seconds)
     */
    REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY_SECONDS 
      ? parseInt(process.env.REFRESH_TOKEN_EXPIRY_SECONDS, 10) 
      : 604800,
    
    /**
     * Temporary token expiry time in seconds
     * Used for password reset, email verification, etc.
     * Default: 10 minutes (600 seconds)
     */
    TEMP_TOKEN_EXPIRY: process.env.TEMP_TOKEN_EXPIRY_SECONDS 
      ? parseInt(process.env.TEMP_TOKEN_EXPIRY_SECONDS, 10) 
      : 600
  },

  /**
   * Password security configuration
   */
  PASSWORD: {
    /**
     * Salt rounds for bcrypt
     * Default: 12
     */
    SALT_ROUNDS: process.env.BCRYPT_SALT_ROUNDS 
      ? parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) 
      : 12,
    
    /**
     * Minimum password length
     * Default: 12 characters
     */
    MIN_LENGTH: process.env.PASSWORD_MIN_LENGTH 
      ? parseInt(process.env.PASSWORD_MIN_LENGTH, 10) 
      : 12,
    
    /**
     * Number of days until a password expires and must be changed
     * Default: 90 days
     */
    EXPIRY_DAYS: process.env.PASSWORD_EXPIRY_DAYS 
      ? parseInt(process.env.PASSWORD_EXPIRY_DAYS, 10) 
      : 90,
    
    /**
     * Password history count
     * Number of previous passwords to remember (prevent reuse)
     * Default: 5
     */
    HISTORY_COUNT: process.env.PASSWORD_HISTORY_COUNT 
      ? parseInt(process.env.PASSWORD_HISTORY_COUNT, 10) 
      : 5
  },
  
  /**
   * Security configuration
   */
  SECURITY: {
    /**
     * Maximum failed login attempts before account lockout
     * Default: 5
     */
    MAX_LOGIN_ATTEMPTS: process.env.MAX_LOGIN_ATTEMPTS
      ? parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10)
      : 5,
    
    /**
     * Account lockout duration in milliseconds
     * Default: 15 minutes
     */
    LOCKOUT_DURATION: process.env.ACCOUNT_LOCKOUT_DURATION_MS
      ? parseInt(process.env.ACCOUNT_LOCKOUT_DURATION_MS, 10)
      : 15 * 60 * 1000,
      /**
     * Two-factor authentication settings
     */
    TWO_FACTOR: {
      /**
       * Whether to enforce 2FA for specific roles
       * Default: true for admin and doctor roles
       */
      ENFORCE_FOR_ROLES: process.env.ENFORCE_2FA_ROLES
        ? process.env.ENFORCE_2FA_ROLES.split(',')
        : ['ADMIN', 'DOCTOR'],
      
      /**
       * Number of backup codes to generate
       * Default: 10
       */
      BACKUP_CODES_COUNT: process.env.TOTP_BACKUP_CODES_COUNT
        ? parseInt(process.env.TOTP_BACKUP_CODES_COUNT, 10)
        : 10
    },
    
    /**
     * Idle session timeout in milliseconds
     * Default: 30 minutes
     * Users will be automatically logged out after this period of inactivity
     */
    IDLE_TIMEOUT_MS: process.env.IDLE_TIMEOUT_MS
      ? parseInt(process.env.IDLE_TIMEOUT_MS, 10)
      : 30 * 60 * 1000
  }
};

// Export as both named and default export for maximum compatibility
// Using this approach eliminates the redeclaration error
const AUTH_CONFIG_EXPORT = AUTH_CONFIG;
export { AUTH_CONFIG };
export default AUTH_CONFIG_EXPORT;
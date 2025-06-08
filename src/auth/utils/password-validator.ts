/**
 * Password Validator
 * 
 * Provides functions for validating password strength and compliance with security requirements.
 */

import { AUTH_CONFIG } from '../config';

/**
 * Result of password validation
 */
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Password schema definition
 * Contains the rules and requirements for valid passwords
 */
export const passwordSchema = {
  minLength: AUTH_CONFIG.PASSWORD.MIN_LENGTH || 8,
  requireUppercase: AUTH_CONFIG.PASSWORD.REQUIRE_UPPERCASE || true,
  requireLowercase: AUTH_CONFIG.PASSWORD.REQUIRE_LOWERCASE || true,
  requireNumbers: AUTH_CONFIG.PASSWORD.REQUIRE_NUMBERS || true,
  requireSpecial: AUTH_CONFIG.PASSWORD.REQUIRE_SPECIAL || true,
  checkCommonPasswords: AUTH_CONFIG.PASSWORD.CHECK_COMMON_PASSWORDS || true
};

/**
 * Validates a password against security requirements
 * 
 * @param password The password to validate
 * @returns Validation result with errors if any
 */
export const passwordValidator = (password: string): PasswordValidationResult => {
  const errors: string[] = [];
  
  // Check password length
  const minLength = AUTH_CONFIG.PASSWORD.MIN_LENGTH;
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  
  // Check for uppercase letters
  if (AUTH_CONFIG.PASSWORD.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  // Check for lowercase letters
  if (AUTH_CONFIG.PASSWORD.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  // Check for numbers
  if (AUTH_CONFIG.PASSWORD.REQUIRE_NUMBERS && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  // Check for special characters
  if (AUTH_CONFIG.PASSWORD.REQUIRE_SPECIAL && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check for common passwords
  if (AUTH_CONFIG.PASSWORD.CHECK_COMMON_PASSWORDS) {
    const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'welcome'];
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common and easily guessable');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * PasswordValidator compatibility class
 * 
 * Provides a class wrapper around the password validation function
 * for compatibility with code expecting a class-based validator
 */
export class PasswordValidator {
  /**
   * Validates a password against security requirements
   * 
   * @param password The password to validate
   * @returns Validation result with errors if any
   */
  public validate(password: string): PasswordValidationResult {
    return passwordValidator(password);
  }
  
  /**
   * Checks if a password meets minimum security requirements
   * 
   * @param password The password to check
   * @returns True if the password is valid, false otherwise
   */
  public isValid(password: string): boolean {
    const result = this.validate(password);
    return result.isValid;
  }
  
  /**
   * Gets validation errors for a password
   * 
   * @param password The password to check
   * @returns Array of error messages, empty if password is valid
   */
  public getErrors(password: string): string[] {
    const result = this.validate(password);
    return result.errors;
  }

  /**
   * Static method to validate a password
   * 
   * @param password The password to validate
   * @returns True if the password is valid, false otherwise
   */
  public static validatePassword(password: string): boolean {
    return passwordValidator(password).isValid;
  }
  
  /**
   * Static method to get validation errors
   * 
   * @param password The password to validate
   * @returns Array of error messages
   */
  public static getValidationErrors(password: string): string[] {
    return passwordValidator(password).errors;
  }
  
  /**
   * Calculate password strength on a scale of 0-100
   * 
   * @param password The password to evaluate
   * @returns Strength score (0-100)
   */
  public static calculatePasswordStrength(password: string): number {
    if (!password) return 0;
    
    let score = 0;
    
    // Length contribution (up to 25 points)
    score += Math.min(25, password.length * 2);
    
    // Character variety contribution (up to 50 points)
    if (/[A-Z]/.test(password)) score += 10; // Uppercase
    if (/[a-z]/.test(password)) score += 10; // Lowercase
    if (/[0-9]/.test(password)) score += 10; // Numbers
    if (/[^A-Za-z0-9]/.test(password)) score += 20; // Special chars
    
    // Complexity patterns (up to 25 points)
    if (/[A-Z].*[A-Z]/.test(password)) score += 5; // Multiple uppercase
    if (/[a-z].*[a-z]/.test(password)) score += 5; // Multiple lowercase
    if (/[0-9].*[0-9]/.test(password)) score += 5; // Multiple numbers
    if (/[^A-Za-z0-9].*[^A-Za-z0-9]/.test(password)) score += 10; // Multiple special
    
    return Math.min(100, score);
  }
}
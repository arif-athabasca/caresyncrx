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
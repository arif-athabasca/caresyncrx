/**
 * Zod Password Schema
 * 
 * Provides a reusable Zod schema for password validation that integrates 
 * with the CareSyncRx password validator.
 */

import { z } from 'zod';
import { passwordValidator } from './password-validator';

/**
 * Zod schema for password validation
 * 
 * This schema uses the CareSyncRx password validator to ensure consistency
 * between client-side and server-side validation rules.
 */
export const passwordZodSchema = z.string().refine((password) => {
  const result = passwordValidator(password);
  return result.isValid;
}, (password) => {
  const result = passwordValidator(password);
  return {
    message: result.errors[0] || 'Password does not meet security requirements'
  };
});

/**
 * Extended password schema that includes confirmation validation
 * 
 * Use this for forms that require password confirmation
 */
export const passwordConfirmationSchema = z.object({
  password: passwordZodSchema,
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

/**
 * Utility function to validate password strength for forms
 * 
 * @param password The password to validate
 * @returns Zod SafeParseResult
 */
export const validatePassword = (password: string) => {
  return passwordZodSchema.safeParse(password);
};

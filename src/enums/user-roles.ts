/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * User role definitions for the CareSyncRx platform.
 */

/**
 * Enum defining the available user roles in the system.
 * These roles control access permissions throughout the application.
 */
export enum UserRole {
  DOCTOR = 'DOCTOR',
  NURSE = 'NURSE',
  PHARMACIST = 'PHARMACIST',
  ADMIN = 'ADMIN',
  PATIENT = 'PATIENT'
}
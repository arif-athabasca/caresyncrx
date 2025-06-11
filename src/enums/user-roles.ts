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
  SUPER_ADMIN = 'SUDO',
  ADMIN = 'ADMIN',
  DOCTOR = 'DOCTOR',
  NURSE = 'NURSE',
  PHARMACIST = 'PHARMACIST',
  PATIENT = 'PATIENT',
  CAREGIVER = 'CAREGIVER',
  TECHNICIAN = 'TECHNICIAN',
  GUEST = 'GUEST'
}
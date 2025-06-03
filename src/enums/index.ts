/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Central export point for all enums to ensure consistent imports
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

export { DeviceStatus } from './device-status';
// Add other enum exports as needed

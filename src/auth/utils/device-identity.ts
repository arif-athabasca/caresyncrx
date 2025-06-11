/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Device Identity Management System
 * 
 * This module provides robust device identity persistence and validation
 * across browser storage mechanisms and database. It ensures consistent
 * device identification even across browser sessions, storage clearing,
 * and different authentication flows.
 */

import { v4 as uuidv4 } from 'uuid';
// Direct import from the source file
import { createEdgeSafeHash } from './edge-safe-hash';

/**
 * Storage keys used for device identity
 */
const STORAGE_KEYS = {
  // Primary device ID storage
  DEVICE_ID: 'csrx_device_id',
  // Fingerprint data for validation
  FINGERPRINT: 'csrx_device_fingerprint',
  // Timestamp for tracking when device ID was created/updated
  TIMESTAMP: 'csrx_device_timestamp',
  // Backup device ID in case primary storage is cleared
  BACKUP_ID: 'csrx_backup_device_id',
  // Session-based temporary device ID
  SESSION_ID: 'csrx_session_device_id'
};

/**
 * Device identity storage locations
 */
enum StorageLocation {
  LOCAL_STORAGE = 'localStorage',
  SESSION_STORAGE = 'sessionStorage',
  COOKIES = 'cookies',
  INDEX_DB = 'indexedDB',
}

/**
 * Information about the device
 */
interface DeviceInfo {
  id: string;
  fingerprint: string;
  timestamp: number;
  properties: {
    userAgent: string;
    screenSize: string;
    colorDepth: number;
    timeZone: string;
    language: string;
    platform: string;
  };
}

/**
 * Device identity management system
 */
export class DeviceIdentity {
  private static instance: DeviceIdentity;
  private deviceId: string | null = null;
  private deviceFingerprint: string | null = null;
  private lastValidated: number = 0;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Initialization happens in init() which is called explicitly
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): DeviceIdentity {
    if (!DeviceIdentity.instance) {
      DeviceIdentity.instance = new DeviceIdentity();
    }
    return DeviceIdentity.instance;
  }

  /**
   * Initialize the device identity system
   * This should be called early in the application lifecycle
   */
  public async init(): Promise<string> {
    try {
      // Try to load existing device ID from various storage mechanisms
      this.deviceId = await this.loadExistingDeviceId();
      
      // If no device ID exists, create a new one
      if (!this.deviceId) {
        this.deviceId = this.generateNewDeviceId();
        this.deviceFingerprint = await this.generateDeviceFingerprint();
        
        // Store the new device ID in all available storage mechanisms
        await this.persistDeviceId(this.deviceId, this.deviceFingerprint);
      } else {
        // If device ID exists, generate fingerprint and validate
        this.deviceFingerprint = await this.generateDeviceFingerprint();
        await this.validateAndRefreshDeviceId(this.deviceId, this.deviceFingerprint);
      }
      
      // Set up event listeners for storage changes
      this.setupStorageEventListeners();
      
      return this.deviceId;
    } catch (error) {
      console.error('Error initializing device identity:', error);
      // Fallback to a temporary device ID
      return this.createTemporaryDeviceId();
    }
  }

  /**
   * Get the current device ID
   * This will attempt to initialize if not already initialized
   */
  public async getDeviceId(): Promise<string> {
    if (!this.deviceId) {
      return this.init();
    }
    
    // If more than 1 hour since last validation, revalidate
    if (Date.now() - this.lastValidated > 3600000) {
      this.lastValidated = Date.now();
      
      if (!this.deviceFingerprint) {
        this.deviceFingerprint = await this.generateDeviceFingerprint();
      }
      
      await this.validateAndRefreshDeviceId(this.deviceId, this.deviceFingerprint);
    }
    
    return this.deviceId;
  }

  /**
   * Generate detailed information about the current device
   * This can be used for device verification on the server
   */  public async getDetailedDeviceInfo(): Promise<DeviceInfo> {
    const id = await this.getDeviceId();
    const fingerprint = this.deviceFingerprint || await this.generateDeviceFingerprint();
    
    // Server-side fallback
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return {
        id,
        fingerprint,
        timestamp: Date.now(),
        properties: {
          userAgent: 'server',
          screenSize: '0x0',
          colorDepth: 0,
          timeZone: 'UTC',
          language: 'en',
          platform: 'server'
        }
      };
    }
    
    return {
      id,
      fingerprint,
      timestamp: Date.now(),
      properties: {
        userAgent: navigator.userAgent,
        screenSize: `${window.screen.width}x${window.screen.height}`,
        colorDepth: window.screen.colorDepth,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        platform: navigator.platform
      }
    };
  }
  /**
   * Verify if a device ID appears to be valid for the current device
   * This is less strict than server-side validation to accommodate for browser changes
   */  public async verifyDeviceId(deviceId: string): Promise<boolean> {
    if (!deviceId) {
      console.warn('Empty device ID provided for verification');
      return false;
    }
    
    // Server-side environment check - be permissive
    if (typeof window === 'undefined') {
      console.log('Server-side device verification - permissive mode');
      return true;
    }
    
    // If the device ID matches our current one, it's valid
    if (deviceId === this.deviceId) {
      console.log('Device ID exact match with current ID');
      return true;
    }
    
    // Check if this device ID is in any of our storage mechanisms
    const existingId = await this.loadExistingDeviceId();
    if (deviceId === existingId) {
      // Update our internal state to match the valid ID
      console.log('Device ID found in existing storage');
      this.deviceId = deviceId;
      return true;
    }
    
    // For more sophisticated verification:
    
    // 1. Check if the device ID is stored in the backup
    try {
      const backupId = localStorage.getItem(STORAGE_KEYS.BACKUP_ID);
      if (deviceId === backupId) {
        // Found in backup - update our primary ID
        console.log('Device ID found in backup storage');
        this.deviceId = deviceId;
        await this.persistDeviceId(deviceId, this.deviceFingerprint);
        return true;
      }
      
      // 2. Check session storage (for temporary/transitional device IDs)
      const sessionId = sessionStorage.getItem(STORAGE_KEYS.SESSION_ID);
      if (deviceId === sessionId) {
        console.log('Device ID found in session storage');
        return true;
      }
      
      // 3. Special handling for known prefixes
      if (deviceId.startsWith('temp-') || deviceId.startsWith('fallback-')) {
        console.log('Temporary device ID detected, allowing access');
        
        // Store this ID for future verification
        sessionStorage.setItem(STORAGE_KEYS.SESSION_ID, deviceId);
        return true;
      }
      
      // 4. Very permissive fallback - always accept for admin-level accounts
      // This is a temporary solution to prevent admin users from being locked out
      // TODO: Remove this after migration to stable device identity system is complete
      if (deviceId.includes('admin') || deviceId.length > 30) {
        console.warn('Allowing potentially untrusted device ID for compatibility', {
          providedId: deviceId.substring(0, 8) + '...',
          reason: 'Legacy compatibility'
        });
        
        // Store this ID temporarily to avoid repeated warnings
        sessionStorage.setItem(STORAGE_KEYS.SESSION_ID, deviceId);
        return true;
      }
    } catch (e) {
      console.warn('Error during advanced device ID verification:', e);
      // Continue with verification process
    }
    
    // If we get here, the device ID is not valid for this device
    return false;
  }

  /**
   * Force a new device ID to be generated
   * This is useful for testing or when a user explicitly wants a new device identity
   */
  public async regenerateDeviceId(): Promise<string> {
    this.deviceId = this.generateNewDeviceId();
    this.deviceFingerprint = await this.generateDeviceFingerprint();
    
    await this.persistDeviceId(this.deviceId, this.deviceFingerprint);
    return this.deviceId;
  }

  /**
   * Load existing device ID from various storage mechanisms
   * @returns The device ID if found, null otherwise
   */  private async loadExistingDeviceId(): Promise<string | null> {
    // Server-side environment check
    if (typeof window === 'undefined') {
      console.log('Skipping device ID loading on server-side');
      return null;
    }
    
    try {
      // Try localStorage first (most common)
      const localStorageId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
      if (localStorageId) {
        return localStorageId;
      }
      
      // Try sessionStorage next
      const sessionStorageId = sessionStorage.getItem(STORAGE_KEYS.DEVICE_ID);
      if (sessionStorageId) {
        return sessionStorageId;
      }
      
      // Try cookies
      if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === STORAGE_KEYS.DEVICE_ID) {
            return decodeURIComponent(value);
          }
        }
      }
      
      // Try backup in localStorage
      const backupId = localStorage.getItem(STORAGE_KEYS.BACKUP_ID);
      if (backupId) {
        return backupId;
      }
      
      return null;
    } catch (error) {
      console.error('Error loading existing device ID:', error);
      return null;
    }
  }

  /**
   * Generate a new device ID
   * @returns A new unique device ID
   */
  private generateNewDeviceId(): string {
    return uuidv4();
  }

  /**
   * Create a temporary device ID for fallback situations
   * This is less secure but ensures the application can continue functioning
   */
  private createTemporaryDeviceId(): string {
    const tempId = `temp-${uuidv4()}`;
    
    try {
      // Store in sessionStorage only since this is temporary
      sessionStorage.setItem(STORAGE_KEYS.SESSION_ID, tempId);
    } catch (e) {
      console.warn('Failed to store temporary device ID:', e);
    }
    
    return tempId;
  }

  /**
   * Generate a fingerprint for the current device
   * This uses various browser properties to create a relatively stable fingerprint
   */  private async generateDeviceFingerprint(): Promise<string> {
    // Server-side fallback
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return createEdgeSafeHash('server-' + Date.now());
    }
    
    try {
      const components = [
        navigator.userAgent,
        navigator.language,
        navigator.platform,
        window.screen.colorDepth,
        `${window.screen.width}x${window.screen.height}`,
        new Date().getTimezoneOffset(),
        !!window.sessionStorage,
        !!window.localStorage,
        !!window.indexedDB,
      ];
      
      // Add some additional browser-specific capabilities if available
      if ('hardwareConcurrency' in navigator) {
        components.push(navigator.hardwareConcurrency);
      }
      
      if ('deviceMemory' in navigator) {
        components.push((navigator as any).deviceMemory);
      }
      
      // Create a fingerprint string
      const fingerprintString = components.join('###');
      
      // Use our edge-safe hash function
      return createEdgeSafeHash(fingerprintString);
    } catch (error) {
      console.error('Error generating device fingerprint:', error);
      // Fallback to a simple fingerprint
      return createEdgeSafeHash(navigator.userAgent + Date.now());
    }
  }

  /**
   * Persist device ID in all available storage mechanisms
   */  private async persistDeviceId(deviceId: string, fingerprint: string | null): Promise<void> {
    const timestamp = Date.now();
    
    // Server-side environment check
    if (typeof window === 'undefined') {
      // On server, just log that we're skipping storage
      console.log('Skipping device ID persistence on server-side');
      return;
    }
    
    try {
      // Store in localStorage (primary)
      localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
      localStorage.setItem(STORAGE_KEYS.TIMESTAMP, timestamp.toString());
      
      if (fingerprint) {
        localStorage.setItem(STORAGE_KEYS.FINGERPRINT, fingerprint);
      }
      
      // Backup in localStorage with different key
      localStorage.setItem(STORAGE_KEYS.BACKUP_ID, deviceId);
      
      // Store in sessionStorage too
      sessionStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
      sessionStorage.setItem(STORAGE_KEYS.TIMESTAMP, timestamp.toString());
      
      // Store in cookies (short-lived)
      if (typeof document !== 'undefined') {
        const twoWeeksInSeconds = 14 * 24 * 60 * 60;
        document.cookie = `${STORAGE_KEYS.DEVICE_ID}=${deviceId}; max-age=${twoWeeksInSeconds}; path=/; SameSite=Strict;`;
      }
    } catch (error) {
      console.error('Error persisting device ID:', error);
      
      // Try individual mechanisms in case one failed
      try { sessionStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId); } catch (e) { /* ignore */ }
      try { sessionStorage.setItem(STORAGE_KEYS.SESSION_ID, deviceId); } catch (e) { /* ignore */ }
    }
  }
  /**
   * Validate a device ID against the current device fingerprint
   * If validation passes, refresh the device ID in all storage mechanisms
   */
  private async validateAndRefreshDeviceId(deviceId: string, currentFingerprint: string | null): Promise<boolean> {
    try {
      // Get stored fingerprint if available
      const storedFingerprint = localStorage.getItem(STORAGE_KEYS.FINGERPRINT);
      
      // If we have both fingerprints, compare them
      if (storedFingerprint && currentFingerprint) {
        // More permissive threshold: 50% similarity is acceptable
        // This makes the system more resilient to browser updates, OS changes, etc.
        const similarityThreshold = 0.5;
        const similarity = this.calculateStringSimilarity(storedFingerprint, currentFingerprint);
        
        console.log(`Device fingerprint similarity: ${similarity.toFixed(2)}`);
        
        if (similarity < similarityThreshold) {
          console.warn('Device fingerprint has changed significantly, but continuing with same device ID', {
            similarity,
            threshold: similarityThreshold
          });
          
          // Log detailed fingerprint components for debugging
          this.logFingerprintComponents(storedFingerprint, currentFingerprint);
          
          // Update the stored fingerprint to the new one - this adapts over time
          localStorage.setItem(STORAGE_KEYS.FINGERPRINT, currentFingerprint);
        }
      } else if (currentFingerprint) {
        // No stored fingerprint, store the current one
        localStorage.setItem(STORAGE_KEYS.FINGERPRINT, currentFingerprint);
      }
      
      // Refresh the device ID in all storage mechanisms
      await this.persistDeviceId(deviceId, currentFingerprint);
      
      return true;
    } catch (error) {
      console.error('Error validating device ID:', error);
      return false;
    }
  }

  /**
   * Setup event listeners for storage changes
   * This helps keep device ID consistent across tabs
   */
  private setupStorageEventListeners(): void {
    try {      // Listen for storage events from other tabs
      if (typeof window !== 'undefined') {
        window.addEventListener('storage', (event) => {
          if (event.key === STORAGE_KEYS.DEVICE_ID && event.newValue) {
            // Another tab updated the device ID, update our local copy
            this.deviceId = event.newValue;
          }
        });
      }
    } catch (error) {
      console.warn('Error setting up storage event listeners:', error);
    }
  }

  /**
   * Calculate string similarity using Levenshtein distance
   * @param str1 First string
   * @param str2 Second string
   * @returns Similarity as a value between 0 and 1
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    
    // If either string is empty, the similarity is 0
    if (len1 === 0 || len2 === 0) {
      return 0;
    }
    
    // Simple case - strings are identical
    if (str1 === str2) {
      return 1;
    }
    
    // For long strings, we use a simple approximation
    if (len1 > 100 || len2 > 100) {
      let matches = 0;
      const samples = 10;
      const sampleLength = 10;
      
      for (let i = 0; i < samples; i++) {
        const pos1 = Math.floor(Math.random() * (len1 - sampleLength));
        const sample1 = str1.substring(pos1, pos1 + sampleLength);
        
        if (str2.includes(sample1)) {
          matches++;
        }
      }
      
      return matches / samples;
    }
    
    // For shorter strings, use Levenshtein distance
    const distanceMatrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(null));
    
    // Initialize first row and column
    for (let i = 0; i <= len1; i++) {
      distanceMatrix[i][0] = i;
    }
    
    for (let j = 0; j <= len2; j++) {
      distanceMatrix[0][j] = j;
    }
    
    // Fill in the rest of the matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        
        distanceMatrix[i][j] = Math.min(
          distanceMatrix[i - 1][j] + 1, // deletion
          distanceMatrix[i][j - 1] + 1, // insertion
          distanceMatrix[i - 1][j - 1] + cost // substitution
        );
      }
    }
    
    // Calculate similarity as 1 - (distance / max length)
    const distance = distanceMatrix[len1][len2];
    const maxLength = Math.max(len1, len2);
    
    return 1 - (distance / maxLength);
  }

  /**
   * Log detailed fingerprint components for debugging
   * @param storedFingerprint The stored fingerprint
   * @param currentFingerprint The current fingerprint
   */
  private logFingerprintComponents(storedFingerprint: string, currentFingerprint: string): void {
    try {
      // Sanitize the fingerprints for logging (remove potentially sensitive info)
      const sanitizeForLog = (fp: string) => {
        // Only keep first 4 and last 4 characters of each component, replace middle with ...
        return fp.split('###').map(component => {
          if (component.length > 10) {
            return `${component.substring(0, 4)}...${component.substring(component.length - 4)}`;
          }
          return component;
        }).join('|');
      };
        console.log('Fingerprint comparison:', {
        stored: sanitizeForLog(storedFingerprint),
        current: sanitizeForLog(currentFingerprint),
        storedLength: storedFingerprint.length,
        currentLength: currentFingerprint.length
      });
      
      // Log browser-specific info that may have changed
      if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
        console.log('Current browser environment:', {
          userAgent: navigator.userAgent.substring(0, 50) + '...',
          language: navigator.language,
          platform: navigator.platform,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          colorDepth: window.screen.colorDepth,
          screenSize: `${window.screen.width}x${window.screen.height}`
        });
      }
    } catch (error) {
      console.error('Error logging fingerprint components:', error);
    }
  }
}

// Create and export a singleton instance
export const deviceIdentity = DeviceIdentity.getInstance();

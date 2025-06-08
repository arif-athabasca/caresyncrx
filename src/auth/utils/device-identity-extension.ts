/**
 * This file adds the setDeviceId method to the DeviceIdentity class
 * to support explicitly setting a device ID from external sources.
 */

import { deviceIdentity } from './device-identity';

// Add setDeviceId method to DeviceIdentity prototype
(deviceIdentity as any).setDeviceId = async function(deviceId: string): Promise<boolean> {
  if (!deviceId) {
    console.warn('Empty device ID provided for setting');
    return false;
  }

  try {
    // Store the device ID
    this.deviceId = deviceId;
    
    // Generate fingerprint for the current device if not already available
    if (!this.deviceFingerprint) {
      this.deviceFingerprint = await this.generateDeviceFingerprint();
    }
    
    // Persist the device ID in all storage mechanisms
    await this.persistDeviceId(deviceId, this.deviceFingerprint);
    
    // Update the last validated timestamp
    this.lastValidated = Date.now();
    
    console.log('Device ID successfully set:', deviceId.substring(0, 8) + '...');
    return true;
  } catch (error) {
    console.error('Error setting device ID:', error);
    return false;
  }
};

export {};

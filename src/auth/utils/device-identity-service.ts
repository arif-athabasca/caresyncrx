/**
 * Device Identity Service
 * 
 * Provides a singleton class for managing device identities and fingerprinting.
 * Used for enhanced security and multi-device token management.
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Device information interface
 */
interface DeviceInfo {
  id: string;
  name: string;
  browser: string;
  os: string;
  lastUsed: number;
}

/**
 * Class-based implementation of device identity service
 */
class DeviceIdentityServiceClass {
  private static instance: DeviceIdentityServiceClass;
  private deviceId: string | null = null;
  
  /**
   * Private constructor to prevent direct instantiation
   */
  private constructor() {
    // Load or generate device ID in browser environment
    if (typeof window !== 'undefined') {
      this.deviceId = this.loadDeviceId();
    }
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): DeviceIdentityServiceClass {
    if (!DeviceIdentityServiceClass.instance) {
      DeviceIdentityServiceClass.instance = new DeviceIdentityServiceClass();
    }
    return DeviceIdentityServiceClass.instance;
  }
  
  /**
   * Load device ID from storage or generate a new one
   */
  private loadDeviceId(): string {
    try {
      let deviceId = localStorage.getItem('deviceId');
      
      if (!deviceId) {
        deviceId = this.generateDeviceId();
        localStorage.setItem('deviceId', deviceId);
      }
      
      return deviceId;
    } catch (error) {
      console.error('Failed to load or generate device ID:', error);
      return this.generateDeviceId();
    }
  }
  
  /**
   * Generate a new device ID
   */
  private generateDeviceId(): string {
    return uuidv4();
  }
  
  /**
   * Get the current device ID
   */
  public getDeviceId(): string {
    if (!this.deviceId) {
      this.deviceId = this.generateDeviceId();
      
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('deviceId', this.deviceId);
        } catch (error) {
          console.error('Failed to save device ID to storage:', error);
        }
      }
    }
    
    return this.deviceId;
  }
  
  /**
   * Get information about the current device
   */
  public getDeviceInfo(): DeviceInfo {
    const deviceId = this.getDeviceId();
    
    let browser = 'Unknown';
    let os = 'Unknown';
    let name = 'Unknown Device';
    
    if (typeof window !== 'undefined' && window.navigator) {
      const userAgent = window.navigator.userAgent;
      
      // Detect browser
      if (userAgent.indexOf('Chrome') !== -1) {
        browser = 'Chrome';
      } else if (userAgent.indexOf('Firefox') !== -1) {
        browser = 'Firefox';
      } else if (userAgent.indexOf('Safari') !== -1) {
        browser = 'Safari';
      } else if (userAgent.indexOf('Edge') !== -1 || userAgent.indexOf('Edg') !== -1) {
        browser = 'Edge';
      } else if (userAgent.indexOf('MSIE') !== -1 || userAgent.indexOf('Trident') !== -1) {
        browser = 'Internet Explorer';
      }
      
      // Detect OS
      if (userAgent.indexOf('Windows') !== -1) {
        os = 'Windows';
      } else if (userAgent.indexOf('Mac') !== -1) {
        os = 'macOS';
      } else if (userAgent.indexOf('Linux') !== -1) {
        os = 'Linux';
      } else if (userAgent.indexOf('Android') !== -1) {
        os = 'Android';
      } else if (userAgent.indexOf('iOS') !== -1 || userAgent.indexOf('iPhone') !== -1 || userAgent.indexOf('iPad') !== -1) {
        os = 'iOS';
      }
      
      name = `${browser} on ${os}`;
    }
    
    return {
      id: deviceId,
      name,
      browser,
      os,
      lastUsed: Date.now()
    };
  }
  
  /**
   * Register the current device
   */
  public registerDevice(): DeviceInfo {
    const deviceInfo = this.getDeviceInfo();
    
    if (typeof window !== 'undefined') {
      try {
        // Save last used timestamp
        const devices = this.getRegisteredDevices();
        const updatedDevices = devices.filter(d => d.id !== deviceInfo.id);
        updatedDevices.push(deviceInfo);
        
        localStorage.setItem('registeredDevices', JSON.stringify(updatedDevices));
      } catch (error) {
        console.error('Failed to register device:', error);
      }
    }
    
    return deviceInfo;
  }
  
  /**
   * Get all registered devices
   */
  public getRegisteredDevices(): DeviceInfo[] {
    if (typeof window !== 'undefined') {
      try {
        const devicesJson = localStorage.getItem('registeredDevices');
        
        if (devicesJson) {
          return JSON.parse(devicesJson);
        }
      } catch (error) {
        console.error('Failed to get registered devices:', error);
      }
    }
    
    return [];
  }
  
  /**
   * Clear all registered devices
   */
  public clearRegisteredDevices(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('registeredDevices');
      } catch (error) {
        console.error('Failed to clear registered devices:', error);
      }
    }
  }
}

// Create the singleton instance
const deviceIdentityServiceInstance = DeviceIdentityServiceClass.getInstance();

// Export the instance as DeviceIdentityService
export const DeviceIdentityService = deviceIdentityServiceInstance;
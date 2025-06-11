/**
 * Auth Utils Index
 * 
 * Re-exports all utility functions and classes from the auth/utils directory.
 * This file helps avoid circular dependencies by providing a central export point.
 */

// Password utilities
export { passwordValidator } from './password-validator';

// Device identity utilities
export { DeviceIdentityService } from './device-identity-service';

// Import device identity extension to add setDeviceId method
import './device-identity-extension';
export { deviceIdentity } from './device-identity';

// Navigation state management
export { NavigationStateManager } from './navigation-state-manager';
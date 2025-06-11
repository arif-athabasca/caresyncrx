/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Authentication enumerations for the CareSyncRx platform.
 * This file forwards to the central enums for backward compatibility.
 */

// Re-export all enums from the central location
export { 
  UserRole,
  TokenType,
  AuthEventType,
  LoginStatus,
  TwoFactorMethod
} from '../enums';

// Default export for backward compatibility
import * as allEnums from '../enums';
export default allEnums;
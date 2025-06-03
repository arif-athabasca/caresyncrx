/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Server-side bcrypt implementation for CareSyncRx.
 * This file ensures that password-related operations only occur on the server.
 */

import * as bcryptjs from 'bcryptjs';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

/**
 * Server-side bcrypt wrapper with browser protection.
 * Authentication should always happen server-side.
 */
const serverSideBcrypt = {
  /**
   * Compare a plain-text password with a hash.
   * This must only be called from server-side code.
   */
  compare: async (password: string, hash: string): Promise<boolean> => {
    if (isBrowser) {
      throw new Error(
        'Security violation: Password operations cannot be performed in the browser. ' +
        'Use an API route for authentication.'
      );
    }
    
    // On server, use real bcrypt
    return bcryptjs.compare(password, hash);
  },
  
  /**
   * Hash a password.
   * This must only be called from server-side code.
   */
  hash: async (password: string, saltRounds: number): Promise<string> => {
    if (isBrowser) {
      throw new Error(
        'Security violation: Password operations cannot be performed in the browser. ' +
        'Use an API route for password hashing.'
      );
    }
    
    // On server, use real bcrypt
    return bcryptjs.hash(password, saltRounds);
  }
};

// Export individual functions for named imports
export const compare = serverSideBcrypt.compare;
export const hash = serverSideBcrypt.hash;

// Also export as default for backward compatibility
export default serverSideBcrypt;
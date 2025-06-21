// Encryption utilities for sensitive data like health card numbers
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For GCM, this is always 16
const TAG_LENGTH = 16; // For GCM, this is always 16

/**
 * Encrypt a string using AES-256-GCM
 */
export function encrypt(text: string, key: string): string {
  try {
    // Ensure key is 32 bytes for AES-256
    const keyBuffer = crypto.scryptSync(key, 'salt', 32);
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipher(ALGORITHM, keyBuffer);
    cipher.setAAD(Buffer.from('health-card-data'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combine iv, tag, and encrypted data
    const combined = iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
    
    return combined;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt a string using AES-256-GCM
 */
export function decrypt(encryptedData: string, key: string): string {
  try {
    // Ensure key is 32 bytes for AES-256
    const keyBuffer = crypto.scryptSync(key, 'salt', 32);
    
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipher(ALGORITHM, keyBuffer);
    decipher.setAAD(Buffer.from('health-card-data'));
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash a string using SHA-256 (for non-reversible hashing)
 */
export function hash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Generate a secure random key for encryption
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verify if a key is valid for encryption (32 bytes when converted)
 */
export function isValidEncryptionKey(key: string): boolean {
  try {
    const keyBuffer = crypto.scryptSync(key, 'salt', 32);
    return keyBuffer.length === 32;
  } catch {
    return false;
  }
}

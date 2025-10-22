/**
 * Encryption utilities for sensitive data
 * Based on PRD security requirements
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SALT_LENGTH = 16;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Get encryption key from environment
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KMS_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KMS_KEY not configured');
  }
  
  // In production, fetch from KMS; for now, use env var
  return Buffer.from(key, 'base64');
}

/**
 * Derive key from master key using scrypt
 */
function deriveKey(masterKey: Buffer, salt: Buffer): Buffer {
  return scryptSync(masterKey, salt, KEY_LENGTH);
}

/**
 * Encrypt string data
 * @param plaintext Data to encrypt
 * @returns Base64-encoded encrypted data with salt, IV, and tag
 */
export function encrypt(plaintext: string): string {
  const masterKey = getEncryptionKey();
  
  // Generate salt and IV
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  
  // Derive key
  const key = deriveKey(masterKey, salt);
  
  // Encrypt
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  
  // Get auth tag
  const tag = cipher.getAuthTag();
  
  // Combine: salt + iv + tag + encrypted
  const combined = Buffer.concat([salt, iv, tag, encrypted]);
  
  return combined.toString('base64');
}

/**
 * Decrypt encrypted data
 * @param ciphertext Base64-encoded encrypted data
 * @returns Decrypted plaintext
 */
export function decrypt(ciphertext: string): string {
  const masterKey = getEncryptionKey();
  
  // Decode
  const combined = Buffer.from(ciphertext, 'base64');
  
  // Extract components
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = combined.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + TAG_LENGTH
  );
  const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  
  // Derive key
  const key = deriveKey(masterKey, salt);
  
  // Decrypt
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  
  return decrypted.toString('utf8');
}

/**
 * Mask card number to last N digits
 */
export function maskCardNumber(cardNumber: string, lastDigits: number = 4): string {
  const cleaned = cardNumber.replace(/\D/g, '');
  
  if (cleaned.length < lastDigits) {
    return '*'.repeat(cleaned.length);
  }
  
  const masked = '*'.repeat(cleaned.length - lastDigits);
  const visible = cleaned.slice(-lastDigits);
  
  return masked + visible;
}

/**
 * Hash sensitive data (one-way)
 */
export function hashData(data: string): string {
  const { createHash } = require('crypto');
  return createHash('sha256').update(data).digest('hex');
}


/**
 * Field-Level Encryption for Sensitive Data
 *
 * Section 4.1: security_dog.md - Encrypt sensitive data at rest
 *
 * Uses AES-256-GCM for authenticated encryption with associated data (AEAD).
 * Protects sensitive data even if database backups are compromised.
 *
 * Fields that should be encrypted:
 * - Prompt templates (business logic)
 * - Execution outputs (AI responses, potentially containing PII)
 * - API keys (user-provided keys)
 */

import crypto from 'crypto';

/**
 * Encryption algorithm: AES-256-GCM (Authenticated Encryption with Associated Data)
 * Provides both confidentiality and authenticity
 */
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits

/**
 * Get encryption key from environment variable
 * In production, this should be stored in a secure key management system (AWS KMS, HashiCorp Vault, etc.)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is required for field-level encryption'
    );
  }

  // Key should be 32 bytes (256 bits) hex string
  if (key.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY must be a 64-character hex string (32 bytes)'
    );
  }

  return Buffer.from(key, 'hex');
}

/**
 * Generate a new encryption key (for setup/rotation)
 * Run this to generate a new key: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Encrypt a string value
 *
 * Format: iv:authTag:encryptedData (all hex-encoded)
 *
 * @param plaintext - Plain text to encrypt
 * @returns Encrypted string in format "iv:authTag:encrypted"
 */
export function encrypt(plaintext: string): string {
  try {
    const key = getEncryptionKey();

    // Generate random IV (Initialization Vector)
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt the data
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Return format: iv:authTag:encrypted (all hex-encoded)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  } catch (error) {
    throw new Error(`Encryption failed: ${error}`);
  }
}

/**
 * Decrypt an encrypted string
 *
 * @param encryptedText - Encrypted string in format "iv:authTag:encrypted"
 * @returns Decrypted plaintext
 */
export function decrypt(encryptedText: string): string {
  try {
    const key = getEncryptionKey();

    // Parse the encrypted format
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }

    const [ivHex, authTagHex, encryptedHex] = parts;

    // Convert from hex
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt the data
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    throw new Error(`Decryption failed: ${error}`);
  }
}

/**
 * Check if a string is encrypted (has the expected format)
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(':');
  return parts.length === 3 && parts.every(part => /^[0-9a-f]+$/i.test(part));
}

/**
 * Encrypt an object's fields
 * Only encrypts fields specified in the fieldsToEncrypt array
 *
 * @param obj - Object to encrypt
 * @param fieldsToEncrypt - Array of field names to encrypt
 * @returns Object with encrypted fields
 */
export function encryptObject<T extends Record<string, any>>(
  obj: T,
  fieldsToEncrypt: Array<keyof T>
): T {
  const result = { ...obj };

  for (const field of fieldsToEncrypt) {
    if (result[field] !== null && result[field] !== undefined) {
      const value = String(result[field]);
      result[field] = encrypt(value) as any;
    }
  }

  return result;
}

/**
 * Decrypt an object's fields
 * Only decrypts fields specified in the fieldsToDecrypt array
 *
 * @param obj - Object to decrypt
 * @param fieldsToDecrypt - Array of field names to decrypt
 * @returns Object with decrypted fields
 */
export function decryptObject<T extends Record<string, any>>(
  obj: T,
  fieldsToDecrypt: Array<keyof T>
): T {
  const result = { ...obj };

  for (const field of fieldsToDecrypt) {
    if (result[field] !== null && result[field] !== undefined) {
      const value = String(result[field]);
      // Only decrypt if it looks encrypted
      if (isEncrypted(value)) {
        result[field] = decrypt(value) as any;
      }
    }
  }

  return result;
}

/**
 * Helper function to encrypt specific database fields before storage
 * Use this in database queries before inserting/updating
 */
export const FieldEncryption = {
  /**
   * Encrypt prompt template
   */
  encryptPromptTemplate(template: string): string {
    return encrypt(template);
  },

  /**
   * Decrypt prompt template
   */
  decryptPromptTemplate(encryptedTemplate: string): string {
    return decrypt(encryptedTemplate);
  },

  /**
   * Encrypt execution output
   */
  encryptExecutionOutput(output: string): string {
    return encrypt(output);
  },

  /**
   * Decrypt execution output
   */
  decryptExecutionOutput(encryptedOutput: string): string {
    return decrypt(encryptedOutput);
  },

  /**
   * Encrypt API key
   */
  encryptApiKey(apiKey: string): string {
    return encrypt(apiKey);
  },

  /**
   * Decrypt API key
   */
  decryptApiKey(encryptedApiKey: string): string {
    return decrypt(encryptedApiKey);
  },
};

/**
 * Utility to rotate encryption keys (for key rotation scenarios)
 * This re-encrypts data with a new key
 *
 * @param encryptedText - Text encrypted with old key
 * @param oldKey - Old encryption key (hex string)
 * @param newKey - New encryption key (hex string)
 * @returns Text re-encrypted with new key
 */
export function rotateEncryptionKey(
  encryptedText: string,
  oldKey: string,
  newKey: string
): string {
  // Temporarily set old key
  const originalKey = process.env.ENCRYPTION_KEY;
  process.env.ENCRYPTION_KEY = oldKey;

  // Decrypt with old key
  const plaintext = decrypt(encryptedText);

  // Set new key
  process.env.ENCRYPTION_KEY = newKey;

  // Encrypt with new key
  const reencrypted = encrypt(plaintext);

  // Restore original key
  process.env.ENCRYPTION_KEY = originalKey;

  return reencrypted;
}

/**
 * Performance note: Encryption adds ~0.1-1ms per field
 * For bulk operations, consider encrypting in batches or using async encryption
 */

import crypto from 'crypto';

/**
 * Encryption service for sensitive data (passwords, API keys, tokens)
 * Uses AES-256-GCM for authenticated encryption
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // GCM standard
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Derives an encryption key from the master secret
 */
function deriveKey(secret: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(secret, salt, 100000, 32, 'sha256');
}

/**
 * Gets the encryption secret from environment
 * @throws {Error} If ENCRYPTION_KEY is not set
 */
function getEncryptionSecret(): string {
  const secret = process.env['ENCRYPTION_KEY'];
  if (!secret || secret.length < 32) {
    throw new Error(
      'ENCRYPTION_KEY environment variable must be set and at least 32 characters long'
    );
  }
  return secret;
}

/**
 * Encrypts a plaintext string
 * @param plaintext - The text to encrypt
 * @returns Base64-encoded encrypted data (salt:iv:authTag:ciphertext)
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return '';

  const secret = getEncryptionSecret();
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(secret, salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: salt:iv:authTag:ciphertext
  return Buffer.concat([salt, iv, authTag, Buffer.from(encrypted, 'hex')])
    .toString('base64');
}

/**
 * Decrypts an encrypted string
 * @param encryptedData - Base64-encoded encrypted data
 * @returns The original plaintext
 * @throws {Error} If decryption fails (wrong key or corrupted data)
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) return '';

  try {
    const secret = getEncryptionSecret();
    const buffer = Buffer.from(encryptedData, 'base64');

    // Extract components
    const salt = buffer.subarray(0, SALT_LENGTH);
    const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = buffer.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
    );
    const ciphertext = buffer.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

    const key = deriveKey(secret, salt);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error(
      `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Checks if a string appears to be encrypted (base64 with correct structure)
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false;
  try {
    const buffer = Buffer.from(value, 'base64');
    // Minimum length: salt + iv + authTag + some ciphertext
    return buffer.length >= SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH + 1;
  } catch {
    return false;
  }
}

/**
 * Encrypts an object's sensitive fields in place
 * @param obj - Object containing sensitive data
 * @param fields - Array of field names to encrypt
 * @returns New object with encrypted fields
 */
export function encryptFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const result = { ...obj };
  for (const field of fields) {
    const value = result[field];
    if (typeof value === 'string' && value && !isEncrypted(value)) {
      result[field] = encrypt(value) as any;
    }
  }
  return result;
}

/**
 * Decrypts an object's encrypted fields in place
 * @param obj - Object with encrypted data
 * @param fields - Array of field names to decrypt
 * @returns New object with decrypted fields
 */
export function decryptFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const result = { ...obj };
  for (const field of fields) {
    const value = result[field];
    if (typeof value === 'string' && value && isEncrypted(value)) {
      try {
        result[field] = decrypt(value) as any;
      } catch (error) {
        console.error(`Failed to decrypt field ${String(field)}:`, error);
        // Leave encrypted if decryption fails
      }
    }
  }
  return result;
}

/**
 * Hashes a password for storage (one-way)
 * @param password - Plain text password
 * @returns Hashed password with salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
    .toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verifies a password against a hash
 * @param password - Plain text password to verify
 * @param storedHash - Stored hash (salt:hash format)
 * @returns True if password matches
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, originalHash] = storedHash.split(':');
    if (!salt || !originalHash) return false;

    const hash = crypto
      .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
      .toString('hex');
    return hash === originalHash;
  } catch {
    return false;
  }
}

/**
 * Generates a random encryption key suitable for ENCRYPTION_KEY
 * @returns 64-character hex string (256 bits)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generates a random JWT secret suitable for JWT_SECRET
 * @returns 64-character hex string (256 bits)
 */
export function generateJWTSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

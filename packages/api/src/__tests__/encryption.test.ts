import { describe, it, expect, beforeEach } from 'vitest';

import {
  encrypt,
  decrypt,
  isEncrypted,
  encryptFields,
  decryptFields,
  hashPassword,
  verifyPassword,
  generateEncryptionKey,
  generateJWTSecret,
} from '../services/encryption';

describe('Encryption Service', () => {
  beforeEach(() => {
    // Set encryption key for tests
    process.env['ENCRYPTION_KEY'] = generateEncryptionKey();
  });

  describe('encrypt() and decrypt()', () => {
    it('should encrypt and decrypt a string successfully', () => {
      const plaintext = 'my-secret-password';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext', () => {
      const plaintext = 'my-secret-password';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle empty strings', () => {
      const encrypted = encrypt('');
      expect(encrypted).toBe('');

      const decrypted = decrypt('');
      expect(decrypted).toBe('');
    });

    it('should handle long strings', () => {
      const plaintext = 'a'.repeat(1000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = '你好世界 🔒🔑 مرحبا';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw error when decrypting with wrong key', () => {
      const plaintext = 'my-secret-password';
      const encrypted = encrypt(plaintext);

      // Change the encryption key
      process.env['ENCRYPTION_KEY'] = generateEncryptionKey();

      expect(() => decrypt(encrypted)).toThrow(/Decryption failed/);
    });

    it('should throw error when decrypting corrupted data', () => {
      const corrupted = 'not-valid-base64-encrypted-data';
      expect(() => decrypt(corrupted)).toThrow(/Decryption failed/);
    });

    it('should throw error when ENCRYPTION_KEY not set', () => {
      delete process.env['ENCRYPTION_KEY'];

      expect(() => encrypt('test')).toThrow(
        /ENCRYPTION_KEY environment variable must be set/
      );
    });

    it('should throw error when ENCRYPTION_KEY too short', () => {
      process.env['ENCRYPTION_KEY'] = 'short';

      expect(() => encrypt('test')).toThrow(
        /ENCRYPTION_KEY environment variable must be set and at least 32 characters/
      );
    });
  });

  describe('isEncrypted()', () => {
    it('should detect encrypted strings', () => {
      const plaintext = 'my-secret-password';
      const encrypted = encrypt(plaintext);

      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for plain text', () => {
      expect(isEncrypted('plain-text-password')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isEncrypted('')).toBe(false);
    });

    it('should return false for short base64 strings', () => {
      expect(isEncrypted('YWJjZA==')).toBe(false);
    });
  });

  describe('encryptFields() and decryptFields()', () => {
    it('should encrypt specified fields in an object', () => {
      const obj = {
        username: 'admin',
        password: 'secret123',
        apiKey: 'key123',
        public: 'public-data',
      };

      const encrypted = encryptFields(obj, ['password', 'apiKey']);

      expect(encrypted.username).toBe('admin');
      expect(encrypted.public).toBe('public-data');
      expect(encrypted.password).not.toBe('secret123');
      expect(encrypted.apiKey).not.toBe('key123');
      expect(isEncrypted(encrypted.password)).toBe(true);
      expect(isEncrypted(encrypted.apiKey)).toBe(true);
    });

    it('should decrypt specified fields in an object', () => {
      const obj = {
        username: 'admin',
        password: 'secret123',
        apiKey: 'key123',
      };

      const encrypted = encryptFields(obj, ['password', 'apiKey']);
      const decrypted = decryptFields(encrypted, ['password', 'apiKey']);

      expect(decrypted.username).toBe('admin');
      expect(decrypted.password).toBe('secret123');
      expect(decrypted.apiKey).toBe('key123');
    });

    it('should handle nested encryption/decryption', () => {
      const obj = { password: 'secret' };

      const encrypted1 = encryptFields(obj, ['password']);
      const encrypted2 = encryptFields(encrypted1, ['password']);

      expect(encrypted1.password).toBe(encrypted2.password);
    });

    it('should handle missing fields gracefully', () => {
      const obj = { username: 'admin', password: undefined, apiKey: undefined };

      const encrypted = encryptFields(obj, ['password', 'apiKey']);

      expect(encrypted.username).toBe('admin');
      expect(encrypted.password).toBeUndefined();
      expect(encrypted.apiKey).toBeUndefined();
    });

    it('should handle empty field list', () => {
      const obj = { password: 'secret' };

      const encrypted = encryptFields(obj, []);

      expect(encrypted.password).toBe('secret');
    });
  });

  describe('hashPassword() and verifyPassword()', () => {
    it('should hash a password', () => {
      const password = 'my-secure-password';
      const hash = hashPassword(password);

      expect(hash).toBeTruthy();
      expect(hash).toContain(':');
      expect(hash.split(':').length).toBe(2);
    });

    it('should produce different hashes for same password', () => {
      const password = 'my-secure-password';
      const hash1 = hashPassword(password);
      const hash2 = hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should verify correct password', () => {
      const password = 'my-secure-password';
      const hash = hashPassword(password);

      expect(verifyPassword(password, hash)).toBe(true);
    });

    it('should reject incorrect password', () => {
      const password = 'my-secure-password';
      const hash = hashPassword(password);

      expect(verifyPassword('wrong-password', hash)).toBe(false);
    });

    it('should reject malformed hash', () => {
      expect(verifyPassword('password', 'malformed-hash')).toBe(false);
    });

    it('should reject empty hash', () => {
      expect(verifyPassword('password', '')).toBe(false);
    });

    it('should handle long passwords', () => {
      const password = 'a'.repeat(1000);
      const hash = hashPassword(password);

      expect(verifyPassword(password, hash)).toBe(true);
    });

    it('should handle special characters in passwords', () => {
      const password = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      const hash = hashPassword(password);

      expect(verifyPassword(password, hash)).toBe(true);
    });
  });

  describe('generateEncryptionKey()', () => {
    it('should generate a valid encryption key', () => {
      const key = generateEncryptionKey();

      expect(key).toBeTruthy();
      expect(key.length).toBe(64); // 32 bytes as hex = 64 characters
      expect(/^[0-9a-f]{64}$/.test(key)).toBe(true);
    });

    it('should generate different keys each time', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();

      expect(key1).not.toBe(key2);
    });

    it('should generate keys usable for encryption', () => {
      const key = generateEncryptionKey();
      process.env['ENCRYPTION_KEY'] = key;

      const plaintext = 'test-data';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('generateJWTSecret()', () => {
    it('should generate a valid JWT secret', () => {
      const secret = generateJWTSecret();

      expect(secret).toBeTruthy();
      expect(secret.length).toBe(64); // 32 bytes as hex = 64 characters
      expect(/^[0-9a-f]{64}$/.test(secret)).toBe(true);
    });

    it('should generate different secrets each time', () => {
      const secret1 = generateJWTSecret();
      const secret2 = generateJWTSecret();

      expect(secret1).not.toBe(secret2);
    });
  });
});

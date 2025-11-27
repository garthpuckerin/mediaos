import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { validateEnvironment } from '../services/envValidation';

describe('Environment Validation', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear relevant env vars before each test
    delete process.env['JWT_SECRET'];
    delete process.env['ENCRYPTION_KEY'];
    delete process.env['NODE_ENV'];
    delete process.env['RATE_LIMIT_MAX'];
    delete process.env['RATE_LIMIT_WINDOW'];
    delete process.env['ALLOWED_ORIGINS'];
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
  });

  describe('JWT_SECRET validation', () => {
    it('should error when JWT_SECRET is missing', () => {
      const result = validateEnvironment();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'JWT_SECRET environment variable is required'
      );
    });

    it('should error when JWT_SECRET is too short', () => {
      process.env['JWT_SECRET'] = 'short';
      const result = validateEnvironment();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'JWT_SECRET must be at least 32 characters long'
      );
    });

    it('should warn when JWT_SECRET is less than 64 characters', () => {
      process.env['JWT_SECRET'] = 'a'.repeat(32);
      process.env['ENCRYPTION_KEY'] = 'b'.repeat(64);
      const result = validateEnvironment();
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain(
        'JWT_SECRET is less than 64 characters (64+ recommended)'
      );
    });

    it('should pass with strong JWT_SECRET', () => {
      process.env['JWT_SECRET'] = 'a'.repeat(64);
      process.env['ENCRYPTION_KEY'] = 'b'.repeat(64);
      const result = validateEnvironment();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('ENCRYPTION_KEY validation', () => {
    it('should error when ENCRYPTION_KEY is missing', () => {
      process.env['JWT_SECRET'] = 'a'.repeat(64);
      const result = validateEnvironment();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'ENCRYPTION_KEY environment variable is required'
      );
    });

    it('should error when ENCRYPTION_KEY is too short', () => {
      process.env['JWT_SECRET'] = 'a'.repeat(64);
      process.env['ENCRYPTION_KEY'] = 'short';
      const result = validateEnvironment();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'ENCRYPTION_KEY must be at least 32 characters long'
      );
    });

    it('should warn when ENCRYPTION_KEY is less than 64 characters', () => {
      process.env['JWT_SECRET'] = 'a'.repeat(64);
      process.env['ENCRYPTION_KEY'] = 'b'.repeat(32);
      const result = validateEnvironment();
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain(
        'ENCRYPTION_KEY is less than 64 characters (64+ recommended)'
      );
    });
  });

  describe('NODE_ENV validation', () => {
    it('should warn when NODE_ENV is not set', () => {
      process.env['JWT_SECRET'] = 'a'.repeat(64);
      process.env['ENCRYPTION_KEY'] = 'b'.repeat(64);
      const result = validateEnvironment();
      expect(result.warnings).toContain(
        'NODE_ENV is not set (defaults to development)'
      );
    });

    it('should warn in production with weak keys', () => {
      process.env['NODE_ENV'] = 'production';
      process.env['JWT_SECRET'] = 'a'.repeat(32);
      process.env['ENCRYPTION_KEY'] = 'b'.repeat(32);
      const result = validateEnvironment();
      expect(result.warnings).toContain(
        'Production environment detected but security keys may be weak'
      );
    });

    it('should warn about missing ALLOWED_ORIGINS in production', () => {
      process.env['NODE_ENV'] = 'production';
      process.env['JWT_SECRET'] = 'a'.repeat(64);
      process.env['ENCRYPTION_KEY'] = 'b'.repeat(64);
      const result = validateEnvironment();
      expect(result.warnings).toContain(
        'ALLOWED_ORIGINS not set in production (CORS will be disabled)'
      );
    });
  });

  describe('Rate limit validation', () => {
    it('should warn when RATE_LIMIT_MAX is not a number', () => {
      process.env['JWT_SECRET'] = 'a'.repeat(64);
      process.env['ENCRYPTION_KEY'] = 'b'.repeat(64);
      process.env['RATE_LIMIT_MAX'] = 'invalid';
      const result = validateEnvironment();
      expect(result.warnings).toContain(
        'RATE_LIMIT_MAX is not a valid number (defaults to 100)'
      );
    });

    it('should warn when RATE_LIMIT_WINDOW is not a number', () => {
      process.env['JWT_SECRET'] = 'a'.repeat(64);
      process.env['ENCRYPTION_KEY'] = 'b'.repeat(64);
      process.env['RATE_LIMIT_WINDOW'] = 'invalid';
      const result = validateEnvironment();
      expect(result.warnings).toContain(
        'RATE_LIMIT_WINDOW is not a valid number (defaults to 60000)'
      );
    });
  });

  describe('Complete validation', () => {
    it('should pass with all valid settings', () => {
      process.env['NODE_ENV'] = 'production';
      process.env['JWT_SECRET'] = 'a'.repeat(64);
      process.env['ENCRYPTION_KEY'] = 'b'.repeat(64);
      process.env['ALLOWED_ORIGINS'] = 'https://example.com';
      process.env['RATE_LIMIT_MAX'] = '100';
      process.env['RATE_LIMIT_WINDOW'] = '60000';

      const result = validateEnvironment();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });
});

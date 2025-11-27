import { describe, it, expect } from 'vitest';

import {
  validatePassword,
  getPasswordRequirementsMessage,
  DEFAULT_REQUIREMENTS,
} from '../services/passwordValidation';

describe('Password Validation', () => {
  describe('Basic requirements', () => {
    it('should reject password shorter than minimum length', () => {
      const result = validatePassword('Short1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters');
    });

    it('should reject password without uppercase letter', () => {
      const result = validatePassword('password123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one uppercase letter'
      );
    });

    it('should reject password without lowercase letter', () => {
      const result = validatePassword('PASSWORD123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one lowercase letter'
      );
    });

    it('should reject password without number', () => {
      const result = validatePassword('Password!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one number'
      );
    });

    it('should reject password without special character', () => {
      const result = validatePassword('Password123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one special character'
      );
    });

    it('should accept password meeting all requirements', () => {
      const result = validatePassword('SecurePass123!');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Common password prevention', () => {
    it('should reject common password "password"', () => {
      const result = validatePassword('password');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'This password is too common and not secure'
      );
    });

    it('should reject common password "password123"', () => {
      const result = validatePassword('password123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'This password is too common and not secure'
      );
    });

    it('should reject common password "12345678"', () => {
      const result = validatePassword('12345678');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'This password is too common and not secure'
      );
    });

    it('should reject common password "admin123"', () => {
      const result = validatePassword('admin123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'This password is too common and not secure'
      );
    });
  });

  describe('Password strength scoring', () => {
    it('should rate weak password as weak', () => {
      const result = validatePassword('Pass123!');
      expect(result.strength).toBe('weak');
      expect(result.score).toBeLessThan(50);
    });

    it('should rate medium password as medium', () => {
      const result = validatePassword('MySecure123!');
      expect(result.strength).toBe('medium');
      expect(result.score).toBeGreaterThanOrEqual(50);
      expect(result.score).toBeLessThan(75);
    });

    it('should rate strong password as strong', () => {
      const result = validatePassword('MyV3ry$ecur3P@ssw0rd!');
      expect(result.strength).toBe('strong');
      expect(result.score).toBeGreaterThanOrEqual(75);
    });

    it('should penalize repeating characters', () => {
      const weak = validatePassword('Passss123!');
      const strong = validatePassword('Password123!');
      expect(weak.score).toBeLessThan(strong.score);
    });

    it('should penalize sequential patterns', () => {
      const weak = validatePassword('Abc123456!');
      const strong = validatePassword('Random142!');
      expect(weak.score).toBeLessThan(strong.score);
    });

    it('should reward longer passwords', () => {
      const short = validatePassword('Pass123!');
      const medium = validatePassword('MyPassword123!');
      const long = validatePassword('MyVeryLongPassword123!');

      expect(medium.score).toBeGreaterThan(short.score);
      expect(long.score).toBeGreaterThan(medium.score);
    });
  });

  describe('Custom requirements', () => {
    it('should accept password with custom minimum length', () => {
      const requirements = { ...DEFAULT_REQUIREMENTS, minLength: 12 };
      const result = validatePassword('Pass123!', requirements);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must be at least 12 characters'
      );
    });

    it('should accept password without uppercase requirement', () => {
      const requirements = { ...DEFAULT_REQUIREMENTS, requireUppercase: false };
      const result = validatePassword('password123!', requirements);
      expect(result.valid).toBe(true);
    });

    it('should accept password without special char requirement', () => {
      const requirements = {
        ...DEFAULT_REQUIREMENTS,
        requireSpecialChars: false,
      };
      const result = validatePassword('Password123', requirements);
      expect(result.valid).toBe(true);
    });

    it('should allow common passwords when prevention disabled', () => {
      const requirements = { ...DEFAULT_REQUIREMENTS, preventCommon: false };
      const result = validatePassword('Password123!', requirements);
      expect(result.valid).toBe(true);
    });
  });

  describe('Requirements message', () => {
    it('should generate correct message for default requirements', () => {
      const message = getPasswordRequirementsMessage();
      expect(message).toContain('At least 8 characters');
      expect(message).toContain('one uppercase letter');
      expect(message).toContain('one lowercase letter');
      expect(message).toContain('one number');
      expect(message).toContain('one special character');
    });

    it('should generate correct message for custom requirements', () => {
      const requirements = {
        minLength: 10,
        requireUppercase: true,
        requireLowercase: false,
        requireNumbers: true,
        requireSpecialChars: false,
        preventCommon: true,
      };
      const message = getPasswordRequirementsMessage(requirements);
      expect(message).toContain('At least 10 characters');
      expect(message).toContain('one uppercase letter');
      expect(message).not.toContain('one lowercase letter');
      expect(message).toContain('one number');
      expect(message).not.toContain('one special character');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty password', () => {
      const result = validatePassword('');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle very long password', () => {
      const longPassword = 'A'.repeat(100) + 'a1!';
      const result = validatePassword(longPassword);
      expect(result.valid).toBe(true);
      expect(result.score).toBeGreaterThan(50);
    });

    it('should handle special characters correctly', () => {
      const passwords = [
        'Password123!',
        'Password123@',
        'Password123#',
        'Password123$',
        'Password123%',
        'Password123^',
        'Password123&',
        'Password123*',
        'Password123(',
        'Password123)',
      ];

      passwords.forEach((password) => {
        const result = validatePassword(password);
        expect(result.valid).toBe(true);
      });
    });
  });
});

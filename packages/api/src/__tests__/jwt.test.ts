import { describe, it, expect, beforeEach } from 'vitest';

import {
  signToken,
  verifyToken,
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  extractTokenFromHeader,
  generateSessionId,
} from '../services/jwt';
import { generateJWTSecret } from '../services/encryption';

describe('JWT Service', () => {
  beforeEach(() => {
    // Set JWT secret for tests
    process.env['JWT_SECRET'] = generateJWTSecret();
  });

  describe('signToken() and verifyToken()', () => {
    it('should sign and verify a token successfully', () => {
      const payload = {
        sub: 'user123',
        email: 'user@example.com',
        role: 'admin',
      };

      const token = signToken(payload, 3600);
      const decoded = verifyToken(token);

      expect(decoded.sub).toBe(payload.sub);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
      expect(decoded.iat).toBeTruthy();
      expect(decoded.exp).toBeTruthy();
    });

    it('should include iat and exp in payload', () => {
      const token = signToken({ sub: 'user123' }, 3600);
      const decoded = verifyToken(token);

      expect(decoded.iat).toBeTruthy();
      expect(decoded.exp).toBeTruthy();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
      expect(decoded.exp - decoded.iat).toBe(3600);
    });

    it('should use default expiration of 24 hours', () => {
      const token = signToken({ sub: 'user123' });
      const decoded = verifyToken(token);

      expect(decoded.exp - decoded.iat).toBe(24 * 60 * 60);
    });

    it('should throw error for expired token', () => {
      const token = signToken({ sub: 'user123' }, -1); // Already expired

      expect(() => verifyToken(token)).toThrow(/Token expired/);
    });

    it('should throw error for invalid token format', () => {
      expect(() => verifyToken('invalid-token')).toThrow(/Invalid token/);
    });

    it('should throw error for malformed token structure', () => {
      expect(() => verifyToken('header.payload')).toThrow(/Invalid token/);
      expect(() => verifyToken('header.payload.signature.extra')).toThrow(
        /Invalid token/
      );
    });

    it('should throw error for tampered payload', () => {
      const token = signToken({ sub: 'user123' }, 3600);
      const parts = token.split('.');

      // Tamper with payload
      const tamperedPayload =
        Buffer.from('{"sub":"hacker"}').toString('base64');
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      expect(() => verifyToken(tamperedToken)).toThrow(/verification failed/);
    });

    it('should throw error when JWT_SECRET not set', () => {
      delete process.env['JWT_SECRET'];

      expect(() => signToken({ sub: 'user123' })).toThrow(
        /JWT_SECRET environment variable must be set/
      );
    });

    it('should throw error when JWT_SECRET too short', () => {
      process.env['JWT_SECRET'] = 'short';

      expect(() => signToken({ sub: 'user123' })).toThrow(
        /JWT_SECRET environment variable must be set and at least 32 characters/
      );
    });

    it('should reject token signed with different secret', () => {
      const token = signToken({ sub: 'user123' }, 3600);

      // Change secret
      process.env['JWT_SECRET'] = generateJWTSecret();

      expect(() => verifyToken(token)).toThrow(/verification failed/);
    });
  });

  describe('generateAccessToken()', () => {
    it('should generate access token with 15 minute expiry', () => {
      const userId = 'user123';
      const email = 'user@example.com';
      const role = 'admin';

      const token = generateAccessToken(userId, email, role);
      const decoded = verifyToken(token);

      expect(decoded.sub).toBe(userId);
      expect(decoded.email).toBe(email);
      expect(decoded.role).toBe(role);
      expect(decoded.exp - decoded.iat).toBe(15 * 60);
    });

    it('should generate access token without email and role', () => {
      const userId = 'user123';
      const token = generateAccessToken(userId);
      const decoded = verifyToken(token);

      expect(decoded.sub).toBe(userId);
      expect(decoded.email).toBeUndefined();
      expect(decoded.role).toBeUndefined();
    });
  });

  describe('generateRefreshToken()', () => {
    it('should generate refresh token with 7 day expiry', () => {
      const userId = 'user123';
      const token = generateRefreshToken(userId);
      const decoded = verifyToken(token);

      expect(decoded.sub).toBe(userId);
      expect(decoded.exp - decoded.iat).toBe(7 * 24 * 60 * 60);
    });

    it('should generate minimal refresh token (only sub)', () => {
      const userId = 'user123';
      const token = generateRefreshToken(userId);
      const decoded = verifyToken(token);

      expect(decoded.sub).toBe(userId);
      expect(decoded.email).toBeUndefined();
      expect(decoded.role).toBeUndefined();
    });
  });

  describe('generateTokenPair()', () => {
    it('should generate both access and refresh tokens', () => {
      const userId = 'user123';
      const email = 'user@example.com';
      const role = 'admin';

      const { accessToken, refreshToken } = generateTokenPair(
        userId,
        email,
        role
      );

      const accessDecoded = verifyToken(accessToken);
      const refreshDecoded = verifyToken(refreshToken);

      expect(accessDecoded.sub).toBe(userId);
      expect(accessDecoded.email).toBe(email);
      expect(accessDecoded.role).toBe(role);

      expect(refreshDecoded.sub).toBe(userId);
      expect(refreshDecoded.email).toBeUndefined();
      expect(refreshDecoded.role).toBeUndefined();
    });

    it('should generate tokens with different expirations', () => {
      const { accessToken, refreshToken } = generateTokenPair('user123');

      const accessDecoded = verifyToken(accessToken);
      const refreshDecoded = verifyToken(refreshToken);

      const accessExpiry = accessDecoded.exp - accessDecoded.iat;
      const refreshExpiry = refreshDecoded.exp - refreshDecoded.iat;

      expect(accessExpiry).toBe(15 * 60);
      expect(refreshExpiry).toBe(7 * 24 * 60 * 60);
    });
  });

  describe('extractTokenFromHeader()', () => {
    it('should extract token from valid Bearer header', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature';
      const header = `Bearer ${token}`;

      expect(extractTokenFromHeader(header)).toBe(token);
    });

    it('should return null for missing header', () => {
      expect(extractTokenFromHeader(undefined)).toBeNull();
    });

    it('should return null for empty header', () => {
      expect(extractTokenFromHeader('')).toBeNull();
    });

    it('should return null for header without Bearer prefix', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature';

      expect(extractTokenFromHeader(token)).toBeNull();
    });

    it('should return null for malformed Bearer header', () => {
      expect(extractTokenFromHeader('Bearer')).toBeNull();
      expect(extractTokenFromHeader('Bearer ')).toBeNull();
      expect(extractTokenFromHeader('Bearer token extra')).toBeNull();
    });

    it('should handle Basic auth header gracefully', () => {
      expect(extractTokenFromHeader('Basic dXNlcjpwYXNz')).toBeNull();
    });
  });

  describe('generateSessionId()', () => {
    it('should generate a session ID', () => {
      const sessionId = generateSessionId();

      expect(sessionId).toBeTruthy();
      expect(sessionId.length).toBe(32);
      expect(/^[0-9a-f]{32}$/.test(sessionId)).toBe(true);
    });

    it('should generate different session IDs', () => {
      const id1 = generateSessionId();
      const id2 = generateSessionId();

      expect(id1).not.toBe(id2);
    });
  });

  describe('Token format and structure', () => {
    it('should generate tokens in standard JWT format', () => {
      const token = signToken({ sub: 'user123' }, 3600);
      const parts = token.split('.');

      expect(parts.length).toBe(3);
      expect(parts[0]).toBeTruthy(); // Header
      expect(parts[1]).toBeTruthy(); // Payload
      expect(parts[2]).toBeTruthy(); // Signature
    });

    it('should use HS256 algorithm in header', () => {
      const token = signToken({ sub: 'user123' }, 3600);
      const headerB64 = token.split('.')[0];

      // Decode header
      const padding = '='.repeat((4 - (headerB64.length % 4)) % 4);
      const base64 = headerB64.replace(/-/g, '+').replace(/_/g, '/') + padding;
      const header = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));

      expect(header.alg).toBe('HS256');
      expect(header.typ).toBe('JWT');
    });

    it('should encode payload correctly', () => {
      const payload = {
        sub: 'user123',
        email: 'user@example.com',
        role: 'admin',
      };

      const token = signToken(payload, 3600);
      const decoded = verifyToken(token);

      expect(decoded.sub).toBe(payload.sub);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });
  });
});

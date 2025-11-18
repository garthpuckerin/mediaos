import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import path from 'path';
import { promises as fs } from 'fs';
import Fastify, { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';

import authRoutes from '../routes/auth';
import libraryRoutes from '../routes/library';
import settingsRoutes from '../routes/settings';
import downloadsRoutes from '../routes/downloads';
import activityRoutes from '../routes/activity';

const CONFIG_DIR = path.join(process.cwd(), 'test-config-auth-integration');

describe('Authentication Integration Tests', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let userToken: string;
  let refreshToken: string;

  beforeEach(async () => {
    console.log('Setting up test environment...');

    // Create fresh config directory
    await fs.mkdir(CONFIG_DIR, { recursive: true });

    // Create Fastify app
    app = Fastify({ logger: false });
    await app.register(multipart);

    // Register routes
    await app.register(authRoutes);
    await app.register(libraryRoutes);
    await app.register(settingsRoutes);
    await app.register(downloadsRoutes);
    await app.register(activityRoutes);

    await app.ready();
  });

  afterEach(async () => {
    console.log('Cleaning up test environment...');
    await app.close();

    // Clean up test files
    try {
      await fs.rm(CONFIG_DIR, { recursive: true, force: true });
    } catch (e) {
      // ignore
    }
  });

  describe('User Registration and Login', () => {
    test('should register first user as admin', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'admin@test.com',
          password: 'admin-password-123',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.ok).toBe(true);
      expect(data.user.email).toBe('admin@test.com');
      expect(data.user.role).toBe('admin');
      expect(data.accessToken).toBeDefined();
      expect(data.refreshToken).toBeDefined();

      adminToken = data.accessToken;
      refreshToken = data.refreshToken;
    });

    test('should register second user as regular user', async () => {
      // First user (admin)
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'admin@test.com',
          password: 'admin-password-123',
        },
      });

      // Second user (regular)
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'user@test.com',
          password: 'user-password-123',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.ok).toBe(true);
      expect(data.user.email).toBe('user@test.com');
      expect(data.user.role).toBe('user');
      expect(data.accessToken).toBeDefined();

      userToken = data.accessToken;
    });

    test('should login existing user', async () => {
      // Register
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'admin@test.com',
          password: 'admin-password-123',
        },
      });

      // Login
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'admin@test.com',
          password: 'admin-password-123',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.ok).toBe(true);
      expect(data.user.email).toBe('admin@test.com');
      expect(data.accessToken).toBeDefined();
      expect(data.refreshToken).toBeDefined();
    });

    test('should reject login with wrong password', async () => {
      // Register
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'admin@test.com',
          password: 'admin-password-123',
        },
      });

      // Login with wrong password
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'admin@test.com',
          password: 'wrong-password',
        },
      });

      expect(response.statusCode).toBe(401);
      const data = response.json();
      expect(data.ok).toBe(false);
      expect(data.error).toContain('Invalid');
    });

    test('should refresh access token', async () => {
      // Register
      const regResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'admin@test.com',
          password: 'admin-password-123',
        },
      });

      const regData = regResponse.json();
      const oldRefreshToken = regData.refreshToken;

      // Wait a moment to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Refresh
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: {
          refreshToken: oldRefreshToken,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.ok).toBe(true);
      expect(data.accessToken).toBeDefined();
      expect(data.accessToken).not.toBe(regData.accessToken);
    });
  });

  describe('Protected Routes - Library', () => {
    test('should reject unauthenticated GET /api/library', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/library',
      });

      expect(response.statusCode).toBe(401);
      const data = response.json();
      expect(data.ok).toBe(false);
      expect(data.error).toContain('Authentication required');
    });

    test('should allow authenticated GET /api/library', async () => {
      // Register and get token
      const authResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'user@test.com',
          password: 'user-password-123',
        },
      });
      const token = authResponse.json().accessToken;

      // Access library
      const response = await app.inject({
        method: 'GET',
        url: '/api/library',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.items).toBeDefined();
      expect(Array.isArray(data.items)).toBe(true);
    });

    test('should reject regular user POST /api/library', async () => {
      // Register regular user
      const authResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'admin@test.com',
          password: 'admin-password-123',
        },
      });
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'user@test.com',
          password: 'user-password-123',
        },
      });

      // Login as regular user
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'user@test.com',
          password: 'user-password-123',
        },
      });
      const token = loginResponse.json().accessToken;

      // Try to add library item
      const response = await app.inject({
        method: 'POST',
        url: '/api/library',
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          kind: 'movie',
          title: 'Test Movie',
        },
      });

      expect(response.statusCode).toBe(403);
      const data = response.json();
      expect(data.ok).toBe(false);
      expect(data.error).toMatch(/Admin|Insufficient permissions/);
    });

    test('should allow admin POST /api/library', async () => {
      // Register admin
      const authResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'admin@test.com',
          password: 'admin-password-123',
        },
      });
      const token = authResponse.json().accessToken;

      // Add library item
      const response = await app.inject({
        method: 'POST',
        url: '/api/library',
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          kind: 'movie',
          title: 'Test Movie',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.ok).toBe(true);
      expect(data.item.title).toBe('Test Movie');
    });
  });

  describe('Protected Routes - Settings', () => {
    test('should reject unauthenticated GET /api/settings/downloaders', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/settings/downloaders',
      });

      expect(response.statusCode).toBe(401);
      const data = response.json();
      expect(data.ok).toBe(false);
    });

    test('should allow authenticated GET /api/settings/downloaders', async () => {
      // Register and get token
      const authResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'user@test.com',
          password: 'user-password-123',
        },
      });
      const token = authResponse.json().accessToken;

      // Get settings
      const response = await app.inject({
        method: 'GET',
        url: '/api/settings/downloaders',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    test('should reject regular user POST /api/settings/downloaders', async () => {
      // Register admin first, then regular user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'admin@test.com',
          password: 'admin-password-123',
        },
      });

      const authResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'user@test.com',
          password: 'user-password-123',
        },
      });
      const token = authResponse.json().accessToken;

      // Try to update settings
      const response = await app.inject({
        method: 'POST',
        url: '/api/settings/downloaders',
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          sabnzbd: {
            enabled: true,
            baseUrl: 'http://localhost:8080',
            apiKey: 'test-key',
          },
        },
      });

      expect(response.statusCode).toBe(403);
      const data = response.json();
      expect(data.ok).toBe(false);
      expect(data.error).toMatch(/Admin|Insufficient permissions/);
    });

    test('should allow admin POST /api/settings/downloaders', async () => {
      // Register admin
      const authResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'admin@test.com',
          password: 'admin-password-123',
        },
      });
      const token = authResponse.json().accessToken;

      // Update settings
      const response = await app.inject({
        method: 'POST',
        url: '/api/settings/downloaders',
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          sabnzbd: {
            enabled: true,
            baseUrl: 'http://localhost:8080',
            apiKey: 'test-key',
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.ok).toBe(true);
    });
  });

  describe('Protected Routes - Downloads', () => {
    test('should reject unauthenticated POST /api/downloads/grab', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/downloads/grab',
        payload: {
          kind: 'movie',
          id: '123',
          title: 'Test Movie',
          link: 'magnet:?xt=test',
          protocol: 'torrent',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    test('should allow authenticated POST /api/downloads/grab', async () => {
      // Register and get token
      const authResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'user@test.com',
          password: 'user-password-123',
        },
      });
      const token = authResponse.json().accessToken;

      // Note: This will fail because qbittorrent is not configured,
      // but it should pass authentication
      const response = await app.inject({
        method: 'POST',
        url: '/api/downloads/grab',
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          kind: 'movie',
          id: '123',
          title: 'Test Movie',
          link: 'magnet:?xt=test',
          protocol: 'torrent',
        },
      });

      // Should get past auth (200) but fail on downloader config
      expect(response.statusCode).toBe(200);
      const data = response.json();
      // Will fail because downloader not configured, not because of auth
      expect(data.ok).toBe(false);
      expect(data.error).not.toContain('Authentication');
    });
  });

  describe('Protected Routes - Activity', () => {
    test('should reject unauthenticated GET /api/activity/queue', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/activity/queue',
      });

      expect(response.statusCode).toBe(401);
    });

    test('should allow authenticated GET /api/activity/queue', async () => {
      // Register and get token
      const authResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'user@test.com',
          password: 'user-password-123',
        },
      });
      const token = authResponse.json().accessToken;

      // Get queue
      const response = await app.inject({
        method: 'GET',
        url: '/api/activity/queue',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.ok).toBe(true);
      expect(Array.isArray(data.items)).toBe(true);
    });
  });

  describe('Token Edge Cases', () => {
    test('should reject malformed token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/library',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    test('should reject missing Bearer prefix', async () => {
      const authResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'user@test.com',
          password: 'user-password-123',
        },
      });
      const token = authResponse.json().accessToken;

      const response = await app.inject({
        method: 'GET',
        url: '/api/library',
        headers: {
          authorization: `Token ${token}`, // Wrong prefix (should be "Bearer")
        },
      });

      expect(response.statusCode).toBe(401);
    });

    test('should reject empty Authorization header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/library',
        headers: {
          authorization: '',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    test('should reject token with manipulated payload', async () => {
      const authResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'user@test.com',
          password: 'user-password-123',
        },
      });
      const authData = authResponse.json();
      expect(authData.accessToken).toBeDefined();
      const validToken = authData.accessToken;

      // Manipulate the token (change middle part)
      const parts = validToken.split('.');
      const tamperedPayload = Buffer.from(
        JSON.stringify({ sub: 'fake-user-id', role: 'admin', iat: Date.now(), exp: Date.now() + 3600 })
      ).toString('base64url');
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      const response = await app.inject({
        method: 'GET',
        url: '/api/library',
        headers: {
          authorization: `Bearer ${tamperedToken}`,
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Current User Endpoint', () => {
    test('should return current user info', async () => {
      // Register
      const authResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'admin@test.com',
          password: 'admin-password-123',
        },
      });
      const token = authResponse.json().accessToken;

      // Get current user
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.ok).toBe(true);
      expect(data.user.email).toBe('admin@test.com');
      expect(data.user.role).toBe('admin');
      expect(data.user.passwordHash).toBeUndefined(); // Should not expose password hash
    });

    test('should reject unauthenticated /api/auth/me', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
      });

      expect(response.statusCode).toBe(401);
    });
  });
});

import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from 'vitest';

import settingsPlugin from '../routes/settings.js';

describe('Settings API Integration Tests', () => {
  let app: FastifyInstance;
  let testConfigDir: string;
  let originalConfigDir: string;

  beforeAll(async () => {
    // Create temporary config directory for testing
    testConfigDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mediaos-test-'));
    originalConfigDir = process.env['CONFIG_DIR'] || '';
    process.env['CONFIG_DIR'] = testConfigDir;
  });

  afterAll(async () => {
    // Cleanup temp directory
    await fs.rm(testConfigDir, { recursive: true, force: true });
    if (originalConfigDir) {
      process.env['CONFIG_DIR'] = originalConfigDir;
    } else {
      delete process.env['CONFIG_DIR'];
    }
  });

  beforeEach(async () => {
    app = Fastify({ logger: false });
    await app.register(settingsPlugin);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    // Clean up config file between tests
    const configFile = path.join(testConfigDir, 'downloaders.json');
    try {
      await fs.unlink(configFile);
    } catch {
      // File might not exist, that's ok
    }
  });

  describe('GET /api/settings/downloaders', () => {
    it('should return default disabled downloaders when no config exists', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/settings/downloaders',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);

      // Verify structure
      expect(data).toHaveProperty('qbittorrent');
      expect(data).toHaveProperty('nzbget');
      expect(data).toHaveProperty('sabnzbd');

      // Verify defaults
      expect(data.qbittorrent.enabled).toBe(false);
      expect(data.qbittorrent.hasPassword).toBe(false);
      expect(data.nzbget.enabled).toBe(false);
      expect(data.nzbget.hasPassword).toBe(false);
      expect(data.sabnzbd.enabled).toBe(false);
      expect(data.sabnzbd.hasApiKey).toBe(false);
    });

    it('should load saved downloader configuration', async () => {
      // Close current app
      await app.close();

      // Pre-populate config
      const configFile = path.join(testConfigDir, 'downloaders.json');
      await fs.mkdir(testConfigDir, { recursive: true });
      await fs.writeFile(
        configFile,
        JSON.stringify({
          qbittorrent: {
            baseUrl: 'http://localhost:8080',
            username: 'admin',
            password: 'secret123',
            category: 'movies',
            timeoutMs: 5000,
          },
          sabnzbd: {
            baseUrl: 'http://localhost:8080/sabnzbd',
            apiKey: 'test-api-key-12345',
            category: 'tv',
            timeoutMs: 10000,
          },
        })
      );

      // Create new app instance that will load the config
      app = Fastify({ logger: false });
      await app.register(settingsPlugin);
      await app.ready();

      const response = await app.inject({
        method: 'GET',
        url: '/api/settings/downloaders',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);

      // qBittorrent should be enabled with settings
      expect(data.qbittorrent.enabled).toBe(true);
      expect(data.qbittorrent.baseUrl).toBe('http://localhost:8080');
      expect(data.qbittorrent.username).toBe('admin');
      expect(data.qbittorrent.hasPassword).toBe(true);
      expect(data.qbittorrent.password).toBeUndefined(); // Password should not be exposed
      expect(data.qbittorrent.category).toBe('movies');
      expect(data.qbittorrent.timeoutMs).toBe(5000);

      // SABnzbd should be enabled
      expect(data.sabnzbd.enabled).toBe(true);
      expect(data.sabnzbd.baseUrl).toBe('http://localhost:8080/sabnzbd');
      expect(data.sabnzbd.hasApiKey).toBe(true);
      expect(data.sabnzbd.apiKey).toBeUndefined(); // API key should not be exposed
      expect(data.sabnzbd.category).toBe('tv');
      expect(data.sabnzbd.timeoutMs).toBe(10000);

      // NZBGet should be disabled
      expect(data.nzbget.enabled).toBe(false);
    });
  });

  describe('POST /api/settings/downloaders', () => {
    it('should save qBittorrent configuration', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/settings/downloaders',
        payload: {
          qbittorrent: {
            enabled: true,
            baseUrl: 'http://localhost:9090',
            username: 'testuser',
            password: 'testpass',
            category: 'downloads',
            timeoutMs: 3000,
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.ok).toBe(true);
      expect(result.downloaders.qbittorrent.enabled).toBe(true);
      expect(result.downloaders.qbittorrent.baseUrl).toBe(
        'http://localhost:9090'
      );
      expect(result.downloaders.qbittorrent.hasPassword).toBe(true);

      // Verify it was persisted
      const configFile = path.join(testConfigDir, 'downloaders.json');
      const savedData = JSON.parse(await fs.readFile(configFile, 'utf-8'));
      expect(savedData.qbittorrent.password).toBe('testpass');
    });

    it('should save SABnzbd configuration', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/settings/downloaders',
        payload: {
          sabnzbd: {
            enabled: true,
            baseUrl: 'http://localhost:8081/sab',
            apiKey: 'my-secret-api-key',
            category: 'media',
            timeoutMs: 15000,
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.ok).toBe(true);
      expect(result.downloaders.sabnzbd.enabled).toBe(true);
      expect(result.downloaders.sabnzbd.baseUrl).toBe(
        'http://localhost:8081/sab'
      );
      expect(result.downloaders.sabnzbd.hasApiKey).toBe(true);
      expect(result.downloaders.sabnzbd.category).toBe('media');

      // Verify persistence
      const configFile = path.join(testConfigDir, 'downloaders.json');
      const savedData = JSON.parse(await fs.readFile(configFile, 'utf-8'));
      expect(savedData.sabnzbd.apiKey).toBe('my-secret-api-key');
    });

    it('should update existing configuration', async () => {
      // Initial save
      await app.inject({
        method: 'POST',
        url: '/api/settings/downloaders',
        payload: {
          qbittorrent: {
            enabled: true,
            baseUrl: 'http://localhost:8080',
            username: 'admin',
            password: 'oldpass',
          },
        },
      });

      // Update
      const response = await app.inject({
        method: 'POST',
        url: '/api/settings/downloaders',
        payload: {
          qbittorrent: {
            enabled: true,
            baseUrl: 'http://localhost:9999',
            username: 'newadmin',
            // Password not provided - should keep old one
            category: 'movies',
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.ok).toBe(true);
      expect(result.downloaders.qbittorrent.baseUrl).toBe(
        'http://localhost:9999'
      );
      expect(result.downloaders.qbittorrent.username).toBe('newadmin');
      expect(result.downloaders.qbittorrent.hasPassword).toBe(true);
      expect(result.downloaders.qbittorrent.category).toBe('movies');

      // Verify old password is retained
      const configFile = path.join(testConfigDir, 'downloaders.json');
      const savedData = JSON.parse(await fs.readFile(configFile, 'utf-8'));
      expect(savedData.qbittorrent.password).toBe('oldpass');
    });

    it('should handle disabling downloaders', async () => {
      // Enable first
      await app.inject({
        method: 'POST',
        url: '/api/settings/downloaders',
        payload: {
          qbittorrent: {
            enabled: true,
            baseUrl: 'http://localhost:8080',
          },
        },
      });

      // Disable
      const response = await app.inject({
        method: 'POST',
        url: '/api/settings/downloaders',
        payload: {
          qbittorrent: {
            enabled: false,
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.ok).toBe(true);
      expect(result.downloaders.qbittorrent.enabled).toBe(false);
    });

    it('should validate and normalize numeric fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/settings/downloaders',
        payload: {
          qbittorrent: {
            enabled: true,
            baseUrl: 'http://localhost:8080',
            timeoutMs: '5000', // String number
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.ok).toBe(true);
      expect(result.downloaders.qbittorrent.timeoutMs).toBe(5000); // Converted to number
      expect(typeof result.downloaders.qbittorrent.timeoutMs).toBe('number');
    });

    it('should reject invalid numeric fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/settings/downloaders',
        payload: {
          qbittorrent: {
            enabled: true,
            timeoutMs: 'not-a-number',
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.ok).toBe(true);
      expect(result.downloaders.qbittorrent.timeoutMs).toBeUndefined(); // Invalid value ignored
    });
  });

  describe('POST /api/settings/downloaders/test', () => {
    it('should test qBittorrent connection', async () => {
      // Note: This test requires a mock or actual qBittorrent instance
      // For now, test the endpoint structure
      const response = await app.inject({
        method: 'POST',
        url: '/api/settings/downloaders/test',
        payload: {
          client: 'qbittorrent',
          baseUrl: 'http://localhost:8080',
          username: 'admin',
          password: 'adminpass',
        },
      });

      // Should return structured response (success or error)
      expect([200, 400, 500]).toContain(response.statusCode);
      const data = JSON.parse(response.payload);
      expect(data).toHaveProperty('ok');
    });

    it('should test SABnzbd connection', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/settings/downloaders/test',
        payload: {
          client: 'sabnzbd',
          baseUrl: 'http://localhost:8080/sabnzbd',
          apiKey: 'test-key',
        },
      });

      expect([200, 400, 500]).toContain(response.statusCode);
      const data = JSON.parse(response.payload);
      expect(data).toHaveProperty('ok');
    });

    it('should test NZBGet connection', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/settings/downloaders/test',
        payload: {
          client: 'nzbget',
          baseUrl: 'http://localhost:6789',
          username: 'nzbget',
          password: 'tegbzn6789',
        },
      });

      expect([200, 400, 500]).toContain(response.statusCode);
      const data = JSON.parse(response.payload);
      expect(data).toHaveProperty('ok');
    });

    it('should require client parameter', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/settings/downloaders/test',
        payload: {
          baseUrl: 'http://localhost:8080',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate client type', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/settings/downloaders/test',
        payload: {
          client: 'invalid-client',
          baseUrl: 'http://localhost:8080',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Configuration Persistence', () => {
    it('should create config directory if it does not exist', async () => {
      // Remove config dir
      await fs.rm(testConfigDir, { recursive: true, force: true });

      const response = await app.inject({
        method: 'POST',
        url: '/api/settings/downloaders',
        payload: {
          qbittorrent: {
            enabled: true,
            baseUrl: 'http://localhost:8080',
          },
        },
      });

      expect(response.statusCode).toBe(200);

      // Verify directory was created
      const configFile = path.join(testConfigDir, 'downloaders.json');
      const stats = await fs.stat(configFile);
      expect(stats.isFile()).toBe(true);
    });

    it('should handle concurrent writes safely', async () => {
      // Make multiple simultaneous requests
      const requests = Array.from({ length: 5 }, (_, i) =>
        app.inject({
          method: 'POST',
          url: '/api/settings/downloaders',
          payload: {
            qbittorrent: {
              enabled: true,
              baseUrl: `http://localhost:${8080 + i}`,
              username: `user${i}`,
            },
          },
        })
      );

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach((response) => {
        expect(response.statusCode).toBe(200);
      });

      // Final config should be valid
      const finalResponse = await app.inject({
        method: 'GET',
        url: '/api/settings/downloaders',
      });

      expect(finalResponse.statusCode).toBe(200);
      const data = JSON.parse(finalResponse.payload);
      expect(data.qbittorrent.enabled).toBe(true);
    });
  });

  describe('Data Sanitization', () => {
    it('should not expose sensitive fields in GET responses', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/settings/downloaders',
        payload: {
          qbittorrent: {
            enabled: true,
            password: 'super-secret',
          },
          sabnzbd: {
            enabled: true,
            apiKey: 'top-secret-key',
          },
          nzbget: {
            enabled: true,
            password: 'nzbget-secret',
          },
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/settings/downloaders',
      });

      const data = JSON.parse(response.payload);

      // Passwords and API keys should not be in response
      expect(data.qbittorrent.password).toBeUndefined();
      expect(data.sabnzbd.apiKey).toBeUndefined();
      expect(data.nzbget.password).toBeUndefined();

      // But indicators should be present
      expect(data.qbittorrent.hasPassword).toBe(true);
      expect(data.sabnzbd.hasApiKey).toBe(true);
      expect(data.nzbget.hasPassword).toBe(true);
    });
  });
});

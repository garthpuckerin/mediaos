import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Sprint 1 - Basic API Server', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify({ logger: false });

    // Register basic routes
    app.get('/api/system/health', async (_request, _reply) => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '0.1.0',
        environment: 'test',
      };
    });

    app.get('/api/system/info', async (_request, _reply) => {
      return {
        name: 'MediaOS',
        version: '0.1.0',
        description: 'Unified media management platform',
        environment: 'test',
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      };
    });

    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Health Check Endpoint', () => {
    it('should return health status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/system/health',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.status).toBe('ok');
      expect(data.version).toBe('0.1.0');
      expect(data.environment).toBe('test');
    });
  });

  describe('System Info Endpoint', () => {
    it('should return system information', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/system/info',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.name).toBe('MediaOS');
      expect(data.version).toBe('0.1.0');
      expect(data.description).toBe('Unified media management platform');
      expect(data.environment).toBe('test');
    });
  });
});

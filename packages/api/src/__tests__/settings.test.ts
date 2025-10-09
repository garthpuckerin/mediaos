import fs from 'fs';
import path from 'path';

import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import settingsRoutes from '../routes/settings';

const tmpRoot = path.join(
  process.cwd(),
  'packages',
  'api',
  'tmp',
  'settings-tests'
);

describe('Downloader settings routes', () => {
  let app: ReturnType<typeof Fastify>;
  let configDir: string;

  beforeEach(async () => {
    configDir = path.join(tmpRoot, `${Date.now()}`);
    fs.mkdirSync(configDir, { recursive: true });
    process.env['MEDIAOS_CONFIG_DIR'] = configDir;
    delete process.env['MEDIAOS_DOWNLOADER_CONFIG'];

    app = Fastify();
    await app.register(settingsRoutes);
  });

  afterEach(async () => {
    await app.close();
    delete process.env['MEDIAOS_CONFIG_DIR'];
    if (fs.existsSync(configDir)) {
      fs.rmSync(configDir, { recursive: true, force: true });
    }
  });

  it('returns disabled defaults when no configuration is present', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/settings/downloaders',
    });
    expect(response.statusCode).toBe(200);

    const payload = response.json();
    expect(payload.qbittorrent.enabled).toBe(false);
    expect(payload.nzbget.enabled).toBe(false);
    expect(payload.sabnzbd.enabled).toBe(false);
    expect(payload.qbittorrent.hasPassword).toBe(false);
  });

  it('persists configuration updates and masks secrets in responses', async () => {
    const postResponse = await app.inject({
      method: 'POST',
      url: '/api/settings/downloaders',
      payload: {
        qbittorrent: {
          enabled: true,
          baseUrl: 'http://localhost:8080',
          username: 'admin',
          password: 'super-secret',
          timeoutMs: 7500,
        },
        nzbget: {
          enabled: true,
          baseUrl: 'http://localhost:6789',
          username: 'nzbuser',
          password: 'nzbpass',
        },
        sabnzbd: {
          enabled: true,
          baseUrl: 'http://localhost:8085',
          apiKey: 'abc123',
          timeoutMs: 9000,
        },
      },
    });
    expect(postResponse.statusCode).toBe(200);

    const persisted = JSON.parse(
      fs.readFileSync(path.join(configDir, 'downloaders.json'), 'utf-8')
    ) as Record<string, unknown>;

    expect(persisted.qbittorrent).toMatchObject({
      baseUrl: 'http://localhost:8080',
      username: 'admin',
      password: 'super-secret',
      timeoutMs: 7500,
    });

    const getResponse = await app.inject({
      method: 'GET',
      url: '/api/settings/downloaders',
    });
    const payload = getResponse.json();
    expect(payload.qbittorrent.enabled).toBe(true);
    expect(payload.qbittorrent.hasPassword).toBe(true);
    expect(payload.qbittorrent.password).toBeUndefined();
    expect(payload.nzbget.hasPassword).toBe(true);
    expect(payload.sabnzbd.hasApiKey).toBe(true);
  });

  it('reuses existing secrets when not provided on update', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/settings/downloaders',
      payload: {
        qbittorrent: {
          enabled: true,
          baseUrl: 'http://localhost:8112',
          username: 'admin',
          password: 'initial',
        },
        nzbget: { enabled: false },
        sabnzbd: { enabled: false },
      },
    });

    const initial = JSON.parse(
      fs.readFileSync(path.join(configDir, 'downloaders.json'), 'utf-8')
    ) as { qbittorrent?: { password?: string } };
    expect(initial.qbittorrent?.password).toBe('initial');

    await app.inject({
      method: 'POST',
      url: '/api/settings/downloaders',
      payload: {
        qbittorrent: {
          enabled: true,
          baseUrl: 'http://localhost:8112',
          username: 'admin',
        },
        nzbget: { enabled: false },
        sabnzbd: { enabled: false },
      },
    });

    const updated = JSON.parse(
      fs.readFileSync(path.join(configDir, 'downloaders.json'), 'utf-8')
    ) as { qbittorrent?: { password?: string } };
    expect(updated.qbittorrent?.password).toBe('initial');
  });
});

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import { sabnzbd } from '@mediaos/adapters/src/downloaders';
import dotenv from 'dotenv';
import Fastify from 'fastify';

import activityRoutes from './routes/activity';
import authRoutes from './routes/auth';
import calendarRoutes from './routes/calendar';
import downloadsRoutes from './routes/downloads';
import filesRoutes from './routes/files';
import indexersRoutes from './routes/indexers';
import libraryRoutes from './routes/library';
import qualityRoutes from './routes/quality';
import settingsRoutes from './routes/settings';
import verifyRoutes from './routes/verify';
import verifyJobsRoutes from './routes/verifyJobs';
import verifySettingsRoutes from './routes/verifySettings';
import wantedRoutes from './routes/wanted';
import { validateConfigWithWarnings } from './services/config';
import { loadDownloadersWithCredentials } from './routes/settings';

// Load environment variables from root directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Create Fastify instance
const app = Fastify({
  logger: {
    level: process.env['LOG_LEVEL'] || 'info',
  },
});

// Security & utility middleware
await app.register(sensible);
await app.register(helmet);
await app.register(rateLimit, {
  max: Number(process.env['RATE_LIMIT_MAX'] || 100),
  timeWindow: process.env['RATE_LIMIT_WINDOW'] || '1 minute',
});

// Multipart uploads (used for NZB uploads, artwork, etc.)
await app.register(multipart, {
  attachFieldsToBody: true,
  limits: {
    fileSize: Number(process.env['UPLOAD_MAX_BYTES'] || 5 * 1024 * 1024),
    files: 1,
  },
});

// CORS configuration
await app.register(cors, {
  origin:
    process.env['NODE_ENV'] === 'production'
      ? process.env['ALLOWED_ORIGINS']?.split(',') || false
      : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
});

// Application routes
// Auth routes (always public)
await app.register(authRoutes);

// Other routes (can be protected with middleware in future)
await app.register(libraryRoutes);
await app.register(filesRoutes);
await app.register(indexersRoutes, { prefix: '/api/indexers' });
await app.register(settingsRoutes);
await app.register(downloadsRoutes);
await app.register(qualityRoutes);
await app.register(calendarRoutes, { prefix: '/api/calendar' });
await app.register(wantedRoutes, { prefix: '/api/wanted' });
await app.register(verifyRoutes);
await app.register(verifySettingsRoutes);
await app.register(verifyJobsRoutes);
await app.register(activityRoutes);

// Health check endpoint
app.get('/api/system/health', async (_request, _reply) => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env['npm_package_version'] || '0.1.0',
    environment: process.env['NODE_ENV'] || 'development',
  };
});

// System info endpoint
app.get('/api/system/info', async (_request, _reply) => {
  return {
    name: 'MediaOS',
    version: process.env['npm_package_version'] || '0.1.0',
    description: 'Unified media management platform',
    environment: process.env['NODE_ENV'] || 'development',
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
  };
});

// Error handling
app.setErrorHandler(async (error, request, reply) => {
  app.log.error(error);

  const statusCode = error.statusCode || 500;
  const message = statusCode === 500 ? 'Internal Server Error' : error.message;

  reply.code(statusCode).send({
    error: true,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
    path: request.url,
  });
});

// Start server
const port = Number(process.env['PORT'] || 3000);
const host = process.env['HOST'] || '0.0.0.0';

try {
  await app.listen({ port, host });
  app.log.info(`Server listening on http://${host}:${port}`);
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}

// Background: Wanted scan scheduler (optional)
try {
  const enable = String(
    process.env['ENABLE_WANTED_SCHEDULER'] || ''
  ).toLowerCase();
  if (enable === '1' || enable === 'true' || enable === 'yes') {
    const interval = Math.max(
      60_000,
      Number(process.env['WANTED_SCAN_INTERVAL_MS'] || 15 * 60_000)
    );
    const jitter = Math.floor(Math.random() * Math.floor(interval / 3));
    const tick = async () => {
      try {
        const res = await app.inject({
          method: 'POST',
          url: '/api/wanted/scan',
          payload: {},
        });
        const j = res.json() as any;
        app.log.info(
          { ok: j?.ok, scanned: j?.scanned, results: j?.results?.length || 0 },
          'WANTED_SCHED_SCAN'
        );
      } catch (e) {
        app.log.warn({ err: e }, 'WANTED_SCHED_SCAN_FAILED');
      }
    };
    setTimeout(() => {
      void tick();
      setInterval(tick, interval);
    }, jitter);
    app.log.info(
      { intervalMs: interval, jitterMs: jitter },
      'WANTED_SCHEDULER_ENABLED'
    );
  }
} catch (_e) {
  // ignore scheduler setup errors
}

// Background: Live download monitor (optional)
try {
  const enable = String(
    process.env['ENABLE_DOWNLOAD_MONITOR'] || ''
  ).toLowerCase();
  if (enable === '1' || enable === 'true' || enable === 'yes') {
    const interval = Math.max(
      30_000,
      Number(process.env['DOWNLOAD_MONITOR_INTERVAL_MS'] || 30_000)
    );
    const lastSeen: Record<
      string,
      { client: string; progress?: number; title?: string }
    > = {};
    const sanitize = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
    const tick = async () => {
      try {
        const res = await app.inject({
          method: 'GET',
          url: '/api/activity/live',
        });
        const j = res.json() as any;
        if (j?.ok && Array.isArray(j.items)) {
          for (const it of j.items) {
            const key = `${it.client}:${it.clientId}`;
            lastSeen[key] = {
              client: it.client,
              progress: it.progress,
              title: it.title,
            };
            // Detect completion for qBittorrent (progress >= 1)
            if (
              it.client === 'qbittorrent' &&
              typeof it.progress === 'number' &&
              it.progress >= 1
            ) {
              try {
                // Heuristic map to last grab by title
                const lg = await app.inject({
                  method: 'GET',
                  url: '/api/library',
                });
                const lj = lg.json() as any;
                const items: any[] = Array.isArray(lj?.items) ? lj.items : [];
                const titleSan = sanitize(String(it.title || ''));
                const candidate = items.find((x) =>
                  titleSan.includes(sanitize(String(x.title || '')))
                );
                if (
                  candidate &&
                  candidate.id &&
                  candidate.kind &&
                  candidate.title
                ) {
                  await app.inject({
                    method: 'POST',
                    url: '/api/verify/jobs',
                    payload: {
                      kind: candidate.kind,
                      id: candidate.id,
                      title: candidate.title,
                      phase: 'all',
                    },
                  });
                }
              } catch {
                /* ignore verify trigger errors */
              }
            }
          }
        }
      } catch (e) {
        app.log.warn({ err: e }, 'DOWNLOAD_MONITOR_TICK_FAILED');
      }
    };
    setInterval(tick, interval);
    app.log.info({ intervalMs: interval }, 'DOWNLOAD_MONITOR_ENABLED');
  }
} catch (_e) {
  // ignore
}

// Background: SAB auto-verify on completion (optional)
try {
  const enable = String(
    process.env['ENABLE_SAB_VERIFY_ON_COMPLETE'] || ''
  ).toLowerCase();
  if (enable === '1' || enable === 'true' || enable === 'yes') {
    const CONFIG_DIR = path.join(process.cwd(), 'config');
    const DL_FILE = path.join(CONFIG_DIR, 'downloaders.json');
    const MON_FILE = path.join(CONFIG_DIR, 'monitor.json');

    // Use loadDownloadersWithCredentials from settings module (includes decryption)
    const ensureDir = async (f: string) => {
      try {
        await fs.mkdir(path.dirname(f), { recursive: true });
      } catch (_e) {
        /* ignore */ void 0;
      }
    };
    const loadMonitor = async (): Promise<any> => {
      try {
        const raw = await fs.readFile(MON_FILE, 'utf8');
        const json = JSON.parse(raw) || {};
        return json;
      } catch {
        return {};
      }
    };
    const saveMonitor = async (obj: any) => {
      await ensureDir(MON_FILE);
      await fs.writeFile(MON_FILE, JSON.stringify(obj, null, 2), 'utf8');
    };

    const interval = Math.max(
      30_000,
      Number(process.env['SAB_VERIFY_POLL_INTERVAL_MS'] || 60_000)
    );
    const sanitize = (s: string) =>
      String(s || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

    const tick = async () => {
      try {
        const cfg = await loadDownloadersWithCredentials();
        const sab = cfg.sabnzbd || {};
        if (!sab.enabled || !sab.baseUrl || !sab.apiKey) return;
        const hist = await sabnzbd.history({
          baseUrl: String(sab.baseUrl),
          apiKey: String(sab.apiKey),
          timeoutMs:
            typeof sab.timeoutMs === 'number' ? sab.timeoutMs : undefined,
        });
        if (!hist.ok) return;
        const mon = await loadMonitor();
        mon.sab = mon.sab || {};
        mon.sab.done = Array.isArray(mon.sab.done) ? mon.sab.done : [];
        const seen: string[] = mon.sab.done;

        // Load library items for fuzzy matching
        const libRes = await app.inject({ method: 'GET', url: '/api/library' });
        const libJson = libRes.json() as any;
        const items: any[] = Array.isArray(libJson?.items) ? libJson.items : [];

        let changed = false;
        for (const h of hist.items.slice(0, 50)) {
          const hid = String(h.id || h.name || '');
          if (!hid || seen.includes(hid)) continue;
          const status = String(h.status || '').toLowerCase();
          if (!status.includes('completed')) continue;
          // Find best-effort library candidate by fuzzy title inclusion
          const hTitle = sanitize(String(h.name || ''));
          const candidate = items.find((x) =>
            hTitle.includes(sanitize(String(x.title || '')))
          );
          if (candidate && candidate.id && candidate.kind && candidate.title) {
            try {
              await app.inject({
                method: 'POST',
                url: '/api/verify/jobs',
                payload: {
                  kind: candidate.kind,
                  id: candidate.id,
                  title: candidate.title,
                  phase: 'all',
                },
              });
              app.log.info(
                {
                  id: candidate.id,
                  kind: candidate.kind,
                  title: candidate.title,
                },
                'SAB_VERIFY_TRIGGERED'
              );
              seen.push(hid);
              changed = true;
            } catch (e) {
              app.log.warn({ err: e, hid }, 'SAB_VERIFY_TRIGGER_FAILED');
            }
          } else {
            // Still mark as seen to avoid retry storm; remove this if you prefer retries
            seen.push(hid);
            changed = true;
          }
          // bound size
          if (seen.length > 500) seen.splice(0, seen.length - 500);
        }
        if (changed) await saveMonitor(mon);
      } catch (e) {
        app.log.warn({ err: e }, 'SAB_VERIFY_POLL_FAILED');
      }
    };
    setInterval(tick, interval);
    app.log.info({ intervalMs: interval }, 'SAB_VERIFY_ON_COMPLETE_ENABLED');
  }
} catch (_e) {
  // ignore
}

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  app.log.info(`Received ${signal}, shutting down gracefully`);
  try {
    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;

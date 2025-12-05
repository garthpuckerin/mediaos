import { promises as fs } from 'fs';
import path from 'path';

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { authenticate, requireAdmin } from '../middleware/auth.js';
import { prowlarr, jackett } from '@mediaos/adapters/src/indexers/index.js';
import { encrypt, decrypt, isEncrypted } from '../services/encryption.js';

// Types
type IndexerType = 'prowlarr' | 'jackett' | 'manual';

interface IndexerConfig {
  id: string;
  name: string;
  type: IndexerType;
  protocol: 'torrent' | 'usenet' | 'both';
  enabled: boolean;
  baseUrl?: string;
  apiKey?: string;
  priority?: number;
}

interface IndexerSettings {
  prowlarr?: {
    enabled: boolean;
    baseUrl?: string;
    apiKey?: string;
    syncEnabled?: boolean;
  };
  jackett?: {
    enabled: boolean;
    baseUrl?: string;
    apiKey?: string;
  };
  indexers: IndexerConfig[];
}

// Config file path
const CONFIG_DIR = path.join(process.cwd(), 'config');
const INDEXERS_FILE = path.join(CONFIG_DIR, 'indexers.json');

// Load settings from disk
async function loadSettings(): Promise<IndexerSettings> {
  try {
    const raw = await fs.readFile(INDEXERS_FILE, 'utf8');
    const data = JSON.parse(raw);

    // Decrypt API keys
    if (data.prowlarr?.apiKey && isEncrypted(data.prowlarr.apiKey)) {
      data.prowlarr.apiKey = decrypt(data.prowlarr.apiKey);
    }
    if (data.jackett?.apiKey && isEncrypted(data.jackett.apiKey)) {
      data.jackett.apiKey = decrypt(data.jackett.apiKey);
    }

    return {
      prowlarr: data.prowlarr,
      jackett: data.jackett,
      indexers: data.indexers || [],
    };
  } catch {
    return { indexers: [] };
  }
}

// Save settings to disk
async function saveSettings(settings: IndexerSettings): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });

  const toSave = { ...settings };

  // Encrypt API keys
  if (toSave.prowlarr?.apiKey && !isEncrypted(toSave.prowlarr.apiKey)) {
    toSave.prowlarr = {
      ...toSave.prowlarr,
      apiKey: encrypt(toSave.prowlarr.apiKey),
    };
  }
  if (toSave.jackett?.apiKey && !isEncrypted(toSave.jackett.apiKey)) {
    toSave.jackett = {
      ...toSave.jackett,
      apiKey: encrypt(toSave.jackett.apiKey),
    };
  }

  await fs.writeFile(INDEXERS_FILE, JSON.stringify(toSave, null, 2));
}

const plugin: FastifyPluginAsync = async (app) => {
  // Get all indexers and settings
  app.get('/', { preHandler: authenticate }, async () => {
    const settings = await loadSettings();
    return {
      prowlarr: settings.prowlarr
        ? {
            enabled: settings.prowlarr.enabled,
            baseUrl: settings.prowlarr.baseUrl,
            hasApiKey: !!settings.prowlarr.apiKey,
            syncEnabled: settings.prowlarr.syncEnabled,
          }
        : undefined,
      jackett: settings.jackett
        ? {
            enabled: settings.jackett.enabled,
            baseUrl: settings.jackett.baseUrl,
            hasApiKey: !!settings.jackett.apiKey,
          }
        : undefined,
      indexers: settings.indexers,
    };
  });

  // Configure Prowlarr
  app.post('/prowlarr', { preHandler: requireAdmin }, async (req) => {
    const schema = z.object({
      enabled: z.boolean(),
      baseUrl: z.string().url().optional(),
      apiKey: z.string().optional(),
      syncEnabled: z.boolean().optional(),
    });
    const data = schema.parse(req.body);

    const settings = await loadSettings();
    settings.prowlarr = {
      enabled: data.enabled,
      baseUrl: data.baseUrl,
      apiKey: data.apiKey || settings.prowlarr?.apiKey,
      syncEnabled: data.syncEnabled ?? settings.prowlarr?.syncEnabled,
    };
    await saveSettings(settings);

    return {
      ok: true,
      prowlarr: {
        enabled: settings.prowlarr.enabled,
        baseUrl: settings.prowlarr.baseUrl,
        hasApiKey: !!settings.prowlarr.apiKey,
        syncEnabled: settings.prowlarr.syncEnabled,
      },
    };
  });

  // Configure Jackett
  app.post('/jackett', { preHandler: requireAdmin }, async (req) => {
    const schema = z.object({
      enabled: z.boolean(),
      baseUrl: z.string().url().optional(),
      apiKey: z.string().optional(),
    });
    const data = schema.parse(req.body);

    const settings = await loadSettings();
    settings.jackett = {
      enabled: data.enabled,
      baseUrl: data.baseUrl,
      apiKey: data.apiKey || settings.jackett?.apiKey,
    };
    await saveSettings(settings);

    return {
      ok: true,
      jackett: {
        enabled: settings.jackett.enabled,
        baseUrl: settings.jackett.baseUrl,
        hasApiKey: !!settings.jackett.apiKey,
      },
    };
  });

  // Test Prowlarr connection
  app.post('/prowlarr/test', { preHandler: requireAdmin }, async (req) => {
    const schema = z.object({
      baseUrl: z.string().url(),
      apiKey: z.string(),
    });
    const data = schema.parse(req.body);

    const result = await prowlarr.test({
      baseUrl: data.baseUrl,
      apiKey: data.apiKey,
    });

    return result;
  });

  // Test Jackett connection
  app.post('/jackett/test', { preHandler: requireAdmin }, async (req) => {
    const schema = z.object({
      baseUrl: z.string().url(),
      apiKey: z.string(),
    });
    const data = schema.parse(req.body);

    const result = await jackett.test({
      baseUrl: data.baseUrl,
      apiKey: data.apiKey,
    });

    return result;
  });

  // Sync indexers from Prowlarr
  app.post('/prowlarr/sync', { preHandler: requireAdmin }, async () => {
    const settings = await loadSettings();

    if (
      !settings.prowlarr?.enabled ||
      !settings.prowlarr?.baseUrl ||
      !settings.prowlarr?.apiKey
    ) {
      return { ok: false, error: 'Prowlarr not configured' };
    }

    const result = await prowlarr.getIndexers({
      baseUrl: settings.prowlarr.baseUrl,
      apiKey: settings.prowlarr.apiKey,
    });

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    // Merge with existing indexers
    const existingManual = settings.indexers.filter(
      (ix) => ix.type === 'manual'
    );
    const prowlarrIndexers: IndexerConfig[] = result.indexers.map((ix) => ({
      id: `prowlarr-${ix.id}`,
      name: ix.name,
      type: 'prowlarr' as const,
      protocol: ix.protocol,
      enabled: ix.enable,
      priority: ix.priority,
    }));

    settings.indexers = [...existingManual, ...prowlarrIndexers];
    await saveSettings(settings);

    return { ok: true, count: prowlarrIndexers.length };
  });

  // Sync indexers from Jackett
  app.post('/jackett/sync', { preHandler: requireAdmin }, async () => {
    const settings = await loadSettings();

    if (
      !settings.jackett?.enabled ||
      !settings.jackett?.baseUrl ||
      !settings.jackett?.apiKey
    ) {
      return { ok: false, error: 'Jackett not configured' };
    }

    const result = await jackett.getIndexers({
      baseUrl: settings.jackett.baseUrl,
      apiKey: settings.jackett.apiKey,
    });

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    // Merge with existing indexers
    const existingNonJackett = settings.indexers.filter(
      (ix) => ix.type !== 'jackett'
    );
    const jackettIndexers: IndexerConfig[] = result.indexers.map((ix) => ({
      id: `jackett-${ix.id}`,
      name: ix.name,
      type: 'jackett' as const,
      protocol: 'torrent',
      enabled: ix.configured,
    }));

    settings.indexers = [...existingNonJackett, ...jackettIndexers];
    await saveSettings(settings);

    return { ok: true, count: jackettIndexers.length };
  });

  // Add manual indexer
  app.post('/', { preHandler: requireAdmin }, async (req) => {
    const schema = z.object({
      name: z.string(),
      type: z.enum(['torrent', 'usenet']),
      url: z.string().optional(),
    });
    const data = schema.parse(req.body);

    const settings = await loadSettings();
    const ix: IndexerConfig = {
      id: Math.random().toString(36).slice(2),
      name: data.name,
      type: 'manual',
      protocol: data.type,
      enabled: true,
      baseUrl: data.url,
    };
    settings.indexers.push(ix);
    await saveSettings(settings);

    return { ok: true, indexer: ix };
  });

  // Search across all enabled indexers
  app.post('/search', { preHandler: authenticate }, async (req) => {
    const schema = z.object({
      q: z.string().min(2),
      cat: z.string().optional(),
      kind: z.string().optional(),
      serverFilter: z.boolean().optional(),
      protocol: z.enum(['torrent', 'usenet', 'any']).optional(),
      minSeeders: z.number().int().nonnegative().optional(),
      minSizeMB: z.number().int().nonnegative().optional(),
      maxSizeMB: z.number().int().nonnegative().optional(),
    });
    const {
      q,
      kind,
      serverFilter,
      protocol = 'any',
      minSeeders,
      minSizeMB,
      maxSizeMB,
    } = schema.parse(req.body);

    const settings = await loadSettings();
    let results: any[] = [];

    // Search via Prowlarr if enabled
    if (
      settings.prowlarr?.enabled &&
      settings.prowlarr?.baseUrl &&
      settings.prowlarr?.apiKey
    ) {
      const prowlarrResults = await prowlarr.search(
        {
          baseUrl: settings.prowlarr.baseUrl,
          apiKey: settings.prowlarr.apiKey,
        },
        { query: q }
      );

      if (prowlarrResults.ok) {
        results.push(
          ...prowlarrResults.results.map((r) => ({
            title: r.title,
            size: formatSize(r.size),
            seeders: r.seeders,
            leechers: r.leechers,
            link: r.magnetUrl || r.downloadUrl,
            protocol: r.protocol,
            indexer: r.indexer,
            publishDate: r.publishDate,
          }))
        );
      }
    }

    // Search via Jackett if enabled
    if (
      settings.jackett?.enabled &&
      settings.jackett?.baseUrl &&
      settings.jackett?.apiKey
    ) {
      const jackettResults = await jackett.search(
        {
          baseUrl: settings.jackett.baseUrl,
          apiKey: settings.jackett.apiKey,
        },
        { query: q }
      );

      if (jackettResults.ok) {
        results.push(
          ...jackettResults.results.map((r) => ({
            title: r.title,
            size: formatSize(r.size),
            seeders: r.seeders,
            leechers: r.peers,
            link: r.magnetUri || r.link,
            protocol: 'torrent',
            indexer: r.tracker,
            publishDate: r.publishDate,
          }))
        );
      }
    }

    // If no external indexers, return stub results
    if (results.length === 0) {
      results = [
        {
          title: `RESULT 2160p for ${q}`,
          size: '3.2GB',
          seeders: 320,
          link: `magnet:?xt=urn:btih:1111111111111111111111111111111111111111&dn=${encodeURIComponent(`RESULT 2160p for ${q}`)}`,
          protocol: 'torrent',
        },
        {
          title: `RESULT 1080p for ${q}`,
          size: '1.4GB',
          seeders: 120,
          link: `magnet:?xt=urn:btih:2222222222222222222222222222222222222222&dn=${encodeURIComponent(`RESULT 1080p for ${q}`)}`,
          protocol: 'torrent',
        },
        {
          title: `RESULT 720p for ${q}`,
          size: '800MB',
          seeders: 75,
          link: `magnet:?xt=urn:btih:3333333333333333333333333333333333333333&dn=${encodeURIComponent(`RESULT 720p for ${q}`)}`,
          protocol: 'torrent',
        },
      ];
    }

    // Apply filters
    if (protocol && protocol !== 'any') {
      results = results.filter((r) => r.protocol === protocol);
    }

    if (typeof minSeeders === 'number') {
      results = results.filter((r) => {
        if (r.protocol !== 'torrent') return true;
        return typeof r.seeders !== 'number' || r.seeders >= minSeeders;
      });
    }

    if (typeof minSizeMB === 'number' || typeof maxSizeMB === 'number') {
      results = results.filter((r) => {
        const mb = parseSize(r.size);
        if (
          typeof minSizeMB === 'number' &&
          typeof mb === 'number' &&
          mb < minSizeMB
        )
          return false;
        if (
          typeof maxSizeMB === 'number' &&
          typeof mb === 'number' &&
          mb > maxSizeMB
        )
          return false;
        return true;
      });
    }

    // Quality filtering
    if (serverFilter && kind) {
      const QUALITY_FILE = path.join(CONFIG_DIR, 'quality.json');
      let profiles: any = {};
      try {
        const raw = await fs.readFile(QUALITY_FILE, 'utf8');
        profiles = JSON.parse(raw) || {};
      } catch {
        profiles = {};
      }

      const prof = profiles[kind] || { allowed: [], cutoff: '' };
      const allowedList = Array.isArray(prof.allowed)
        ? prof.allowed.map((x: any) => String(x).toLowerCase())
        : [];

      if (allowedList.length > 0) {
        const detectQuality = (t: string): string | null => {
          const s = (t || '').toLowerCase();
          if (s.includes('2160p') || s.includes('4k')) return '2160p';
          if (s.includes('1080p')) return '1080p';
          if (s.includes('720p')) return '720p';
          if (s.includes('480p')) return '480p';
          return null;
        };

        results = results.filter((r) => {
          const qd = detectQuality(r.title || '');
          return !qd || allowedList.includes(qd);
        });
      }
    }

    // Sort by seeders (descending)
    results.sort((a, b) => (b.seeders || 0) - (a.seeders || 0));

    return { ok: true, results };
  });

  // Update indexer
  app.patch('/:id', { preHandler: requireAdmin }, async (req) => {
    const id = (req.params as any).id as string;
    const schema = z.object({
      enabled: z.boolean().optional(),
      name: z.string().optional(),
      priority: z.number().optional(),
    });
    const data = schema.parse(req.body || {});

    const settings = await loadSettings();
    const ix = settings.indexers.find((x) => x.id === id);
    if (!ix) return { ok: false, error: 'not_found' };

    if (typeof data.enabled === 'boolean') ix.enabled = data.enabled;
    if (typeof data.name === 'string') ix.name = data.name;
    if (typeof data.priority === 'number') ix.priority = data.priority;

    await saveSettings(settings);
    return { ok: true, indexer: ix };
  });

  // Delete indexer
  app.delete('/:id', { preHandler: requireAdmin }, async (req) => {
    const id = (req.params as any).id as string;

    const settings = await loadSettings();
    const idx = settings.indexers.findIndex((x) => x.id === id);
    if (idx === -1) return { ok: false, error: 'not_found' };

    const [removed] = settings.indexers.splice(idx, 1);
    await saveSettings(settings);
    return { ok: true, indexer: removed };
  });
};

// Helper functions
function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`;
  }
  return `${bytes}B`;
}

function parseSize(s: string): number | undefined {
  const m = (s || '').toLowerCase().match(/([0-9]+\.?[0-9]*)\s*(kb|mb|gb|tb)/);
  if (!m) return undefined;
  const n = Number(m[1]);
  const unit = m[2];
  if (!Number.isFinite(n)) return undefined;
  return unit === 'kb'
    ? n / 1024
    : unit === 'mb'
      ? n
      : unit === 'gb'
        ? n * 1024
        : n * 1024 * 1024;
}

export default plugin;

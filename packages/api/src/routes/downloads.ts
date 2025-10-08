import { getDownloaderConfig } from '@mediaos/shared/config/downloaders';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { all, run } from '../db';
import { enqueueJob } from '../queue';

const torrentSchema = z.object({
  provider: z.literal('qbittorrent'),
  magnet: z.string().min(1),
  destination: z.string().optional(),
});

const nzbSchema = z.object({
  provider: z.literal('nzbget'),
  url: z.string().url(),
  category: z.string().optional(),
});

const sabSchema = z.object({
  provider: z.literal('sabnzbd'),
  url: z.string().url(),
  category: z.string().optional(),
});

const requestSchema = z.discriminatedUnion('provider', [
  torrentSchema,
  nzbSchema,
  sabSchema,
]);

const providers = ['qbittorrent', 'nzbget', 'sabnzbd'] as const;
type ProviderKey = (typeof providers)[number];

interface JobRow {
  id: number;
  status: string;
  payload: string;
  result: string | null;
  created_at: string;
  finished_at: string | null;
}

const plugin: FastifyPluginAsync = async (app) => {
  app.get('/api/downloads', async () => {
    const rows = await all<JobRow>(
      `SELECT id, status, payload, result, created_at, finished_at
         FROM jobs
        WHERE type = 'download.enqueue'
        ORDER BY created_at DESC
        LIMIT 50`
    );

    const config = getDownloaderConfig();
    const totals = {
      total: 0,
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
    };

    const providerSummaries: Record<ProviderKey, ProviderSummary> =
      providers.reduce(
        (acc, key) => {
          acc[key] = createProviderSummary(Boolean(config[key]));
          return acc;
        },
        Object.create(null) as Record<ProviderKey, ProviderSummary>
      );

    const recentFailures: RecentFailure[] = [];

    for (const row of rows) {
      totals.total += 1;
      switch (row.status) {
        case 'pending':
          totals.pending += 1;
          break;
        case 'running':
          totals.running += 1;
          break;
        case 'completed':
          totals.completed += 1;
          break;
        case 'failed':
          totals.failed += 1;
          break;
        default:
          break;
      }

      const provider = getProviderFromPayload(row.payload);
      if (!provider) {
        continue;
      }
      const summary = providerSummaries[provider];
      summary.totals.total += 1;
      switch (row.status) {
        case 'pending':
          summary.totals.pending += 1;
          break;
        case 'running':
          summary.totals.running += 1;
          break;
        case 'completed':
          summary.totals.completed += 1;
          if (!summary.lastSuccess) {
            summary.lastSuccess = row.finished_at ?? row.created_at;
          }
          break;
        case 'failed': {
          summary.totals.failed += 1;
          const failure = {
            at: row.finished_at ?? row.created_at,
            message: getFailureMessage(row.result),
          };
          if (!summary.lastFailure || summary.lastFailure.at < failure.at) {
            summary.lastFailure = failure;
          }
          if (recentFailures.length < 5) {
            recentFailures.push({
              jobId: row.id,
              provider,
              finishedAt: failure.at,
              message: failure.message,
            });
          }
          break;
        }
        default:
          break;
      }
    }

    return {
      totals,
      providers: providerSummaries,
      recentFailures,
    };
  });

  app.post('/api/downloads', async (req) => {
    const data = requestSchema.parse(req.body);

    const payload = { ...data };

    const { lastID } = await run(
      'INSERT INTO jobs (type, payload) VALUES (?, ?)',
      ['download.enqueue', JSON.stringify(payload)]
    );

    await enqueueJob('download.enqueue', { ...payload, jobId: lastID });

    return { ok: true, jobId: lastID };
  });
};

export default plugin;

type ProviderSummary = {
  enabled: boolean;
  totals: {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
  };
  lastSuccess: string | null;
  lastFailure: { at: string; message: string } | null;
};

type RecentFailure = {
  jobId: number;
  provider: ProviderKey;
  finishedAt: string;
  message: string;
};

function createProviderSummary(enabled: boolean): ProviderSummary {
  return {
    enabled,
    totals: { total: 0, pending: 0, running: 0, completed: 0, failed: 0 },
    lastSuccess: null,
    lastFailure: null,
  };
}

function getProviderFromPayload(payload: string | null): ProviderKey | null {
  if (!payload) {
    return null;
  }
  try {
    const data = JSON.parse(payload) as { provider?: unknown } | null;
    if (data && isProviderKey(data.provider)) {
      return data.provider;
    }
  } catch {
    return null;
  }
  return null;
}

function getFailureMessage(result: string | null): string {
  if (!result) {
    return 'Unknown failure';
  }
  try {
    const data = JSON.parse(result) as {
      error?: string;
      message?: string;
    } | null;
    const message = data?.error ?? data?.message;
    if (message && message.length > 0) {
      return message;
    }
  } catch {
    return result;
  }
  return 'Unknown failure';
}

function isProviderKey(value: unknown): value is ProviderKey {
  return (
    typeof value === 'string' &&
    (providers as readonly string[]).includes(value as string)
  );
}

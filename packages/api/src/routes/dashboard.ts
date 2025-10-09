import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { all } from '../db';

const dashboardSchema = z.object({
  totals: z.object({
    mediaItems: z.number().int(),
    requests: z.object({
      pending: z.number().int(),
      approved: z.number().int(),
      denied: z.number().int(),
    }),
    jobs: z.object({
      pending: z.number().int(),
      running: z.number().int(),
      completed: z.number().int(),
      failed: z.number().int(),
    }),
    indexers: z.object({
      total: z.number().int(),
      enabled: z.number().int(),
      disabled: z.number().int(),
    }),
  }),
  latest: z.object({
    mediaItems: z
      .array(
        z.object({
          id: z.number().int(),
          title: z.string(),
          kind: z.string(),
          year: z.number().int().nullable(),
          updated_at: z.string(),
        })
      )
      .max(5),
    requests: z
      .array(
        z.object({
          id: z.number().int(),
          title: z.string(),
          status: z.string(),
          created_at: z.string(),
        })
      )
      .max(5),
    jobs: z
      .array(
        z.object({
          id: z.number().int(),
          type: z.string(),
          status: z.string(),
          created_at: z.string(),
        })
      )
      .max(5),
    indexers: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          enabled: z.boolean(),
          last_synced_at: z.string().nullable(),
        })
      )
      .max(5),
  }),
});

const plugin: FastifyPluginAsync = async (app) => {
  app.get('/api/dashboard/overview', async () => {
    const mediaItemsRows = await all<{ mediaItems: number }>(
      'SELECT COUNT(*) as mediaItems FROM media_items'
    );
    const mediaItems = Number(mediaItemsRows[0]?.mediaItems ?? 0);

    const requestBuckets = await all<{ status: string; total: number }>(
      'SELECT status, COUNT(*) as total FROM requests GROUP BY status'
    );

    const jobBuckets = await all<{ status: string; total: number }>(
      'SELECT status, COUNT(*) as total FROM jobs GROUP BY status'
    );

    const indexerTotalsRows = await all<{
      totalIndexers: number;
      enabledIndexers: number;
    }>(
      `SELECT COUNT(*) as totalIndexers,
              SUM(CASE WHEN enabled = 1 THEN 1 ELSE 0 END) as enabledIndexers
         FROM indexers`
    );
    const totalIndexers = Number(indexerTotalsRows[0]?.totalIndexers ?? 0);
    const enabledIndexers = Number(indexerTotalsRows[0]?.enabledIndexers ?? 0);

    const mediaItemsLatest = await all<{
      id: number;
      title: string;
      kind: string;
      year: number | null;
      updated_at: string;
    }>(
      'SELECT id, title, kind, year, updated_at FROM media_items ORDER BY updated_at DESC LIMIT 5'
    );

    const requestsLatest = await all<{
      id: number;
      title: string;
      status: string;
      created_at: string;
    }>(
      'SELECT id, title, status, created_at FROM requests ORDER BY created_at DESC LIMIT 5'
    );

    const jobsLatest = await all<{
      id: number;
      type: string;
      status: string;
      created_at: string;
    }>(
      'SELECT id, type, status, created_at FROM jobs ORDER BY created_at DESC LIMIT 5'
    );

    const indexerLatest = await all<{
      id: string;
      name: string;
      enabled: number;
      last_synced_at: string | null;
    }>(
      'SELECT id, name, enabled, last_synced_at FROM indexers ORDER BY updated_at DESC LIMIT 5'
    );

    const payload = {
      totals: {
        mediaItems,
        requests: reduceBuckets(requestBuckets, [
          'pending',
          'approved',
          'denied',
        ]),
        jobs: reduceBuckets(jobBuckets, [
          'pending',
          'running',
          'completed',
          'failed',
        ]),
        indexers: {
          total: totalIndexers,
          enabled: enabledIndexers ?? 0,
          disabled: totalIndexers - (enabledIndexers ?? 0),
        },
      },
      latest: {
        mediaItems: mediaItemsLatest,
        requests: requestsLatest,
        jobs: jobsLatest,
        indexers: indexerLatest.map((row) => ({
          id: row.id,
          name: row.name,
          enabled: Boolean(row.enabled),
          last_synced_at: row.last_synced_at,
        })),
      },
    } satisfies z.infer<typeof dashboardSchema>;

    return dashboardSchema.parse(payload);
  });
};

export default plugin;

function reduceBuckets<TStatus extends string>(
  rows: { status: string; total: number }[],
  order: TStatus[]
): Record<TStatus, number> {
  const lookup = new Map<string, number>();
  for (const row of rows) {
    lookup.set(row.status, Number(row.total) || 0);
  }
  return order.reduce(
    (acc, key) => {
      acc[key] = lookup.get(key) ?? 0;
      return acc;
    },
    Object.create(null) as Record<TStatus, number>
  );
}

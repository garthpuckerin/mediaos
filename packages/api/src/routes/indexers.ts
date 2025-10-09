import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { all, run } from '../db';

const indexerSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['torrent', 'usenet']),
  url: z.string().nullable(),
  enabled: z.boolean(),
});

const plugin: FastifyPluginAsync = async (app) => {
  app.get('/api/indexers', async () => {
    const rows = await all<{
      id: string;
      name: string;
      type: string;
      url: string | null;
      enabled: number;
    }>(
      'SELECT id, name, type, url, enabled FROM indexers ORDER BY created_at DESC'
    );
    const indexers = rows.map((row) =>
      indexerSchema.parse({
        id: row.id,
        name: row.name,
        type: row.type,
        url: row.url,
        enabled: Boolean(row.enabled),
      })
    );
    return { indexers };
  });

  app.post('/api/indexers', async (req) => {
    const schema = z.object({
      name: z.string(),
      type: z.enum(['torrent', 'usenet']),
      url: z.string().url().optional(),
    });
    const data = schema.parse(req.body);
    const id = Math.random().toString(36).slice(2);
    await run(
      'INSERT INTO indexers (id, name, type, url, enabled) VALUES (?, ?, ?, ?, 1)',
      [id, data.name, data.type, data.url ?? null]
    );
    const rows2 = await all<{
      id: string;
      name: string;
      type: string;
      url: string | null;
      enabled: number;
    }>('SELECT id, name, type, url, enabled FROM indexers WHERE id = ?', [id]);
    const row = rows2[0];
    if (!row) {
      throw app.httpErrors.internalServerError(
        'Failed to fetch created indexer'
      );
    }
    return {
      ok: true,
      indexer: indexerSchema.parse({
        id: row.id,
        name: row.name,
        type: row.type,
        url: row.url,
        enabled: Boolean(row.enabled),
      }),
    };
  });

  app.post('/api/indexers/search', async (req) => {
    const schema = z.object({
      q: z.string().min(2),
      cat: z.string().optional(),
    });
    const { q } = schema.parse(req.body);
    // TODO: call adapters; this is a stub
    return {
      ok: true,
      results: [{ title: `RESULT for ${q}`, size: '1.4GB', seeders: 120 }],
    };
  });
};

export default plugin;

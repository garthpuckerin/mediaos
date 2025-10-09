import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { all, run } from '../db';
import { enqueueJob } from '../queue';

const jobRecord = z.object({
  id: z.number().int(),
  type: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  payload: z.record(z.unknown()).nullable().optional(),
  result: z.record(z.unknown()).nullable().optional(),
  created_at: z.string().optional().nullable(),
  started_at: z.string().optional().nullable(),
  finished_at: z.string().optional().nullable(),
});

const plugin: FastifyPluginAsync = async (app) => {
  app.get('/api/jobs', async () => {
    const rows = await all<{
      id: number;
      type: string;
      status: string;
      payload: string | null;
      result: string | null;
      created_at: string | null;
      started_at: string | null;
      finished_at: string | null;
    }>(
      'SELECT id, type, status, payload, result, created_at, started_at, finished_at FROM jobs ORDER BY created_at DESC'
    );

    return {
      jobs: rows.map((row) =>
        jobRecord.parse({
          ...row,
          payload: row.payload ? parseJson(row.payload) : null,
          result: row.result ? parseJson(row.result) : null,
        })
      ),
    };
  });

  app.post('/api/jobs', async (req) => {
    const schema = z.object({
      type: z.string(),
      payload: z.record(z.unknown()).optional(),
    });
    const data = schema.parse(req.body);

    const { lastID } = await run(
      'INSERT INTO jobs (type, payload) VALUES (?, ?)',
      [data.type, JSON.stringify(data.payload ?? {})]
    );

    await enqueueJob(data.type, { ...data.payload, jobId: lastID });

    const jobRows = await all<{
      id: number;
      type: string;
      status: string;
      payload: string | null;
      result: string | null;
      created_at: string | null;
      started_at: string | null;
      finished_at: string | null;
    }>(
      'SELECT id, type, status, payload, result, created_at, started_at, finished_at FROM jobs WHERE id = ?',
      [lastID]
    );
    const row = jobRows[0];
    if (!row) {
      throw app.httpErrors.internalServerError('Failed to fetch created job');
    }

    return {
      ok: true,
      job: jobRecord.parse({
        ...row,
        payload: row.payload ? parseJson(row.payload) : null,
        result: row.result ? parseJson(row.result) : null,
      }),
    };
  });
};

export default plugin;

function parseJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

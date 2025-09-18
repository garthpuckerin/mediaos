import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

type Indexer = {
  id: string;
  name: string;
  type: 'torrent' | 'usenet';
  url?: string;
  enabled: boolean;
};

const indexers: Indexer[] = [
  { id: 'nyaa', name: 'Nyaa', type: 'torrent', enabled: true },
  { id: '1337x', name: '1337x', type: 'torrent', enabled: true },
];

const plugin: FastifyPluginAsync = async (app) => {
  app.get('/', async () => ({ indexers }));

  app.post('/', async (req) => {
    const schema = z.object({
      name: z.string(),
      type: z.enum(['torrent', 'usenet']),
      url: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const ix: Indexer = {
      id: Math.random().toString(36).slice(2),
      enabled: true,
      // Ensure optional properties include undefined when not provided
      ...data,
      url: (data as any).url ?? undefined,
    } as Indexer;
    indexers.push(ix);
    return { ok: true, indexer: ix };
  });

  app.post('/search', async (req) => {
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

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
      results: [
        {
          title: `RESULT for ${q}`,
          size: '1.4GB',
          seeders: 120,
          link:
            'magnet:?xt=urn:btih:0000000000000000000000000000000000000000&dn=' +
            encodeURIComponent(`RESULT for ${q}`),
          protocol: 'torrent',
        },
      ],
    };
  });

  app.patch('/:id', async (req) => {
    const id = (req.params as any).id as string;
    const schema = z.object({
      enabled: z.boolean().optional(),
      name: z.string().optional(),
      url: z.string().optional(),
    });
    const data = schema.parse(req.body || {});
    const ix = indexers.find((x) => x.id === id);
    if (!ix) return { ok: false, error: 'not_found' };
    if (typeof data.enabled === 'boolean') ix.enabled = data.enabled;
    if (typeof data.name === 'string') ix.name = data.name;
    if (typeof data.url === 'string') (ix as any).url = data.url;
    return { ok: true, indexer: ix };
  });

  app.delete('/:id', async (req) => {
    const id = (req.params as any).id as string;
    const idx = indexers.findIndex((x) => x.id === id);
    if (idx === -1) return { ok: false, error: 'not_found' };
    const [removed] = indexers.splice(idx, 1);
    return { ok: true, indexer: removed };
  });
};

export default plugin;

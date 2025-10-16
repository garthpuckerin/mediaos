import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';

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
      kind: z.string().optional(),
      serverFilter: z.boolean().optional(),
    });
    const { q, kind, serverFilter } = schema.parse(req.body);
    // TODO: call adapters; this is a stub
  let results = [
      {
        title: `RESULT 2160p for ${q}`,
        size: '3.2GB',
        seeders: 320,
        link:
          'magnet:?xt=urn:btih:1111111111111111111111111111111111111111&dn=' +
          encodeURIComponent(`RESULT 2160p for ${q}`),
        protocol: 'torrent',
      },
      {
        title: `RESULT 1080p for ${q}`,
        size: '1.4GB',
        seeders: 120,
        link:
          'magnet:?xt=urn:btih:2222222222222222222222222222222222222222&dn=' +
          encodeURIComponent(`RESULT 1080p for ${q}`),
        protocol: 'torrent',
      },
      {
        title: `RESULT 720p for ${q}`,
        size: '800MB',
        seeders: 75,
        link:
          'magnet:?xt=urn:btih:3333333333333333333333333333333333333333&dn=' +
          encodeURIComponent(`RESULT 720p for ${q}`),
        protocol: 'torrent',
      },
      {
        title: `USENET 1080p for ${q}`,
        size: '1.2GB',
        seeders: 0,
        link: 'https://example.com/fakefile.nzb',
        protocol: 'usenet',
      },
    ];

    if (serverFilter && kind) {
      // Load quality profiles
      const CONFIG_DIR = path.join(process.cwd(), 'config');
      const QUALITY_FILE = path.join(CONFIG_DIR, 'quality.json');
      let profiles: any = {};
      try {
        const raw = await fs.readFile(QUALITY_FILE, 'utf8');
        const json = JSON.parse(raw);
        profiles = json || {};
      } catch (_e) {
        profiles = {};
      }
      const prof = (profiles as any)[kind] || { allowed: [], cutoff: '' };
      const allowedList = Array.isArray(prof.allowed)
        ? prof.allowed.map((x: any) => String(x).toLowerCase())
        : [];
      const qualityRank: Record<string, number> = {
        '2160p': 4,
        '1080p': 3,
        '720p': 2,
        '480p': 1,
        sd: 1,
      };
      const detectQuality = (t: string): string | null => {
        const s = (t || '').toLowerCase();
        let best: string | null = null;
        for (const qk of Object.keys(qualityRank)) {
          if (s.includes(qk)) {
            const cur = best && typeof (qualityRank as any)[best] === 'number' ? (qualityRank as any)[best] : -Infinity;
            const next = (qualityRank as any)[qk];
            if (typeof next === 'number' && next > cur) best = qk;
          }
        }
        return best;
      };
      results = results.filter((r) => {
        if (allowedList.length === 0) return true;
        const qd = detectQuality(String((r as any).title || ''));
        return !!(qd && allowedList.includes(qd));
      });
    }

    return {
      ok: true,
      results,
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

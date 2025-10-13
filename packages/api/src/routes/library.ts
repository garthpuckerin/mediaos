import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

// Minimal in-memory demo; replace with DB layer.
const library: any[] = [];

const plugin: FastifyPluginAsync = async (app) => {
  app.get('/api/library', async () => ({ items: library }));

  app.get('/api/library/:id', async (req, _res) => {
    const id = (req.params as any).id as string;
    const item = library.find((it) => it.id === id || it.title === id);
    if (!item) return { ok: false, error: 'not_found' };
    return { ok: true, item };
  });

  app.post('/api/library', async (req, _res) => {
    const schema = z.object({
      kind: z.enum(['movie', 'series', 'music', 'book']),
      title: z.string(),
      posterUrl: z.string().url().optional(),
      backgroundUrl: z.string().url().optional(),
    });
    const data = schema.parse(req.body);
    const item = { id: Date.now().toString(), ...data } as any;
    library.push(item);
    return { ok: true, item };
  });

  app.post('/api/library/artwork', async (req) => {
    const schema = z.object({
      title: z.string(),
      tab: z.enum(['poster', 'background', 'banner', 'season']).optional(),
      url: z.string().url(),
    });
    const { title, tab = 'poster', url } = schema.parse(req.body);
    const it = library.find((x) => x.title === title);
    if (!it) return { ok: false, error: 'not_found' };
    if (tab === 'poster') (it as any).posterUrl = url;
    if (tab === 'background') (it as any).backgroundUrl = url;
    return { ok: true, item: it };
  });

  // artwork lock/revert hooks will call into /artwork routes
};

export default plugin;

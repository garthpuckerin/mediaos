import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';

type LibraryItem = {
  id: string;
  kind: 'movie' | 'series' | 'music' | 'book';
  title: string;
  posterUrl?: string;
  backgroundUrl?: string;
};

const CONFIG_DIR = path.join(process.cwd(), 'config');
const LIB_FILE = path.join(CONFIG_DIR, 'library.json');

async function ensureDir(filePath: string) {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
  } catch (_e) {
    // ignore
  }
}

async function loadLibrary(): Promise<LibraryItem[]> {
  try {
    const raw = await fs.readFile(LIB_FILE, 'utf8');
    const json = JSON.parse(raw);
    const items = Array.isArray(json?.items)
      ? (json.items as LibraryItem[])
      : [];
    return items;
  } catch (_e) {
    return [];
  }
}

async function saveLibrary(items: LibraryItem[]) {
  await ensureDir(LIB_FILE);
  await fs.writeFile(LIB_FILE, JSON.stringify({ items }, null, 2), 'utf8');
}

const plugin: FastifyPluginAsync = async (app) => {
  app.get('/api/library', async () => {
    const items = await loadLibrary();
    return { items };
  });

  app.get('/api/library/:id', async (req, _res) => {
    const id = (req.params as any).id as string;
    const items = await loadLibrary();
    const item = items.find((it) => it.id === id || it.title === id);
    if (!item) return { ok: false, error: 'not_found' };
    return { ok: true, item };
  });

  app.post('/api/library', async (req, _res) => {
    const schema = z.object({
      id: z.string().optional(),
      kind: z.enum(['movie', 'series', 'music', 'book']),
      title: z.string(),
      posterUrl: z.string().url().optional(),
      backgroundUrl: z.string().url().optional(),
    });
    const data = schema.parse(req.body);
    const items = await loadLibrary();
    // Upsert by (kind,title) to avoid dupes while preserving id
    const existing = items.find(
      (x) =>
        x.kind === data.kind &&
        x.title.toLowerCase() === data.title.toLowerCase()
    );
    if (existing) return { ok: true, item: existing };
    const providedId = (data as any).id as string | undefined;
    if (providedId && items.some((x) => x.id === providedId)) {
      return { ok: false, error: 'duplicate_id' };
    }
    const newId =
      providedId ||
      Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const { id: _ignore, ...rest } = data as any;
    const item: LibraryItem = { id: newId, ...(rest as any) };
    items.push(item);
    await saveLibrary(items);
    return { ok: true, item };
  });

  app.post('/api/library/artwork', async (req) => {
    const schema = z.object({
      title: z.string(),
      tab: z.enum(['poster', 'background', 'banner', 'season']).optional(),
      url: z.string().url(),
    });
    const { title, tab = 'poster', url } = schema.parse(req.body);
    const items = await loadLibrary();
    const it = items.find((x) => x.title === title);
    if (!it) return { ok: false, error: 'not_found' };
    if (tab === 'poster') (it as any).posterUrl = url;
    if (tab === 'background') (it as any).backgroundUrl = url;
    await saveLibrary(items);
    return { ok: true, item: it };
  });

  app.patch('/api/library/:id', async (req) => {
    const id = (req.params as any).id as string;
    const schema = z.object({
      kind: z.enum(['movie', 'series', 'music', 'book']).optional(),
      title: z.string().optional(),
      posterUrl: z.string().url().optional().nullable(),
      backgroundUrl: z.string().url().optional().nullable(),
    });
    const patch = schema.parse(req.body || {});
    const items = await loadLibrary();
    const ix = items.findIndex((x) => x.id === id);
    if (ix === -1) return { ok: false, error: 'not_found' };
    const next = { ...items[ix] } as LibraryItem;
    if (typeof patch.kind === 'string') next.kind = patch.kind as any;
    if (typeof patch.title === 'string' && patch.title.trim().length > 0)
      next.title = patch.title.trim();
    if (patch.posterUrl !== undefined) {
      if (patch.posterUrl === null) delete (next as any).posterUrl;
      else next.posterUrl = patch.posterUrl;
    }
    if (patch.backgroundUrl !== undefined) {
      if (patch.backgroundUrl === null) delete (next as any).backgroundUrl;
      else next.backgroundUrl = patch.backgroundUrl;
    }
    // prevent duplicate (kind,title) pairs (excluding self)
    const dup = items.find(
      (x, i) =>
        i !== ix &&
        x.kind === next.kind &&
        String(x.title || '').toLowerCase() ===
          String(next.title || '').toLowerCase()
    );
    if (dup) return { ok: false, error: 'duplicate_title' };
    items[ix] = next;
    await saveLibrary(items);
    return { ok: true, item: next };
  });

  app.delete('/api/library/:id', async (req) => {
    const id = (req.params as any).id as string;
    const items = await loadLibrary();
    const idx = items.findIndex((x) => x.id === id);
    if (idx === -1) return { ok: false, error: 'not_found' };
    const [removed] = items.splice(idx, 1);
    await saveLibrary(items);
    return { ok: true, item: removed };
  });

  // artwork lock/revert hooks will call into /artwork routes
};

export default plugin;

import type { FastifyPluginAsync } from 'fastify';
import { promises as fs } from 'fs';
import path from 'path';

type WantedItem = { id: string; title: string; kind: string; addedAt: string };

const CONFIG_DIR = path.join(process.cwd(), 'config');
const WANTED_FILE = path.join(CONFIG_DIR, 'wanted.json');

async function ensureDir(filePath: string) {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
  } catch (_e) {
    // ignore
  }
}

async function loadWanted(): Promise<WantedItem[]> {
  try {
    const raw = await fs.readFile(WANTED_FILE, 'utf8');
    const json = JSON.parse(raw);
    return Array.isArray(json?.items) ? (json.items as WantedItem[]) : [];
  } catch (_e) {
    return [];
  }
}

async function saveWanted(items: WantedItem[]) {
  await ensureDir(WANTED_FILE);
  await fs.writeFile(WANTED_FILE, JSON.stringify({ items }, null, 2), 'utf8');
}

const plugin: FastifyPluginAsync = async (app) => {
  app.get('/', async () => {
    const items = await loadWanted();
    return { ok: true, items };
  });

  app.post('/', async (req) => {
    const b = (req.body || {}) as any;
    const id = String(b.id || '').trim();
    const title = String(b.title || '').trim();
    const kind = String(b.kind || '').trim();
    if (!id || !title || !kind) return { ok: false, error: 'missing_params' };
    const items = await loadWanted();
    const key = `${kind}:${id}`;
    const exists = items.find((x) => `${x.kind}:${x.id}` === key);
    if (!exists)
      items.push({ id, title, kind, addedAt: new Date().toISOString() });
    await saveWanted(items);
    return { ok: true, items };
  });

  app.post('/scan', async (req) => {
    const b = (req.body || {}) as any;
    const enqueue = !!b.enqueue;
    const items = await loadWanted();
    const results: any[] = [];
    for (const it of items) {
      // Minimal scan: reuse simple titles to form a matched result (stub)
      const found = [
        { title: `${it.title} 1080p`, protocol: 'torrent', link: 'magnet:?xt=urn:btih:222...' },
      ];
      let grabbed = 0;
      if (enqueue && found.length > 0) {
        try {
          const first = found[0];
          const res = await app.inject({
            method: 'POST',
            url: '/api/downloads/grab',
            payload: { kind: it.kind, id: it.id, title: first.title, link: first.link, protocol: first.protocol },
          });
          const j = res.json() as any;
          if (j && j.ok) grabbed = 1;
        } catch (_e) {
          // ignore enqueue errors
          void 0;
        }
      }
      results.push({ key: `${it.kind}:${it.id}`, found: found.length, grabbed });
    }
    return { ok: true, scanned: items.length, results };
  });

  app.delete('/:kind/:id', async (req) => {
    const params = (req.params || {}) as any;
    const id = String(params.id || '').trim();
    const kind = String(params.kind || '').trim();
    const items = await loadWanted();
    const next = items.filter((x) => !(x.id === id && x.kind === kind));
    await saveWanted(next);
    return { ok: true, items: next };
  });
};

export default plugin;

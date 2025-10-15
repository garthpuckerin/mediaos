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


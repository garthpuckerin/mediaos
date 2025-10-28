import type { FastifyPluginAsync } from 'fastify';
import { promises as fs } from 'fs';
import path from 'path';

type WantedItem = {
  id: string;
  title: string;
  kind: string;
  addedAt: string;
  lastScan?: {
    at: string;
    found: number;
    grabbed: number;
  };
};

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
    const scannedAt = new Date().toISOString();
    const rand = (min: number, max: number) =>
      min + Math.floor(Math.random() * (max - min + 1));
    const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
    const sizes = [
      '700MB',
      '900MB',
      '1.2GB',
      '1.6GB',
      '2.4GB',
      '3.4GB',
      '5.0GB',
      '7.2GB',
    ];
    const quals = ['720p', '1080p', '2160p'];
    const tags = ['WEB-DL', 'BluRay', 'x264', 'x265', 'Remux'];
    for (const it of items) {
      // Create a small variety of results favoring Usenet in this build
      const count = rand(0, 3);
      const arr: any[] = [];
      for (let i = 0; i < count; i++) {
        const q = pick(quals);
        const t = pick(tags);
        const sz = pick(sizes);
        // favor usenet ~70%
        const isUsenet = Math.random() < 0.7;
        if (isUsenet) {
          arr.push({
            title: `${it.title} ${q} ${t}`,
            size: sz,
            protocol: 'usenet',
            link: `https://example.com/fake/${encodeURIComponent(it.title)}.${q}.nzb`,
          });
        } else {
          arr.push({
            title: `${it.title} ${q} ${t}`,
            size: sz,
            seeders: rand(20, 500),
            protocol: 'torrent',
            link: `magnet:?xt=urn:btih:${Math.random().toString(16).slice(2).padEnd(40, 'a')}`,
          });
        }
      }
      const found = arr;
      let grabbed = 0;
      if (enqueue && found.length > 0) {
        try {
          // Prefer first usenet result if any
          const nzb =
            found.find((f: any) => f.protocol === 'usenet') ||
            (found[0] as any);
          const res = await app.inject({
            method: 'POST',
            url: '/api/downloads/grab',
            payload:
              nzb && nzb.title && nzb.link && nzb.protocol
                ? {
                    kind: it.kind,
                    id: it.id,
                    title: nzb.title,
                    link: nzb.link,
                    protocol: nzb.protocol,
                  }
                : {
                    kind: it.kind,
                    id: it.id,
                    title: `${it.title} 1080p`,
                    link: 'https://example.com/fakefile.nzb',
                    protocol: 'usenet',
                  },
          });
          const j = res.json() as any;
          if (j && j.ok) grabbed = 1;
        } catch (_e) {
          // ignore enqueue errors
          void 0;
        }
      }
      it.lastScan = {
        at: scannedAt,
        found: found.length,
        grabbed,
      };
      results.push({
        key: `${it.kind}:${it.id}`,
        found: found.length,
        grabbed,
      });
    }
    await saveWanted(items);
    return { ok: true, scanned: items.length, results, scannedAt };
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

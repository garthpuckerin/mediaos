import type { FastifyPluginAsync } from 'fastify';
import { promises as fs } from 'fs';
import path from 'path';

const calendarPlugin: FastifyPluginAsync = async (app) => {
  app.get('/', async () => {
    const CONFIG_DIR = path.join(process.cwd(), 'config');
    const WANTED_FILE = path.join(CONFIG_DIR, 'wanted.json');
    try {
      const raw = await fs.readFile(WANTED_FILE, 'utf8');
      const json = JSON.parse(raw);
      const items: any[] = Array.isArray(json?.items) ? json.items : [];
      const now = Date.now();
      const events = items.slice(0, 10).map((it, idx) => {
        const target = new Date(now + (idx + 1) * 24 * 60 * 60 * 1000);
        return {
          date: target.toISOString(),
          day: target.toISOString().slice(0, 10),
          key: `${it.kind}:${it.id}`,
          title: it.title,
          kind: it.kind,
          itemId: it.id,
          daysUntil: idx + 1,
          lastScan: it.lastScan || null,
        };
      });
      return { events };
    } catch {
      return { events: [] };
    }
  });
};

export default calendarPlugin;

import type { FastifyPluginAsync } from 'fastify';
import { promises as fs } from 'fs';
import path from 'path';

const CONFIG_DIR = path.join(process.cwd(), 'config');
const VERIFY_SETTINGS = path.join(CONFIG_DIR, 'verify.json');

async function ensureDir(filePath: string) {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
  } catch (_e) {
    // ignore
  }
}

async function loadVerifySettings(): Promise<any> {
  try {
    const raw = await fs.readFile(VERIFY_SETTINGS, 'utf8');
    const json = JSON.parse(raw);
    return json || {};
  } catch (_e) {
    return {};
  }
}

const plugin: FastifyPluginAsync = async (app) => {
  app.get('/api/settings/verify', async () => {
    const settings = await loadVerifySettings();
    return { ok: true, settings };
  });

  app.post('/api/settings/verify', async (req) => {
    const b = (req.body || {}) as any;
    const settings = b && typeof b === 'object' ? b : {};
    await ensureDir(VERIFY_SETTINGS);
    await fs.writeFile(VERIFY_SETTINGS, JSON.stringify(settings, null, 2), 'utf8');
    return { ok: true, settings };
  });
};

export default plugin;


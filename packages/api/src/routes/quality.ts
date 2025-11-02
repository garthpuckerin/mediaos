import { promises as fs } from 'fs';
import path from 'path';

import type { FastifyPluginAsync } from 'fastify';

type QualityProfile = { allowed: string[]; cutoff: string };
type Profiles = { [kind: string]: QualityProfile };

const CONFIG_DIR = path.join(process.cwd(), 'config');
const QUALITY_FILE = path.join(CONFIG_DIR, 'quality.json');

async function ensureDir(filePath: string) {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
  } catch (_e) {
    // ignore
  }
}

async function loadProfiles(): Promise<Profiles> {
  try {
    const raw = await fs.readFile(QUALITY_FILE, 'utf8');
    const json = JSON.parse(raw);
    return json || {};
  } catch (_e) {
    return {};
  }
}

const plugin: FastifyPluginAsync = async (app) => {
  app.get('/api/settings/quality', async () => {
    const profiles = await loadProfiles();
    return { ok: true, profiles };
  });

  app.post('/api/settings/quality', async (req) => {
    const body = (req.body || {}) as any;
    const profiles: Profiles = body?.profiles || {};
    await ensureDir(QUALITY_FILE);
    await fs.writeFile(QUALITY_FILE, JSON.stringify(profiles, null, 2), 'utf8');
    return { ok: true, profiles };
  });
};

export default plugin;

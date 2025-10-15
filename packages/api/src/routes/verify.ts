import type { FastifyPluginAsync } from 'fastify';
import { promises as fs } from 'fs';
import path from 'path';
import { runVerify } from '../services/verify';

const CONFIG_DIR = path.join(process.cwd(), 'config');
const VERIFY_RESULTS = path.join(CONFIG_DIR, 'verify-results.json');
const VERIFY_SETTINGS = path.join(CONFIG_DIR, 'verify.json');

async function ensureDir(filePath: string) {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
  } catch (_e) {
    // ignore
  }
}

async function loadResults(): Promise<any> {
  try {
    const raw = await fs.readFile(VERIFY_RESULTS, 'utf8');
    const json = JSON.parse(raw);
    return json && typeof json === 'object' ? json : {};
  } catch (_e) {
    return {};
  }
}

async function saveResults(map: any) {
  await ensureDir(VERIFY_RESULTS);
  await fs.writeFile(VERIFY_RESULTS, JSON.stringify(map, null, 2), 'utf8');
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
  app.post('/api/verify/check', async (req) => {
    const b = (req.body || {}) as any;
    const phase = (String(b.phase || 'all') as any) || 'all';
    const kind = String(b.kind || '');
    const id = String(b.id || '');
    const title = String(b.title || '');
    if (!kind || !id) return { ok: false, error: 'missing_params' };

    const settings = await loadVerifySettings();
    const result = runVerify({ phase, kind, id, title, settings });

    // persist last result
    const map = await loadResults();
    const key = `${kind}:${id}`;
    map[key] = { ...result, kind, id, title };
    await saveResults(map);

    app.log.info({ kind, id, phase, issues: result.issues, topSeverity: result.topSeverity }, 'VERIFY_RESULT');
    return { ok: true, result };
  });

  app.get('/api/verify/last', async (req) => {
    const q = (req.query || {}) as any;
    const kind = String(q.kind || '');
    const id = String(q.id || '');
    if (!kind || !id) return { ok: false, error: 'missing_params' };
    const map = await loadResults();
    const key = `${kind}:${id}`;
    const result = map[key] || null;
    return { ok: true, result };
  });
};

export default plugin;

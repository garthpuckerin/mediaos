import type { FastifyPluginAsync } from 'fastify';
import { runVerify } from '../services/verify';
import { loadVerifyResults, saveLastVerifyResult, loadVerifySettings } from '../services/verifyStore';
import { probeMedia, probeMediaStub } from '@mediaos/workers';

// settings are loaded via services/verifyStore

const plugin: FastifyPluginAsync = async (app) => {
  app.post('/api/verify/check', async (req) => {
    const b = (req.body || {}) as any;
    const phase = (String(b.phase || 'all') as any) || 'all';
    const kind = String(b.kind || '');
    const id = String(b.id || '');
    const title = String(b.title || '');
    const filePath = typeof b.path === 'string' ? b.path : undefined;
    if (!kind || !id) return { ok: false, error: 'missing_params' };

    const settings = await loadVerifySettings();
    let result;
    if (filePath) {
      const md = await probeMedia({ kind, id, title, path: filePath });
      result = runVerify({ phase, kind, id, title, settings }, md as any);
    } else {
      const md = await probeMediaStub({ kind, id, title });
      result = runVerify({ phase, kind, id, title, settings }, md as any);
    }

    // persist last result
    const key = `${kind}:${id}`;
    await saveLastVerifyResult(key, { ...result, kind, id, title });

    app.log.info({ kind, id, phase, issues: result.issues, topSeverity: result.topSeverity }, 'VERIFY_RESULT');
    return { ok: true, result };
  });

  app.get('/api/verify/last', async (req) => {
    const q = (req.query || {}) as any;
    const kind = String(q.kind || '');
    const id = String(q.id || '');
    if (!kind || !id) return { ok: false, error: 'missing_params' };
    const map = await loadVerifyResults();
    const key = `${kind}:${id}`;
    const result = map[key] || null;
    return { ok: true, result };
  });
};

export default plugin;

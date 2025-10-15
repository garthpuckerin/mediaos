import type { FastifyPluginAsync } from 'fastify';

type VerifyPhase = 'downloader' | 'arr' | 'player' | 'all';
type Issue = { kind: string; severity: 'info' | 'warn' | 'error'; message?: string };

const plugin: FastifyPluginAsync = async (app) => {
  app.post('/api/verify/check', async (req) => {
    const b = (req.body || {}) as any;
    const phase = (String(b.phase || 'all') as VerifyPhase) || 'all';
    const kind = String(b.kind || '');
    const id = String(b.id || '');
    const title = String(b.title || '');
    if (!kind || !id) return { ok: false, error: 'missing_params' };

    const issues: Issue[] = [];
    // Placeholder heuristics — expand with real checks later
    if (title && title.toLowerCase().includes('sample')) {
      issues.push({ kind: 'wrong_content', severity: 'error', message: 'Title indicates sample content' });
    }
    const result = {
      phase,
      issues,
      analyzedAt: new Date().toISOString(),
    };
    app.log.info({ kind, id, phase, issues }, 'VERIFY_RESULT');
    return { ok: true, result };
  });
};

export default plugin;


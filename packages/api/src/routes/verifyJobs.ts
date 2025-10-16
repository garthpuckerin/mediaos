import type { FastifyPluginAsync } from 'fastify';
import { runVerify } from '../services/verify';
import { saveLastVerifyResult } from '../services/verifyStore';

type Job = {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  input: any;
  result?: any;
  error?: string;
  enqueuedAt: string;
  finishedAt?: string;
};

const jobs = new Map<string, Job>();

function genId() {
  return Math.random().toString(36).slice(2);
}

const plugin: FastifyPluginAsync = async (app) => {
  app.post('/api/verify/jobs', async (req) => {
    const b = (req.body || {}) as any;
    const kind = String(b.kind || '');
    const id = String(b.id || '');
    const title = String(b.title || '');
    const phase = (String(b.phase || 'all') as any) || 'all';
    if (!kind || !id) return { ok: false, error: 'missing_params' };

    const jobId = genId();
    const job: Job = {
      id: jobId,
      status: 'queued',
      input: { phase, kind, id, title },
      enqueuedAt: new Date().toISOString(),
    };
    jobs.set(jobId, job);

    setImmediate(async () => {
      const j = jobs.get(jobId);
      if (!j) return;
      j.status = 'running';
      try {
        const result = runVerify(j.input);
        j.result = result;
        j.status = 'completed';
        j.finishedAt = new Date().toISOString();
        const key = `${j.input.kind}:${j.input.id}`;
        await saveLastVerifyResult(key, { ...result, ...j.input });
      } catch (e) {
        j.status = 'failed';
        j.error = (e as Error).message;
        j.finishedAt = new Date().toISOString();
      }
      jobs.set(jobId, j);
    });

    return { ok: true, jobId };
  });

  app.get('/api/verify/jobs/:id', async (req) => {
    const params = (req.params || {}) as any;
    const jobId = String(params.id || '');
    const job = jobs.get(jobId) || null;
    if (!job) return { ok: false, error: 'not_found' };
    return { ok: true, job };
  });
};

export default plugin;

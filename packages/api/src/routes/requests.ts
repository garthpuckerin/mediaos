import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { authenticate, requireAdmin } from '../middleware/auth';

type ReqItem = {
  id: string;
  title: string;
  kind: 'movie' | 'series';
  status: 'pending' | 'approved' | 'denied';
};

const queue: ReqItem[] = [];

const plugin: FastifyPluginAsync = async (app) => {
  app.get(
    '/',
    { preHandler: authenticate },
    async () => ({ requests: queue })
  );

  app.post(
    '/',
    { preHandler: authenticate },
    async (req) => {
    const schema = z.object({
      title: z.string(),
      kind: z.enum(['movie', 'series']),
    });
    const data = schema.parse(req.body);
    const item: ReqItem = {
      id: Date.now().toString(),
      status: 'pending',
      ...data,
    };
      queue.push(item);
      return { ok: true, request: item };
    }
  );

  app.post(
    '/:id/approve',
    { preHandler: requireAdmin },
    async (req) => {
    const id = (req.params as any).id;
    const item = queue.find((r) => r.id === id);
    if (!item) return { ok: false };
      item.status = 'approved';
      // TODO: enqueue acquisition job
      return { ok: true, request: item };
    }
  );
};

export default plugin;

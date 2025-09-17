import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

// Minimal in-memory demo; replace with DB layer.
const library: any[] = [];

const plugin: FastifyPluginAsync = async (app) => {
  app.get('/', async () => ({ items: library }));

  app.post('/', async (req, res) => {
    const schema = z.object({ kind: z.enum(['movie','series','music','book']), title: z.string() });
    const data = schema.parse(req.body);
    const item = { id: Date.now().toString(), ...data };
    library.push(item);
    return { ok: true, item };
  });

  // artwork lock/revert hooks will call into /artwork routes
};

export default plugin;

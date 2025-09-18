import type { FastifyPluginAsync } from 'fastify';
const plugin: FastifyPluginAsync = async (app) => {
  app.get('/', async () => ({ ok: true }));
  app.post('/', async () => ({ ok: true }));
};
export default plugin;

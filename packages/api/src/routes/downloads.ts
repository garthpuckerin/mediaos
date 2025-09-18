import type { FastifyPluginAsync } from 'fastify';
const plugin: FastifyPluginAsync = async (app) => {
  app.get('/', async () => ({ items: [] })); // TODO: real queue
};
export default plugin;

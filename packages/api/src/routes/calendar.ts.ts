import { FastifyPluginAsync } from 'fastify';
const plugin: FastifyPluginAsync = async (app) => {
  app.get('/', async () => ({ events: [] })); // TODO: air-dates + jobs
};
export default plugin;

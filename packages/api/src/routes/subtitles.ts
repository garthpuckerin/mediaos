import type { FastifyPluginAsync } from 'fastify';
const plugin: FastifyPluginAsync = async (app) => {
  app.get('/providers', async () => ({
    providers: ['OpenSubtitles', 'Subscene', 'Assrt'],
  }));
  app.post('/fetch', async () => ({
    ok: true,
    message: 'TODO: download subs via adapter',
  }));
};
export default plugin;

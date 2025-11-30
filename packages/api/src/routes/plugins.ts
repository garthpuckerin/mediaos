import { FastifyInstance } from 'fastify';
import { pluginService } from '../services/PluginService';

export async function pluginsRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    const plugins = await pluginService.getPlugins();
    return { success: true, plugins };
  });

  fastify.post('/:id/toggle', async (request, reply) => {
    const { id } = request.params as { id: string };
    const plugin = await pluginService.togglePlugin(id);

    if (!plugin) {
      return reply
        .code(404)
        .send({ success: false, message: 'Plugin not found' });
    }

    return { success: true, plugin };
  });
}

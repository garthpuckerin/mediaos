import type { FastifyPluginAsync } from 'fastify';

const plugin: FastifyPluginAsync = async (app) => {
  app.post('/api/downloads/grab', async (req) => {
    const body = (req.body || {}) as any;
    const kind = String(body.kind || '');
    const id = String(body.id || '');
    const title = String(body.title || '');
    const link = String(body.link || '');
    const protocol =
      (String(body.protocol || '').toLowerCase() as 'torrent' | 'usenet') ||
      'torrent';
    if (!title || !link) return { ok: false, error: 'missing_params' };
    // TODO: dispatch to client adapters (qBittorrent/SABnzbd/NZBGet)
    app.log.info({ kind, id, title, link, protocol }, 'GRAB_REQUEST');
    return { ok: true, queued: true };
  });
};

export default plugin;

import type { FastifyPluginAsync } from 'fastify';
import { qbittorrent } from '@mediaos/adapters/src/downloaders';

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
    // Dispatch minimal support: Torrent magnet via qBittorrent stub
    try {
      if (protocol === 'torrent' && link.startsWith('magnet:')) {
        const res = await qbittorrent.addMagnet(link);
        app.log.info({ kind, id, title, link, protocol, res }, 'GRAB_TORRENT');
        return { ok: !!res.ok, queued: !!res.ok };
      }
      // Future: support NZB via SABnzbd/NZBGet and .torrent URLs
      app.log.warn({ kind, id, title, link, protocol }, 'GRAB_UNSUPPORTED');
      return { ok: false, error: 'unsupported_link_or_protocol' };
    } catch (e) {
      app.log.error({ err: e, link, protocol }, 'GRAB_FAILED');
      return { ok: false, error: (e as Error).message };
    }
  });
};

export default plugin;

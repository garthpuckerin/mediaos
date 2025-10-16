import type { FastifyPluginAsync } from 'fastify';
import { qbittorrent, sabnzbd, nzbget } from '@mediaos/adapters/src/downloaders';
import { promises as fs } from 'fs';
import path from 'path';
import { saveGrab } from '../services/grabStore';

const plugin: FastifyPluginAsync = async (app) => {
  app.get('/api/downloads/last', async (req) => {
    const q = (req.query || {}) as any;
    const kind = String(q.kind || '');
    const id = String(q.id || '');
    if (!kind || !id) return { ok: false, error: 'missing_params' };
    const { loadGrabs } = await import('../services/grabStore');
    const map = await loadGrabs();
    return { ok: true, last: map[`${kind}:${id}`] || null };
  });
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
        // Load downloader settings (qBittorrent)
        const CONFIG_DIR = path.join(process.cwd(), 'config');
        const DL_FILE = path.join(CONFIG_DIR, 'downloaders.json');
        let cfg: any = {};
        try {
          const raw = await fs.readFile(DL_FILE, 'utf8');
          cfg = JSON.parse(raw) || {};
        } catch (_e) {
          cfg = {};
        }
        const qbc = cfg.qbittorrent || {};
        if (!qbc.enabled || !qbc.baseUrl) {
          app.log.warn({ reason: 'qbittorrent_not_configured' }, 'GRAB_UNSUPPORTED');
          return { ok: false, error: 'qbittorrent_not_configured' };
        }
        const res = await qbittorrent.addMagnet(link, undefined, {
          baseUrl: String(qbc.baseUrl),
          username: qbc.username || undefined,
          password: qbc.password || undefined,
          timeoutMs: typeof qbc.timeoutMs === 'number' ? qbc.timeoutMs : undefined,
        });
        const ok = !!res.ok;
        const saved = {
          kind,
          id,
          title,
          link,
          protocol,
          client: 'qbittorrent',
          ok,
          status: res.status,
          at: new Date().toISOString(),
        };
        await saveGrab(`${kind}:${id}`, saved);
        app.log.info({ kind, id, title, link, protocol, res }, 'GRAB_TORRENT');
        return { ok, queued: ok };
      }
      if (protocol === 'usenet' && /^https?:\/\//i.test(link)) {
        // Try SABnzbd first
        const CONFIG_DIR = path.join(process.cwd(), 'config');
        const DL_FILE = path.join(CONFIG_DIR, 'downloaders.json');
        let cfg: any = {};
        try {
          const raw = await fs.readFile(DL_FILE, 'utf8');
          cfg = JSON.parse(raw) || {};
        } catch (_e) {
          cfg = {};
        }
        const sab = cfg.sabnzbd || {};
        if (sab.enabled && sab.baseUrl && sab.apiKey) {
          const res = await sabnzbd.addUrl(link, {
            baseUrl: String(sab.baseUrl),
            apiKey: String(sab.apiKey),
            timeoutMs: typeof sab.timeoutMs === 'number' ? sab.timeoutMs : undefined,
          });
          const ok = !!res.ok;
          await saveGrab(`${kind}:${id}`, {
            kind,
            id,
            title,
            link,
            protocol,
            client: 'sabnzbd',
            ok,
            status: res.status,
            at: new Date().toISOString(),
          });
          app.log.info({ kind, id, title, link, protocol, res }, 'GRAB_SABNZBD');
          return { ok, queued: ok };
        }
        const nzb = cfg.nzbget || {};
        if (nzb.enabled && nzb.baseUrl) {
          const res = await nzbget.addUrl(link, {
            baseUrl: String(nzb.baseUrl),
            username: nzb.username || undefined,
            password: nzb.password || undefined,
            timeoutMs: typeof nzb.timeoutMs === 'number' ? nzb.timeoutMs : undefined,
          });
          const ok = !!res.ok;
          await saveGrab(`${kind}:${id}`, {
            kind,
            id,
            title,
            link,
            protocol,
            client: 'nzbget',
            ok,
            status: res.status,
            at: new Date().toISOString(),
          });
          app.log.info({ kind, id, title, link, protocol, res }, 'GRAB_NZBGET');
          return { ok, queued: ok };
        }
        app.log.warn({ reason: 'usenet_not_configured' }, 'GRAB_UNSUPPORTED');
        return { ok: false, error: 'usenet_not_configured' };
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

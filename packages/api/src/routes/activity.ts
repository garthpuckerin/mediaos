import { qbittorrent, sabnzbd } from '@mediaos/adapters/src/downloaders';
import type { FastifyPluginAsync } from 'fastify';

import { authenticate } from '../middleware/auth';
import { loadGrabs } from '../services/grabStore';
import { loadDownloadersWithCredentials } from './settings';

const plugin: FastifyPluginAsync = async (app) => {
  app.get(
    '/api/activity/queue',
    { preHandler: authenticate },
    async () => {
      const map = await loadGrabs();
      const items = Object.values(map || {})
        .filter((it: any) => !!it && typeof it === 'object')
        .filter(
          (it: any) =>
            it &&
            (it.ok === true || String(it.status || '').toLowerCase() === 'queued')
        )
        .map((it: any) => ({
          kind: it.kind,
          id: it.id,
          title: it.title,
          client: it.client,
          protocol: it.protocol,
          ok: !!it.ok,
          status: it.status,
          at: it.at,
        }));
      return { ok: true, items };
    }
  );

  app.get(
    '/api/activity/history',
    { preHandler: authenticate },
    async () => {
      const map = await loadGrabs();
      const snap = Object.values(map || {})
        .filter((it: any) => !!it && typeof it === 'object')
        .map((it: any) => ({
          kind: it.kind,
          id: it.id,
          title: it.title,
          client: it.client,
          protocol: it.protocol,
          ok: !!it.ok,
          status: it.status,
          at: it.at,
        }));
      const items: any[] = [];
      // SAB history
      try {
        const cfg = await loadDownloadersWithCredentials();
        if (cfg.sabnzbd?.enabled && cfg.sabnzbd?.baseUrl && cfg.sabnzbd?.apiKey) {
          const r = await sabnzbd.history({
            baseUrl: String(cfg.sabnzbd.baseUrl),
            apiKey: String(cfg.sabnzbd.apiKey),
            timeoutMs:
              typeof cfg.sabnzbd.timeoutMs === 'number'
                ? cfg.sabnzbd.timeoutMs
                : undefined,
          });
          if (r.ok) {
            for (const h of r.items.slice(0, 50)) {
              items.push({
                client: 'sabnzbd',
                protocol: 'usenet',
                title: h.name,
                status: h.status,
                at: h.completed,
                category: h.category,
              });
            }
          }
        }
      } catch {
        // ignore history errors
      }
      // merge snapshots (fallback entries)
      for (const s of snap) items.push(s);
      items.sort((a: any, b: any) =>
        String(b.at || '').localeCompare(String(a.at || ''))
      );
      return { ok: true, items };
    }
  );

  app.get(
    '/api/activity/live',
    { preHandler: authenticate },
    async () => {
      const cfg = await loadDownloadersWithCredentials();
      const out: any[] = [];
      // qBittorrent
      if (cfg.qbittorrent?.enabled && cfg.qbittorrent?.baseUrl) {
        const r = await qbittorrent.list({
          baseUrl: String(cfg.qbittorrent.baseUrl),
          username: cfg.qbittorrent.username || undefined,
          password: cfg.qbittorrent.password || undefined,
          timeoutMs:
            typeof cfg.qbittorrent.timeoutMs === 'number'
              ? cfg.qbittorrent.timeoutMs
              : undefined,
        });
        if (r.ok) {
          for (const t of r.items) {
            out.push({
              client: 'qbittorrent',
              protocol: 'torrent',
              clientId: t.id,
              title: t.name,
              progress: t.progress,
              status: t.state,
              speedBps: t.dlspeed,
              etaSec: t.eta,
              category: t.category,
              clientUrl: String(cfg.qbittorrent.baseUrl || ''),
            });
          }
        }
      }
      // SABnzbd
      if (cfg.sabnzbd?.enabled && cfg.sabnzbd?.baseUrl && cfg.sabnzbd?.apiKey) {
        const r = await sabnzbd.queue({
          baseUrl: String(cfg.sabnzbd.baseUrl),
          apiKey: String(cfg.sabnzbd.apiKey),
          timeoutMs:
            typeof cfg.sabnzbd.timeoutMs === 'number'
              ? cfg.sabnzbd.timeoutMs
              : undefined,
          category: cfg.sabnzbd.category || undefined,
        });
        if (r.ok) {
          for (const s of r.items) {
            const total = typeof s.mb === 'number' ? s.mb : undefined;
            const left = typeof s.mbleft === 'number' ? s.mbleft : undefined;
            const progress =
              total && left !== undefined && total > 0
                ? Math.max(0, Math.min(1, (total - left) / total))
                : undefined;
            out.push({
              client: 'sabnzbd',
              protocol: 'usenet',
              clientId: s.id,
              title: s.name,
              progress,
              status: s.status,
              eta: s.timeleft,
              category: s.category,
              clientUrl: String(cfg.sabnzbd.baseUrl || ''),
            });
          }
        }
      }
      // NZBGet (list only)
      // We could call listgroups here for parity in a follow-up.
      return { ok: true, items: out };
    }
  );

  app.post(
    '/api/activity/action',
    { preHandler: authenticate },
    async (req) => {
      const b = (req.body || {}) as any;
      const client = String(b.client || '').toLowerCase();
      const op = String(b.op || '').toLowerCase() as
        | 'pause'
        | 'resume'
        | 'delete';
      const id = String(b.id || '');
      if (!client || !op || !id) return { ok: false, error: 'missing_params' };
      const cfg = await loadDownloadersWithCredentials();
      try {
        if (client === 'qbittorrent') {
          const c = cfg.qbittorrent || {};
          const r = await qbittorrent.action(op, id, {
            baseUrl: String(c.baseUrl || ''),
            username: c.username || undefined,
            password: c.password || undefined,
            timeoutMs: typeof c.timeoutMs === 'number' ? c.timeoutMs : undefined,
          });
          return r.ok
            ? { ok: true }
            : { ok: false, error: r.error || 'action_failed', status: r.status };
        }
        if (client === 'sabnzbd') {
          const c = cfg.sabnzbd || {};
          const r = await sabnzbd.action(op, id, {
            baseUrl: String(c.baseUrl || ''),
            apiKey: String(c.apiKey || ''),
            timeoutMs: typeof c.timeoutMs === 'number' ? c.timeoutMs : undefined,
            category: c.category || undefined,
          });
          return r.ok
            ? { ok: true }
            : { ok: false, error: r.error || 'action_failed', status: r.status };
        }
        return { ok: false, error: 'unsupported_client' };
      } catch (e) {
        return { ok: false, error: (e as Error).message };
      }
    }
  );
};

export default plugin;

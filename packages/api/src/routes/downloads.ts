import { promises as fs } from 'fs';
import path from 'path';

import type { MultipartFile } from '@fastify/multipart';
import {
  qbittorrent,
  sabnzbd,
  nzbget,
} from '@mediaos/adapters/src/downloaders';
import type { FastifyPluginAsync } from 'fastify';

import { authenticate } from '../middleware/auth';
import { rateLimits } from '../middleware/rateLimits';
import { loadGrabs, saveGrab } from '../services/grabStore';

const CONFIG_DIR = path.join(process.cwd(), 'config');
const DL_FILE = path.join(CONFIG_DIR, 'downloaders.json');

async function loadDownloaderConfig(): Promise<any> {
  try {
    const raw = await fs.readFile(DL_FILE, 'utf8');
    return JSON.parse(raw) || {};
  } catch (_e) {
    return {};
  }
}

function unwrapField(value: any): any {
  if (value && typeof value === 'object') {
    if (Object.prototype.hasOwnProperty.call(value, 'value'))
      return value.value;
  }
  return value;
}

async function extractNzbUpload(body: any): Promise<{
  filename?: string;
  mimetype?: string;
  base64: string;
  size: number;
} | null> {
  const candidate: MultipartFile | undefined =
    (body?.nzbUpload as MultipartFile | undefined) ||
    (body?.nzb as MultipartFile | undefined) ||
    (body?.nzbFile as MultipartFile | undefined);
  if (!candidate || typeof (candidate as any).toBuffer !== 'function')
    return null;
  const buffer = await candidate.toBuffer();
  if (!buffer || buffer.length === 0) return null;
  return {
    filename: candidate.filename,
    mimetype: candidate.mimetype,
    base64: buffer.toString('base64'),
    size: buffer.length,
  };
}

const plugin: FastifyPluginAsync = async (app) => {
  app.get(
    '/api/downloads/last',
    { preHandler: authenticate },
    async (req) => {
      const q = (req.query || {}) as any;
      const kind = String(q.kind || '');
      const id = String(q.id || '');
      if (!kind || !id) return { ok: false, error: 'missing_params' };
      const map = await loadGrabs();
      return { ok: true, last: map[`${kind}:${id}`] || null };
    }
  );
  app.post(
    '/api/downloads/grab',
    {
      preHandler: authenticate,
      config: {
        rateLimit: rateLimits.downloads,
      },
    },
    async (req) => {
    const rawBody = (req.body || {}) as any;
    const kind = String(unwrapField(rawBody.kind) || '');
    const id = String(unwrapField(rawBody.id) || '');
    const title = String(unwrapField(rawBody.title) || '');
    const link = String(unwrapField(rawBody.link) || '');
    const protocolRaw = String(
      unwrapField(rawBody.protocol) || ''
    ).toLowerCase();
    const protocol = (
      protocolRaw === 'usenet'
        ? 'usenet'
        : protocolRaw === 'torrent'
          ? 'torrent'
          : link.startsWith('magnet:')
            ? 'torrent'
            : 'usenet'
    ) as 'torrent' | 'usenet';

    const nzbUpload = await extractNzbUpload(rawBody);

    if (!title) return { ok: false, error: 'missing_params' };
    if (!link && !nzbUpload) return { ok: false, error: 'missing_link' };

    const cfg = await loadDownloaderConfig();
    // Dispatch minimal support: Torrent magnet via qBittorrent stub
    try {
      if (protocol === 'torrent' && link.startsWith('magnet:')) {
        const qbc = cfg.qbittorrent || {};
        if (!qbc.enabled || !qbc.baseUrl) {
          app.log.warn(
            { reason: 'qbittorrent_not_configured' },
            'GRAB_UNSUPPORTED'
          );
          return { ok: false, error: 'qbittorrent_not_configured' };
        }
        const res = await qbittorrent.addMagnet(link, undefined, {
          baseUrl: String(qbc.baseUrl),
          username: qbc.username || undefined,
          password: qbc.password || undefined,
          timeoutMs:
            typeof qbc.timeoutMs === 'number' ? qbc.timeoutMs : undefined,
          category: qbc.category || undefined,
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
      if (protocol === 'usenet') {
        const sab = cfg.sabnzbd || {};
        if (
          sab.enabled &&
          sab.baseUrl &&
          sab.apiKey &&
          link &&
          /^https?:\/\//i.test(link)
        ) {
          const res = await sabnzbd.addUrl(link, {
            baseUrl: String(sab.baseUrl),
            apiKey: String(sab.apiKey),
            timeoutMs:
              typeof sab.timeoutMs === 'number' ? sab.timeoutMs : undefined,
            category: sab.category || undefined,
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
            category: sab.category || undefined,
          });
          app.log.info(
            { kind, id, title, link, protocol, res },
            'GRAB_SABNZBD'
          );
          return { ok, queued: ok };
        }
        if (sab.enabled && sab.baseUrl && sab.apiKey && nzbUpload) {
          const res = await sabnzbd.addFile(
            {
              base64: String(nzbUpload.base64 || ''),
              ...(nzbUpload.filename && { filename: nzbUpload.filename }),
              ...(nzbUpload.mimetype && { mimetype: nzbUpload.mimetype }),
            },
            {
              baseUrl: String(sab.baseUrl),
              apiKey: String(sab.apiKey),
              timeoutMs:
                typeof sab.timeoutMs === 'number' ? sab.timeoutMs : undefined,
              category: sab.category || undefined,
            }
          );
          const ok = !!res.ok;
          await saveGrab(`${kind}:${id}`, {
            kind,
            id,
            title,
            link: link || null,
            protocol,
            client: 'sabnzbd',
            ok,
            status: res.status ?? 'uploaded',
            at: new Date().toISOString(),
            category: sab.category || undefined,
          });
          app.log.info({ kind, id, title, protocol, res }, 'GRAB_SABNZBD_FILE');
          return { ok, queued: ok };
        }
        const nzb = cfg.nzbget || {};
        if (nzb.enabled && nzb.baseUrl) {
          const res = await nzbget.addUrl(link, {
            baseUrl: String(nzb.baseUrl),
            username: nzb.username || undefined,
            password: nzb.password || undefined,
            timeoutMs:
              typeof nzb.timeoutMs === 'number' ? nzb.timeoutMs : undefined,
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
        if (nzbUpload) {
          await saveGrab(`${kind}:${id}`, {
            kind,
            id,
            title,
            link: link || null,
            protocol,
            client: sab.enabled ? 'sabnzbd' : nzb.enabled ? 'nzbget' : 'usenet',
            ok: false,
            status: 'stored',
            at: new Date().toISOString(),
            nzbUpload,
            category: sab?.category || undefined,
          });
          app.log.info(
            { kind, id, title, protocol, nzbUpload: { size: nzbUpload.size } },
            'GRAB_NZB_STORED'
          );
          return { ok: true, queued: false, stored: true };
        }
        app.log.warn(
          { reason: 'usenet_not_configured', hasUpload: !!nzbUpload },
          'GRAB_UNSUPPORTED'
        );
        return { ok: false, error: 'usenet_not_configured' };
      }
      // Future: support NZB via SABnzbd/NZBGet and .torrent URLs
      app.log.warn({ kind, id, title, link, protocol }, 'GRAB_UNSUPPORTED');
      return { ok: false, error: 'unsupported_link_or_protocol' };
    } catch (e) {
      app.log.error({ err: e, link, protocol }, 'GRAB_FAILED');
      return { ok: false, error: (e as Error).message };
    }
    }
  );
};

export default plugin;

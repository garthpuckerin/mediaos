import type { FastifyPluginAsync } from 'fastify';
import { promises as fs } from 'fs';
import path from 'path';

type DlCommon = { enabled: boolean; baseUrl?: string; timeoutMs?: number };
type QB = DlCommon & {
  username?: string;
  password?: string;
  hasPassword?: boolean;
};
type NZB = DlCommon & {
  username?: string;
  password?: string;
  hasPassword?: boolean;
};
type SAB = DlCommon & { apiKey?: string };

type Downloaders = {
  qbittorrent: QB;
  nzbget: NZB;
  sabnzbd: SAB;
};

const CONFIG_DIR = path.join(process.cwd(), 'config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'downloaders.json');

async function ensureDir(filePath: string) {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
  } catch (_e) {
    // ignore
  }
}

function isFiniteNumber(v: any): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

function normalize(obj: any): Downloaders {
  const qb: QB = {
    enabled: !!obj?.qbittorrent?.enabled,
    hasPassword: !!obj?.qbittorrent?.password,
  } as QB;
  if (obj?.qbittorrent?.baseUrl) qb.baseUrl = String(obj.qbittorrent.baseUrl);
  if (obj?.qbittorrent?.username)
    qb.username = String(obj.qbittorrent.username);
  const qbTimeout = isFiniteNumber(obj?.qbittorrent?.timeoutMs);
  if (typeof qbTimeout === 'number') qb.timeoutMs = qbTimeout;

  const nz: NZB = {
    enabled: !!obj?.nzbget?.enabled,
    hasPassword: !!obj?.nzbget?.password,
  } as NZB;
  if (obj?.nzbget?.baseUrl) nz.baseUrl = String(obj.nzbget.baseUrl);
  if (obj?.nzbget?.username) nz.username = String(obj.nzbget.username);
  const nzTimeout = isFiniteNumber(obj?.nzbget?.timeoutMs);
  if (typeof nzTimeout === 'number') nz.timeoutMs = nzTimeout;

  const sab: SAB = { enabled: !!obj?.sabnzbd?.enabled } as SAB;
  if (obj?.sabnzbd?.baseUrl) sab.baseUrl = String(obj.sabnzbd.baseUrl);
  if (obj?.sabnzbd?.apiKey) (sab as any).hasApiKey = true;
  const sabTimeout = isFiniteNumber(obj?.sabnzbd?.timeoutMs);
  if (typeof sabTimeout === 'number') sab.timeoutMs = sabTimeout;

  return {
    qbittorrent: qb,
    nzbget: nz,
    sabnzbd: sab,
  };
}

async function loadDownloaders(): Promise<Downloaders> {
  try {
    const raw = await fs.readFile(CONFIG_FILE, 'utf8');
    const json = JSON.parse(raw);
    return normalize(json);
  } catch (_e) {
    return normalize({});
  }
}

async function saveDownloaders(payload: Downloaders, existing?: any) {
  const toSave = {
    qbittorrent: {
      enabled: !!payload.qbittorrent.enabled,
      ...(payload.qbittorrent.baseUrl
        ? { baseUrl: payload.qbittorrent.baseUrl }
        : {}),
      ...(payload.qbittorrent.username
        ? { username: payload.qbittorrent.username }
        : {}),
      password:
        payload.qbittorrent.password && payload.qbittorrent.password.length > 0
          ? payload.qbittorrent.password
          : existing?.qbittorrent?.password || undefined,
      ...(typeof isFiniteNumber(payload.qbittorrent.timeoutMs) === 'number'
        ? { timeoutMs: isFiniteNumber(payload.qbittorrent.timeoutMs) }
        : {}),
    },
    nzbget: {
      enabled: !!payload.nzbget.enabled,
      ...(payload.nzbget.baseUrl ? { baseUrl: payload.nzbget.baseUrl } : {}),
      ...(payload.nzbget.username ? { username: payload.nzbget.username } : {}),
      password:
        payload.nzbget.password && payload.nzbget.password.length > 0
          ? payload.nzbget.password
          : existing?.nzbget?.password || undefined,
      ...(typeof isFiniteNumber(payload.nzbget.timeoutMs) === 'number'
        ? { timeoutMs: isFiniteNumber(payload.nzbget.timeoutMs) }
        : {}),
    },
    sabnzbd: {
      enabled: !!payload.sabnzbd.enabled,
      ...(payload.sabnzbd.baseUrl ? { baseUrl: payload.sabnzbd.baseUrl } : {}),
      ...(payload.sabnzbd.apiKey ? { apiKey: payload.sabnzbd.apiKey } : {}),
      ...(typeof isFiniteNumber(payload.sabnzbd.timeoutMs) === 'number'
        ? { timeoutMs: isFiniteNumber(payload.sabnzbd.timeoutMs) }
        : {}),
    },
  } as any;
  await ensureDir(CONFIG_FILE);
  await fs.writeFile(CONFIG_FILE, JSON.stringify(toSave, null, 2), 'utf8');
  return normalize(toSave);
}

const plugin: FastifyPluginAsync = async (app) => {
  app.get('/api/settings/downloaders', async () => {
    return await loadDownloaders();
  });

  app.post('/api/settings/downloaders', async (req) => {
    const body = (req.body || {}) as any;
    const qbIn: QB = { enabled: !!body?.qbittorrent?.enabled } as QB;
    if (body?.qbittorrent?.baseUrl)
      qbIn.baseUrl = String(body.qbittorrent.baseUrl);
    if (body?.qbittorrent?.username)
      qbIn.username = String(body.qbittorrent.username);
    if (body?.qbittorrent?.password)
      qbIn.password = String(body.qbittorrent.password);
    const qbInTimeout = isFiniteNumber(body?.qbittorrent?.timeoutMs);
    if (typeof qbInTimeout === 'number') qbIn.timeoutMs = qbInTimeout;

    const nzIn: NZB = { enabled: !!body?.nzbget?.enabled } as NZB;
    if (body?.nzbget?.baseUrl) nzIn.baseUrl = String(body.nzbget.baseUrl);
    if (body?.nzbget?.username) nzIn.username = String(body.nzbget.username);
    if (body?.nzbget?.password) nzIn.password = String(body.nzbget.password);
    const nzInTimeout = isFiniteNumber(body?.nzbget?.timeoutMs);
    if (typeof nzInTimeout === 'number') nzIn.timeoutMs = nzInTimeout;

    const sabIn: SAB = { enabled: !!body?.sabnzbd?.enabled } as SAB;
    if (body?.sabnzbd?.baseUrl) sabIn.baseUrl = String(body.sabnzbd.baseUrl);
    if (body?.sabnzbd?.apiKey) sabIn.apiKey = String(body.sabnzbd.apiKey);
    const sabInTimeout = isFiniteNumber(body?.sabnzbd?.timeoutMs);
    if (typeof sabInTimeout === 'number') sabIn.timeoutMs = sabInTimeout;

    const incoming: Downloaders = {
      qbittorrent: qbIn,
      nzbget: nzIn,
      sabnzbd: sabIn,
    };
    let existing: any = {};
    try {
      const raw = await fs.readFile(CONFIG_FILE, 'utf8');
      existing = JSON.parse(raw);
    } catch (_e) {
      // ignore
    }
    const saved = await saveDownloaders(incoming, existing);
    return { ok: true, downloaders: saved };
  });

  app.post('/api/settings/downloaders/test', async (req) => {
    const body = (req.body || {}) as any;
    const client = String(body.client || '').toLowerCase();
    const incoming = body.settings || {};
    const saved = await loadDownloaders();
    const cfg: any =
      client === 'qbittorrent'
        ? { ...saved.qbittorrent, ...incoming }
        : client === 'nzbget'
          ? { ...saved.nzbget, ...incoming }
          : client === 'sabnzbd'
            ? { ...saved.sabnzbd, ...incoming }
            : null;
    if (!cfg) return { ok: false, error: 'invalid_client' };
    const baseUrl: string | undefined = cfg.baseUrl || undefined;
    if (!baseUrl) return { ok: false, error: 'missing_baseUrl' };

    const timeoutFetch = async (input: any, init?: any) => {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 4000);
      try {
        const res = await fetch(input, {
          ...(init || {}),
          signal: controller.signal,
        });
        return res;
      } finally {
        clearTimeout(t);
      }
    };

    try {
      if (client === 'qbittorrent') {
        if (cfg.username && (cfg.password || cfg.hasPassword)) {
          const loginUrl = new URL('/api/v2/auth/login', baseUrl).toString();
          const form = new URLSearchParams({
            username: cfg.username || '',
            password: cfg.password || '',
          }).toString();
          const res = await timeoutFetch(loginUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: form,
          });
          const text = await res.text();
          if (res.ok && text.toLowerCase().includes('ok'))
            return { ok: true, status: res.status };
          return { ok: false, error: `login_failed: ${text || res.status}` };
        }
        const verUrl = new URL('/api/v2/app/version', baseUrl).toString();
        const res = await timeoutFetch(verUrl);
        return { ok: res.ok, status: res.status };
      }

      if (client === 'sabnzbd') {
        const apiKey = cfg.apiKey || '';
        if (!apiKey) return { ok: false, error: 'missing_apiKey' };
        const url = new URL('/api', baseUrl);
        url.searchParams.set('mode', 'queue');
        url.searchParams.set('output', 'json');
        url.searchParams.set('apikey', apiKey);
        const res = await timeoutFetch(url.toString());
        return { ok: res.ok, status: res.status };
      }

      if (client === 'nzbget') {
        const jrpc = new URL('/jsonrpc', baseUrl).toString();
        const auth =
          cfg.username && (cfg.password || cfg.hasPassword)
            ? 'Basic ' +
              Buffer.from(`${cfg.username}:${cfg.password || ''}`).toString(
                'base64'
              )
            : undefined;
        const res = await timeoutFetch(jrpc, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(auth ? { Authorization: auth } : {}),
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'version',
            params: [],
            id: 1,
          }),
        });
        return { ok: res.ok, status: res.status };
      }

      const res = await timeoutFetch(baseUrl);
      return { ok: res.ok, status: res.status };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  });
};

export default plugin;

import { promises as fs } from 'fs';
import path from 'path';

import type { FastifyPluginAsync } from 'fastify';

type DlCommon = { enabled: boolean; baseUrl?: string; timeoutMs?: number };
type QB = DlCommon & {
  username?: string;
  password?: string;
  hasPassword?: boolean;
  category?: string;
};
type NZB = DlCommon & {
  username?: string;
  password?: string;
  hasPassword?: boolean;
};
type SAB = DlCommon & {
  apiKey?: string;
  hasApiKey?: boolean;
  category?: string;
};

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
    baseUrl: obj?.qbittorrent?.baseUrl || undefined,
    username: obj?.qbittorrent?.username || undefined,
    hasPassword: !!obj?.qbittorrent?.password,
    category: obj?.qbittorrent?.category || undefined,
  };
  const qbT = isFiniteNumber(obj?.qbittorrent?.timeoutMs);
  if (typeof qbT === 'number') qb.timeoutMs = qbT;

  const nz: NZB = {
    enabled: !!obj?.nzbget?.enabled,
    baseUrl: obj?.nzbget?.baseUrl || undefined,
    username: obj?.nzbget?.username || undefined,
    hasPassword: !!obj?.nzbget?.password,
  };
  const nzT = isFiniteNumber(obj?.nzbget?.timeoutMs);
  if (typeof nzT === 'number') nz.timeoutMs = nzT;

  const sab: SAB = {
    enabled: !!obj?.sabnzbd?.enabled,
    baseUrl: obj?.sabnzbd?.baseUrl || undefined,
    apiKey: obj?.sabnzbd?.apiKey || undefined,
    hasApiKey: !!obj?.sabnzbd?.apiKey,
    category: obj?.sabnzbd?.category || undefined,
  };
  const sabT = isFiniteNumber(obj?.sabnzbd?.timeoutMs);
  if (typeof sabT === 'number') sab.timeoutMs = sabT;

  return { qbittorrent: qb, nzbget: nz, sabnzbd: sab };
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
      baseUrl: payload.qbittorrent.baseUrl || undefined,
      username: payload.qbittorrent.username || undefined,
      // only persist password if provided
      password:
        payload.qbittorrent.password && payload.qbittorrent.password.length > 0
          ? payload.qbittorrent.password
          : existing?.qbittorrent?.password || undefined,
      timeoutMs: isFiniteNumber(payload.qbittorrent.timeoutMs),
      category: payload.qbittorrent.category || undefined,
    },
    nzbget: {
      enabled: !!payload.nzbget.enabled,
      baseUrl: payload.nzbget.baseUrl || undefined,
      username: payload.nzbget.username || undefined,
      password:
        payload.nzbget.password && payload.nzbget.password.length > 0
          ? payload.nzbget.password
          : existing?.nzbget?.password || undefined,
      timeoutMs: isFiniteNumber(payload.nzbget.timeoutMs),
    },
    sabnzbd: {
      enabled: !!payload.sabnzbd.enabled,
      baseUrl: payload.sabnzbd.baseUrl || undefined,
      apiKey: payload.sabnzbd.apiKey || undefined,
      timeoutMs: isFiniteNumber(payload.sabnzbd.timeoutMs),
      category: payload.sabnzbd.category || undefined,
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
    const qbIn: QB = {
      enabled: !!body?.qbittorrent?.enabled,
      baseUrl: body?.qbittorrent?.baseUrl || undefined,
      username: body?.qbittorrent?.username || undefined,
      password: body?.qbittorrent?.password || undefined,
      category: body?.qbittorrent?.category || undefined,
    };
    const qbInT = isFiniteNumber(body?.qbittorrent?.timeoutMs);
    if (typeof qbInT === 'number') qbIn.timeoutMs = qbInT;

    const nzIn: NZB = {
      enabled: !!body?.nzbget?.enabled,
      baseUrl: body?.nzbget?.baseUrl || undefined,
      username: body?.nzbget?.username || undefined,
      password: body?.nzbget?.password || undefined,
    };
    const nzInT = isFiniteNumber(body?.nzbget?.timeoutMs);
    if (typeof nzInT === 'number') nzIn.timeoutMs = nzInT;

    const sabIn: SAB = {
      enabled: !!body?.sabnzbd?.enabled,
      baseUrl: body?.sabnzbd?.baseUrl || undefined,
      apiKey: body?.sabnzbd?.apiKey || undefined,
      category: body?.sabnzbd?.category || undefined,
    };
    const sabInT = isFiniteNumber(body?.sabnzbd?.timeoutMs);
    if (typeof sabInT === 'number') sabIn.timeoutMs = sabInT;

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

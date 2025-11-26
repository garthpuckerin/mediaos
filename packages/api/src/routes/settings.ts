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

function getConfigDir(): string {
  return process.env['CONFIG_DIR'] || path.join(process.cwd(), 'config');
}

function getConfigFile(): string {
  return path.join(getConfigDir(), 'downloaders.json');
}

async function ensureDir(filePath: string) {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
  } catch (_e) {
    // ignore
  }
}

function isFiniteNumber(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

type PartialDownloaders = {
  qbittorrent?: Partial<QB>;
  nzbget?: Partial<NZB>;
  sabnzbd?: Partial<SAB>;
};

function normalize(obj: unknown): Downloaders {
  const input = obj as PartialDownloaders;
  const qb: QB = { enabled: !!input?.qbittorrent?.enabled, hasPassword: false };
  if (input?.qbittorrent?.baseUrl) qb.baseUrl = input.qbittorrent.baseUrl;
  if (input?.qbittorrent?.username) qb.username = input.qbittorrent.username;
  if (input?.qbittorrent?.category) qb.category = input.qbittorrent.category;
  if ((input?.qbittorrent as Record<string, unknown>)?.['password'])
    qb.hasPassword = true;
  const qbT = isFiniteNumber(input?.qbittorrent?.timeoutMs);
  if (typeof qbT === 'number') qb.timeoutMs = qbT;

  const nz: NZB = { enabled: !!input?.nzbget?.enabled, hasPassword: false };
  if (input?.nzbget?.baseUrl) nz.baseUrl = input.nzbget.baseUrl;
  if (input?.nzbget?.username) nz.username = input.nzbget.username;
  if ((input?.nzbget as Record<string, unknown>)?.['password'])
    nz.hasPassword = true;
  const nzT = isFiniteNumber(input?.nzbget?.timeoutMs);
  if (typeof nzT === 'number') nz.timeoutMs = nzT;

  const sab: SAB = {
    enabled: !!input?.sabnzbd?.enabled,
    hasApiKey: !!input?.sabnzbd?.apiKey,
  };
  if (input?.sabnzbd?.baseUrl) sab.baseUrl = input.sabnzbd.baseUrl;
  if (input?.sabnzbd?.apiKey) sab.apiKey = input.sabnzbd.apiKey;
  if (input?.sabnzbd?.category) sab.category = input.sabnzbd.category;
  const sabT = isFiniteNumber(input?.sabnzbd?.timeoutMs);
  if (typeof sabT === 'number') sab.timeoutMs = sabT;

  return { qbittorrent: qb, nzbget: nz, sabnzbd: sab };
}

async function loadDownloaders(): Promise<Downloaders> {
  try {
    const raw = await fs.readFile(getConfigFile(), 'utf8');
    const json = JSON.parse(raw);
    return normalize(json);
  } catch (_e) {
    return normalize({});
  }
}

type SavedDownloaders = {
  qbittorrent?: { password?: string };
  nzbget?: { password?: string };
  sabnzbd?: Record<string, unknown>;
};

async function saveDownloaders(
  payload: Downloaders,
  existing?: SavedDownloaders
) {
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
  };
  await ensureDir(getConfigFile());
  await fs.writeFile(getConfigFile(), JSON.stringify(toSave, null, 2), 'utf8');
  return normalize(toSave);
}

const plugin: FastifyPluginAsync = async (app) => {
  app.get('/api/settings/downloaders', async () => {
    return await loadDownloaders();
  });

  app.post('/api/settings/downloaders', async (req) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const bodyQB = body['qbittorrent'] as Record<string, unknown> | undefined;
    const bodyNZ = body['nzbget'] as Record<string, unknown> | undefined;
    const bodySAB = body['sabnzbd'] as Record<string, unknown> | undefined;

    const qbIn: QB = { enabled: !!bodyQB?.['enabled'], hasPassword: false };
    if (bodyQB?.['baseUrl']) qbIn.baseUrl = String(bodyQB['baseUrl']);
    if (bodyQB?.['username']) qbIn.username = String(bodyQB['username']);
    if (bodyQB?.['password']) qbIn.password = String(bodyQB['password']);
    if (bodyQB?.['category']) qbIn.category = String(bodyQB['category']);
    const qbInT = isFiniteNumber(bodyQB?.['timeoutMs']);
    if (typeof qbInT === 'number') qbIn.timeoutMs = qbInT;

    const nzIn: NZB = { enabled: !!bodyNZ?.['enabled'], hasPassword: false };
    if (bodyNZ?.['baseUrl']) nzIn.baseUrl = String(bodyNZ['baseUrl']);
    if (bodyNZ?.['username']) nzIn.username = String(bodyNZ['username']);
    if (bodyNZ?.['password']) nzIn.password = String(bodyNZ['password']);
    const nzInT = isFiniteNumber(bodyNZ?.['timeoutMs']);
    if (typeof nzInT === 'number') nzIn.timeoutMs = nzInT;

    const sabIn: SAB = {
      enabled: !!bodySAB?.['enabled'],
      hasApiKey: !!bodySAB?.['apiKey'],
    };
    if (bodySAB?.['baseUrl']) sabIn.baseUrl = String(bodySAB['baseUrl']);
    if (bodySAB?.['apiKey']) sabIn.apiKey = String(bodySAB['apiKey']);
    if (bodySAB?.['category']) sabIn.category = String(bodySAB['category']);
    const sabInT = isFiniteNumber(bodySAB?.['timeoutMs']);
    if (typeof sabInT === 'number') sabIn.timeoutMs = sabInT;

    const incoming: Downloaders = {
      qbittorrent: qbIn,
      nzbget: nzIn,
      sabnzbd: sabIn,
    };
    let existing: SavedDownloaders = {};
    try {
      const raw = await fs.readFile(getConfigFile(), 'utf8');
      existing = JSON.parse(raw) as SavedDownloaders;
    } catch (_e) {
      // ignore
    }
    const saved = await saveDownloaders(incoming, existing);
    return { ok: true, downloaders: saved };
  });

  app.post('/api/settings/downloaders/test', async (req) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const client = String(body['client'] || '').toLowerCase();
    const incoming = (body['settings'] || {}) as Record<string, unknown>;
    const saved = await loadDownloaders();

    const timeoutFetch = async (input: string, init?: RequestInit) => {
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
        const cfg = { ...saved.qbittorrent, ...incoming } as QB &
          Record<string, unknown>;
        const baseUrl = cfg.baseUrl;
        if (!baseUrl) return { ok: false, error: 'missing_baseUrl' };

        if (cfg.username && (cfg['password'] || cfg.hasPassword)) {
          const loginUrl = new URL('/api/v2/auth/login', baseUrl).toString();
          const form = new URLSearchParams({
            username: cfg.username,
            password: String(cfg['password'] || ''),
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
        const cfg = { ...saved.sabnzbd, ...incoming } as SAB &
          Record<string, unknown>;
        const baseUrl = cfg.baseUrl;
        if (!baseUrl) return { ok: false, error: 'missing_baseUrl' };

        const apiKey = cfg.apiKey;
        if (!apiKey) return { ok: false, error: 'missing_apiKey' };
        const url = new URL('/api', baseUrl);
        url.searchParams.set('mode', 'queue');
        url.searchParams.set('output', 'json');
        url.searchParams.set('apikey', apiKey);
        const res = await timeoutFetch(url.toString());
        return { ok: res.ok, status: res.status };
      }

      if (client === 'nzbget') {
        const cfg = { ...saved.nzbget, ...incoming } as NZB &
          Record<string, unknown>;
        const baseUrl = cfg.baseUrl;
        if (!baseUrl) return { ok: false, error: 'missing_baseUrl' };

        const jrpc = new URL('/jsonrpc', baseUrl).toString();
        const auth =
          cfg.username && (cfg['password'] || cfg.hasPassword)
            ? 'Basic ' +
              Buffer.from(
                `${cfg.username}:${String(cfg['password'] || '')}`
              ).toString('base64')
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

      return { ok: false, error: 'invalid_client' };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  });
};

export default plugin;

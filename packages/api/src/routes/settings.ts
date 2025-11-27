import { promises as fs } from 'fs';
import path from 'path';

import type { FastifyPluginAsync } from 'fastify';

import { decrypt, encrypt, isEncrypted } from '../services/encryption';

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

/**
 * Normalizes downloader config for API responses (no credentials)
 */
function normalize(obj: any): Downloaders {
  const qb: QB = {
    enabled: !!obj?.qbittorrent?.enabled || !!obj?.qbittorrent?.baseUrl,
    hasPassword: false,
  };
  if (obj?.qbittorrent?.baseUrl) qb.baseUrl = obj.qbittorrent.baseUrl;
  if (obj?.qbittorrent?.username) qb.username = obj.qbittorrent.username;
  if (obj?.qbittorrent?.category) qb.category = obj.qbittorrent.category;
  if ((obj?.qbittorrent as Record<string, unknown>)?.['password'])
    qb.hasPassword = true;
  const qbT = isFiniteNumber(obj?.qbittorrent?.timeoutMs);
  if (typeof qbT === 'number') qb.timeoutMs = qbT;

  // NZBGet: enabled if explicitly enabled OR if baseUrl is present
  const nz: NZB = {
    enabled: !!obj?.nzbget?.enabled || !!obj?.nzbget?.baseUrl,
    hasPassword: false,
  };
  if (obj?.nzbget?.baseUrl) nz.baseUrl = obj.nzbget.baseUrl;
  if (obj?.nzbget?.username) nz.username = obj.nzbget.username;
  if ((obj?.nzbget as Record<string, unknown>)?.['password'])
    nz.hasPassword = true;
  const nzT = isFiniteNumber(obj?.nzbget?.timeoutMs);
  if (typeof nzT === 'number') nz.timeoutMs = nzT;

  // SABnzbd: enabled if explicitly enabled OR if baseUrl is present
  const sab: SAB = {
    enabled: !!obj?.sabnzbd?.enabled || !!obj?.sabnzbd?.baseUrl,
    hasApiKey: !!(obj?.sabnzbd as Record<string, unknown>)?.['apiKey'],
  };
  if (obj?.sabnzbd?.baseUrl) sab.baseUrl = obj.sabnzbd.baseUrl;
  // Note: Do NOT copy apiKey to response - sensitive data should not be exposed
  if (obj?.sabnzbd?.category) sab.category = obj.sabnzbd.category;
  const sabT = isFiniteNumber(obj?.sabnzbd?.timeoutMs);
  if (typeof sabT === 'number') sab.timeoutMs = sabT;

  return { qbittorrent: qb, nzbget: nz, sabnzbd: sab };
}

/**
 * Decrypts credentials from stored config
 */
function decryptCredentials(obj: any): any {
  const result = JSON.parse(JSON.stringify(obj)); // deep clone

  // Decrypt qBittorrent password
  if (result?.qbittorrent?.password) {
    try {
      if (isEncrypted(result.qbittorrent.password)) {
        result.qbittorrent.password = decrypt(result.qbittorrent.password);
      }
    } catch (error) {
      console.error('Failed to decrypt qBittorrent password:', error);
    }
  }

  // Decrypt NZBGet password
  if (result?.nzbget?.password) {
    try {
      if (isEncrypted(result.nzbget.password)) {
        result.nzbget.password = decrypt(result.nzbget.password);
      }
    } catch (error) {
      console.error('Failed to decrypt NZBGet password:', error);
    }
  }

  // Decrypt SABnzbd API key
  if (result?.sabnzbd?.apiKey) {
    try {
      if (isEncrypted(result.sabnzbd.apiKey)) {
        result.sabnzbd.apiKey = decrypt(result.sabnzbd.apiKey);
      }
    } catch (error) {
      console.error('Failed to decrypt SABnzbd API key:', error);
    }
  }

  return result;
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

/**
 * Loads downloader config with decrypted credentials for internal use
 * @returns Raw config object with decrypted passwords/API keys
 */
export async function loadDownloadersWithCredentials(): Promise<any> {
  try {
    const raw = await fs.readFile(getConfigFile(), 'utf8');
    const json = JSON.parse(raw);
    return decryptCredentials(json);
  } catch (_e) {
    return {};
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

  // Encrypt sensitive fields before saving
  try {
    if (
      toSave.qbittorrent.password &&
      !isEncrypted(toSave.qbittorrent.password)
    ) {
      toSave.qbittorrent.password = encrypt(toSave.qbittorrent.password);
    }
    if (toSave.nzbget.password && !isEncrypted(toSave.nzbget.password)) {
      toSave.nzbget.password = encrypt(toSave.nzbget.password);
    }
    if (toSave.sabnzbd.apiKey && !isEncrypted(toSave.sabnzbd.apiKey)) {
      toSave.sabnzbd.apiKey = encrypt(toSave.sabnzbd.apiKey);
    }
  } catch (error) {
    console.warn(
      '⚠️  Encryption failed, credentials will be stored in plain text:',
      error
    );
    // Continue without encryption if ENCRYPTION_KEY not set
  }

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
    let existing: any = {};
    try {
      const raw = await fs.readFile(getConfigFile(), 'utf8');
      existing = JSON.parse(raw) as any;
    } catch (_e) {
      // ignore
    }
    const saved = await saveDownloaders(incoming, existing);
    return { ok: true, downloaders: saved };
  });

  app.post('/api/settings/downloaders/test', async (req, reply) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const client = String(body['client'] || '').toLowerCase();

    // Validate required client parameter
    if (!client) {
      return reply.code(400).send({ ok: false, error: 'client_required' });
    }

    // Validate client type
    const validClients = ['qbittorrent', 'sabnzbd', 'nzbget'];
    if (!validClients.includes(client)) {
      return reply.code(400).send({ ok: false, error: 'invalid_client' });
    }

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

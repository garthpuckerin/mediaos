import fs from 'fs';
import path from 'path';

export interface DownloaderConfig {
  qbittorrent: QbittorrentEnv | null;
  nzbget: NzbgetEnv | null;
  sabnzbd: SabnzbdEnv | null;
}

export interface QbittorrentEnv {
  baseUrl: string;
  username: string;
  password: string;
  timeoutMs: number;
}

export interface NzbgetEnv {
  baseUrl: string;
  username?: string;
  password?: string;
  timeoutMs: number;
}

export interface SabnzbdEnv {
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
}

const CONFIG_DIR =
  process.env['MEDIAOS_CONFIG_DIR'] ?? path.resolve(process.cwd(), 'config');
const CONFIG_FILE =
  process.env['MEDIAOS_DOWNLOADER_CONFIG'] ??
  path.join(CONFIG_DIR, 'downloaders.json');

type PartialDownloaderConfig = {
  qbittorrent?: QbittorrentEnv | null;
  nzbget?: NzbgetEnv | null;
  sabnzbd?: SabnzbdEnv | null;
};

let fileConfigCache: {
  mtimeMs: number;
  config: PartialDownloaderConfig;
} | null = null;

export function getDownloaderConfig(): DownloaderConfig {
  const envConfig = readEnvConfig();
  const fileConfig = readFileConfig();

  return {
    qbittorrent:
      fileConfig &&
      Object.prototype.hasOwnProperty.call(fileConfig, 'qbittorrent')
        ? (fileConfig.qbittorrent ?? null)
        : envConfig.qbittorrent,
    nzbget:
      fileConfig && Object.prototype.hasOwnProperty.call(fileConfig, 'nzbget')
        ? (fileConfig.nzbget ?? null)
        : envConfig.nzbget,
    sabnzbd:
      fileConfig && Object.prototype.hasOwnProperty.call(fileConfig, 'sabnzbd')
        ? (fileConfig.sabnzbd ?? null)
        : envConfig.sabnzbd,
  };
}

export function requireDownloaderConfig(): DownloaderConfig {
  const config = getDownloaderConfig();
  if (!config.qbittorrent) {
    throw new Error(
      'Missing qBittorrent configuration (set in environment or config/downloaders.json).'
    );
  }
  if (!config.nzbget) {
    throw new Error(
      'Missing NZBGet configuration (set in environment or config/downloaders.json).'
    );
  }
  if (!config.sabnzbd) {
    throw new Error(
      'Missing SABnzbd configuration (set in environment or config/downloaders.json).'
    );
  }
  return config;
}

export async function saveDownloaderConfig(
  config: DownloaderConfig
): Promise<void> {
  const payload = {
    qbittorrent: config.qbittorrent,
    nzbget: config.nzbget,
    sabnzbd: config.sabnzbd,
  };

  await fs.promises.mkdir(CONFIG_DIR, { recursive: true });
  await fs.promises.writeFile(
    CONFIG_FILE,
    JSON.stringify(payload, null, 2),
    'utf-8'
  );
  fileConfigCache = null;
}

export function clearDownloaderConfigCache(): void {
  fileConfigCache = null;
}

function readEnvConfig(): DownloaderConfig {
  return {
    qbittorrent: readQbittorrentEnv(),
    nzbget: readNzbgetEnv(),
    sabnzbd: readSabnzbdEnv(),
  };
}

function readFileConfig(): PartialDownloaderConfig | null {
  try {
    const stats = fs.statSync(CONFIG_FILE);
    if (fileConfigCache && fileConfigCache.mtimeMs === stats.mtimeMs) {
      return fileConfigCache.config;
    }

    const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) as Record<
      string,
      unknown
    >;
    const next: PartialDownloaderConfig = {};

    if (Object.prototype.hasOwnProperty.call(raw, 'qbittorrent')) {
      next.qbittorrent = parseQbittorrent(raw['qbittorrent']);
    }
    if (Object.prototype.hasOwnProperty.call(raw, 'nzbget')) {
      next.nzbget = parseNzbget(raw['nzbget']);
    }
    if (Object.prototype.hasOwnProperty.call(raw, 'sabnzbd')) {
      next.sabnzbd = parseSabnzbd(raw['sabnzbd']);
    }

    fileConfigCache = { mtimeMs: stats.mtimeMs, config: next };
    return next;
  } catch (error) {
    if (isFileMissing(error)) {
      fileConfigCache = null;
      return null;
    }
    fileConfigCache = null;
    throw error;
  }
}

function parseQbittorrent(value: unknown): QbittorrentEnv | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const payload = value as Record<string, unknown>;
  const baseUrl = readString(payload['baseUrl']);
  const username = readString(payload['username']);
  const password = readString(payload['password']);

  if (!baseUrl || !username || !password) {
    return null;
  }

  return {
    baseUrl,
    username,
    password,
    timeoutMs: readNumber(payload['timeoutMs'], 5000),
  };
}

function parseNzbget(value: unknown): NzbgetEnv | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const payload = value as Record<string, unknown>;
  const baseUrl = readString(payload['baseUrl']);
  if (!baseUrl) {
    return null;
  }

  const obj: NzbgetEnv = {
    baseUrl,
    timeoutMs: readNumber(payload['timeoutMs'], 5000),
  };
  const u = readString(payload['username']);
  const pw = readString(payload['password']);
  if (u !== undefined) (obj as any).username = u;
  if (pw !== undefined) (obj as any).password = pw;
  return obj;
}

function parseSabnzbd(value: unknown): SabnzbdEnv | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const payload = value as Record<string, unknown>;
  const baseUrl = readString(payload['baseUrl']);
  const apiKey = readString(payload['apiKey']);
  if (!baseUrl || !apiKey) {
    return null;
  }

  return {
    baseUrl,
    apiKey,
    timeoutMs: readNumber(payload['timeoutMs'], 5000),
  };
}

function readQbittorrentEnv(): QbittorrentEnv | null {
  const baseUrl = optionalString('QBITTORRENT_BASE_URL');
  const username = optionalString('QBITTORRENT_USERNAME');
  const password = optionalString('QBITTORRENT_PASSWORD');
  if (!baseUrl || !username || !password) {
    return null;
  }
  return {
    baseUrl,
    username,
    password,
    timeoutMs: optionalNumber('QBITTORRENT_TIMEOUT_MS', 5000),
  };
}

function readNzbgetEnv(): NzbgetEnv | null {
  const baseUrl = optionalString('NZBGET_BASE_URL');
  if (!baseUrl) {
    return null;
  }
  const obj: NzbgetEnv = {
    baseUrl,
    timeoutMs: optionalNumber('NZBGET_TIMEOUT_MS', 5000),
  };
  const u = optionalString('NZBGET_USERNAME');
  const pw = optionalString('NZBGET_PASSWORD');
  if (u !== undefined) (obj as any).username = u;
  if (pw !== undefined) (obj as any).password = pw;
  return obj;
}

function readSabnzbdEnv(): SabnzbdEnv | null {
  const baseUrl = optionalString('SABNZBD_BASE_URL');
  const apiKey = optionalString('SABNZBD_API_KEY');
  if (!baseUrl || !apiKey) {
    return null;
  }
  return {
    baseUrl,
    apiKey,
    timeoutMs: optionalNumber('SABNZBD_TIMEOUT_MS', 5000),
  };
}

function optionalString(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

function optionalNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw || raw.length === 0) {
    return fallback;
  }
  const value = Number(raw);
  if (Number.isNaN(value)) {
    throw new Error(`${name} must be a number`);
  }
  return value;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0
    ? value
    : undefined;
}

function readNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function isFileMissing(error: unknown): boolean {
  return Boolean((error as NodeJS.ErrnoException)?.code === 'ENOENT');
}

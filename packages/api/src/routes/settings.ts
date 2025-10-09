import {
  getDownloaderConfig,
  saveDownloaderConfig,
  type DownloaderConfig,
  type NzbgetEnv,
  type QbittorrentEnv,
  type SabnzbdEnv,
} from '@mediaos/shared/config/downloaders';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const timeoutSchema = z
  .number({ invalid_type_error: 'timeoutMs must be a number' })
  .int({ message: 'timeoutMs must be an integer' })
  .min(1000, { message: 'timeoutMs must be at least 1000ms' })
  .max(60000, { message: 'timeoutMs must be <= 60000ms' })
  .optional();

const qbittorrentSettingsSchema = z
  .object({
    enabled: z.boolean(),
    baseUrl: z.string().url().optional(),
    username: z.string().min(1).optional(),
    password: z.string().min(1).optional(),
    timeoutMs: timeoutSchema,
  })
  .superRefine((value, ctx) => {
    if (!value.enabled) {
      return;
    }
    if (!value.baseUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['baseUrl'],
        message: 'baseUrl is required',
      });
    }
    if (!value.username) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['username'],
        message: 'username is required',
      });
    }
  });

const nzbgetSettingsSchema = z
  .object({
    enabled: z.boolean(),
    baseUrl: z.string().url().optional(),
    username: z.string().min(1).optional(),
    password: z.string().min(1).optional(),
    timeoutMs: timeoutSchema,
  })
  .superRefine((value, ctx) => {
    if (value.enabled && !value.baseUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['baseUrl'],
        message: 'baseUrl is required',
      });
    }
  });

const sabnzbdSettingsSchema = z
  .object({
    enabled: z.boolean(),
    baseUrl: z.string().url().optional(),
    apiKey: z.string().min(1).optional(),
    timeoutMs: timeoutSchema,
  })
  .superRefine((value, ctx) => {
    if (!value.enabled) {
      return;
    }
    if (!value.baseUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['baseUrl'],
        message: 'baseUrl is required',
      });
    }
  });

const downloaderSettingsSchema = z.object({
  qbittorrent: qbittorrentSettingsSchema,
  nzbget: nzbgetSettingsSchema,
  sabnzbd: sabnzbdSettingsSchema,
});

type DownloaderSettingsInput = z.infer<typeof downloaderSettingsSchema>;

type DownloaderSettingsResponse = {
  qbittorrent: {
    enabled: boolean;
    baseUrl: string;
    username: string;
    timeoutMs: number;
    hasPassword: boolean;
  };
  nzbget: {
    enabled: boolean;
    baseUrl: string;
    username: string;
    timeoutMs: number;
    hasPassword: boolean;
  };
  sabnzbd: {
    enabled: boolean;
    baseUrl: string;
    timeoutMs: number;
    hasApiKey: boolean;
  };
};

const plugin: FastifyPluginAsync = async (app) => {
  app.get('/api/settings/downloaders', async () => {
    return serializeDownloaderConfig(getDownloaderConfig());
  });

  app.get('/api/settings', async () => {
    return {
      downloaders: serializeDownloaderConfig(getDownloaderConfig()),
    };
  });

  app.post('/api/settings/downloaders', async (req) => {
    const parsed = downloaderSettingsSchema.parse(req.body ?? {});
    const current = getDownloaderConfig();
    const config = buildDownloaderConfig(parsed, current, (message) =>
      app.httpErrors.badRequest(message)
    );

    await saveDownloaderConfig(config);

    return { ok: true, downloaders: serializeDownloaderConfig(config) };
  });
};

export default plugin;

function serializeDownloaderConfig(
  config: DownloaderConfig
): DownloaderSettingsResponse {
  return {
    qbittorrent: {
      enabled: Boolean(config.qbittorrent),
      baseUrl: config.qbittorrent?.baseUrl ?? '',
      username: config.qbittorrent?.username ?? '',
      timeoutMs: config.qbittorrent?.timeoutMs ?? 5000,
      hasPassword: Boolean(config.qbittorrent?.password),
    },
    nzbget: {
      enabled: Boolean(config.nzbget),
      baseUrl: config.nzbget?.baseUrl ?? '',
      username: config.nzbget?.username ?? '',
      timeoutMs: config.nzbget?.timeoutMs ?? 5000,
      hasPassword: Boolean(config.nzbget?.password),
    },
    sabnzbd: {
      enabled: Boolean(config.sabnzbd),
      baseUrl: config.sabnzbd?.baseUrl ?? '',
      timeoutMs: config.sabnzbd?.timeoutMs ?? 5000,
      hasApiKey: Boolean(config.sabnzbd?.apiKey),
    },
  };
}

function buildDownloaderConfig(
  input: DownloaderSettingsInput,
  current: DownloaderConfig,
  badRequest: (message: string) => Error
): DownloaderConfig {
  const qbittorrent = input.qbittorrent.enabled
    ? buildQbittorrentConfig(input.qbittorrent, current.qbittorrent, badRequest)
    : null;
  const nzbget = input.nzbget.enabled
    ? buildNzbgetConfig(input.nzbget, current.nzbget, badRequest)
    : null;
  const sabnzbd = input.sabnzbd.enabled
    ? buildSabnzbdConfig(input.sabnzbd, current.sabnzbd, badRequest)
    : null;

  return { qbittorrent, nzbget, sabnzbd };
}

function buildQbittorrentConfig(
  input: DownloaderSettingsInput['qbittorrent'],
  current: QbittorrentEnv | null,
  badRequest: (message: string) => Error
): QbittorrentEnv {
  if (!input.baseUrl || !input.username) {
    throw badRequest('qBittorrent requires baseUrl and username');
  }
  const password = resolveSecret(
    input.password,
    current?.password,
    'qBittorrent password',
    badRequest
  );
  return {
    baseUrl: input.baseUrl,
    username: input.username,
    password,
    timeoutMs: resolveTimeout(input.timeoutMs, current?.timeoutMs),
  };
}

function buildNzbgetConfig(
  input: DownloaderSettingsInput['nzbget'],
  current: NzbgetEnv | null,
  badRequest: (message: string) => Error
): NzbgetEnv {
  if (!input.baseUrl) {
    throw badRequest('NZBGet baseUrl must be provided when enabled');
  }
  const obj: NzbgetEnv = {
    baseUrl: input.baseUrl,
    timeoutMs: resolveTimeout(input.timeoutMs, current?.timeoutMs),
  };
  const u = resolveOptionalSecret(input.username, current?.username);
  const pw = resolveOptionalSecret(input.password, current?.password);
  if (u !== undefined) (obj as any).username = u;
  if (pw !== undefined) (obj as any).password = pw;
  return obj;
}

function buildSabnzbdConfig(
  input: DownloaderSettingsInput['sabnzbd'],
  current: SabnzbdEnv | null,
  badRequest: (message: string) => Error
): SabnzbdEnv {
  if (!input.baseUrl) {
    throw badRequest('SABnzbd baseUrl is required when enabled');
  }
  const apiKey = resolveSecret(
    input.apiKey,
    current?.apiKey,
    'SABnzbd API key',
    badRequest
  );
  return {
    baseUrl: input.baseUrl,
    apiKey,
    timeoutMs: resolveTimeout(input.timeoutMs, current?.timeoutMs),
  };
}

function resolveSecret(
  provided: string | undefined,
  existing: string | undefined,
  label: string,
  badRequest: (message: string) => Error
): string {
  if (typeof provided === 'string' && provided.trim().length > 0) {
    return provided.trim();
  }
  if (existing && existing.length > 0) {
    return existing;
  }
  throw badRequest(`${label} is required`);
}

function resolveOptionalSecret(
  provided: string | undefined,
  existing: string | undefined
): string | undefined {
  if (typeof provided === 'string') {
    const trimmed = provided.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return existing;
}

function resolveTimeout(
  value: number | undefined,
  fallback: number | undefined
): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof fallback === 'number' && Number.isFinite(fallback)) {
    return Math.trunc(fallback);
  }
  return 5000;
}

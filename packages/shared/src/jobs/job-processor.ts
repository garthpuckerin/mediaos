import {
  createNzbgetClient,
  NzbgetClient,
} from '@mediaos/adapters/downloaders/nzbget';
import {
  createQbittorrentClient,
  QbittorrentClient,
} from '@mediaos/adapters/downloaders/qbittorrent';
import {
  createSabnzbdClient,
  SabnzbdClient,
} from '@mediaos/adapters/downloaders/sabnzbd';
import pino from 'pino';

import {
  getDownloaderConfig,
  type DownloaderConfig,
} from '../config/downloaders';
export interface RunFunction {
  (
    sql: string,
    params?: unknown[]
  ): Promise<{ lastID: number; changes: number }>;
}

export interface JobResult {
  ok: boolean;
  message?: string;
  data?: Record<string, unknown>;
}

export type JobExecutor = (
  payload: Record<string, unknown>,
  run: RunFunction
) => Promise<JobResult>;

const logger = pino({
  level: process.env['LOG_LEVEL'] ?? 'info',
  name: 'worker:processor',
});

let qbittorrentClient: QbittorrentClient | null = null;
let nzbgetClient: NzbgetClient | null = null;
let sabnzbdClient: SabnzbdClient | null = null;
let lastConfigSignature: string | null = null;

async function withRetry<T>(
  operation: () => Promise<T>,
  attempts = 3,
  delayMs = 150
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) {
        break;
      }
      const sleep = delayMs * attempt;
      logger.warn({ attempt, attempts, sleep }, 'Download job retry scheduled');
      await new Promise((resolve) => setTimeout(resolve, sleep));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

const jobExecutors: Record<string, JobExecutor> = {
  async 'request.evaluate'(payload, run) {
    const requestId = Number(payload['requestId']);
    if (Number.isNaN(requestId)) {
      throw new Error('request.evaluate job missing numeric requestId');
    }

    const request = await run(
      'UPDATE requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['approved', requestId]
    );

    if (request.changes === 0) {
      throw new Error(`request.evaluate unable to locate request ${requestId}`);
    }

    await run(
      `INSERT INTO media_items (title, kind, year)
         SELECT title, kind, NULL FROM requests WHERE id = ?
         ON CONFLICT(title, kind) DO UPDATE SET updated_at = CURRENT_TIMESTAMP`,
      [requestId]
    );

    return {
      ok: true,
      message: 'Request evaluated and approved',
      data: { requestId },
    };
  },

  async 'request.approved'(payload, run) {
    const requestId = Number(payload['requestId']);
    if (Number.isNaN(requestId)) {
      throw new Error('request.approved job missing numeric requestId');
    }

    await run(
      'UPDATE requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['approved', requestId]
    );

    return {
      ok: true,
      message: 'Request approval finalised',
      data: { requestId },
    };
  },

  async 'library.refresh'(payload, run) {
    const libraryId = payload['libraryId'] ?? 'default';
    const outcome = await run(
      `UPDATE media_items
         SET updated_at = CURRENT_TIMESTAMP
         WHERE updated_at < DATETIME('now', '-1 minute')`
    );

    return {
      ok: true,
      message: 'Library refresh completed',
      data: { libraryId, touched: outcome.changes },
    };
  },

  async 'indexers.sync'(payload, run) {
    void payload;
    const outcome = await run(
      `UPDATE indexers
         SET last_synced_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP`
    );
    return {
      ok: true,
      message: 'Indexers synchronised',
      data: { synced: outcome.changes },
    };
  },

  async 'download.enqueue'(payload) {
    const provider = String(payload['provider'] ?? '');

    if (provider === 'qbittorrent') {
      const magnet = payload['magnet'];
      if (typeof magnet !== 'string' || magnet.length === 0) {
        throw new Error('qbittorrent job missing magnet');
      }
      const destination =
        typeof payload['destination'] === 'string'
          ? payload['destination']
          : undefined;
      const client = getQbittorrentClient();
      await withRetry(() => client.addMagnet(magnet, destination));
      return {
        ok: true,
        message: 'Torrent submitted to qBittorrent',
        data: { provider, destination: destination ?? null },
      };
    }

    if (provider === 'nzbget') {
      const url = payload['url'];
      if (typeof url !== 'string' || url.length === 0) {
        throw new Error('nzbget job missing url');
      }
      const category =
        typeof payload['category'] === 'string'
          ? payload['category']
          : undefined;
      const client = getNzbgetClient();
      await withRetry(() => client.addUrl(url, category));
      return {
        ok: true,
        message: 'NZB submitted to NZBGet',
        data: { provider, category: category ?? null },
      };
    }

    if (provider === 'sabnzbd') {
      const url = payload['url'];
      if (typeof url !== 'string' || url.length === 0) {
        throw new Error('sabnzbd job missing url');
      }
      const category =
        typeof payload['category'] === 'string'
          ? payload['category']
          : undefined;
      const client = getSabnzbdClient();
      await withRetry(() => client.addUrl(url, category));
      return {
        ok: true,
        message: 'NZB submitted to SABnzbd',
        data: { provider, category: category ?? null },
      };
    }

    throw new Error(
      `download.enqueue received unsupported provider: ${provider}`
    );
  },
};

export async function processJob(
  jobName: string,
  jobData: Record<string, unknown>,
  run: RunFunction
): Promise<void> {
  const jobIdValue = jobData['jobId'];
  const jobId =
    typeof jobIdValue === 'string'
      ? Number.parseInt(jobIdValue, 10)
      : Number(jobIdValue);

  if (!Number.isNaN(jobId)) {
    await run(
      'UPDATE jobs SET status = ?, payload = ?, started_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['running', JSON.stringify(jobData ?? {}), jobId]
    );
  }

  const executor = jobExecutors[jobName];
  if (!executor) {
    const error = new Error(`unknown job type: ${jobName}`);
    await failJob(Number.isNaN(jobId) ? undefined : jobId, error, run);
    throw error;
  }

  try {
    const result = await executor(jobData, run);

    if (!Number.isNaN(jobId)) {
      await run(
        'UPDATE jobs SET status = ?, result = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['completed', JSON.stringify(result), jobId]
      );
    }
  } catch (error) {
    logger.error({ jobName, jobId, err: error }, 'Job execution failed');
    await failJob(Number.isNaN(jobId) ? undefined : jobId, error, run);
    throw error;
  }
}

export async function failJob(
  jobId: number | undefined,
  error: unknown,
  run: RunFunction
): Promise<void> {
  if (jobId === undefined || Number.isNaN(jobId)) {
    return;
  }
  const message = error instanceof Error ? error.message : 'Unknown error';
  await run(
    'UPDATE jobs SET status = ?, result = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?',
    ['failed', JSON.stringify({ error: message }), jobId]
  );
}

function getQbittorrentClient() {
  const config = loadDownloaderConfig();
  const qb = config.qbittorrent;
  if (!qb) {
    throw new Error('qBittorrent configuration missing');
  }
  if (!qbittorrentClient) {
    qbittorrentClient = createQbittorrentClient(qb);
  }
  return qbittorrentClient;
}

function getNzbgetClient() {
  const config = loadDownloaderConfig();
  const nzb = config.nzbget;
  if (!nzb) {
    throw new Error('NZBGet configuration missing');
  }
  if (!nzbgetClient) {
    nzbgetClient = createNzbgetClient(nzb);
  }
  return nzbgetClient;
}

function getSabnzbdClient() {
  const config = loadDownloaderConfig();
  const sab = config.sabnzbd;
  if (!sab) {
    throw new Error('SABnzbd configuration missing');
  }
  if (!sabnzbdClient) {
    sabnzbdClient = createSabnzbdClient(sab);
  }
  return sabnzbdClient;
}

function loadDownloaderConfig(): DownloaderConfig {
  const config = getDownloaderConfig();
  const signature = JSON.stringify(config);
  if (signature !== lastConfigSignature) {
    lastConfigSignature = signature;
    qbittorrentClient = null;
    nzbgetClient = null;
    sabnzbdClient = null;
  }
  return config;
}

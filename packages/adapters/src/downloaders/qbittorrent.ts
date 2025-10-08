import type { TorrentClient } from './index';

interface RequestOptions {
  method: 'GET' | 'POST';
  path: string;
  body?: URLSearchParams | string;
}

class RetryableRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetryableRequestError';
  }
}

export interface QbittorrentConfig {
  baseUrl: string;
  username: string;
  password: string;
  timeoutMs?: number;
}

export class QbittorrentClient implements TorrentClient {
  private sidCookie: string | null = null;
  private readonly timeoutMs: number;
  private readonly maxAttempts = 3;
  private readonly baseDelayMs = 150;

  constructor(private readonly config: QbittorrentConfig) {
    if (!config.baseUrl) throw new Error('qBittorrent baseUrl is required');
    if (!config.username) throw new Error('qBittorrent username is required');
    if (!config.password) throw new Error('qBittorrent password is required');
    this.timeoutMs = config.timeoutMs ?? 5000;
  }

  async addMagnet(magnet: string, dest?: string): Promise<{ ok: boolean }> {
    if (!magnet) throw new Error('magnet uri is required');

    await this.ensureSession();

    const params = new URLSearchParams({ urls: magnet });
    if (dest) params.append('savepath', dest);

    const response = await this.request({
      method: 'POST',
      path: '/api/v2/torrents/add',
      body: params,
    });

    if (!response.ok) {
      if (response.status === 403) {
        this.sidCookie = null;
        await this.ensureSession(true);
        return this.addMagnet(magnet, dest);
      }
      const text = await response.text();
      throw new Error(`Failed to add magnet: ${response.status} ${text}`);
    }

    return { ok: true };
  }

  private async ensureSession(force = false): Promise<void> {
    if (this.sidCookie && !force) return;

    const body = new URLSearchParams({
      username: this.config.username,
      password: this.config.password,
    });

    const response = await this.fetchWithRetry(
      new URL('/api/v2/auth/login', this.config.baseUrl).toString(),
      {
        method: 'POST',
        body: body.toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`qBittorrent login failed: ${response.status} ${text}`);
    }

    const cookie = response.headers.get('set-cookie');
    if (!cookie)
      throw new Error('qBittorrent login did not return a session cookie');

    const sid = cookie
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('SID='));

    if (!sid) throw new Error('qBittorrent SID cookie missing');
    this.sidCookie = sid;
  }

  private async request(options: RequestOptions): Promise<Response> {
    const url = new URL(options.path, this.config.baseUrl).toString();
    const headers: Record<string, string> = {};

    if (options.method === 'POST') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    if (this.sidCookie) {
      headers['Cookie'] = this.sidCookie;
    }

    const bodyString =
      typeof options.body === 'string'
        ? options.body
        : options.body?.toString();
    const bodyVal: BodyInit | null = bodyString ?? null;

    return this.fetchWithRetry(url, {
      method: options.method,
      headers,
      body: bodyVal,
    });
  }

  private async fetchWithRetry(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    return this.withRetry(async (attempt) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await fetch(input, {
          ...init,
          signal: controller.signal,
        });
        if (this.shouldRetryResponse(response) && attempt < this.maxAttempts) {
          await this.drainResponse(response);
          throw new RetryableRequestError(
            `Retryable status ${response.status}`
          );
        }
        return response;
      } catch (error) {
        if (!this.isRetryableError(error) || attempt >= this.maxAttempts) {
          throw error;
        }
        throw error;
      } finally {
        clearTimeout(timer);
      }
    });
  }

  private async withRetry<T>(
    operation: (attempt: number) => Promise<T>
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await operation(attempt);
      } catch (error) {
        lastError = error;
        if (!this.isRetryableError(error) || attempt === this.maxAttempts) {
          throw error instanceof Error ? error : new Error(String(error));
        }
        await this.delay(this.baseDelayMs * attempt);
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  private shouldRetryResponse(response: Response): boolean {
    return (
      response.status === 408 ||
      response.status === 425 ||
      response.status === 429 ||
      (response.status >= 500 && response.status < 600)
    );
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof RetryableRequestError) {
      return true;
    }
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        return true;
      }
      if (error instanceof TypeError) {
        return true;
      }
      const code = (error as NodeJS.ErrnoException).code;
      if (
        code &&
        [
          'ECONNRESET',
          'ECONNREFUSED',
          'EPIPE',
          'ETIMEDOUT',
          'EHOSTUNREACH',
          'ENOTFOUND',
        ].includes(code)
      ) {
        return true;
      }
    }
    return false;
  }

  private async drainResponse(response: Response): Promise<void> {
    try {
      await response.arrayBuffer();
    } catch {
      // ignore drain errors
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export function createQbittorrentClient(
  config: QbittorrentConfig
): QbittorrentClient {
  return new QbittorrentClient(config);
}

import type { UsenetClient } from './index';

class RetryableRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetryableRequestError';
  }
}

export interface NzbgetConfig {
  baseUrl: string;
  username?: string;
  password?: string;
  timeoutMs?: number;
}

interface JsonRpcRequest {
  method: string;
  params: unknown[];
  id: number;
}

interface JsonRpcResponse<T> {
  result?: T;
  error?: { code: number; message: string };
}

export class NzbgetClient implements UsenetClient {
  private readonly timeoutMs: number;
  private readonly maxAttempts = 3;
  private readonly baseDelayMs = 150;
  private requestId = 0;

  constructor(private readonly config: NzbgetConfig) {
    if (!config.baseUrl) {
      throw new Error('NZBGet baseUrl is required');
    }
    this.timeoutMs = config.timeoutMs ?? 5000;
  }

  async addUrl(nzbUrl: string, category?: string): Promise<{ ok: boolean }> {
    if (!nzbUrl) {
      throw new Error('nzbUrl is required');
    }

    const result = await this.call<boolean>('appendurl', [
      nzbUrl,
      category ?? '',
      0,
      false,
      '',
      0,
      'AUTO',
    ]);

    if (!result) {
      throw new Error('NZBGet appendurl returned false');
    }

    return { ok: true };
  }

  private async call<T>(method: string, params: unknown[]): Promise<T> {
    const payload: JsonRpcRequest = {
      method,
      params,
      id: ++this.requestId,
    };

    const response = await this.fetchWithRetry(this.endpointUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeader(),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`NZBGet request failed: ${response.status} ${text}`);
    }

    const json = (await response.json()) as JsonRpcResponse<T>;
    if (json.error) {
      throw new Error(`NZBGet error ${json.error.code}: ${json.error.message}`);
    }
    if (json.result === undefined) {
      throw new Error('NZBGet returned no result');
    }
    return json.result;
  }

  private endpointUrl(): string {
    return new URL('/jsonrpc', this.config.baseUrl).toString();
  }

  private authHeader(): Record<string, string> {
    const { username, password } = this.config;
    if (!username || !password) {
      return {};
    }
    const credentials = Buffer.from(`${username}:${password}`).toString(
      'base64'
    );
    return { Authorization: `Basic ${credentials}` };
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

export function createNzbgetClient(config: NzbgetConfig): NzbgetClient {
  return new NzbgetClient(config);
}

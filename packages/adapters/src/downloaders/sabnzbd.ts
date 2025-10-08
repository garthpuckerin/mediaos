import type { UsenetClient } from './index';

class RetryableRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetryableRequestError';
  }
}

export interface SabnzbdConfig {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
}

export class SabnzbdClient implements UsenetClient {
  private readonly timeoutMs: number;
  private readonly maxAttempts = 3;
  private readonly baseDelayMs = 150;

  constructor(private readonly config: SabnzbdConfig) {
    if (!config.baseUrl) {
      throw new Error('SABnzbd baseUrl is required');
    }
    if (!config.apiKey) {
      throw new Error('SABnzbd apiKey is required');
    }
    this.timeoutMs = config.timeoutMs ?? 5000;
  }

  async addUrl(nzbUrl: string, category?: string): Promise<{ ok: boolean }> {
    if (!nzbUrl) {
      throw new Error('nzbUrl is required');
    }

    const params = new URLSearchParams({
      mode: 'addurl',
      name: nzbUrl,
      apikey: this.config.apiKey,
      output: 'json',
    });
    if (category) {
      params.append('cat', category);
    }

    const response = await this.fetchWithRetry(this.endpointUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`SABnzbd request failed: ${response.status} ${text}`);
    }

    const data = (await response.json()) as {
      status?: boolean;
      error?: string;
    };
    if (!data.status) {
      throw new Error(
        data.error ?? 'SABnzbd returned an unsuccessful response'
      );
    }

    return { ok: true };
  }

  private endpointUrl(): string {
    return new URL('/api', this.config.baseUrl).toString();
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

export function createSabnzbdClient(config: SabnzbdConfig): SabnzbdClient {
  return new SabnzbdClient(config);
}

/**
 * Prowlarr Indexer Adapter
 *
 * Prowlarr is an indexer manager that aggregates multiple indexers
 * and provides a unified API for searching.
 */

export interface ProwlarrConfig {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
}

export interface ProwlarrIndexer {
  id: number;
  name: string;
  protocol: 'torrent' | 'usenet';
  privacy: 'public' | 'private' | 'semiPrivate';
  enable: boolean;
  priority: number;
  categories: Array<{ id: number; name: string }>;
}

export interface ProwlarrSearchResult {
  guid: string;
  title: string;
  size: number;
  publishDate: string;
  downloadUrl?: string;
  magnetUrl?: string;
  infoUrl?: string;
  indexer: string;
  indexerId: number;
  protocol: 'torrent' | 'usenet';
  seeders?: number;
  leechers?: number;
  categories: Array<{ id: number; name: string }>;
}

export interface SearchOptions {
  query: string;
  categories?: number[];
  indexerIds?: number[];
  type?: 'search' | 'movie' | 'tvsearch' | 'music' | 'book';
  limit?: number;
}

/**
 * Prowlarr API adapter
 */
export const prowlarr = {
  /**
   * Test connection to Prowlarr
   */
  async test(
    cfg: ProwlarrConfig
  ): Promise<{ ok: boolean; error?: string; version?: string }> {
    try {
      const url = new URL(
        '/api/v1/system/status',
        cfg.baseUrl.replace(/\/$/, '')
      );
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        cfg.timeoutMs || 10000
      );

      const res = await fetch(url.toString(), {
        headers: { 'X-Api-Key': cfg.apiKey },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return { ok: false, error: `HTTP ${res.status}` };
      }

      const data = await res.json();
      return { ok: true, version: data.version };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },

  /**
   * Get list of configured indexers
   */
  async getIndexers(
    cfg: ProwlarrConfig
  ): Promise<
    { ok: true; indexers: ProwlarrIndexer[] } | { ok: false; error: string }
  > {
    try {
      const url = new URL('/api/v1/indexer', cfg.baseUrl.replace(/\/$/, ''));
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        cfg.timeoutMs || 10000
      );

      const res = await fetch(url.toString(), {
        headers: { 'X-Api-Key': cfg.apiKey },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return { ok: false, error: `HTTP ${res.status}` };
      }

      const data = await res.json();
      const indexers: ProwlarrIndexer[] = Array.isArray(data)
        ? data.map((ix: any) => ({
            id: ix.id,
            name: ix.name,
            protocol: ix.protocol === 'usenet' ? 'usenet' : 'torrent',
            privacy: ix.privacy || 'public',
            enable: ix.enable ?? true,
            priority: ix.priority ?? 25,
            categories: ix.capabilities?.categories || [],
          }))
        : [];

      return { ok: true, indexers };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },

  /**
   * Search across all or specific indexers
   */
  async search(
    cfg: ProwlarrConfig,
    options: SearchOptions
  ): Promise<
    { ok: true; results: ProwlarrSearchResult[] } | { ok: false; error: string }
  > {
    try {
      const url = new URL('/api/v1/search', cfg.baseUrl.replace(/\/$/, ''));
      url.searchParams.set('query', options.query);
      url.searchParams.set('type', options.type || 'search');

      if (options.categories?.length) {
        url.searchParams.set('categories', options.categories.join(','));
      }
      if (options.indexerIds?.length) {
        url.searchParams.set('indexerIds', options.indexerIds.join(','));
      }
      if (options.limit) {
        url.searchParams.set('limit', String(options.limit));
      }

      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        cfg.timeoutMs || 30000
      );

      const res = await fetch(url.toString(), {
        headers: { 'X-Api-Key': cfg.apiKey },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return { ok: false, error: `HTTP ${res.status}` };
      }

      const data = await res.json();
      const results: ProwlarrSearchResult[] = Array.isArray(data)
        ? data.map((r: any) => ({
            guid: r.guid || r.id || '',
            title: r.title || '',
            size: r.size || 0,
            publishDate: r.publishDate || '',
            downloadUrl: r.downloadUrl,
            magnetUrl: r.magnetUrl,
            infoUrl: r.infoUrl,
            indexer: r.indexer || '',
            indexerId: r.indexerId || 0,
            protocol: r.protocol === 'usenet' ? 'usenet' : 'torrent',
            seeders: r.seeders,
            leechers: r.leechers,
            categories: r.categories || [],
          }))
        : [];

      return { ok: true, results };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },

  /**
   * Get download link for a release
   */
  async getDownloadUrl(
    cfg: ProwlarrConfig,
    guid: string,
    indexerId: number
  ): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
    try {
      const url = new URL(
        `/api/v1/indexer/${indexerId}/download`,
        cfg.baseUrl.replace(/\/$/, '')
      );
      url.searchParams.set('link', guid);

      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        cfg.timeoutMs || 10000
      );

      const res = await fetch(url.toString(), {
        headers: { 'X-Api-Key': cfg.apiKey },
        signal: controller.signal,
        redirect: 'manual',
      });
      clearTimeout(timeout);

      // Follow redirect to get actual download URL
      const location = res.headers.get('location');
      if (location) {
        return { ok: true, url: location };
      }

      if (res.ok) {
        // Some indexers return the URL in the body
        const text = await res.text();
        if (text.startsWith('magnet:') || text.startsWith('http')) {
          return { ok: true, url: text };
        }
      }

      return { ok: false, error: 'Could not get download URL' };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};

/**
 * Jackett Indexer Adapter
 *
 * Jackett works as a proxy server that translates queries from
 * apps into tracker-site-specific HTTP queries.
 */

export interface JackettConfig {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
}

export interface JackettIndexer {
  id: string;
  name: string;
  type: 'public' | 'private' | 'semi-private';
  configured: boolean;
  caps: string[];
}

export interface JackettSearchResult {
  guid: string;
  title: string;
  tracker: string;
  trackerId: string;
  categoryDesc: string;
  size: number;
  publishDate: string;
  link?: string;
  magnetUri?: string;
  infoHash?: string;
  seeders?: number;
  peers?: number;
  downloadVolumeFactor?: number;
  uploadVolumeFactor?: number;
}

export interface SearchOptions {
  query: string;
  indexers?: string[]; // Tracker IDs
  categories?: number[];
  limit?: number;
}

// Jackett category IDs (Torznab standard)
export const JACKETT_CATEGORIES = {
  MOVIES: 2000,
  MOVIES_SD: 2030,
  MOVIES_HD: 2040,
  MOVIES_UHD: 2045,
  MOVIES_BLURAY: 2050,
  TV: 5000,
  TV_SD: 5030,
  TV_HD: 5040,
  TV_UHD: 5045,
  AUDIO: 3000,
  AUDIO_MP3: 3010,
  AUDIO_LOSSLESS: 3040,
  BOOKS: 7000,
  BOOKS_EBOOK: 7020,
  BOOKS_COMICS: 7030,
  ANIME: 5070,
};

/**
 * Jackett API adapter
 */
export const jackett = {
  /**
   * Test connection to Jackett
   */
  async test(
    cfg: JackettConfig
  ): Promise<{ ok: boolean; error?: string; version?: string }> {
    try {
      const url = new URL(
        '/api/v2.0/server/config',
        cfg.baseUrl.replace(/\/$/, '')
      );
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        cfg.timeoutMs || 10000
      );

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${cfg.apiKey}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        // Try alternative auth method
        const url2 = new URL(
          '/api/v2.0/server/config',
          cfg.baseUrl.replace(/\/$/, '')
        );
        url2.searchParams.set('apikey', cfg.apiKey);

        const res2 = await fetch(url2.toString());
        if (!res2.ok) {
          return { ok: false, error: `HTTP ${res2.status}` };
        }
        const data = await res2.json();
        return { ok: true, version: data.app_version };
      }

      const data = await res.json();
      return { ok: true, version: data.app_version };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },

  /**
   * Get list of configured indexers
   */
  async getIndexers(
    cfg: JackettConfig
  ): Promise<
    { ok: true; indexers: JackettIndexer[] } | { ok: false; error: string }
  > {
    try {
      const url = new URL('/api/v2.0/indexers', cfg.baseUrl.replace(/\/$/, ''));
      url.searchParams.set('apikey', cfg.apiKey);
      url.searchParams.set('configured', 'true');

      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        cfg.timeoutMs || 10000
      );

      const res = await fetch(url.toString(), {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return { ok: false, error: `HTTP ${res.status}` };
      }

      const data = await res.json();
      const indexers: JackettIndexer[] = Array.isArray(data)
        ? data.map((ix: any) => ({
            id: ix.id || '',
            name: ix.name || '',
            type: ix.type || 'public',
            configured: ix.configured ?? true,
            caps: ix.caps || [],
          }))
        : [];

      return { ok: true, indexers };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },

  /**
   * Search across all or specific indexers using Torznab API
   */
  async search(
    cfg: JackettConfig,
    options: SearchOptions
  ): Promise<
    { ok: true; results: JackettSearchResult[] } | { ok: false; error: string }
  > {
    try {
      // Use the "all" indexer endpoint for multi-indexer search
      const indexer =
        options.indexers?.length === 1 ? options.indexers[0] : 'all';
      const url = new URL(
        `/api/v2.0/indexers/${indexer}/results/torznab/api`,
        cfg.baseUrl.replace(/\/$/, '')
      );

      url.searchParams.set('apikey', cfg.apiKey);
      url.searchParams.set('t', 'search');
      url.searchParams.set('q', options.query);

      if (options.categories?.length) {
        url.searchParams.set('cat', options.categories.join(','));
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
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return { ok: false, error: `HTTP ${res.status}` };
      }

      // Jackett returns XML (Torznab format)
      const xml = await res.text();
      const results = parseJackettXml(xml);

      return { ok: true, results };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};

/**
 * Parse Jackett Torznab XML response
 */
function parseJackettXml(xml: string): JackettSearchResult[] {
  const results: JackettSearchResult[] = [];

  // Simple regex-based XML parsing for items
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

  for (const match of itemMatches) {
    const item = match[1];

    const getTag = (tag: string): string => {
      const m = item.match(new RegExp(`<${tag}>([^<]*)<\/${tag}>`));
      return m ? m[1] : '';
    };

    const getAttr = (tag: string, attr: string): string => {
      const m = item.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`));
      return m ? m[1] : '';
    };

    // Get torznab attributes
    const getAttrValue = (name: string): string => {
      const m = item.match(
        new RegExp(`<torznab:attr name="${name}" value="([^"]*)"`)
      );
      return m ? m[1] : '';
    };

    const guid = getTag('guid') || getAttr('enclosure', 'url') || '';
    const title = getTag('title') || '';
    const link = getTag('link') || getAttr('enclosure', 'url') || '';
    const size = parseInt(
      getAttr('enclosure', 'length') || getAttrValue('size') || '0',
      10
    );
    const pubDate = getTag('pubDate') || '';
    const tracker =
      getAttr('jackettindexer', 'id') || getTag('jackettindexer') || '';
    const trackerId = getAttr('jackettindexer', 'id') || '';
    const categoryDesc = getTag('category') || '';
    const seeders = parseInt(getAttrValue('seeders') || '0', 10);
    const peers = parseInt(getAttrValue('peers') || '0', 10);
    const magnetUri = getAttrValue('magneturl') || '';
    const infoHash = getAttrValue('infohash') || '';
    const downloadVolumeFactor = parseFloat(
      getAttrValue('downloadvolumefactor') || '1'
    );
    const uploadVolumeFactor = parseFloat(
      getAttrValue('uploadvolumefactor') || '1'
    );

    if (title) {
      results.push({
        guid,
        title,
        tracker,
        trackerId,
        categoryDesc,
        size,
        publishDate: pubDate,
        link: link || undefined,
        magnetUri: magnetUri || undefined,
        infoHash: infoHash || undefined,
        seeders: seeders || undefined,
        peers: peers || undefined,
        downloadVolumeFactor,
        uploadVolumeFactor,
      });
    }
  }

  return results;
}

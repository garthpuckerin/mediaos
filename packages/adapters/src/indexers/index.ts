/**
 * Indexer Adapters
 *
 * Provides integration with various indexer sources:
 * - Prowlarr: Indexer manager with unified API
 * - Jackett: Proxy server for torrent trackers
 * - Direct indexers: Nyaa, 1337x, etc.
 */

export {
  prowlarr,
  type ProwlarrConfig,
  type ProwlarrIndexer,
  type ProwlarrSearchResult,
  type SearchOptions as ProwlarrSearchOptions,
} from './prowlarr.js';
export {
  jackett,
  type JackettConfig,
  type JackettIndexer,
  type JackettSearchResult,
  type SearchOptions as JackettSearchOptions,
  JACKETT_CATEGORIES,
} from './jackett.js';

// Common types
export type SearchQuery = { q: string; category?: string };
export type SearchResult = {
  title: string;
  size?: string;
  seeders?: number;
  leechers?: number;
  link?: string;
  magnetUri?: string;
  protocol?: 'torrent' | 'usenet';
  indexer?: string;
  publishDate?: string;
};

export interface IndexerAdapter {
  name: string;
  type: 'torrent' | 'usenet';
  search(q: SearchQuery): Promise<SearchResult[]>;
  health(): Promise<{ ok: boolean; latencyMs?: number }>;
}

// Built-in stub adapters for common public indexers
export const nyaa: IndexerAdapter = {
  name: 'Nyaa',
  type: 'torrent',
  async search(q) {
    return [
      {
        title: `[Nyaa] ${q.q} — STUB`,
        size: '1.2GB',
        seeders: 123,
        protocol: 'torrent',
        indexer: 'Nyaa',
      },
    ];
  },
  async health() {
    return { ok: true, latencyMs: 200 };
  },
};

export const x1337: IndexerAdapter = {
  name: '1337x',
  type: 'torrent',
  async search(q) {
    return [
      {
        title: `[1337x] ${q.q} — STUB`,
        size: '2.1GB',
        seeders: 456,
        protocol: 'torrent',
        indexer: '1337x',
      },
    ];
  },
  async health() {
    return { ok: true, latencyMs: 150 };
  },
};

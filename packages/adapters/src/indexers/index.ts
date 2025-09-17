export type SearchQuery = { q: string; category?: string };
export type SearchResult = { title: string; size?: string; seeders?: number; leechers?: number; link?: string };

export interface IndexerAdapter {
  name: string;
  type: 'torrent'|'usenet';
  search(q: SearchQuery): Promise<SearchResult[]>;
  health(): Promise<{ ok: boolean; latencyMs?: number }>;
}

// Example stub
export const nyaa: IndexerAdapter = {
  name: 'Nyaa',
  type: 'torrent',
  async search(q) { return [{ title: `[Nyaa] ${q.q} — STUB`, size: '1.2GB', seeders: 123 }]; },
  async health() { return { ok: true, latencyMs: 200 }; }
};

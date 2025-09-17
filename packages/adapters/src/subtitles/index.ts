export type SubQuery = { title: string; lang: string };
export type SubResult = { provider: string; score: number; url: string };

export interface SubtitleAdapter {
  name: string;
  fetch(q: SubQuery): Promise<SubResult[]>;
}

// Example stub
export const opensubtitles: SubtitleAdapter = {
  name: 'OpenSubtitles',
  async fetch(q) { return [{ provider: 'OpenSubtitles', score: 0.8, url: 'https://example.com/sub.srt' }]; }
};

/**
 * MusicBrainz Adapter
 *
 * Provides metadata for music (artists, albums, tracks).
 * API Documentation: https://musicbrainz.org/doc/MusicBrainz_API
 */

export interface MusicBrainzConfig {
  userAgent: string; // Required by MusicBrainz API
}

export interface MBArtist {
  id: string;
  name: string;
  sortName: string;
  type: string | null;
  country: string | null;
  disambiguation: string | null;
  beginDate: string | null;
  endDate: string | null;
}

export interface MBRelease {
  id: string;
  title: string;
  status: string | null;
  date: string | null;
  year: number | null;
  country: string | null;
  trackCount: number;
  artistCredits: string[];
  coverArtUrl: string | null;
}

export interface MBRecording {
  id: string;
  title: string;
  length: number | null; // milliseconds
  artistCredits: string[];
}

const BASE_URL = 'https://musicbrainz.org/ws/2';
const COVER_ART_URL = 'https://coverartarchive.org';

/**
 * MusicBrainz API adapter
 */
export const musicbrainz = {
  /**
   * Search for artists
   */
  async searchArtists(
    cfg: MusicBrainzConfig,
    query: string,
    limit = 10
  ): Promise<{ ok: true; results: MBArtist[] } | { ok: false; error: string }> {
    try {
      const url = new URL(`${BASE_URL}/artist`);
      url.searchParams.set('query', query);
      url.searchParams.set('limit', String(limit));
      url.searchParams.set('fmt', 'json');

      const res = await fetch(url.toString(), {
        headers: {
          'User-Agent': cfg.userAgent,
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        return { ok: false, error: `HTTP ${res.status}` };
      }

      const data = await res.json();
      const results: MBArtist[] = (data.artists || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        sortName: a['sort-name'] || a.name,
        type: a.type || null,
        country: a.country || null,
        disambiguation: a.disambiguation || null,
        beginDate: a['life-span']?.begin || null,
        endDate: a['life-span']?.end || null,
      }));

      return { ok: true, results };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },

  /**
   * Search for releases (albums)
   */
  async searchReleases(
    cfg: MusicBrainzConfig,
    query: string,
    artistName?: string,
    limit = 10
  ): Promise<
    { ok: true; results: MBRelease[] } | { ok: false; error: string }
  > {
    try {
      const url = new URL(`${BASE_URL}/release`);
      let searchQuery = query;
      if (artistName) {
        searchQuery = `release:"${query}" AND artist:"${artistName}"`;
      }
      url.searchParams.set('query', searchQuery);
      url.searchParams.set('limit', String(limit));
      url.searchParams.set('fmt', 'json');

      const res = await fetch(url.toString(), {
        headers: {
          'User-Agent': cfg.userAgent,
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        return { ok: false, error: `HTTP ${res.status}` };
      }

      const data = await res.json();
      const results: MBRelease[] = (data.releases || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        status: r.status || null,
        date: r.date || null,
        year: r.date ? parseInt(r.date.slice(0, 4), 10) : null,
        country: r.country || null,
        trackCount: r['track-count'] || 0,
        artistCredits: (r['artist-credit'] || [])
          .map((ac: any) => ac.name || ac.artist?.name)
          .filter(Boolean),
        coverArtUrl: null, // Fetch separately if needed
      }));

      return { ok: true, results };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },

  /**
   * Get release details with tracks
   */
  async getRelease(
    cfg: MusicBrainzConfig,
    releaseId: string
  ): Promise<
    | { ok: true; release: MBRelease; tracks: MBRecording[] }
    | { ok: false; error: string }
  > {
    try {
      const url = new URL(`${BASE_URL}/release/${releaseId}`);
      url.searchParams.set('inc', 'recordings+artist-credits');
      url.searchParams.set('fmt', 'json');

      const res = await fetch(url.toString(), {
        headers: {
          'User-Agent': cfg.userAgent,
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        return { ok: false, error: `HTTP ${res.status}` };
      }

      const r = await res.json();

      // Get tracks from all media
      const tracks: MBRecording[] = [];
      for (const media of r.media || []) {
        for (const track of media.tracks || []) {
          const rec = track.recording || {};
          tracks.push({
            id: rec.id || track.id,
            title: track.title || rec.title,
            length: track.length || rec.length || null,
            artistCredits: (rec['artist-credit'] || r['artist-credit'] || [])
              .map((ac: any) => ac.name || ac.artist?.name)
              .filter(Boolean),
          });
        }
      }

      const release: MBRelease = {
        id: r.id,
        title: r.title,
        status: r.status || null,
        date: r.date || null,
        year: r.date ? parseInt(r.date.slice(0, 4), 10) : null,
        country: r.country || null,
        trackCount: tracks.length,
        artistCredits: (r['artist-credit'] || [])
          .map((ac: any) => ac.name || ac.artist?.name)
          .filter(Boolean),
        coverArtUrl: null,
      };

      return { ok: true, release, tracks };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },

  /**
   * Get cover art URL for a release
   */
  async getCoverArt(
    cfg: MusicBrainzConfig,
    releaseId: string
  ): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
    try {
      const url = `${COVER_ART_URL}/release/${releaseId}/front`;

      // Check if cover art exists
      const res = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': cfg.userAgent,
        },
      });

      if (res.ok) {
        return { ok: true, url };
      }

      return { ok: false, error: 'No cover art found' };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};

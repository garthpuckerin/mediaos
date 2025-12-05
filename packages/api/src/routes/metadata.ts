/**
 * Metadata API Routes
 *
 * Provides endpoints for searching and fetching metadata from external providers.
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';

import { authenticate, requireAdmin } from '../middleware/auth.js';
import { tmdb, musicbrainz } from '@mediaos/adapters/src/metadata/index.js';
import { encrypt, decrypt, isEncrypted } from '../services/encryption.js';

// Config paths
const CONFIG_DIR = path.join(process.cwd(), 'config');
const METADATA_FILE = path.join(CONFIG_DIR, 'metadata.json');

interface MetadataSettings {
  tmdb?: {
    apiKey?: string;
    language?: string;
    includeAdult?: boolean;
  };
  musicbrainz?: {
    enabled?: boolean;
  };
}

async function loadSettings(): Promise<MetadataSettings> {
  try {
    const raw = await fs.readFile(METADATA_FILE, 'utf8');
    const data = JSON.parse(raw);

    // Decrypt API key
    if (data.tmdb?.apiKey && isEncrypted(data.tmdb.apiKey)) {
      data.tmdb.apiKey = decrypt(data.tmdb.apiKey);
    }

    return data;
  } catch {
    return {};
  }
}

async function saveSettings(settings: MetadataSettings): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });

  const toSave = { ...settings };

  // Encrypt API key
  if (toSave.tmdb?.apiKey && !isEncrypted(toSave.tmdb.apiKey)) {
    toSave.tmdb = { ...toSave.tmdb, apiKey: encrypt(toSave.tmdb.apiKey) };
  }

  await fs.writeFile(METADATA_FILE, JSON.stringify(toSave, null, 2));
}

const plugin: FastifyPluginAsync = async (app) => {
  /**
   * GET /api/metadata/settings
   * Get current metadata provider settings
   */
  app.get('/settings', { preHandler: authenticate }, async () => {
    const settings = await loadSettings();
    return {
      tmdb: {
        hasApiKey: !!settings.tmdb?.apiKey,
        language: settings.tmdb?.language || 'en-US',
        includeAdult: settings.tmdb?.includeAdult ?? false,
      },
      musicbrainz: {
        enabled: settings.musicbrainz?.enabled ?? true,
      },
    };
  });

  /**
   * POST /api/metadata/settings
   * Update metadata provider settings
   */
  app.post('/settings', { preHandler: requireAdmin }, async (req) => {
    const schema = z.object({
      tmdb: z
        .object({
          apiKey: z.string().optional(),
          language: z.string().optional(),
          includeAdult: z.boolean().optional(),
        })
        .optional(),
      musicbrainz: z
        .object({
          enabled: z.boolean().optional(),
        })
        .optional(),
    });

    const data = schema.parse(req.body);
    const existing = await loadSettings();

    const settings: MetadataSettings = {
      tmdb: {
        apiKey: data.tmdb?.apiKey || existing.tmdb?.apiKey,
        language: data.tmdb?.language ?? existing.tmdb?.language ?? 'en-US',
        includeAdult:
          data.tmdb?.includeAdult ?? existing.tmdb?.includeAdult ?? false,
      },
      musicbrainz: {
        enabled:
          data.musicbrainz?.enabled ?? existing.musicbrainz?.enabled ?? true,
      },
    };

    await saveSettings(settings);

    return {
      ok: true,
      tmdb: {
        hasApiKey: !!settings.tmdb?.apiKey,
        language: settings.tmdb?.language,
        includeAdult: settings.tmdb?.includeAdult,
      },
      musicbrainz: {
        enabled: settings.musicbrainz?.enabled,
      },
    };
  });

  /**
   * POST /api/metadata/search/movie
   * Search for movies
   */
  app.post('/search/movie', { preHandler: authenticate }, async (req) => {
    const schema = z.object({
      query: z.string().min(1),
      year: z.number().optional(),
    });

    const { query, year } = schema.parse(req.body);
    const settings = await loadSettings();

    if (!settings.tmdb?.apiKey) {
      return { ok: false, error: 'TMDB API key not configured' };
    }

    const result = await tmdb.searchMovies(
      {
        apiKey: settings.tmdb.apiKey,
        language: settings.tmdb.language,
        includeAdult: settings.tmdb.includeAdult,
      },
      query,
      year
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    return {
      ok: true,
      results: result.results.map((m) => ({
        ...m,
        posterUrl: tmdb.getImageUrl(m.posterPath, 'w342'),
        backdropUrl: tmdb.getImageUrl(m.backdropPath, 'w780'),
      })),
    };
  });

  /**
   * GET /api/metadata/movie/:id
   * Get movie details
   */
  app.get('/movie/:id', { preHandler: authenticate }, async (req) => {
    const movieId = parseInt((req.params as any).id, 10);
    const settings = await loadSettings();

    if (!settings.tmdb?.apiKey) {
      return { ok: false, error: 'TMDB API key not configured' };
    }

    const result = await tmdb.getMovie(
      {
        apiKey: settings.tmdb.apiKey,
        language: settings.tmdb.language,
      },
      movieId
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    return {
      ok: true,
      movie: {
        ...result.movie,
        posterUrl: tmdb.getImageUrl(result.movie.posterPath, 'w500'),
        backdropUrl: tmdb.getImageUrl(result.movie.backdropPath, 'original'),
      },
    };
  });

  /**
   * POST /api/metadata/search/tv
   * Search for TV shows
   */
  app.post('/search/tv', { preHandler: authenticate }, async (req) => {
    const schema = z.object({
      query: z.string().min(1),
      year: z.number().optional(),
    });

    const { query, year } = schema.parse(req.body);
    const settings = await loadSettings();

    if (!settings.tmdb?.apiKey) {
      return { ok: false, error: 'TMDB API key not configured' };
    }

    const result = await tmdb.searchTVShows(
      {
        apiKey: settings.tmdb.apiKey,
        language: settings.tmdb.language,
      },
      query,
      year
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    return {
      ok: true,
      results: result.results.map((s) => ({
        ...s,
        posterUrl: tmdb.getImageUrl(s.posterPath, 'w342'),
        backdropUrl: tmdb.getImageUrl(s.backdropPath, 'w780'),
      })),
    };
  });

  /**
   * GET /api/metadata/tv/:id
   * Get TV show details
   */
  app.get('/tv/:id', { preHandler: authenticate }, async (req) => {
    const tvId = parseInt((req.params as any).id, 10);
    const settings = await loadSettings();

    if (!settings.tmdb?.apiKey) {
      return { ok: false, error: 'TMDB API key not configured' };
    }

    const result = await tmdb.getTVShow(
      {
        apiKey: settings.tmdb.apiKey,
        language: settings.tmdb.language,
      },
      tvId
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    return {
      ok: true,
      show: {
        ...result.show,
        posterUrl: tmdb.getImageUrl(result.show.posterPath, 'w500'),
        backdropUrl: tmdb.getImageUrl(result.show.backdropPath, 'original'),
      },
      seasons: result.seasons.map((sn) => ({
        ...sn,
        posterUrl: tmdb.getImageUrl(sn.posterPath, 'w342'),
      })),
    };
  });

  /**
   * GET /api/metadata/tv/:id/season/:seasonNumber
   * Get TV season details with episodes
   */
  app.get(
    '/tv/:id/season/:seasonNumber',
    { preHandler: authenticate },
    async (req) => {
      const tvId = parseInt((req.params as any).id, 10);
      const seasonNumber = parseInt((req.params as any).seasonNumber, 10);
      const settings = await loadSettings();

      if (!settings.tmdb?.apiKey) {
        return { ok: false, error: 'TMDB API key not configured' };
      }

      const result = await tmdb.getTVSeason(
        {
          apiKey: settings.tmdb.apiKey,
          language: settings.tmdb.language,
        },
        tvId,
        seasonNumber
      );

      if (!result.ok) {
        return { ok: false, error: result.error };
      }

      return {
        ok: true,
        season: {
          ...result.season,
          posterUrl: tmdb.getImageUrl(result.season.posterPath, 'w342'),
        },
        episodes: result.episodes.map((ep) => ({
          ...ep,
          stillUrl: tmdb.getImageUrl(ep.stillPath, 'w342'),
        })),
      };
    }
  );

  /**
   * POST /api/metadata/search/music
   * Search for music (artists or albums)
   */
  app.post('/search/music', { preHandler: authenticate }, async (req) => {
    const schema = z.object({
      query: z.string().min(1),
      type: z.enum(['artist', 'album']),
      artistName: z.string().optional(),
    });

    const { query, type, artistName } = schema.parse(req.body);
    const settings = await loadSettings();

    if (settings.musicbrainz?.enabled === false) {
      return { ok: false, error: 'MusicBrainz is disabled' };
    }

    const config = { userAgent: 'MediaOS/1.0 (github.com/mediaos)' };

    if (type === 'artist') {
      const result = await musicbrainz.searchArtists(config, query);
      if (!result.ok) {
        return { ok: false, error: result.error };
      }
      return { ok: true, type: 'artist', results: result.results };
    } else {
      const result = await musicbrainz.searchReleases(
        config,
        query,
        artistName
      );
      if (!result.ok) {
        return { ok: false, error: result.error };
      }
      return { ok: true, type: 'album', results: result.results };
    }
  });

  /**
   * GET /api/metadata/music/release/:id
   * Get album/release details
   */
  app.get('/music/release/:id', { preHandler: authenticate }, async (req) => {
    const releaseId = (req.params as any).id as string;
    const settings = await loadSettings();

    if (settings.musicbrainz?.enabled === false) {
      return { ok: false, error: 'MusicBrainz is disabled' };
    }

    const config = { userAgent: 'MediaOS/1.0 (github.com/mediaos)' };

    const result = await musicbrainz.getRelease(config, releaseId);
    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    // Try to get cover art
    const coverResult = await musicbrainz.getCoverArt(config, releaseId);

    return {
      ok: true,
      release: {
        ...result.release,
        coverArtUrl: coverResult.ok ? coverResult.url : null,
      },
      tracks: result.tracks,
    };
  });
};

export default plugin;

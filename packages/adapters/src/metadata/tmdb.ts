/**
 * TMDB (The Movie Database) Adapter
 *
 * Provides metadata for movies and TV shows.
 * API Documentation: https://developer.themoviedb.org/docs
 */

export interface TMDBConfig {
  apiKey: string;
  language?: string;
  includeAdult?: boolean;
}

export interface TMDBMovie {
  id: number;
  title: string;
  originalTitle: string;
  overview: string;
  releaseDate: string;
  year: number;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number;
  voteCount: number;
  genres: string[];
  runtime: number | null;
  tagline: string | null;
  imdbId: string | null;
}

export interface TMDBTVShow {
  id: number;
  name: string;
  originalName: string;
  overview: string;
  firstAirDate: string;
  year: number;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number;
  voteCount: number;
  genres: string[];
  numberOfSeasons: number;
  numberOfEpisodes: number;
  status: string;
  networks: string[];
}

export interface TMDBSeason {
  id: number;
  seasonNumber: number;
  name: string;
  overview: string;
  posterPath: string | null;
  airDate: string | null;
  episodeCount: number;
}

export interface TMDBEpisode {
  id: number;
  name: string;
  overview: string;
  seasonNumber: number;
  episodeNumber: number;
  airDate: string | null;
  stillPath: string | null;
  voteAverage: number;
  runtime: number | null;
}

const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

/**
 * TMDB API adapter
 */
export const tmdb = {
  /**
   * Get full image URL from TMDB path
   */
  getImageUrl(
    path: string | null,
    size: 'w92' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w500'
  ): string | null {
    if (!path) return null;
    return `${IMAGE_BASE_URL}/${size}${path}`;
  },

  /**
   * Search for movies
   */
  async searchMovies(
    cfg: TMDBConfig,
    query: string,
    year?: number
  ): Promise<
    { ok: true; results: TMDBMovie[] } | { ok: false; error: string }
  > {
    try {
      const url = new URL(`${BASE_URL}/search/movie`);
      url.searchParams.set('api_key', cfg.apiKey);
      url.searchParams.set('query', query);
      url.searchParams.set('language', cfg.language || 'en-US');
      url.searchParams.set('include_adult', String(cfg.includeAdult ?? false));
      if (year) url.searchParams.set('year', String(year));

      const res = await fetch(url.toString());
      if (!res.ok) {
        return { ok: false, error: `HTTP ${res.status}` };
      }

      const data = await res.json();
      const results: TMDBMovie[] = (data.results || []).map((m: any) => ({
        id: m.id,
        title: m.title,
        originalTitle: m.original_title,
        overview: m.overview || '',
        releaseDate: m.release_date || '',
        year: m.release_date ? parseInt(m.release_date.slice(0, 4), 10) : 0,
        posterPath: m.poster_path,
        backdropPath: m.backdrop_path,
        voteAverage: m.vote_average || 0,
        voteCount: m.vote_count || 0,
        genres: [],
        runtime: null,
        tagline: null,
        imdbId: null,
      }));

      return { ok: true, results };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },

  /**
   * Get movie details
   */
  async getMovie(
    cfg: TMDBConfig,
    movieId: number
  ): Promise<{ ok: true; movie: TMDBMovie } | { ok: false; error: string }> {
    try {
      const url = new URL(`${BASE_URL}/movie/${movieId}`);
      url.searchParams.set('api_key', cfg.apiKey);
      url.searchParams.set('language', cfg.language || 'en-US');

      const res = await fetch(url.toString());
      if (!res.ok) {
        return { ok: false, error: `HTTP ${res.status}` };
      }

      const m = await res.json();
      const movie: TMDBMovie = {
        id: m.id,
        title: m.title,
        originalTitle: m.original_title,
        overview: m.overview || '',
        releaseDate: m.release_date || '',
        year: m.release_date ? parseInt(m.release_date.slice(0, 4), 10) : 0,
        posterPath: m.poster_path,
        backdropPath: m.backdrop_path,
        voteAverage: m.vote_average || 0,
        voteCount: m.vote_count || 0,
        genres: (m.genres || []).map((g: any) => g.name),
        runtime: m.runtime,
        tagline: m.tagline,
        imdbId: m.imdb_id,
      };

      return { ok: true, movie };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },

  /**
   * Search for TV shows
   */
  async searchTVShows(
    cfg: TMDBConfig,
    query: string,
    year?: number
  ): Promise<
    { ok: true; results: TMDBTVShow[] } | { ok: false; error: string }
  > {
    try {
      const url = new URL(`${BASE_URL}/search/tv`);
      url.searchParams.set('api_key', cfg.apiKey);
      url.searchParams.set('query', query);
      url.searchParams.set('language', cfg.language || 'en-US');
      if (year) url.searchParams.set('first_air_date_year', String(year));

      const res = await fetch(url.toString());
      if (!res.ok) {
        return { ok: false, error: `HTTP ${res.status}` };
      }

      const data = await res.json();
      const results: TMDBTVShow[] = (data.results || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        originalName: s.original_name,
        overview: s.overview || '',
        firstAirDate: s.first_air_date || '',
        year: s.first_air_date ? parseInt(s.first_air_date.slice(0, 4), 10) : 0,
        posterPath: s.poster_path,
        backdropPath: s.backdrop_path,
        voteAverage: s.vote_average || 0,
        voteCount: s.vote_count || 0,
        genres: [],
        numberOfSeasons: 0,
        numberOfEpisodes: 0,
        status: '',
        networks: [],
      }));

      return { ok: true, results };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },

  /**
   * Get TV show details
   */
  async getTVShow(
    cfg: TMDBConfig,
    tvId: number
  ): Promise<
    | { ok: true; show: TMDBTVShow; seasons: TMDBSeason[] }
    | { ok: false; error: string }
  > {
    try {
      const url = new URL(`${BASE_URL}/tv/${tvId}`);
      url.searchParams.set('api_key', cfg.apiKey);
      url.searchParams.set('language', cfg.language || 'en-US');

      const res = await fetch(url.toString());
      if (!res.ok) {
        return { ok: false, error: `HTTP ${res.status}` };
      }

      const s = await res.json();
      const show: TMDBTVShow = {
        id: s.id,
        name: s.name,
        originalName: s.original_name,
        overview: s.overview || '',
        firstAirDate: s.first_air_date || '',
        year: s.first_air_date ? parseInt(s.first_air_date.slice(0, 4), 10) : 0,
        posterPath: s.poster_path,
        backdropPath: s.backdrop_path,
        voteAverage: s.vote_average || 0,
        voteCount: s.vote_count || 0,
        genres: (s.genres || []).map((g: any) => g.name),
        numberOfSeasons: s.number_of_seasons || 0,
        numberOfEpisodes: s.number_of_episodes || 0,
        status: s.status || '',
        networks: (s.networks || []).map((n: any) => n.name),
      };

      const seasons: TMDBSeason[] = (s.seasons || []).map((sn: any) => ({
        id: sn.id,
        seasonNumber: sn.season_number,
        name: sn.name,
        overview: sn.overview || '',
        posterPath: sn.poster_path,
        airDate: sn.air_date,
        episodeCount: sn.episode_count || 0,
      }));

      return { ok: true, show, seasons };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },

  /**
   * Get TV season details with episodes
   */
  async getTVSeason(
    cfg: TMDBConfig,
    tvId: number,
    seasonNumber: number
  ): Promise<
    | { ok: true; season: TMDBSeason; episodes: TMDBEpisode[] }
    | { ok: false; error: string }
  > {
    try {
      const url = new URL(`${BASE_URL}/tv/${tvId}/season/${seasonNumber}`);
      url.searchParams.set('api_key', cfg.apiKey);
      url.searchParams.set('language', cfg.language || 'en-US');

      const res = await fetch(url.toString());
      if (!res.ok) {
        return { ok: false, error: `HTTP ${res.status}` };
      }

      const sn = await res.json();
      const season: TMDBSeason = {
        id: sn.id,
        seasonNumber: sn.season_number,
        name: sn.name,
        overview: sn.overview || '',
        posterPath: sn.poster_path,
        airDate: sn.air_date,
        episodeCount: (sn.episodes || []).length,
      };

      const episodes: TMDBEpisode[] = (sn.episodes || []).map((ep: any) => ({
        id: ep.id,
        name: ep.name,
        overview: ep.overview || '',
        seasonNumber: ep.season_number,
        episodeNumber: ep.episode_number,
        airDate: ep.air_date,
        stillPath: ep.still_path,
        voteAverage: ep.vote_average || 0,
        runtime: ep.runtime,
      }));

      return { ok: true, season, episodes };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};

/**
 * File Parser - Extracts metadata from media filenames
 *
 * Handles common naming patterns:
 * - Movies: Movie.Title.Year.Quality.Source.Codec.ext
 * - Series: Show.Name.SXXEXX.Title.Quality.Source.ext
 * - Music: Artist - Album - Track.ext
 * - Books: Author - Title.ext
 */

export interface ParsedMedia {
  type: 'movie' | 'series' | 'music' | 'book' | 'unknown';
  title: string;
  year?: number;
  quality?: string;
  source?: string;
  codec?: string;
  // Series-specific
  season?: number;
  episode?: number;
  episodeTitle?: string;
  // Music-specific
  artist?: string;
  album?: string;
  track?: number;
  // Book-specific
  author?: string;
  // File info
  extension: string;
  originalFilename: string;
}

// Video file extensions
const VIDEO_EXTENSIONS = new Set([
  '.mkv',
  '.mp4',
  '.avi',
  '.mov',
  '.wmv',
  '.flv',
  '.webm',
  '.m4v',
  '.ts',
  '.m2ts',
]);

// Audio file extensions
const AUDIO_EXTENSIONS = new Set([
  '.mp3',
  '.flac',
  '.wav',
  '.aac',
  '.ogg',
  '.wma',
  '.m4a',
  '.opus',
  '.alac',
]);

// Book file extensions
const BOOK_EXTENSIONS = new Set([
  '.epub',
  '.mobi',
  '.pdf',
  '.azw',
  '.azw3',
  '.cbz',
  '.cbr',
]);

// Quality patterns
const QUALITY_PATTERNS = [
  { pattern: /2160p|4k|uhd/i, quality: '2160p' },
  { pattern: /1080p|1080i/i, quality: '1080p' },
  { pattern: /720p/i, quality: '720p' },
  { pattern: /480p|dvdrip/i, quality: '480p' },
  { pattern: /576p/i, quality: '576p' },
];

// Source patterns
const SOURCE_PATTERNS = [
  { pattern: /bluray|blu-ray|bdrip|brrip/i, source: 'BluRay' },
  { pattern: /web-?dl/i, source: 'WEB-DL' },
  { pattern: /webrip/i, source: 'WEBRip' },
  { pattern: /hdtv/i, source: 'HDTV' },
  { pattern: /dvdrip|dvd/i, source: 'DVD' },
  { pattern: /remux/i, source: 'REMUX' },
];

// Codec patterns
const CODEC_PATTERNS = [
  { pattern: /x265|hevc|h\.?265/i, codec: 'x265' },
  { pattern: /x264|h\.?264|avc/i, codec: 'x264' },
  { pattern: /xvid/i, codec: 'XviD' },
  { pattern: /av1/i, codec: 'AV1' },
];

// Season/Episode patterns
const EPISODE_PATTERNS = [
  /S(\d{1,2})E(\d{1,3})/i, // S01E01
  /(\d{1,2})x(\d{1,3})/i, // 1x01
  /Season\s*(\d+).*Episode\s*(\d+)/i, // Season 1 Episode 1
  /\[(\d{1,2})x(\d{1,3})\]/i, // [1x01]
];

// Year pattern
const YEAR_PATTERN = /(?:^|[.\s(])(\d{4})(?:[.\s)]|$)/;

/**
 * Parse a media filename to extract metadata
 */
export function parseFilename(filename: string): ParsedMedia {
  const ext = getExtension(filename);
  const nameWithoutExt = filename.slice(0, -ext.length);

  // Determine media type by extension
  const mediaType = getMediaType(ext);

  const result: ParsedMedia = {
    type: mediaType,
    title: '',
    extension: ext,
    originalFilename: filename,
  };

  switch (mediaType) {
    case 'series':
      parseSeriesFilename(nameWithoutExt, result);
      break;
    case 'movie':
      parseMovieFilename(nameWithoutExt, result);
      break;
    case 'music':
      parseMusicFilename(nameWithoutExt, result);
      break;
    case 'book':
      parseBookFilename(nameWithoutExt, result);
      break;
    default:
      // Try video parsing as fallback
      if (VIDEO_EXTENSIONS.has(ext.toLowerCase())) {
        result.type = 'movie';
        parseMovieFilename(nameWithoutExt, result);
      } else {
        result.title = cleanTitle(nameWithoutExt);
      }
  }

  return result;
}

function getExtension(filename: string): string {
  const match = filename.match(/\.[^.]+$/);
  return match ? match[0].toLowerCase() : '';
}

function getMediaType(ext: string): ParsedMedia['type'] {
  const lowerExt = ext.toLowerCase();

  // Check for series pattern first (video files might be series)
  // This is determined later by content parsing

  if (AUDIO_EXTENSIONS.has(lowerExt)) return 'music';
  if (BOOK_EXTENSIONS.has(lowerExt)) return 'book';
  if (VIDEO_EXTENSIONS.has(lowerExt)) return 'movie'; // Default, may change to series

  return 'unknown';
}

function parseSeriesFilename(name: string, result: ParsedMedia): void {
  // Try to match episode pattern
  for (const pattern of EPISODE_PATTERNS) {
    const match = name.match(pattern);
    if (match) {
      result.season = parseInt(match[1], 10);
      result.episode = parseInt(match[2], 10);

      // Extract show title (everything before the episode pattern)
      const titlePart = name.slice(0, match.index);
      result.title = cleanTitle(titlePart);

      // Extract episode title (between episode pattern and quality info)
      const afterEpisode = name.slice((match.index || 0) + match[0].length);
      const qualityMatch = afterEpisode.match(
        /\b(720p|1080p|2160p|4k|hdtv|web|bluray)/i
      );
      if (qualityMatch && qualityMatch.index !== undefined) {
        result.episodeTitle = cleanTitle(
          afterEpisode.slice(0, qualityMatch.index)
        );
      }

      break;
    }
  }

  // Extract quality, source, codec
  extractTechnicalInfo(name, result);
}

function parseMovieFilename(name: string, result: ParsedMedia): void {
  // Check if this is actually a series
  for (const pattern of EPISODE_PATTERNS) {
    if (pattern.test(name)) {
      result.type = 'series';
      parseSeriesFilename(name, result);
      return;
    }
  }

  // Find year
  const yearMatch = name.match(YEAR_PATTERN);
  if (yearMatch) {
    result.year = parseInt(yearMatch[1], 10);
    // Title is everything before the year
    const titleEnd =
      name.indexOf(yearMatch[0]) +
      (yearMatch[0].startsWith('.') || yearMatch[0].startsWith(' ') ? 1 : 0);
    result.title = cleanTitle(
      name.slice(0, titleEnd > 0 ? titleEnd - 1 : name.length)
    );
  } else {
    // No year found, try to find title before quality info
    const qualityMatch = name.match(/\b(720p|1080p|2160p|4k|hdtv|web|bluray)/i);
    if (qualityMatch && qualityMatch.index !== undefined) {
      result.title = cleanTitle(name.slice(0, qualityMatch.index));
    } else {
      result.title = cleanTitle(name);
    }
  }

  // Extract quality, source, codec
  extractTechnicalInfo(name, result);
}

function parseMusicFilename(name: string, result: ParsedMedia): void {
  // Common patterns:
  // "Artist - Album - 01 - Track.ext"
  // "01 - Track.ext"
  // "Artist - Track.ext"

  const parts = name.split(/\s*-\s*/);

  if (parts.length >= 3) {
    result.artist = cleanTitle(parts[0]);
    result.album = cleanTitle(parts[1]);
    // Try to extract track number
    const trackMatch = parts[2].match(/^(\d+)/);
    if (trackMatch) {
      result.track = parseInt(trackMatch[1], 10);
      result.title = cleanTitle(
        parts
          .slice(2)
          .join(' - ')
          .replace(/^\d+\s*/, '')
      );
    } else {
      result.title = cleanTitle(parts.slice(2).join(' - '));
    }
  } else if (parts.length === 2) {
    // Could be "Artist - Track" or "01 - Track"
    if (/^\d+$/.test(parts[0].trim())) {
      result.track = parseInt(parts[0], 10);
      result.title = cleanTitle(parts[1]);
    } else {
      result.artist = cleanTitle(parts[0]);
      result.title = cleanTitle(parts[1]);
    }
  } else {
    result.title = cleanTitle(name);
  }
}

function parseBookFilename(name: string, result: ParsedMedia): void {
  // Common patterns:
  // "Author - Title.ext"
  // "Title (Author).ext"
  // "Title.ext"

  // Check for "Author - Title" pattern
  const dashParts = name.split(/\s*-\s*/);
  if (dashParts.length >= 2) {
    result.author = cleanTitle(dashParts[0]);
    result.title = cleanTitle(dashParts.slice(1).join(' - '));
    return;
  }

  // Check for "(Author)" pattern
  const authorMatch = name.match(/\(([^)]+)\)\s*$/);
  if (authorMatch) {
    result.author = cleanTitle(authorMatch[1]);
    result.title = cleanTitle(name.slice(0, authorMatch.index));
    return;
  }

  result.title = cleanTitle(name);
}

function extractTechnicalInfo(name: string, result: ParsedMedia): void {
  // Quality
  for (const { pattern, quality } of QUALITY_PATTERNS) {
    if (pattern.test(name)) {
      result.quality = quality;
      break;
    }
  }

  // Source
  for (const { pattern, source } of SOURCE_PATTERNS) {
    if (pattern.test(name)) {
      result.source = source;
      break;
    }
  }

  // Codec
  for (const { pattern, codec } of CODEC_PATTERNS) {
    if (pattern.test(name)) {
      result.codec = codec;
      break;
    }
  }
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/\./g, ' ') // Replace dots with spaces
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/\s+/g, ' ') // Normalize multiple spaces
    .replace(/\[.*?\]/g, '') // Remove bracketed content
    .replace(/\(.*?\)/g, '') // Remove parenthetical content (for cleaning)
    .trim();
}

/**
 * Determine if a file is likely a video file
 */
export function isVideoFile(filename: string): boolean {
  const ext = getExtension(filename);
  return VIDEO_EXTENSIONS.has(ext.toLowerCase());
}

/**
 * Determine if a file is likely an audio file
 */
export function isAudioFile(filename: string): boolean {
  const ext = getExtension(filename);
  return AUDIO_EXTENSIONS.has(ext.toLowerCase());
}

/**
 * Determine if a file is likely a book file
 */
export function isBookFile(filename: string): boolean {
  const ext = getExtension(filename);
  return BOOK_EXTENSIONS.has(ext.toLowerCase());
}

/**
 * Check if a file is a media file we care about
 */
export function isMediaFile(filename: string): boolean {
  return isVideoFile(filename) || isAudioFile(filename) || isBookFile(filename);
}

/**
 * Naming Templates - Customizable file and folder naming patterns
 *
 * Supports tokens that get replaced with actual values:
 *
 * Series:
 *   {Series.Title}     - Show name
 *   {Series.CleanTitle} - Show name (filename safe)
 *   {Season}           - Season number (1, 2, 3...)
 *   {Season:00}        - Season number padded (01, 02, 03...)
 *   {Episode}          - Episode number
 *   {Episode:00}       - Episode number padded
 *   {Episode.Title}    - Episode title
 *   {Quality}          - Video quality (1080p, 720p...)
 *   {Source}           - Release source (BluRay, WEB-DL...)
 *   {Codec}            - Video codec (x264, x265...)
 *   {Extension}        - File extension
 *
 * Movies:
 *   {Movie.Title}      - Movie name
 *   {Movie.CleanTitle} - Movie name (filename safe)
 *   {Year}             - Release year
 *   {Quality}          - Video quality
 *   {Source}           - Release source
 *   {Codec}            - Video codec
 *   {Extension}        - File extension
 *
 * Music:
 *   {Artist}           - Artist name
 *   {Artist.CleanName} - Artist name (filename safe)
 *   {Album}            - Album name
 *   {Album.CleanName}  - Album name (filename safe)
 *   {Track}            - Track number
 *   {Track:00}         - Track number padded
 *   {Title}            - Track title
 *   {Extension}        - File extension
 *
 * Books:
 *   {Author}           - Author name
 *   {Author.CleanName} - Author name (filename safe)
 *   {Title}            - Book title
 *   {Title.CleanTitle} - Book title (filename safe)
 *   {Extension}        - File extension
 */

import type { ParsedMedia } from './fileParser.js';

export interface NamingConfig {
  series: {
    folderFormat: string;
    seasonFolderFormat: string;
    fileFormat: string;
  };
  movies: {
    folderFormat: string;
    fileFormat: string;
  };
  music: {
    artistFolderFormat: string;
    albumFolderFormat: string;
    fileFormat: string;
  };
  books: {
    authorFolderFormat: string;
    fileFormat: string;
  };
}

/**
 * Default naming templates (similar to Sonarr/Radarr defaults)
 */
export const DEFAULT_NAMING_CONFIG: NamingConfig = {
  series: {
    folderFormat: '{Series.CleanTitle}',
    seasonFolderFormat: 'Season {Season:00}',
    fileFormat:
      '{Series.CleanTitle} - S{Season:00}E{Episode:00} - {Episode.Title}{Quality}{Extension}',
  },
  movies: {
    folderFormat: '{Movie.CleanTitle} ({Year})',
    fileFormat: '{Movie.CleanTitle} ({Year}){Quality}{Extension}',
  },
  music: {
    artistFolderFormat: '{Artist.CleanName}',
    albumFolderFormat: '{Album.CleanName}',
    fileFormat: '{Track:00} - {Title}{Extension}',
  },
  books: {
    authorFolderFormat: '{Author.CleanName}',
    fileFormat: '{Title.CleanTitle}{Extension}',
  },
};

/**
 * Make a string safe for use as a filename/folder name
 */
export function cleanForFilename(input: string): string {
  return input
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid chars
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/\.+$/g, '') // Remove trailing dots
    .replace(/^\s+|\s+$/g, '') // Trim
    .slice(0, 200); // Limit length
}

/**
 * Pad a number with leading zeros
 */
function padNumber(num: number | undefined, width: number): string {
  if (num === undefined) return '';
  return String(num).padStart(width, '0');
}

/**
 * Replace tokens in a template string
 */
export function applyTemplate(
  template: string,
  parsed: ParsedMedia,
  additionalData?: Record<string, string | number | undefined>
): string {
  let result = template;

  // Helper to replace a token
  const replace = (token: string, value: string | number | undefined) => {
    if (value === undefined || value === '') return;
    result = result.replace(
      new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      String(value)
    );
  };

  // Helper for padded numbers
  const replacePadded = (baseToken: string, value: number | undefined) => {
    if (value === undefined) return;
    // Match {Token:00}, {Token:000}, etc.
    const paddedPattern = new RegExp(`\\{${baseToken}:(0+)\\}`, 'g');
    result = result.replace(paddedPattern, (_, zeros) =>
      padNumber(value, zeros.length)
    );
    // Also replace non-padded version
    replace(`{${baseToken}}`, value);
  };

  // Common tokens
  replace('{Quality}', parsed.quality ? ` [${parsed.quality}]` : '');
  replace('{Source}', parsed.source);
  replace('{Codec}', parsed.codec);
  replace('{Extension}', parsed.extension);

  // Type-specific tokens
  switch (parsed.type) {
    case 'series':
      replace('{Series.Title}', parsed.title);
      replace('{Series.CleanTitle}', cleanForFilename(parsed.title));
      replacePadded('Season', parsed.season);
      replacePadded('Episode', parsed.episode);
      replace(
        '{Episode.Title}',
        parsed.episodeTitle ? ` - ${cleanForFilename(parsed.episodeTitle)}` : ''
      );
      break;

    case 'movie':
      replace('{Movie.Title}', parsed.title);
      replace('{Movie.CleanTitle}', cleanForFilename(parsed.title));
      replace('{Year}', parsed.year);
      break;

    case 'music':
      replace('{Artist}', parsed.artist);
      replace(
        '{Artist.CleanName}',
        parsed.artist ? cleanForFilename(parsed.artist) : ''
      );
      replace('{Album}', parsed.album);
      replace(
        '{Album.CleanName}',
        parsed.album ? cleanForFilename(parsed.album) : ''
      );
      replacePadded('Track', parsed.track);
      replace('{Title}', parsed.title);
      replace('{Title.CleanTitle}', cleanForFilename(parsed.title));
      break;

    case 'book':
      replace('{Author}', parsed.author);
      replace(
        '{Author.CleanName}',
        parsed.author ? cleanForFilename(parsed.author) : ''
      );
      replace('{Title}', parsed.title);
      replace('{Title.CleanTitle}', cleanForFilename(parsed.title));
      break;
  }

  // Additional data (for overrides)
  if (additionalData) {
    for (const [key, value] of Object.entries(additionalData)) {
      replace(`{${key}}`, value);
    }
  }

  // Clean up any remaining empty tokens or double spaces
  result = result
    .replace(/\{[^}]+\}/g, '') // Remove unreplaced tokens
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/\s*-\s*-\s*/g, ' - ') // Fix double dashes
    .replace(/^\s*-\s*|\s*-\s*$/g, '') // Remove leading/trailing dashes
    .trim();

  return result;
}

/**
 * Generate the full folder path for a media item
 */
export function generateFolderPath(
  parsed: ParsedMedia,
  config: NamingConfig = DEFAULT_NAMING_CONFIG
): string[] {
  const parts: string[] = [];

  switch (parsed.type) {
    case 'series':
      parts.push(applyTemplate(config.series.folderFormat, parsed));
      if (parsed.season !== undefined) {
        parts.push(applyTemplate(config.series.seasonFolderFormat, parsed));
      }
      break;

    case 'movie':
      parts.push(applyTemplate(config.movies.folderFormat, parsed));
      break;

    case 'music':
      if (parsed.artist) {
        parts.push(applyTemplate(config.music.artistFolderFormat, parsed));
      }
      if (parsed.album) {
        parts.push(applyTemplate(config.music.albumFolderFormat, parsed));
      }
      break;

    case 'book':
      if (parsed.author) {
        parts.push(applyTemplate(config.books.authorFolderFormat, parsed));
      }
      break;
  }

  return parts.filter((p) => p.length > 0);
}

/**
 * Generate the filename for a media item
 */
export function generateFilename(
  parsed: ParsedMedia,
  config: NamingConfig = DEFAULT_NAMING_CONFIG
): string {
  let template: string;

  switch (parsed.type) {
    case 'series':
      template = config.series.fileFormat;
      break;
    case 'movie':
      template = config.movies.fileFormat;
      break;
    case 'music':
      template = config.music.fileFormat;
      break;
    case 'book':
      template = config.books.fileFormat;
      break;
    default:
      // Fallback: just use original filename
      return parsed.originalFilename;
  }

  const filename = applyTemplate(template, parsed);

  // Ensure we have an extension
  if (!filename.includes('.') && parsed.extension) {
    return filename + parsed.extension;
  }

  return filename;
}

/**
 * Preview what the organized path would be
 */
export function previewOrganizedPath(
  parsed: ParsedMedia,
  rootPath: string,
  config: NamingConfig = DEFAULT_NAMING_CONFIG
): { folderPath: string; filename: string; fullPath: string } {
  const folderParts = generateFolderPath(parsed, config);
  const filename = generateFilename(parsed, config);

  const folderPath = [rootPath, ...folderParts].join('/');
  const fullPath = [folderPath, filename].join('/');

  return { folderPath, filename, fullPath };
}

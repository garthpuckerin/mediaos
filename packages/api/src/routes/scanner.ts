/**
 * Scanner API Routes
 *
 * Provides endpoints for library scanning functionality.
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  getScanner,
  type MediaFolder,
  type ScannedItem,
} from '../services/scanner/index.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { getMediaFolders } from '../services/settingsStore.js';

// Schema for manual scan request
const ScanRequestSchema = z.object({
  folders: z
    .array(
      z.object({
        path: z.string(),
        type: z.enum(['movies', 'series', 'music', 'books']),
      })
    )
    .optional(),
});

// Library file for now (will migrate to DB later)
const CONFIG_DIR = path.join(process.cwd(), 'config');
const LIB_FILE = path.join(CONFIG_DIR, 'library.json');

interface LibraryItem {
  id: string;
  kind: 'movie' | 'series' | 'music' | 'book';
  title: string;
  year?: number;
  quality?: string;
  source?: string;
  posterUrl?: string;
  backgroundUrl?: string;
  filePath?: string;
  fileSize?: number;
  metadata?: Record<string, unknown>;
}

async function loadLibrary(): Promise<LibraryItem[]> {
  try {
    const raw = await fs.readFile(LIB_FILE, 'utf8');
    const json = JSON.parse(raw);
    return Array.isArray(json?.items) ? json.items : [];
  } catch {
    return [];
  }
}

async function saveLibrary(items: LibraryItem[]): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(LIB_FILE, JSON.stringify({ items }, null, 2), 'utf8');
}

/**
 * Convert scanned item to library item
 */
function scannedToLibraryItem(scanned: ScannedItem): LibraryItem {
  const { parsed, filePath, fileSize } = scanned;

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  // Map parsed type to library kind
  const kindMap: Record<string, LibraryItem['kind']> = {
    movie: 'movie',
    series: 'series',
    music: 'music',
    book: 'book',
    unknown: 'movie', // Default fallback
  };

  // Build title with series info if applicable
  let title = parsed.title;
  if (parsed.type === 'series' && parsed.season !== undefined) {
    // For series, use show name as title
    title = parsed.title;
  } else if (parsed.type === 'music' && parsed.artist) {
    title = `${parsed.artist} - ${parsed.title}`;
  } else if (parsed.type === 'book' && parsed.author) {
    title = `${parsed.author} - ${parsed.title}`;
  }

  return {
    id,
    kind: kindMap[parsed.type] || 'movie',
    title,
    year: parsed.year,
    quality: parsed.quality,
    source: parsed.source,
    filePath,
    fileSize,
    metadata: {
      originalFilename: parsed.originalFilename,
      codec: parsed.codec,
      season: parsed.season,
      episode: parsed.episode,
      episodeTitle: parsed.episodeTitle,
      artist: parsed.artist,
      album: parsed.album,
      track: parsed.track,
      author: parsed.author,
    },
  };
}

const plugin: FastifyPluginAsync = async (app) => {
  /**
   * GET /api/scanner/status
   * Get current scan status and progress
   */
  app.get('/api/scanner/status', { preHandler: authenticate }, async () => {
    const scanner = getScanner();
    return {
      ok: true,
      ...scanner.getProgress(),
    };
  });

  /**
   * POST /api/scanner/start
   * Start a library scan
   */
  app.post('/api/scanner/start', { preHandler: requireAdmin }, async (req) => {
    const scanner = getScanner();

    if (scanner.isScanning()) {
      return {
        ok: false,
        error: 'Scan already in progress',
        progress: scanner.getProgress(),
      };
    }

    const body = ScanRequestSchema.parse(req.body || {});

    // Get folders from request or settings
    let folders: MediaFolder[];

    if (body.folders && body.folders.length > 0) {
      folders = body.folders;
    } else {
      // Load from settings
      const savedFolders = await getMediaFolders();
      folders = savedFolders.map((f) => ({
        path: f.path,
        type: f.type as MediaFolder['type'],
      }));
    }

    if (folders.length === 0) {
      return {
        ok: false,
        error: 'No folders configured for scanning',
      };
    }

    // Verify folders exist
    for (const folder of folders) {
      try {
        await fs.access(folder.path);
      } catch {
        return {
          ok: false,
          error: `Folder not accessible: ${folder.path}`,
        };
      }
    }

    // Start scan in background
    scanner
      .scan(folders)
      .then(async (result) => {
        if (result.success) {
          // Merge scanned items into library
          const existingItems = await loadLibrary();
          const scannedItems = scanner.getScannedItems();

          let added = 0;
          let updated = 0;

          for (const scanned of scannedItems) {
            const newItem = scannedToLibraryItem(scanned);

            // Check for existing item by title and kind
            const existingIndex = existingItems.findIndex(
              (item) =>
                item.kind === newItem.kind &&
                item.title.toLowerCase() === newItem.title.toLowerCase()
            );

            if (existingIndex >= 0) {
              // Update existing item
              existingItems[existingIndex] = {
                ...existingItems[existingIndex],
                ...newItem,
                id: existingItems[existingIndex].id, // Keep original ID
              };
              updated++;
            } else {
              // Add new item
              existingItems.push(newItem);
              added++;
            }
          }

          await saveLibrary(existingItems);

          app.log.info({
            msg: 'Scan completed',
            itemsFound: result.itemsFound,
            itemsAdded: added,
            itemsUpdated: updated,
            duration: result.duration,
          });
        }
      })
      .catch((error) => {
        app.log.error({ err: error }, 'Scan failed');
      });

    return {
      ok: true,
      message: 'Scan started',
      progress: scanner.getProgress(),
    };
  });

  /**
   * POST /api/scanner/stop
   * Abort the current scan
   */
  app.post('/api/scanner/stop', { preHandler: requireAdmin }, async () => {
    const scanner = getScanner();

    if (!scanner.isScanning()) {
      return {
        ok: false,
        error: 'No scan in progress',
      };
    }

    scanner.abort();

    return {
      ok: true,
      message: 'Scan abort requested',
    };
  });

  /**
   * GET /api/scanner/preview
   * Preview what would be scanned without adding to library
   */
  app.get('/api/scanner/preview', { preHandler: authenticate }, async () => {
    const scanner = getScanner();

    if (scanner.isScanning()) {
      return {
        ok: false,
        error: 'Scan in progress - cannot preview',
      };
    }

    const items = scanner.getScannedItems().map(scannedToLibraryItem);

    return {
      ok: true,
      items,
      count: items.length,
    };
  });

  /**
   * POST /api/scanner/preview
   * Scan a specific path and return parsed files without importing
   */
  app.post(
    '/api/scanner/preview',
    { preHandler: authenticate },
    async (req) => {
      const schema = z.object({
        path: z.string(),
        kind: z.enum(['movies', 'series', 'music', 'books']).optional(),
      });

      const { path: scanPath, kind } = schema.parse(req.body);

      // Import parseFilename dynamically
      const { parseFilename, isMediaFile } = await import(
        '../services/scanner/fileParser.js'
      );

      // Verify path exists
      try {
        await fs.access(scanPath);
      } catch {
        return {
          ok: false,
          error: `Path not accessible: ${scanPath}`,
        };
      }

      const files: Array<{
        path: string;
        filename: string;
        parsed: ReturnType<typeof parseFilename>;
        size: number;
      }> = [];

      // Recursively scan directory
      async function scanDir(dir: string) {
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });

          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
              // Skip hidden directories
              if (!entry.name.startsWith('.')) {
                await scanDir(fullPath);
              }
            } else if (entry.isFile() && isMediaFile(entry.name)) {
              const parsed = parseFilename(entry.name);

              // Filter by kind if specified
              if (kind) {
                const kindMap: Record<string, string> = {
                  movies: 'movie',
                  series: 'series',
                  music: 'music',
                  books: 'book',
                };
                if (parsed.type !== kindMap[kind]) {
                  continue;
                }
              }

              try {
                const stats = await fs.stat(fullPath);
                files.push({
                  path: fullPath,
                  filename: entry.name,
                  parsed,
                  size: stats.size,
                });
              } catch {
                // Skip files we can't stat
              }
            }
          }
        } catch {
          // Skip directories we can't read
        }
      }

      await scanDir(scanPath);

      return {
        ok: true,
        files,
        count: files.length,
      };
    }
  );

  /**
   * POST /api/scanner/import
   * Import scanned files into library with matched items
   */
  app.post('/api/scanner/import', { preHandler: requireAdmin }, async (req) => {
    const schema = z.object({
      kind: z.enum(['movies', 'series', 'music', 'books']),
      files: z.array(
        z.object({
          path: z.string(),
          itemId: z.string(),
          parsed: z.record(z.unknown()),
        })
      ),
    });

    const { kind, files } = schema.parse(req.body);

    if (files.length === 0) {
      return {
        ok: false,
        error: 'No files to import',
      };
    }

    const existingItems = await loadLibrary();
    let imported = 0;

    for (const file of files) {
      // Find the target library item
      const itemIndex = existingItems.findIndex((it) => it.id === file.itemId);

      if (itemIndex < 0) {
        // Item doesn't exist - skip or create?
        continue;
      }

      // Verify file exists
      try {
        const stats = await fs.stat(file.path);

        // Update the library item with file info
        existingItems[itemIndex] = {
          ...existingItems[itemIndex],
          filePath: file.path,
          fileSize: stats.size,
          quality:
            (file.parsed as any).quality || existingItems[itemIndex].quality,
          source:
            (file.parsed as any).source || existingItems[itemIndex].source,
          metadata: {
            ...existingItems[itemIndex].metadata,
            ...(file.parsed as object),
            importedAt: new Date().toISOString(),
          },
        };

        imported++;
      } catch {
        // File not accessible - skip
      }
    }

    await saveLibrary(existingItems);

    return {
      ok: true,
      count: imported,
      total: files.length,
    };
  });

  /**
   * POST /api/scanner/rescan
   * Rescan a specific folder
   */
  app.post('/api/scanner/rescan', { preHandler: requireAdmin }, async (req) => {
    const schema = z.object({
      path: z.string(),
      type: z.enum(['movies', 'series', 'music', 'books']),
    });

    const folder = schema.parse(req.body);
    const scanner = getScanner();

    if (scanner.isScanning()) {
      return {
        ok: false,
        error: 'Scan already in progress',
      };
    }

    // Verify folder exists
    try {
      await fs.access(folder.path);
    } catch {
      return {
        ok: false,
        error: `Folder not accessible: ${folder.path}`,
      };
    }

    // Start scan for single folder
    scanner.scan([folder]).catch((error) => {
      app.log.error({ err: error }, 'Rescan failed');
    });

    return {
      ok: true,
      message: 'Rescan started',
      progress: scanner.getProgress(),
    };
  });
};

export default plugin;

/**
 * File Organizer API Routes
 *
 * Provides endpoints for organizing media files into proper folder structures.
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  getScanner,
  getOrganizer,
  DEFAULT_NAMING_CONFIG,
  previewOrganizedPath,
  type OrganizeOptions,
  type FileOperation,
  type ConflictResolution,
  type NamingConfig,
} from '../services/scanner/index.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

// Schema for organize request
const OrganizeRequestSchema = z.object({
  destinations: z.object({
    series: z.string().optional(),
    movies: z.string().optional(),
    music: z.string().optional(),
    books: z.string().optional(),
  }),
  operation: z.enum(['move', 'copy', 'hardlink']).default('hardlink'),
  conflictResolution: z.enum(['skip', 'overwrite', 'rename']).default('skip'),
  dryRun: z.boolean().default(true),
  cleanupEmptyFolders: z.boolean().default(true),
  namingConfig: z
    .object({
      series: z
        .object({
          folderFormat: z.string(),
          seasonFolderFormat: z.string(),
          fileFormat: z.string(),
        })
        .optional(),
      movies: z
        .object({
          folderFormat: z.string(),
          fileFormat: z.string(),
        })
        .optional(),
      music: z
        .object({
          artistFolderFormat: z.string(),
          albumFolderFormat: z.string(),
          fileFormat: z.string(),
        })
        .optional(),
      books: z
        .object({
          authorFolderFormat: z.string(),
          fileFormat: z.string(),
        })
        .optional(),
    })
    .optional(),
});

// Config file for organizer settings
const CONFIG_DIR = path.join(process.cwd(), 'config');
const ORGANIZER_CONFIG_FILE = path.join(CONFIG_DIR, 'organizer.json');

interface OrganizerConfig {
  destinations: {
    series?: string;
    movies?: string;
    music?: string;
    books?: string;
  };
  defaultOperation: FileOperation;
  conflictResolution: ConflictResolution;
  cleanupEmptyFolders: boolean;
  namingConfig: NamingConfig;
}

const DEFAULT_ORGANIZER_CONFIG: OrganizerConfig = {
  destinations: {},
  defaultOperation: 'hardlink',
  conflictResolution: 'skip',
  cleanupEmptyFolders: true,
  namingConfig: DEFAULT_NAMING_CONFIG,
};

async function loadOrganizerConfig(): Promise<OrganizerConfig> {
  try {
    const raw = await fs.readFile(ORGANIZER_CONFIG_FILE, 'utf8');
    const data = JSON.parse(raw);
    return { ...DEFAULT_ORGANIZER_CONFIG, ...data };
  } catch {
    return DEFAULT_ORGANIZER_CONFIG;
  }
}

async function saveOrganizerConfig(config: OrganizerConfig): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(
    ORGANIZER_CONFIG_FILE,
    JSON.stringify(config, null, 2),
    'utf8'
  );
}

const plugin: FastifyPluginAsync = async (app) => {
  /**
   * GET /api/organizer/config
   * Get current organizer configuration
   */
  app.get('/api/organizer/config', { preHandler: authenticate }, async () => {
    const config = await loadOrganizerConfig();
    return {
      ok: true,
      config,
      defaultNamingConfig: DEFAULT_NAMING_CONFIG,
    };
  });

  /**
   * POST /api/organizer/config
   * Update organizer configuration
   */
  app.post(
    '/api/organizer/config',
    { preHandler: requireAdmin },
    async (req) => {
      const schema = z.object({
        destinations: z
          .object({
            series: z.string().optional(),
            movies: z.string().optional(),
            music: z.string().optional(),
            books: z.string().optional(),
          })
          .optional(),
        defaultOperation: z.enum(['move', 'copy', 'hardlink']).optional(),
        conflictResolution: z.enum(['skip', 'overwrite', 'rename']).optional(),
        cleanupEmptyFolders: z.boolean().optional(),
        namingConfig: z.any().optional(),
      });

      const updates = schema.parse(req.body);
      const current = await loadOrganizerConfig();

      const newConfig: OrganizerConfig = {
        ...current,
        ...updates,
        destinations: { ...current.destinations, ...updates.destinations },
        namingConfig: updates.namingConfig
          ? { ...current.namingConfig, ...updates.namingConfig }
          : current.namingConfig,
      };

      await saveOrganizerConfig(newConfig);

      return {
        ok: true,
        config: newConfig,
      };
    }
  );

  /**
   * GET /api/organizer/status
   * Get current organization progress
   */
  app.get('/api/organizer/status', { preHandler: authenticate }, async () => {
    const organizer = getOrganizer();
    return {
      ok: true,
      ...organizer.getProgress(),
    };
  });

  /**
   * POST /api/organizer/preview
   * Preview what organization would do (dry run)
   */
  app.post(
    '/api/organizer/preview',
    { preHandler: authenticate },
    async (req) => {
      const scanner = getScanner();
      const organizer = getOrganizer();

      if (organizer.isOrganizing()) {
        return {
          ok: false,
          error: 'Organization in progress',
        };
      }

      const scannedItems = scanner.getScannedItems();

      if (scannedItems.length === 0) {
        return {
          ok: false,
          error: 'No scanned items to organize. Run a scan first.',
        };
      }

      const body = OrganizeRequestSchema.parse(req.body || {});
      const config = await loadOrganizerConfig();

      const options: OrganizeOptions = {
        destinations: body.destinations || config.destinations,
        operation: body.operation || config.defaultOperation,
        conflictResolution:
          body.conflictResolution || config.conflictResolution,
        dryRun: true,
        cleanupEmptyFolders:
          body.cleanupEmptyFolders ?? config.cleanupEmptyFolders,
        namingConfig: body.namingConfig
          ? { ...config.namingConfig, ...body.namingConfig }
          : config.namingConfig,
      };

      const preview = organizer.previewOrganization(scannedItems, options);

      return {
        ok: true,
        totalItems: preview.length,
        items: preview.map((p) => ({
          source: p.sourcePath,
          destination: p.destinationPath,
          operation: p.operation,
          status: p.status,
          error: p.error,
        })),
      };
    }
  );

  /**
   * POST /api/organizer/start
   * Start organizing files
   */
  app.post(
    '/api/organizer/start',
    { preHandler: requireAdmin },
    async (req) => {
      const scanner = getScanner();
      const organizer = getOrganizer();

      if (scanner.isScanning()) {
        return {
          ok: false,
          error: 'Scan in progress. Wait for scan to complete.',
        };
      }

      if (organizer.isOrganizing()) {
        return {
          ok: false,
          error: 'Organization already in progress',
        };
      }

      const scannedItems = scanner.getScannedItems();

      if (scannedItems.length === 0) {
        return {
          ok: false,
          error: 'No scanned items to organize. Run a scan first.',
        };
      }

      const body = OrganizeRequestSchema.parse(req.body || {});
      const config = await loadOrganizerConfig();

      // Validate destinations exist
      const destinations = body.destinations || config.destinations;
      for (const [type, destPath] of Object.entries(destinations)) {
        if (destPath) {
          try {
            await fs.access(destPath);
          } catch {
            return {
              ok: false,
              error: `Destination folder not accessible for ${type}: ${destPath}`,
            };
          }
        }
      }

      const options: OrganizeOptions = {
        destinations,
        operation: body.operation || config.defaultOperation,
        conflictResolution:
          body.conflictResolution || config.conflictResolution,
        dryRun: body.dryRun,
        cleanupEmptyFolders:
          body.cleanupEmptyFolders ?? config.cleanupEmptyFolders,
        namingConfig: body.namingConfig
          ? { ...config.namingConfig, ...body.namingConfig }
          : config.namingConfig,
      };

      // Start organization in background
      organizer
        .organize(scannedItems, options)
        .then((summary) => {
          app.log.info({
            msg: 'Organization completed',
            moved: summary.moved,
            copied: summary.copied,
            hardlinked: summary.hardlinked,
            skipped: summary.skipped,
            failed: summary.failed,
            duration: summary.duration,
          });
        })
        .catch((error) => {
          app.log.error({ err: error }, 'Organization failed');
        });

      return {
        ok: true,
        message: body.dryRun ? 'Dry run started' : 'Organization started',
        progress: organizer.getProgress(),
      };
    }
  );

  /**
   * POST /api/organizer/stop
   * Abort the current organization
   */
  app.post('/api/organizer/stop', { preHandler: requireAdmin }, async () => {
    const organizer = getOrganizer();

    if (!organizer.isOrganizing()) {
      return {
        ok: false,
        error: 'No organization in progress',
      };
    }

    organizer.abort();

    return {
      ok: true,
      message: 'Organization abort requested',
    };
  });

  /**
   * POST /api/organizer/test-naming
   * Test naming template with sample data
   */
  app.post(
    '/api/organizer/test-naming',
    { preHandler: authenticate },
    async (req) => {
      const schema = z.object({
        type: z.enum(['series', 'movie', 'music', 'book']),
        sampleData: z.object({
          title: z.string(),
          year: z.number().optional(),
          season: z.number().optional(),
          episode: z.number().optional(),
          episodeTitle: z.string().optional(),
          quality: z.string().optional(),
          source: z.string().optional(),
          codec: z.string().optional(),
          artist: z.string().optional(),
          album: z.string().optional(),
          track: z.number().optional(),
          author: z.string().optional(),
          extension: z.string().default('.mkv'),
        }),
        destinationRoot: z.string().default('/media'),
        namingConfig: z.any().optional(),
      });

      const { type, sampleData, destinationRoot, namingConfig } = schema.parse(
        req.body
      );
      const config = await loadOrganizerConfig();

      const parsed = {
        type,
        ...sampleData,
        originalFilename: `sample${sampleData.extension}`,
      };

      const mergedConfig = namingConfig
        ? { ...config.namingConfig, ...namingConfig }
        : config.namingConfig;

      const result = previewOrganizedPath(
        parsed as any,
        destinationRoot,
        mergedConfig
      );

      return {
        ok: true,
        input: parsed,
        output: result,
      };
    }
  );
};

export default plugin;

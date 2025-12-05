/**
 * File Organizer Service
 *
 * Moves, copies, or hardlinks media files into organized folder structures.
 * Supports dry-run mode for previewing changes.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';
import type { ParsedMedia } from './fileParser.js';
import type { ScannedItem } from './scanner.js';
import {
  NamingConfig,
  DEFAULT_NAMING_CONFIG,
  previewOrganizedPath,
  cleanForFilename,
} from './namingTemplates.js';

export type FileOperation = 'move' | 'copy' | 'hardlink';
export type ConflictResolution = 'skip' | 'overwrite' | 'rename';

export interface OrganizeOptions {
  /** Root destination folder for each media type */
  destinations: {
    series?: string;
    movies?: string;
    music?: string;
    books?: string;
  };
  /** File operation type */
  operation: FileOperation;
  /** How to handle conflicts */
  conflictResolution: ConflictResolution;
  /** Naming configuration */
  namingConfig?: NamingConfig;
  /** Preview only, don't make changes */
  dryRun: boolean;
  /** Delete empty source folders after moving */
  cleanupEmptyFolders: boolean;
}

export interface OrganizeResult {
  sourcePath: string;
  destinationPath: string;
  operation: FileOperation;
  status: 'success' | 'skipped' | 'failed' | 'conflict' | 'dry-run';
  error?: string;
  conflictAction?: ConflictResolution;
}

export interface OrganizeProgress {
  status: 'idle' | 'organizing' | 'completed' | 'failed';
  totalFiles: number;
  processedFiles: number;
  successCount: number;
  skipCount: number;
  errorCount: number;
  currentFile: string | null;
  errors: string[];
}

export interface OrganizeSummary {
  success: boolean;
  totalProcessed: number;
  moved: number;
  copied: number;
  hardlinked: number;
  skipped: number;
  failed: number;
  results: OrganizeResult[];
  duration: number;
}

type OrganizerEventMap = {
  progress: [OrganizeProgress];
  file: [OrganizeResult];
  complete: [OrganizeSummary];
  error: [Error];
};

/**
 * File Organizer with event-based progress reporting
 */
export class FileOrganizer extends EventEmitter<OrganizerEventMap> {
  private progress: OrganizeProgress = {
    status: 'idle',
    totalFiles: 0,
    processedFiles: 0,
    successCount: 0,
    skipCount: 0,
    errorCount: 0,
    currentFile: null,
    errors: [],
  };

  private results: OrganizeResult[] = [];
  private abortController: AbortController | null = null;

  /**
   * Get current progress
   */
  getProgress(): OrganizeProgress {
    return { ...this.progress };
  }

  /**
   * Check if organizing is in progress
   */
  isOrganizing(): boolean {
    return this.progress.status === 'organizing';
  }

  /**
   * Abort the current operation
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Preview what the organized structure would look like
   */
  previewOrganization(
    items: ScannedItem[],
    options: OrganizeOptions
  ): OrganizeResult[] {
    const config = options.namingConfig || DEFAULT_NAMING_CONFIG;
    const results: OrganizeResult[] = [];

    for (const item of items) {
      const destRoot = this.getDestinationRoot(item.parsed.type, options);

      if (!destRoot) {
        results.push({
          sourcePath: item.filePath,
          destinationPath: '',
          operation: options.operation,
          status: 'skipped',
          error: `No destination configured for type: ${item.parsed.type}`,
        });
        continue;
      }

      const { fullPath } = previewOrganizedPath(item.parsed, destRoot, config);

      results.push({
        sourcePath: item.filePath,
        destinationPath: fullPath,
        operation: options.operation,
        status: 'dry-run',
      });
    }

    return results;
  }

  /**
   * Organize files according to options
   */
  async organize(
    items: ScannedItem[],
    options: OrganizeOptions
  ): Promise<OrganizeSummary> {
    if (this.isOrganizing()) {
      throw new Error('Organization already in progress');
    }

    const startTime = Date.now();
    this.abortController = new AbortController();
    this.results = [];

    // Reset progress
    this.progress = {
      status: 'organizing',
      totalFiles: items.length,
      processedFiles: 0,
      successCount: 0,
      skipCount: 0,
      errorCount: 0,
      currentFile: null,
      errors: [],
    };
    this.emitProgress();

    const config = options.namingConfig || DEFAULT_NAMING_CONFIG;
    let moved = 0,
      copied = 0,
      hardlinked = 0,
      skipped = 0,
      failed = 0;

    try {
      for (const item of items) {
        if (this.abortController.signal.aborted) break;

        this.progress.currentFile = item.filePath;
        this.emitProgress();

        const result = await this.processFile(item, options, config);
        this.results.push(result);

        // Update counts
        if (result.status === 'success') {
          this.progress.successCount++;
          if (options.operation === 'move') moved++;
          else if (options.operation === 'copy') copied++;
          else hardlinked++;
        } else if (
          result.status === 'skipped' ||
          result.status === 'conflict'
        ) {
          this.progress.skipCount++;
          skipped++;
        } else if (result.status === 'failed') {
          this.progress.errorCount++;
          failed++;
          if (result.error) {
            this.progress.errors.push(result.error);
          }
        }

        this.progress.processedFiles++;
        this.emit('file', result);
        this.emitProgress();
      }

      this.progress.status = this.abortController.signal.aborted
        ? 'failed'
        : 'completed';
      this.progress.currentFile = null;
      this.emitProgress();
    } catch (error) {
      this.progress.status = 'failed';
      this.progress.errors.push((error as Error).message);
      this.emitProgress();
      this.emit(
        'error',
        error instanceof Error ? error : new Error(String(error))
      );
    }

    const summary: OrganizeSummary = {
      success: this.progress.status === 'completed',
      totalProcessed: this.progress.processedFiles,
      moved,
      copied,
      hardlinked,
      skipped,
      failed,
      results: this.results,
      duration: Date.now() - startTime,
    };

    this.emit('complete', summary);
    return summary;
  }

  /**
   * Process a single file
   */
  private async processFile(
    item: ScannedItem,
    options: OrganizeOptions,
    config: NamingConfig
  ): Promise<OrganizeResult> {
    const destRoot = this.getDestinationRoot(item.parsed.type, options);

    if (!destRoot) {
      return {
        sourcePath: item.filePath,
        destinationPath: '',
        operation: options.operation,
        status: 'skipped',
        error: `No destination configured for type: ${item.parsed.type}`,
      };
    }

    const { folderPath, fullPath } = previewOrganizedPath(
      item.parsed,
      destRoot,
      config
    );

    // Check if source and destination are the same
    if (path.normalize(item.filePath) === path.normalize(fullPath)) {
      return {
        sourcePath: item.filePath,
        destinationPath: fullPath,
        operation: options.operation,
        status: 'skipped',
        error: 'File already in correct location',
      };
    }

    // Dry run - don't actually do anything
    if (options.dryRun) {
      return {
        sourcePath: item.filePath,
        destinationPath: fullPath,
        operation: options.operation,
        status: 'dry-run',
      };
    }

    try {
      // Check if destination exists
      const destExists = await this.fileExists(fullPath);

      if (destExists) {
        switch (options.conflictResolution) {
          case 'skip':
            return {
              sourcePath: item.filePath,
              destinationPath: fullPath,
              operation: options.operation,
              status: 'conflict',
              conflictAction: 'skip',
              error: 'Destination file already exists',
            };

          case 'rename':
            const newPath = await this.getUniqueFilename(fullPath);
            return await this.executeOperation(
              item.filePath,
              newPath,
              folderPath,
              options
            );

          case 'overwrite':
            await fs.unlink(fullPath);
            break;
        }
      }

      return await this.executeOperation(
        item.filePath,
        fullPath,
        folderPath,
        options
      );
    } catch (error) {
      return {
        sourcePath: item.filePath,
        destinationPath: fullPath,
        operation: options.operation,
        status: 'failed',
        error: (error as Error).message,
      };
    }
  }

  /**
   * Execute the file operation
   */
  private async executeOperation(
    sourcePath: string,
    destPath: string,
    destFolder: string,
    options: OrganizeOptions
  ): Promise<OrganizeResult> {
    // Create destination folder
    await fs.mkdir(destFolder, { recursive: true });

    try {
      switch (options.operation) {
        case 'move':
          await fs.rename(sourcePath, destPath);
          // Try to clean up empty source folder
          if (options.cleanupEmptyFolders) {
            await this.cleanupEmptyFolders(path.dirname(sourcePath));
          }
          break;

        case 'copy':
          await fs.copyFile(sourcePath, destPath);
          break;

        case 'hardlink':
          await fs.link(sourcePath, destPath);
          break;
      }

      return {
        sourcePath,
        destinationPath: destPath,
        operation: options.operation,
        status: 'success',
      };
    } catch (error) {
      // If hardlink fails (cross-device), fall back to copy
      if (
        options.operation === 'hardlink' &&
        (error as NodeJS.ErrnoException).code === 'EXDEV'
      ) {
        await fs.copyFile(sourcePath, destPath);
        return {
          sourcePath,
          destinationPath: destPath,
          operation: 'copy', // Note: changed from hardlink to copy
          status: 'success',
          error: 'Hardlink not supported across devices, copied instead',
        };
      }
      throw error;
    }
  }

  /**
   * Get destination root for a media type
   */
  private getDestinationRoot(
    type: ParsedMedia['type'],
    options: OrganizeOptions
  ): string | undefined {
    switch (type) {
      case 'series':
        return options.destinations.series;
      case 'movie':
        return options.destinations.movies;
      case 'music':
        return options.destinations.music;
      case 'book':
        return options.destinations.books;
      default:
        return undefined;
    }
  }

  /**
   * Check if a file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get a unique filename by appending a number
   */
  private async getUniqueFilename(filePath: string): Promise<string> {
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);

    let counter = 1;
    let newPath = filePath;

    while (await this.fileExists(newPath)) {
      newPath = path.join(dir, `${base} (${counter})${ext}`);
      counter++;
      if (counter > 100) {
        throw new Error('Could not find unique filename after 100 attempts');
      }
    }

    return newPath;
  }

  /**
   * Clean up empty folders recursively
   */
  private async cleanupEmptyFolders(folderPath: string): Promise<void> {
    try {
      const entries = await fs.readdir(folderPath);

      // If folder is empty, remove it
      if (entries.length === 0) {
        await fs.rmdir(folderPath);
        // Try parent folder too
        const parent = path.dirname(folderPath);
        if (parent !== folderPath) {
          await this.cleanupEmptyFolders(parent);
        }
      }
    } catch {
      // Ignore errors (folder might not be empty or might not exist)
    }
  }

  /**
   * Emit progress event (throttled)
   */
  private lastEmitTime = 0;
  private emitProgress(): void {
    const now = Date.now();
    if (
      now - this.lastEmitTime < 100 &&
      this.progress.status === 'organizing'
    ) {
      return;
    }
    this.lastEmitTime = now;
    this.emit('progress', this.getProgress());
  }
}

// Singleton instance
let organizerInstance: FileOrganizer | null = null;

export function getOrganizer(): FileOrganizer {
  if (!organizerInstance) {
    organizerInstance = new FileOrganizer();
  }
  return organizerInstance;
}

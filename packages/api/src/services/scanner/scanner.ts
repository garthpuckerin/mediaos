/**
 * Library Scanner Service
 *
 * Recursively scans configured media directories and populates the library.
 * Supports movies, series, music, and books.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';
import { parseFilename, isMediaFile, ParsedMedia } from './fileParser.js';

export interface ScanProgress {
  status: 'idle' | 'scanning' | 'completed' | 'failed';
  totalFiles: number;
  scannedFiles: number;
  currentPath: string | null;
  foundItems: number;
  errors: string[];
  startedAt: string | null;
  completedAt: string | null;
}

export interface ScannedItem {
  filePath: string;
  parsed: ParsedMedia;
  fileSize: number;
  modifiedAt: string;
}

export interface ScanResult {
  success: boolean;
  itemsFound: number;
  itemsAdded: number;
  itemsUpdated: number;
  errors: string[];
  duration: number;
}

export interface MediaFolder {
  path: string;
  type: 'movies' | 'series' | 'music' | 'books';
}

type ScanEventMap = {
  progress: [ScanProgress];
  item: [ScannedItem];
  complete: [ScanResult];
  error: [Error];
};

/**
 * Scanner class with event-based progress reporting
 */
export class LibraryScanner extends EventEmitter<ScanEventMap> {
  private progress: ScanProgress = {
    status: 'idle',
    totalFiles: 0,
    scannedFiles: 0,
    currentPath: null,
    foundItems: 0,
    errors: [],
    startedAt: null,
    completedAt: null,
  };

  private abortController: AbortController | null = null;
  private scannedItems: ScannedItem[] = [];

  /**
   * Get current scan progress
   */
  getProgress(): ScanProgress {
    return { ...this.progress };
  }

  /**
   * Get scanned items from the last scan
   */
  getScannedItems(): ScannedItem[] {
    return [...this.scannedItems];
  }

  /**
   * Check if a scan is currently running
   */
  isScanning(): boolean {
    return this.progress.status === 'scanning';
  }

  /**
   * Abort the current scan
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Start scanning the specified folders
   */
  async scan(folders: MediaFolder[]): Promise<ScanResult> {
    if (this.isScanning()) {
      throw new Error('Scan already in progress');
    }

    const startTime = Date.now();
    this.abortController = new AbortController();
    this.scannedItems = [];

    // Reset progress
    this.progress = {
      status: 'scanning',
      totalFiles: 0,
      scannedFiles: 0,
      currentPath: null,
      foundItems: 0,
      errors: [],
      startedAt: new Date().toISOString(),
      completedAt: null,
    };
    this.emitProgress();

    try {
      // First pass: count files for progress
      for (const folder of folders) {
        if (this.abortController.signal.aborted) break;
        await this.countFiles(folder.path);
      }

      // Second pass: scan and parse files
      for (const folder of folders) {
        if (this.abortController.signal.aborted) break;
        await this.scanDirectory(folder.path, folder.type);
      }

      // Mark complete
      this.progress.status = this.abortController.signal.aborted
        ? 'failed'
        : 'completed';
      this.progress.completedAt = new Date().toISOString();
      this.progress.currentPath = null;
      this.emitProgress();

      const result: ScanResult = {
        success: !this.abortController.signal.aborted,
        itemsFound: this.scannedItems.length,
        itemsAdded: this.scannedItems.length, // Will be updated by caller after DB insert
        itemsUpdated: 0,
        errors: [...this.progress.errors],
        duration: Date.now() - startTime,
      };

      this.emit('complete', result);
      return result;
    } catch (error) {
      this.progress.status = 'failed';
      this.progress.completedAt = new Date().toISOString();

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.progress.errors.push(errorMessage);
      this.emitProgress();

      const result: ScanResult = {
        success: false,
        itemsFound: this.scannedItems.length,
        itemsAdded: 0,
        itemsUpdated: 0,
        errors: [...this.progress.errors],
        duration: Date.now() - startTime,
      };

      this.emit(
        'error',
        error instanceof Error ? error : new Error(String(error))
      );
      this.emit('complete', result);
      return result;
    }
  }

  /**
   * Count files in a directory (for progress calculation)
   */
  private async countFiles(dirPath: string): Promise<void> {
    if (this.abortController?.signal.aborted) return;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (this.abortController?.signal.aborted) break;

        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Skip hidden directories and common non-media folders
          if (!this.shouldSkipDirectory(entry.name)) {
            await this.countFiles(fullPath);
          }
        } else if (entry.isFile() && isMediaFile(entry.name)) {
          this.progress.totalFiles++;
        }
      }
    } catch (error) {
      // Silently ignore permission errors during counting
      if ((error as NodeJS.ErrnoException).code !== 'EACCES') {
        throw error;
      }
    }
  }

  /**
   * Recursively scan a directory
   */
  private async scanDirectory(
    dirPath: string,
    mediaType: MediaFolder['type']
  ): Promise<void> {
    if (this.abortController?.signal.aborted) return;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (this.abortController?.signal.aborted) break;

        const fullPath = path.join(dirPath, entry.name);
        this.progress.currentPath = fullPath;

        if (entry.isDirectory()) {
          // Skip hidden directories and common non-media folders
          if (!this.shouldSkipDirectory(entry.name)) {
            await this.scanDirectory(fullPath, mediaType);
          }
        } else if (entry.isFile() && isMediaFile(entry.name)) {
          await this.processFile(fullPath, entry.name, mediaType);
        }
      }
    } catch (error) {
      const errorMessage = `Error scanning ${dirPath}: ${(error as Error).message}`;
      this.progress.errors.push(errorMessage);

      // Don't fail entire scan for permission errors
      if ((error as NodeJS.ErrnoException).code !== 'EACCES') {
        throw error;
      }
    }
  }

  /**
   * Process a single media file
   */
  private async processFile(
    filePath: string,
    filename: string,
    folderType: MediaFolder['type']
  ): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      const parsed = parseFilename(filename);

      // Override type based on folder configuration if needed
      const typeMap: Record<MediaFolder['type'], ParsedMedia['type']> = {
        movies: 'movie',
        series: 'series',
        music: 'music',
        books: 'book',
      };

      // If parser detected series but folder is movies, trust the parser
      // If parser couldn't determine, use folder type
      if (parsed.type === 'unknown' || parsed.type === 'movie') {
        parsed.type = typeMap[folderType];
      }

      const scannedItem: ScannedItem = {
        filePath,
        parsed,
        fileSize: stats.size,
        modifiedAt: stats.mtime.toISOString(),
      };

      this.scannedItems.push(scannedItem);
      this.progress.scannedFiles++;
      this.progress.foundItems++;

      this.emit('item', scannedItem);
      this.emitProgress();
    } catch (error) {
      this.progress.scannedFiles++;
      this.progress.errors.push(
        `Error processing ${filePath}: ${(error as Error).message}`
      );
      this.emitProgress();
    }
  }

  /**
   * Check if a directory should be skipped
   */
  private shouldSkipDirectory(name: string): boolean {
    const skipPatterns = [
      /^\./, // Hidden directories
      /^@/, // Synology system folders
      /^#/, // macOS trash
      /^node_modules$/i,
      /^\.git$/i,
      /^\.svn$/i,
      /^__MACOSX$/i,
      /^Thumbs\.db$/i,
      /^desktop\.ini$/i,
      /^\$RECYCLE\.BIN$/i,
      /^System Volume Information$/i,
      /^lost\+found$/i,
      /^\.Spotlight-V100$/i,
      /^\.fseventsd$/i,
      /^\.Trashes$/i,
      /^\.TemporaryItems$/i,
      /^@eaDir$/i, // Synology thumbnail folder
      /^#recycle$/i, // Synology recycle bin
    ];

    return skipPatterns.some((pattern) => pattern.test(name));
  }

  /**
   * Emit progress event (throttled)
   */
  private lastEmitTime = 0;
  private emitProgress(): void {
    const now = Date.now();
    // Throttle progress events to max 10 per second
    if (now - this.lastEmitTime < 100 && this.progress.status === 'scanning') {
      return;
    }
    this.lastEmitTime = now;
    this.emit('progress', this.getProgress());
  }
}

// Singleton instance for the application
let scannerInstance: LibraryScanner | null = null;

export function getScanner(): LibraryScanner {
  if (!scannerInstance) {
    scannerInstance = new LibraryScanner();
  }
  return scannerInstance;
}

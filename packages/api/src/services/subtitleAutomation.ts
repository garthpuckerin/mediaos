/**
 * Subtitle Automation Service
 *
 * Automatically processes subtitles:
 * - On download completion
 * - On scheduled library scans
 * - Sync detection and correction
 * - Auto-generation when missing
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  getSubtitleTracks,
  parseSubtitleFile,
  detectSyncOffset,
  autoSyncSubtitles,
  checkWhisperAvailable,
  generateSubtitlesWithWhisper,
  GenerationProgress,
} from './subtitles.js';

// ==========================================
// Types
// ==========================================

export interface SubtitleAutomationConfig {
  enabled: boolean;
  autoSyncOnDownload: boolean;
  autoGenerateWhenMissing: boolean;
  preferredLanguages: string[]; // e.g., ['en', 'es']
  whisperModel: 'tiny' | 'base' | 'small' | 'medium' | 'large';
  maxSyncOffsetMs: number; // Don't auto-fix if offset > this
  scanScheduleHours: number; // 0 = disabled
}

export interface SubtitleJob {
  id: string;
  type: 'sync' | 'generate' | 'extract';
  videoPath: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'skipped';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: {
    action: string;
    outputPath?: string;
    offsetMs?: number;
    segments?: number;
  };
  error?: string;
  metadata?: {
    title?: string;
    kind?: string;
    itemId?: string;
    source?: string;
  };
}

export interface AutomationStatus {
  enabled: boolean;
  queuedJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  lastScanAt?: string;
  nextScanAt?: string;
  whisperAvailable: boolean;
}

// ==========================================
// Default Configuration
// ==========================================

const DEFAULT_CONFIG: SubtitleAutomationConfig = {
  enabled: true,
  autoSyncOnDownload: true,
  autoGenerateWhenMissing: false, // Disabled by default (requires Whisper)
  preferredLanguages: ['en'],
  whisperModel: 'base',
  maxSyncOffsetMs: 5000, // 5 seconds
  scanScheduleHours: 24, // Daily scan
};

// ==========================================
// Automation Service
// ==========================================

class SubtitleAutomationService {
  private config: SubtitleAutomationConfig = DEFAULT_CONFIG;
  private jobs: Map<string, SubtitleJob> = new Map();
  private processing = false;
  private maxConcurrent = 1; // Process one at a time (CPU intensive)
  private currentRunning = 0;
  private scanInterval: NodeJS.Timeout | null = null;
  private lastScanAt: string | null = null;
  private whisperAvailable: boolean | null = null;

  constructor() {
    this.loadConfig();
    this.checkWhisper();
  }

  /**
   * Load configuration from file
   */
  private async loadConfig(): Promise<void> {
    try {
      const configPath = path.join(
        process.cwd(),
        'config',
        'subtitle-automation.json'
      );
      const raw = await fs.readFile(configPath, 'utf-8');
      const saved = JSON.parse(raw);
      this.config = { ...DEFAULT_CONFIG, ...saved };
    } catch {
      // Use defaults
    }

    // Start scheduled scan if enabled
    this.scheduleNextScan();
  }

  /**
   * Save configuration to file
   */
  async saveConfig(config: Partial<SubtitleAutomationConfig>): Promise<void> {
    this.config = { ...this.config, ...config };

    try {
      const configPath = path.join(
        process.cwd(),
        'config',
        'subtitle-automation.json'
      );
      await fs.mkdir(path.dirname(configPath), { recursive: true });
      await fs.writeFile(
        configPath,
        JSON.stringify(this.config, null, 2),
        'utf-8'
      );
    } catch (e) {
      console.error('Failed to save subtitle automation config:', e);
    }

    // Reschedule scan with new settings
    this.scheduleNextScan();
  }

  /**
   * Get current configuration
   */
  getConfig(): SubtitleAutomationConfig {
    return { ...this.config };
  }

  /**
   * Check if Whisper is available
   */
  private async checkWhisper(): Promise<void> {
    const result = await checkWhisperAvailable();
    this.whisperAvailable = result.available;
  }

  /**
   * Schedule the next library scan
   */
  private scheduleNextScan(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }

    if (this.config.enabled && this.config.scanScheduleHours > 0) {
      const intervalMs = this.config.scanScheduleHours * 60 * 60 * 1000;
      this.scanInterval = setInterval(
        () => this.runScheduledScan(),
        intervalMs
      );
    }
  }

  /**
   * Get next scan time
   */
  private getNextScanTime(): string | undefined {
    if (!this.config.enabled || this.config.scanScheduleHours <= 0) {
      return undefined;
    }

    const lastScan = this.lastScanAt ? new Date(this.lastScanAt) : new Date();
    const next = new Date(
      lastScan.getTime() + this.config.scanScheduleHours * 60 * 60 * 1000
    );
    return next.toISOString();
  }

  /**
   * Run scheduled library scan for subtitle issues
   */
  async runScheduledScan(): Promise<{ scanned: number; issues: number }> {
    if (!this.config.enabled) {
      return { scanned: 0, issues: 0 };
    }

    this.lastScanAt = new Date().toISOString();
    let scanned = 0;
    let issues = 0;

    try {
      // Load library items
      const libraryPath = path.join(process.cwd(), 'config', 'library.json');
      const libraryRaw = await fs.readFile(libraryPath, 'utf-8');
      const library = JSON.parse(libraryRaw);
      const items: any[] = library.items || [];

      for (const item of items) {
        if (!item.path) continue;

        try {
          // Check if it's a video file
          const ext = path.extname(item.path).toLowerCase();
          if (!['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.m4v'].includes(ext)) {
            continue;
          }

          scanned++;

          // Check for existing subtitles
          const baseName = path.basename(item.path, ext);
          const dir = path.dirname(item.path);
          const possibleSubs = [
            path.join(dir, `${baseName}.srt`),
            path.join(dir, `${baseName}.en.srt`),
            path.join(dir, `${baseName}.eng.srt`),
          ];

          let hasSubtitle = false;
          let subtitlePath: string | null = null;

          for (const subPath of possibleSubs) {
            try {
              await fs.stat(subPath);
              hasSubtitle = true;
              subtitlePath = subPath;
              break;
            } catch {
              // Not found
            }
          }

          // Also check for embedded subtitles
          if (!hasSubtitle) {
            const tracks = await getSubtitleTracks(item.path);
            hasSubtitle = tracks.length > 0;
          }

          // Queue generation if missing and auto-generate is enabled
          if (
            !hasSubtitle &&
            this.config.autoGenerateWhenMissing &&
            this.whisperAvailable
          ) {
            issues++;
            this.addJob('generate', item.path, {
              title: item.title,
              kind: item.kind,
              itemId: item.id,
              source: 'scheduled-scan',
            });
          }

          // Check sync if we have external subtitle
          if (subtitlePath && this.config.autoSyncOnDownload) {
            const analysis = await detectSyncOffset(item.path, subtitlePath);
            if (
              analysis.ok &&
              Math.abs(analysis.offsetMs) > 200 &&
              Math.abs(analysis.offsetMs) <= this.config.maxSyncOffsetMs
            ) {
              issues++;
              this.addJob('sync', item.path, {
                title: item.title,
                kind: item.kind,
                itemId: item.id,
                source: 'scheduled-scan',
              });
            }
          }
        } catch {
          // Skip problematic items
        }
      }
    } catch (e) {
      console.error('Scheduled subtitle scan failed:', e);
    }

    return { scanned, issues };
  }

  /**
   * Process a completed download
   */
  async processDownload(
    videoPath: string,
    metadata?: SubtitleJob['metadata']
  ): Promise<void> {
    if (!this.config.enabled) return;

    // Check for subtitles in same directory
    const ext = path.extname(videoPath).toLowerCase();
    const baseName = path.basename(videoPath, ext);
    const dir = path.dirname(videoPath);

    // Look for subtitle files
    const possibleSubs = [
      path.join(dir, `${baseName}.srt`),
      path.join(dir, `${baseName}.en.srt`),
      path.join(dir, `${baseName}.eng.srt`),
    ];

    let subtitlePath: string | null = null;
    for (const subPath of possibleSubs) {
      try {
        await fs.stat(subPath);
        subtitlePath = subPath;
        break;
      } catch {
        // Not found
      }
    }

    if (subtitlePath && this.config.autoSyncOnDownload) {
      // Queue sync check
      this.addJob('sync', videoPath, {
        ...metadata,
        source: 'download',
      });
    } else if (!subtitlePath && this.config.autoGenerateWhenMissing) {
      // Check for embedded subtitles first
      const tracks = await getSubtitleTracks(videoPath);
      if (tracks.length === 0 && this.whisperAvailable) {
        // Queue generation
        this.addJob('generate', videoPath, {
          ...metadata,
          source: 'download',
        });
      }
    }
  }

  /**
   * Add a job to the queue
   */
  addJob(
    type: SubtitleJob['type'],
    videoPath: string,
    metadata?: SubtitleJob['metadata']
  ): string {
    const id = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const job: SubtitleJob = {
      id,
      type,
      videoPath,
      status: 'queued',
      createdAt: new Date().toISOString(),
      metadata,
    };

    this.jobs.set(id, job);
    this.processQueue();

    return id;
  }

  /**
   * Get job by ID
   */
  getJob(id: string): SubtitleJob | undefined {
    return this.jobs.get(id);
  }

  /**
   * Get all jobs
   */
  getAllJobs(): SubtitleJob[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Get automation status
   */
  getStatus(): AutomationStatus {
    const jobs = Array.from(this.jobs.values());
    return {
      enabled: this.config.enabled,
      queuedJobs: jobs.filter((j) => j.status === 'queued').length,
      runningJobs: jobs.filter((j) => j.status === 'running').length,
      completedJobs: jobs.filter((j) => j.status === 'completed').length,
      failedJobs: jobs.filter((j) => j.status === 'failed').length,
      lastScanAt: this.lastScanAt || undefined,
      nextScanAt: this.getNextScanTime(),
      whisperAvailable: this.whisperAvailable || false,
    };
  }

  /**
   * Clear completed/failed jobs
   */
  clearCompleted(): number {
    let count = 0;
    for (const [id, job] of this.jobs) {
      if (
        job.status === 'completed' ||
        job.status === 'failed' ||
        job.status === 'skipped'
      ) {
        this.jobs.delete(id);
        count++;
      }
    }
    return count;
  }

  /**
   * Process the job queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (true) {
      const jobs = Array.from(this.jobs.values()).filter(
        (j) => j.status === 'queued'
      );

      if (jobs.length === 0 || this.currentRunning >= this.maxConcurrent) {
        if (this.currentRunning === 0) {
          this.processing = false;
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      const job = jobs[0];
      this.processJob(job);
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: SubtitleJob): Promise<void> {
    this.currentRunning++;
    job.status = 'running';
    job.startedAt = new Date().toISOString();

    try {
      switch (job.type) {
        case 'sync':
          await this.processSyncJob(job);
          break;
        case 'generate':
          await this.processGenerateJob(job);
          break;
        case 'extract':
          await this.processExtractJob(job);
          break;
      }
    } catch (e) {
      job.status = 'failed';
      job.error = (e as Error).message;
    }

    job.completedAt = new Date().toISOString();
    this.currentRunning--;
  }

  /**
   * Process a sync job
   */
  private async processSyncJob(job: SubtitleJob): Promise<void> {
    const ext = path.extname(job.videoPath).toLowerCase();
    const baseName = path.basename(job.videoPath, ext);
    const dir = path.dirname(job.videoPath);

    // Find subtitle file
    const possibleSubs = [
      path.join(dir, `${baseName}.srt`),
      path.join(dir, `${baseName}.en.srt`),
      path.join(dir, `${baseName}.eng.srt`),
    ];

    let subtitlePath: string | null = null;
    for (const subPath of possibleSubs) {
      try {
        await fs.stat(subPath);
        subtitlePath = subPath;
        break;
      } catch {
        // Not found
      }
    }

    if (!subtitlePath) {
      job.status = 'skipped';
      job.result = { action: 'No subtitle file found' };
      return;
    }

    // Detect offset
    const analysis = await detectSyncOffset(job.videoPath, subtitlePath);

    if (!analysis.ok) {
      job.status = 'failed';
      job.error = analysis.recommendation;
      return;
    }

    if (Math.abs(analysis.offsetMs) < 200) {
      job.status = 'completed';
      job.result = {
        action: 'Already in sync',
        offsetMs: analysis.offsetMs,
      };
      return;
    }

    if (Math.abs(analysis.offsetMs) > this.config.maxSyncOffsetMs) {
      job.status = 'skipped';
      job.result = {
        action: `Offset too large (${analysis.offsetMs}ms > ${this.config.maxSyncOffsetMs}ms)`,
        offsetMs: analysis.offsetMs,
      };
      return;
    }

    // Auto-sync
    const syncResult = await autoSyncSubtitles(job.videoPath, subtitlePath);

    if (syncResult.ok) {
      job.status = 'completed';
      job.result = {
        action: 'Synced',
        outputPath: syncResult.outputPath,
        offsetMs: syncResult.offsetMs,
      };
    } else {
      job.status = 'failed';
      job.error = syncResult.error;
    }
  }

  /**
   * Process a generate job
   */
  private async processGenerateJob(job: SubtitleJob): Promise<void> {
    if (!this.whisperAvailable) {
      job.status = 'failed';
      job.error = 'Whisper is not installed';
      return;
    }

    const result = await generateSubtitlesWithWhisper(job.videoPath, {
      model: this.config.whisperModel,
      language: this.config.preferredLanguages[0],
    });

    if (result.ok) {
      job.status = 'completed';
      job.result = {
        action: 'Generated',
        outputPath: result.outputPath,
        segments: result.segments,
      };
    } else {
      job.status = 'failed';
      job.error = result.error;
    }
  }

  /**
   * Process an extract job
   */
  private async processExtractJob(job: SubtitleJob): Promise<void> {
    // This is typically triggered manually, but included for completeness
    job.status = 'skipped';
    job.result = { action: 'Extract jobs should be run manually' };
  }

  /**
   * Trigger immediate scan
   */
  async triggerScan(): Promise<{ scanned: number; issues: number }> {
    return this.runScheduledScan();
  }
}

// Singleton instance
export const subtitleAutomation = new SubtitleAutomationService();

// Auto-cleanup old jobs every 6 hours
setInterval(
  () => {
    const jobs = subtitleAutomation.getAllJobs();
    const cutoff = Date.now() - 48 * 60 * 60 * 1000; // 48 hours

    for (const job of jobs) {
      if (
        (job.status === 'completed' ||
          job.status === 'failed' ||
          job.status === 'skipped') &&
        job.completedAt &&
        new Date(job.completedAt).getTime() < cutoff
      ) {
        // Jobs are managed by the service, just log for now
        console.log(`[SubtitleAutomation] Auto-cleanup: ${job.id}`);
      }
    }
  },
  6 * 60 * 60 * 1000
);

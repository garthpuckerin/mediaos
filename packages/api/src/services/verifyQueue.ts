/**
 * Verification Queue Service
 *
 * Background processing for content verification jobs
 */

import {
  verifyContent,
  VerifyOptions,
  ContentVerifyResult,
} from './contentVerify.js';
import { scanDirectory, SecurityScanResult } from './securityScan.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface VerifyJob {
  id: string;
  type: 'file' | 'folder';
  path: string;
  options: VerifyOptions;
  status: 'queued' | 'running' | 'completed' | 'failed';
  priority: number; // Higher = more urgent
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: ContentVerifyResult | SecurityScanResult;
  error?: string;
  metadata?: {
    title?: string;
    kind?: string;
    itemId?: string;
    source?: 'download' | 'import' | 'manual' | 'scan';
  };
}

export interface QueueStatus {
  totalJobs: number;
  queuedJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  isProcessing: boolean;
}

class VerifyQueueService {
  private jobs: Map<string, VerifyJob> = new Map();
  private processing = false;
  private maxConcurrent = 2;
  private currentRunning = 0;
  private listeners: Array<(job: VerifyJob) => void> = [];

  /**
   * Add a job to the queue
   */
  addJob(
    type: 'file' | 'folder',
    filePath: string,
    options: VerifyOptions = {},
    metadata?: VerifyJob['metadata'],
    priority = 5
  ): string {
    const id = `verify-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const job: VerifyJob = {
      id,
      type,
      path: filePath,
      options,
      status: 'queued',
      priority,
      createdAt: new Date().toISOString(),
      metadata,
    };

    this.jobs.set(id, job);

    // Start processing if not already running
    this.processQueue();

    return id;
  }

  /**
   * Add multiple files to the queue
   */
  addBatch(
    files: Array<{ path: string; metadata?: VerifyJob['metadata'] }>,
    options: VerifyOptions = {},
    priority = 5
  ): string[] {
    const ids: string[] = [];

    for (const file of files) {
      const id = this.addJob(
        'file',
        file.path,
        options,
        file.metadata,
        priority
      );
      ids.push(id);
    }

    return ids;
  }

  /**
   * Get job status
   */
  getJob(id: string): VerifyJob | undefined {
    return this.jobs.get(id);
  }

  /**
   * Get all jobs
   */
  getAllJobs(): VerifyJob[] {
    return Array.from(this.jobs.values()).sort((a, b) => {
      // Sort by status (running first, then queued, then completed)
      const statusOrder = { running: 0, queued: 1, completed: 2, failed: 3 };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;

      // Then by priority (higher first)
      if (a.priority !== b.priority) return b.priority - a.priority;

      // Then by creation time
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  /**
   * Get queue status
   */
  getStatus(): QueueStatus {
    const jobs = Array.from(this.jobs.values());
    return {
      totalJobs: jobs.length,
      queuedJobs: jobs.filter((j) => j.status === 'queued').length,
      runningJobs: jobs.filter((j) => j.status === 'running').length,
      completedJobs: jobs.filter((j) => j.status === 'completed').length,
      failedJobs: jobs.filter((j) => j.status === 'failed').length,
      isProcessing: this.processing,
    };
  }

  /**
   * Cancel a queued job
   */
  cancelJob(id: string): boolean {
    const job = this.jobs.get(id);
    if (job && job.status === 'queued') {
      this.jobs.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Clear completed/failed jobs
   */
  clearCompleted(): number {
    let count = 0;
    for (const [id, job] of this.jobs) {
      if (job.status === 'completed' || job.status === 'failed') {
        this.jobs.delete(id);
        count++;
      }
    }
    return count;
  }

  /**
   * Listen for job completion
   */
  onJobComplete(callback: (job: VerifyJob) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  /**
   * Process the queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (true) {
      // Get next queued job
      const jobs = Array.from(this.jobs.values())
        .filter((j) => j.status === 'queued')
        .sort((a, b) => b.priority - a.priority);

      if (jobs.length === 0 || this.currentRunning >= this.maxConcurrent) {
        if (this.currentRunning === 0) {
          this.processing = false;
          return;
        }
        // Wait a bit and check again
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }

      const job = jobs[0];
      this.processJob(job);
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: VerifyJob): Promise<void> {
    this.currentRunning++;
    job.status = 'running';
    job.startedAt = new Date().toISOString();

    try {
      if (job.type === 'file') {
        job.result = await verifyContent(job.path, job.options);
      } else {
        job.result = await scanDirectory(job.path, true);
      }
      job.status = 'completed';
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : String(error);
    }

    job.completedAt = new Date().toISOString();
    this.currentRunning--;

    // Notify listeners
    for (const listener of this.listeners) {
      try {
        listener(job);
      } catch {
        // Ignore listener errors
      }
    }
  }

  /**
   * Get results for completed jobs
   */
  getResults(): Array<{
    id: string;
    path: string;
    passed: boolean;
    issueCount: number;
    securityIssueCount: number;
    metadata?: VerifyJob['metadata'];
  }> {
    return Array.from(this.jobs.values())
      .filter((j) => j.status === 'completed' && j.result)
      .map((j) => {
        const result = j.result as ContentVerifyResult;
        return {
          id: j.id,
          path: j.path,
          passed: result.passed ?? (result as SecurityScanResult).safe ?? true,
          issueCount: result.issues?.length ?? 0,
          securityIssueCount:
            (result as ContentVerifyResult).securityIssues?.length ?? 0,
          metadata: j.metadata,
        };
      });
  }
}

// Singleton instance
export const verifyQueue = new VerifyQueueService();

// Auto-cleanup old jobs every hour
setInterval(
  () => {
    const jobs = Array.from(verifyQueue.getAllJobs());
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours

    for (const job of jobs) {
      if (
        (job.status === 'completed' || job.status === 'failed') &&
        job.completedAt &&
        new Date(job.completedAt).getTime() < cutoff
      ) {
        verifyQueue.cancelJob(job.id);
      }
    }
  },
  60 * 60 * 1000
);

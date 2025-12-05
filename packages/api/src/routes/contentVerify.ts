import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  verifyContent,
  quickVerify,
  VerifyOptions,
  ContentVerifyResult,
} from '../services/contentVerify.js';
import {
  scanFile as securityScanFile,
  scanDirectory as securityScanDirectory,
  quickSafetyCheck,
} from '../services/securityScan.js';
import { verifyQueue } from '../services/verifyQueue.js';
import * as path from 'path';
import * as fs from 'fs/promises';

interface VerifyRequest {
  path: string;
  expectedTitle?: string;
  expectedQuality?: string;
  expectedDurationMin?: number;
  expectedDurationMax?: number;
  minBitrateKbps?: number;
  checkCorruption?: boolean;
  checkSecurity?: boolean;
}

interface QueueJobRequest {
  path: string;
  type?: 'file' | 'folder';
  options?: VerifyOptions;
  priority?: number;
  metadata?: {
    title?: string;
    kind?: string;
    itemId?: string;
    source?: 'download' | 'import' | 'manual' | 'scan';
  };
}

interface BatchVerifyRequest {
  paths: string[];
  options?: VerifyOptions;
}

export default async function contentVerifyRoutes(app: FastifyInstance) {
  /**
   * POST /api/verify/content
   * Verify a single file
   */
  app.post(
    '/api/verify/content',
    async (
      request: FastifyRequest<{ Body: VerifyRequest }>,
      reply: FastifyReply
    ) => {
      const { path: filePath, ...options } = request.body;

      if (!filePath) {
        return reply.code(400).send({ ok: false, error: 'Path is required' });
      }

      // Resolve path
      const resolvedPath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(process.cwd(), filePath);

      const result = await verifyContent(resolvedPath, options);

      return reply.send(result);
    }
  );

  /**
   * POST /api/verify/content/quick
   * Quick verification without deep analysis
   */
  app.post(
    '/api/verify/content/quick',
    async (
      request: FastifyRequest<{ Body: { path: string } }>,
      reply: FastifyReply
    ) => {
      const { path: filePath } = request.body;

      if (!filePath) {
        return reply.code(400).send({ ok: false, error: 'Path is required' });
      }

      const resolvedPath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(process.cwd(), filePath);

      const result = await quickVerify(resolvedPath);

      return reply.send(result);
    }
  );

  /**
   * POST /api/verify/content/batch
   * Verify multiple files
   */
  app.post(
    '/api/verify/content/batch',
    async (
      request: FastifyRequest<{ Body: BatchVerifyRequest }>,
      reply: FastifyReply
    ) => {
      const { paths, options = {} } = request.body;

      if (!paths || paths.length === 0) {
        return reply.code(400).send({ ok: false, error: 'Paths are required' });
      }

      const results: Record<string, ContentVerifyResult> = {};

      // Process in parallel with limit
      const BATCH_SIZE = 3;
      for (let i = 0; i < paths.length; i += BATCH_SIZE) {
        const batch = paths.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (filePath) => {
            const resolvedPath = path.isAbsolute(filePath)
              ? filePath
              : path.resolve(process.cwd(), filePath);
            const result = await verifyContent(resolvedPath, options);
            return { path: filePath, result };
          })
        );

        for (const { path: p, result } of batchResults) {
          results[p] = result;
        }
      }

      const allPassed = Object.values(results).every((r) => r.passed);
      const totalIssues = Object.values(results).reduce(
        (sum, r) => sum + r.issues.length,
        0
      );

      return reply.send({
        ok: true,
        allPassed,
        totalFiles: paths.length,
        totalIssues,
        results,
      });
    }
  );

  /**
   * POST /api/verify/content/folder
   * Verify all media files in a folder
   */
  app.post(
    '/api/verify/content/folder',
    async (
      request: FastifyRequest<{
        Body: { path: string; recursive?: boolean; options?: VerifyOptions };
      }>,
      reply: FastifyReply
    ) => {
      const {
        path: folderPath,
        recursive = false,
        options = {},
      } = request.body;

      if (!folderPath) {
        return reply.code(400).send({ ok: false, error: 'Path is required' });
      }

      const resolvedPath = path.isAbsolute(folderPath)
        ? folderPath
        : path.resolve(process.cwd(), folderPath);

      // Get all media files
      const mediaExtensions = [
        '.mp4',
        '.mkv',
        '.avi',
        '.mov',
        '.wmv',
        '.m4v',
        '.webm',
        '.ts',
      ];
      const mediaFiles: string[] = [];

      async function scanDir(dir: string) {
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory() && recursive) {
              await scanDir(fullPath);
            } else if (entry.isFile()) {
              const ext = path.extname(entry.name).toLowerCase();
              if (mediaExtensions.includes(ext)) {
                mediaFiles.push(fullPath);
              }
            }
          }
        } catch {
          // Ignore permission errors
        }
      }

      await scanDir(resolvedPath);

      if (mediaFiles.length === 0) {
        return reply.send({
          ok: true,
          allPassed: true,
          totalFiles: 0,
          totalIssues: 0,
          results: {},
          message: 'No media files found in folder',
        });
      }

      // Verify all files
      const results: Record<string, ContentVerifyResult> = {};
      const BATCH_SIZE = 3;

      for (let i = 0; i < mediaFiles.length; i += BATCH_SIZE) {
        const batch = mediaFiles.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (filePath) => {
            const result = await verifyContent(filePath, options);
            return { path: filePath, result };
          })
        );

        for (const { path: p, result } of batchResults) {
          results[p] = result;
        }
      }

      const passedCount = Object.values(results).filter((r) => r.passed).length;
      const failedCount = mediaFiles.length - passedCount;
      const totalIssues = Object.values(results).reduce(
        (sum, r) => sum + r.issues.length,
        0
      );

      return reply.send({
        ok: true,
        allPassed: failedCount === 0,
        totalFiles: mediaFiles.length,
        passedCount,
        failedCount,
        totalIssues,
        results,
      });
    }
  );

  // ==========================================
  // Security Scan Routes
  // ==========================================

  /**
   * POST /api/verify/security
   * Security scan a single file
   */
  app.post(
    '/api/verify/security',
    async (
      request: FastifyRequest<{ Body: { path: string } }>,
      reply: FastifyReply
    ) => {
      const { path: filePath } = request.body;

      if (!filePath) {
        return reply.code(400).send({ ok: false, error: 'Path is required' });
      }

      const resolvedPath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(process.cwd(), filePath);

      const result = await securityScanFile(resolvedPath);

      return reply.send(result);
    }
  );

  /**
   * POST /api/verify/security/folder
   * Security scan a directory
   */
  app.post(
    '/api/verify/security/folder',
    async (
      request: FastifyRequest<{
        Body: { path: string; recursive?: boolean };
      }>,
      reply: FastifyReply
    ) => {
      const { path: folderPath, recursive = true } = request.body;

      if (!folderPath) {
        return reply.code(400).send({ ok: false, error: 'Path is required' });
      }

      const resolvedPath = path.isAbsolute(folderPath)
        ? folderPath
        : path.resolve(process.cwd(), folderPath);

      const result = await securityScanDirectory(resolvedPath, recursive);

      return reply.send(result);
    }
  );

  /**
   * POST /api/verify/security/quick
   * Quick filename-based safety check
   */
  app.post(
    '/api/verify/security/quick',
    async (
      request: FastifyRequest<{ Body: { filename: string } }>,
      reply: FastifyReply
    ) => {
      const { filename } = request.body;

      if (!filename) {
        return reply
          .code(400)
          .send({ ok: false, error: 'Filename is required' });
      }

      const result = quickSafetyCheck(filename);

      return reply.send({ ok: true, ...result });
    }
  );

  // ==========================================
  // Verification Queue Routes
  // ==========================================

  /**
   * GET /api/verify/queue
   * Get queue status
   */
  app.get('/api/verify/queue', async (_request, reply: FastifyReply) => {
    const status = verifyQueue.getStatus();
    const jobs = verifyQueue.getAllJobs();

    return reply.send({
      ok: true,
      ...status,
      jobs: jobs.slice(0, 50), // Limit to 50 most recent
    });
  });

  /**
   * POST /api/verify/queue
   * Add a job to the queue
   */
  app.post(
    '/api/verify/queue',
    async (
      request: FastifyRequest<{ Body: QueueJobRequest }>,
      reply: FastifyReply
    ) => {
      const {
        path: filePath,
        type = 'file',
        options = {},
        priority = 5,
        metadata,
      } = request.body;

      if (!filePath) {
        return reply.code(400).send({ ok: false, error: 'Path is required' });
      }

      const resolvedPath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(process.cwd(), filePath);

      const jobId = verifyQueue.addJob(
        type,
        resolvedPath,
        options,
        metadata,
        priority
      );

      return reply.send({
        ok: true,
        jobId,
        message: 'Job added to queue',
      });
    }
  );

  /**
   * POST /api/verify/queue/batch
   * Add multiple files to the queue
   */
  app.post(
    '/api/verify/queue/batch',
    async (
      request: FastifyRequest<{
        Body: {
          files: Array<{
            path: string;
            metadata?: QueueJobRequest['metadata'];
          }>;
          options?: VerifyOptions;
          priority?: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { files, options = {}, priority = 5 } = request.body;

      if (!files || files.length === 0) {
        return reply.code(400).send({ ok: false, error: 'Files are required' });
      }

      const resolvedFiles = files.map((f) => ({
        path: path.isAbsolute(f.path)
          ? f.path
          : path.resolve(process.cwd(), f.path),
        metadata: f.metadata,
      }));

      const jobIds = verifyQueue.addBatch(resolvedFiles, options, priority);

      return reply.send({
        ok: true,
        jobIds,
        message: `${jobIds.length} jobs added to queue`,
      });
    }
  );

  /**
   * GET /api/verify/queue/:id
   * Get job status
   */
  app.get(
    '/api/verify/queue/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      const job = verifyQueue.getJob(id);

      if (!job) {
        return reply.code(404).send({ ok: false, error: 'Job not found' });
      }

      return reply.send({ ok: true, job });
    }
  );

  /**
   * DELETE /api/verify/queue/:id
   * Cancel a queued job
   */
  app.delete(
    '/api/verify/queue/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      const cancelled = verifyQueue.cancelJob(id);

      if (!cancelled) {
        return reply.code(400).send({
          ok: false,
          error: 'Job cannot be cancelled (not queued or not found)',
        });
      }

      return reply.send({ ok: true, message: 'Job cancelled' });
    }
  );

  /**
   * POST /api/verify/queue/clear
   * Clear completed/failed jobs
   */
  app.post('/api/verify/queue/clear', async (_request, reply: FastifyReply) => {
    const cleared = verifyQueue.clearCompleted();

    return reply.send({
      ok: true,
      cleared,
      message: `Cleared ${cleared} completed/failed jobs`,
    });
  });

  /**
   * GET /api/verify/queue/results
   * Get summary of completed job results
   */
  app.get(
    '/api/verify/queue/results',
    async (_request, reply: FastifyReply) => {
      const results = verifyQueue.getResults();
      const passed = results.filter((r) => r.passed).length;
      const failed = results.length - passed;

      return reply.send({
        ok: true,
        total: results.length,
        passed,
        failed,
        results,
      });
    }
  );
}

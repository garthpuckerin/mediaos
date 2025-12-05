import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  verifyContent,
  quickVerify,
  VerifyOptions,
  ContentVerifyResult,
} from '../services/contentVerify.js';
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
}

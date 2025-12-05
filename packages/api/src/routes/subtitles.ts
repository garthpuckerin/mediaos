import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  getSubtitleTracks,
  extractSubtitle,
  parseSubtitleFile,
  detectSyncOffset,
  autoSyncSubtitles,
  checkWhisperAvailable,
  generateSubtitlesWithWhisper,
  generateSRT,
  adjustSubtitleTiming,
  searchSubtitles,
  GenerationProgress,
} from '../services/subtitles.js';
import {
  subtitleAutomation,
  SubtitleAutomationConfig,
} from '../services/subtitleAutomation.js';

// Track active generation jobs
const activeJobs: Map<
  string,
  { progress: GenerationProgress; videoPath: string }
> = new Map();

export default async function subtitleRoutes(app: FastifyInstance) {
  /**
   * GET /api/subtitles/tracks
   * Get subtitle tracks from a video file
   */
  app.get(
    '/api/subtitles/tracks',
    async (
      request: FastifyRequest<{ Querystring: { path: string } }>,
      reply: FastifyReply
    ) => {
      const { path: videoPath } = request.query;

      if (!videoPath) {
        return reply.code(400).send({ ok: false, error: 'Path is required' });
      }

      const resolvedPath = path.isAbsolute(videoPath)
        ? videoPath
        : path.resolve(process.cwd(), videoPath);

      const tracks = await getSubtitleTracks(resolvedPath);

      return reply.send({
        ok: true,
        tracks,
        hasEmbedded: tracks.length > 0,
      });
    }
  );

  /**
   * POST /api/subtitles/extract
   * Extract embedded subtitle from video
   */
  app.post(
    '/api/subtitles/extract',
    async (
      request: FastifyRequest<{
        Body: { videoPath: string; trackIndex: number; outputPath?: string };
      }>,
      reply: FastifyReply
    ) => {
      const { videoPath, trackIndex, outputPath } = request.body;

      if (!videoPath || trackIndex === undefined) {
        return reply
          .code(400)
          .send({ ok: false, error: 'videoPath and trackIndex are required' });
      }

      const resolvedVideo = path.isAbsolute(videoPath)
        ? videoPath
        : path.resolve(process.cwd(), videoPath);

      const baseName = path.basename(
        resolvedVideo,
        path.extname(resolvedVideo)
      );
      const outDir = path.dirname(resolvedVideo);
      const finalOutput =
        outputPath || path.join(outDir, `${baseName}.track${trackIndex}.srt`);

      const result = await extractSubtitle(
        resolvedVideo,
        trackIndex,
        finalOutput
      );

      return reply.send({
        ...result,
        outputPath: result.ok ? finalOutput : undefined,
      });
    }
  );

  /**
   * POST /api/subtitles/parse
   * Parse a subtitle file and return entries
   */
  app.post(
    '/api/subtitles/parse',
    async (
      request: FastifyRequest<{ Body: { path: string } }>,
      reply: FastifyReply
    ) => {
      const { path: subtitlePath } = request.body;

      if (!subtitlePath) {
        return reply.code(400).send({ ok: false, error: 'Path is required' });
      }

      const resolvedPath = path.isAbsolute(subtitlePath)
        ? subtitlePath
        : path.resolve(process.cwd(), subtitlePath);

      try {
        const entries = await parseSubtitleFile(resolvedPath);
        return reply.send({
          ok: true,
          entries,
          count: entries.length,
          duration:
            entries.length > 0 ? entries[entries.length - 1].endTime : 0,
        });
      } catch (e) {
        return reply.send({ ok: false, error: (e as Error).message });
      }
    }
  );

  /**
   * POST /api/subtitles/sync/detect
   * Detect sync offset between video and subtitle
   */
  app.post(
    '/api/subtitles/sync/detect',
    async (
      request: FastifyRequest<{
        Body: { videoPath: string; subtitlePath: string };
      }>,
      reply: FastifyReply
    ) => {
      const { videoPath, subtitlePath } = request.body;

      if (!videoPath || !subtitlePath) {
        return reply.code(400).send({
          ok: false,
          error: 'videoPath and subtitlePath are required',
        });
      }

      const resolvedVideo = path.isAbsolute(videoPath)
        ? videoPath
        : path.resolve(process.cwd(), videoPath);

      const resolvedSub = path.isAbsolute(subtitlePath)
        ? subtitlePath
        : path.resolve(process.cwd(), subtitlePath);

      const analysis = await detectSyncOffset(resolvedVideo, resolvedSub);

      return reply.send(analysis);
    }
  );

  /**
   * POST /api/subtitles/sync/auto
   * Auto-sync subtitles with video
   */
  app.post(
    '/api/subtitles/sync/auto',
    async (
      request: FastifyRequest<{
        Body: { videoPath: string; subtitlePath: string; outputPath?: string };
      }>,
      reply: FastifyReply
    ) => {
      const { videoPath, subtitlePath, outputPath } = request.body;

      if (!videoPath || !subtitlePath) {
        return reply.code(400).send({
          ok: false,
          error: 'videoPath and subtitlePath are required',
        });
      }

      const resolvedVideo = path.isAbsolute(videoPath)
        ? videoPath
        : path.resolve(process.cwd(), videoPath);

      const resolvedSub = path.isAbsolute(subtitlePath)
        ? subtitlePath
        : path.resolve(process.cwd(), subtitlePath);

      const result = await autoSyncSubtitles(
        resolvedVideo,
        resolvedSub,
        outputPath
      );

      return reply.send(result);
    }
  );

  /**
   * POST /api/subtitles/sync/manual
   * Manually adjust subtitle timing
   */
  app.post(
    '/api/subtitles/sync/manual',
    async (
      request: FastifyRequest<{
        Body: { subtitlePath: string; offsetMs: number; outputPath?: string };
      }>,
      reply: FastifyReply
    ) => {
      const { subtitlePath, offsetMs, outputPath } = request.body;

      if (!subtitlePath || offsetMs === undefined) {
        return reply
          .code(400)
          .send({ ok: false, error: 'subtitlePath and offsetMs are required' });
      }

      const resolvedSub = path.isAbsolute(subtitlePath)
        ? subtitlePath
        : path.resolve(process.cwd(), subtitlePath);

      try {
        const entries = await parseSubtitleFile(resolvedSub);
        const adjusted = adjustSubtitleTiming(entries, offsetMs);
        const srtContent = generateSRT(adjusted);

        const finalOutput =
          outputPath || resolvedSub.replace(/\.[^.]+$/, '.adjusted.srt');

        await fs.writeFile(finalOutput, srtContent, 'utf-8');

        return reply.send({
          ok: true,
          outputPath: finalOutput,
          entriesAdjusted: entries.length,
        });
      } catch (e) {
        return reply.send({ ok: false, error: (e as Error).message });
      }
    }
  );

  /**
   * GET /api/subtitles/generate/check
   * Check if Whisper is available for subtitle generation
   */
  app.get(
    '/api/subtitles/generate/check',
    async (_request, reply: FastifyReply) => {
      const result = await checkWhisperAvailable();

      return reply.send({
        ok: true,
        ...result,
        installInstructions: !result.available
          ? 'Install Whisper with: pip install openai-whisper\n' +
            'Or faster-whisper: pip install faster-whisper\n' +
            'Also ensure ffmpeg is installed.'
          : undefined,
      });
    }
  );

  /**
   * POST /api/subtitles/generate
   * Generate subtitles using Whisper AI
   */
  app.post(
    '/api/subtitles/generate',
    async (
      request: FastifyRequest<{
        Body: {
          videoPath: string;
          language?: string;
          model?: 'tiny' | 'base' | 'small' | 'medium' | 'large';
          outputDir?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { videoPath, language, model, outputDir } = request.body;

      if (!videoPath) {
        return reply
          .code(400)
          .send({ ok: false, error: 'videoPath is required' });
      }

      const resolvedVideo = path.isAbsolute(videoPath)
        ? videoPath
        : path.resolve(process.cwd(), videoPath);

      // Generate job ID
      const jobId = `whisper-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      // Initialize progress tracking
      activeJobs.set(jobId, {
        progress: { status: 'pending', progress: 0 },
        videoPath: resolvedVideo,
      });

      // Start generation in background
      generateSubtitlesWithWhisper(resolvedVideo, {
        language,
        model,
        outputDir,
        onProgress: (progress) => {
          const job = activeJobs.get(jobId);
          if (job) {
            job.progress = progress;
          }
        },
      }).then((result) => {
        const job = activeJobs.get(jobId);
        if (job) {
          job.progress = {
            status: result.ok ? 'complete' : 'error',
            progress: result.ok ? 100 : 0,
            error: result.error,
            currentStep: result.ok
              ? `Generated ${result.segments} subtitle segments`
              : result.error,
          };
        }
      });

      return reply.send({
        ok: true,
        jobId,
        message: 'Subtitle generation started',
      });
    }
  );

  /**
   * GET /api/subtitles/generate/:jobId
   * Get status of subtitle generation job
   */
  app.get(
    '/api/subtitles/generate/:jobId',
    async (
      request: FastifyRequest<{ Params: { jobId: string } }>,
      reply: FastifyReply
    ) => {
      const { jobId } = request.params;
      const job = activeJobs.get(jobId);

      if (!job) {
        return reply.code(404).send({ ok: false, error: 'Job not found' });
      }

      return reply.send({
        ok: true,
        jobId,
        ...job.progress,
        videoPath: job.videoPath,
      });
    }
  );

  /**
   * GET /api/subtitles/generate/jobs
   * List all active generation jobs
   */
  app.get(
    '/api/subtitles/generate/jobs',
    async (_request, reply: FastifyReply) => {
      const jobs = Array.from(activeJobs.entries()).map(([id, job]) => ({
        jobId: id,
        ...job.progress,
        videoPath: job.videoPath,
      }));

      return reply.send({
        ok: true,
        jobs,
        activeCount: jobs.filter((j) => j.status === 'transcribing').length,
      });
    }
  );

  /**
   * POST /api/subtitles/search
   * Search for subtitles online (OpenSubtitles)
   */
  app.post(
    '/api/subtitles/search',
    async (
      request: FastifyRequest<{
        Body: {
          imdbId?: string;
          title?: string;
          season?: number;
          episode?: number;
          language?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { imdbId, title, season, episode, language } = request.body;

      if (!imdbId && !title) {
        return reply
          .code(400)
          .send({ ok: false, error: 'imdbId or title is required' });
      }

      // Load API key from settings
      let apiKey: string | undefined;
      try {
        const settingsPath = path.join(
          process.cwd(),
          'config',
          'settings.json'
        );
        const settings = JSON.parse(await fs.readFile(settingsPath, 'utf-8'));
        apiKey = settings.openSubtitlesApiKey;
      } catch {
        // No settings file
      }

      const result = await searchSubtitles({
        imdbId,
        title,
        season,
        episode,
        language,
        apiKey,
      });

      return reply.send(result);
    }
  );

  /**
   * POST /api/subtitles/convert
   * Convert subtitle between formats
   */
  app.post(
    '/api/subtitles/convert',
    async (
      request: FastifyRequest<{
        Body: {
          inputPath: string;
          outputFormat: 'srt' | 'vtt';
          outputPath?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { inputPath, outputFormat, outputPath } = request.body;

      if (!inputPath || !outputFormat) {
        return reply.code(400).send({
          ok: false,
          error: 'inputPath and outputFormat are required',
        });
      }

      const resolvedInput = path.isAbsolute(inputPath)
        ? inputPath
        : path.resolve(process.cwd(), inputPath);

      try {
        const entries = await parseSubtitleFile(resolvedInput);
        let output: string;

        if (outputFormat === 'srt') {
          output = generateSRT(entries);
        } else if (outputFormat === 'vtt') {
          // Generate VTT
          output =
            'WEBVTT\n\n' +
            entries
              .map((entry) => {
                const formatTime = (ms: number) => {
                  const hours = Math.floor(ms / 3600000);
                  const minutes = Math.floor((ms % 3600000) / 60000);
                  const seconds = Math.floor((ms % 60000) / 1000);
                  const millis = ms % 1000;
                  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
                };
                return `${formatTime(entry.startTime)} --> ${formatTime(entry.endTime)}\n${entry.text}`;
              })
              .join('\n\n');
        } else {
          return reply
            .code(400)
            .send({ ok: false, error: 'Unsupported output format' });
        }

        const finalOutput =
          outputPath || resolvedInput.replace(/\.[^.]+$/, `.${outputFormat}`);

        await fs.writeFile(finalOutput, output, 'utf-8');

        return reply.send({
          ok: true,
          outputPath: finalOutput,
          entriesConverted: entries.length,
        });
      } catch (e) {
        return reply.send({ ok: false, error: (e as Error).message });
      }
    }
  );

  // ==========================================
  // Automation Routes
  // ==========================================

  /**
   * GET /api/subtitles/automation/status
   * Get automation status
   */
  app.get(
    '/api/subtitles/automation/status',
    async (_request, reply: FastifyReply) => {
      const status = subtitleAutomation.getStatus();
      return reply.send({ ok: true, ...status });
    }
  );

  /**
   * GET /api/subtitles/automation/config
   * Get automation configuration
   */
  app.get(
    '/api/subtitles/automation/config',
    async (_request, reply: FastifyReply) => {
      const config = subtitleAutomation.getConfig();
      return reply.send({ ok: true, config });
    }
  );

  /**
   * POST /api/subtitles/automation/config
   * Update automation configuration
   */
  app.post(
    '/api/subtitles/automation/config',
    async (
      request: FastifyRequest<{ Body: Partial<SubtitleAutomationConfig> }>,
      reply: FastifyReply
    ) => {
      await subtitleAutomation.saveConfig(request.body);
      const config = subtitleAutomation.getConfig();
      return reply.send({ ok: true, config, message: 'Configuration saved' });
    }
  );

  /**
   * GET /api/subtitles/automation/jobs
   * Get all automation jobs
   */
  app.get(
    '/api/subtitles/automation/jobs',
    async (_request, reply: FastifyReply) => {
      const jobs = subtitleAutomation.getAllJobs();
      return reply.send({
        ok: true,
        jobs: jobs.slice(0, 100), // Limit to 100 most recent
        total: jobs.length,
      });
    }
  );

  /**
   * GET /api/subtitles/automation/jobs/:id
   * Get specific automation job
   */
  app.get(
    '/api/subtitles/automation/jobs/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const job = subtitleAutomation.getJob(request.params.id);
      if (!job) {
        return reply.code(404).send({ ok: false, error: 'Job not found' });
      }
      return reply.send({ ok: true, job });
    }
  );

  /**
   * POST /api/subtitles/automation/scan
   * Trigger immediate library scan
   */
  app.post(
    '/api/subtitles/automation/scan',
    async (_request, reply: FastifyReply) => {
      const result = await subtitleAutomation.triggerScan();
      return reply.send({
        ok: true,
        ...result,
        message: `Scanned ${result.scanned} items, found ${result.issues} issues`,
      });
    }
  );

  /**
   * POST /api/subtitles/automation/clear
   * Clear completed jobs
   */
  app.post(
    '/api/subtitles/automation/clear',
    async (_request, reply: FastifyReply) => {
      const cleared = subtitleAutomation.clearCompleted();
      return reply.send({
        ok: true,
        cleared,
        message: `Cleared ${cleared} completed jobs`,
      });
    }
  );

  /**
   * POST /api/subtitles/automation/process
   * Manually queue a video for processing
   */
  app.post(
    '/api/subtitles/automation/process',
    async (
      request: FastifyRequest<{
        Body: {
          videoPath: string;
          type: 'sync' | 'generate';
          metadata?: {
            title?: string;
            kind?: string;
            itemId?: string;
          };
        };
      }>,
      reply: FastifyReply
    ) => {
      const { videoPath, type, metadata } = request.body;

      if (!videoPath || !type) {
        return reply
          .code(400)
          .send({ ok: false, error: 'videoPath and type are required' });
      }

      const resolvedPath = path.isAbsolute(videoPath)
        ? videoPath
        : path.resolve(process.cwd(), videoPath);

      const jobId = subtitleAutomation.addJob(type, resolvedPath, {
        ...metadata,
        source: 'manual',
      });

      return reply.send({
        ok: true,
        jobId,
        message: 'Job queued for processing',
      });
    }
  );
}

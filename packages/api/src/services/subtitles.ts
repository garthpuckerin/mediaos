/**
 * Subtitle Service
 *
 * Features:
 * - Subtitle sync detection and correction
 * - Auto-generate subtitles using Whisper AI
 * - Extract embedded subtitles
 * - Convert between subtitle formats
 */

import { execFile as _execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execFile = promisify(_execFile);

// ==========================================
// Types
// ==========================================

export interface SubtitleTrack {
  index: number;
  language?: string;
  title?: string;
  codec: string;
  forced?: boolean;
  default?: boolean;
  embedded: boolean;
}

export interface SubtitleEntry {
  index: number;
  startTime: number; // milliseconds
  endTime: number;
  text: string;
}

export interface SyncAnalysis {
  ok: boolean;
  offsetMs: number; // Positive = subtitle ahead, negative = behind
  confidence: number; // 0-1
  method: 'audio-fingerprint' | 'speech-detection' | 'estimated';
  recommendation: string;
}

export interface GenerationProgress {
  status: 'pending' | 'extracting' | 'transcribing' | 'complete' | 'error';
  progress: number; // 0-100
  currentStep?: string;
  error?: string;
}

export interface GenerationResult {
  ok: boolean;
  outputPath?: string;
  language?: string;
  segments?: number;
  duration?: number;
  error?: string;
}

// ==========================================
// Subtitle Parsing
// ==========================================

/**
 * Parse SRT subtitle file
 */
export function parseSRT(content: string): SubtitleEntry[] {
  const entries: SubtitleEntry[] = [];
  const blocks = content.trim().split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length < 3) continue;

    // First line is index
    const index = parseInt(lines[0], 10);
    if (isNaN(index)) continue;

    // Second line is timestamp
    const timeMatch = lines[1].match(
      /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
    );
    if (!timeMatch) continue;

    const startTime =
      parseInt(timeMatch[1]) * 3600000 +
      parseInt(timeMatch[2]) * 60000 +
      parseInt(timeMatch[3]) * 1000 +
      parseInt(timeMatch[4]);

    const endTime =
      parseInt(timeMatch[5]) * 3600000 +
      parseInt(timeMatch[6]) * 60000 +
      parseInt(timeMatch[7]) * 1000 +
      parseInt(timeMatch[8]);

    // Rest is text
    const text = lines.slice(2).join('\n').trim();

    entries.push({ index, startTime, endTime, text });
  }

  return entries;
}

/**
 * Parse VTT subtitle file
 */
export function parseVTT(content: string): SubtitleEntry[] {
  const entries: SubtitleEntry[] = [];
  // Remove WEBVTT header and metadata
  const cleaned = content.replace(/^WEBVTT.*?\n\n/s, '');
  const blocks = cleaned.trim().split(/\n\n+/);

  let index = 1;
  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length < 2) continue;

    // Find timestamp line
    let timestampLineIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timestampLineIndex = i;
        break;
      }
    }

    const timeMatch = lines[timestampLineIndex].match(
      /(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/
    );

    // Also try shorter format (MM:SS.mmm)
    const shortMatch =
      !timeMatch &&
      lines[timestampLineIndex].match(
        /(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2})\.(\d{3})/
      );

    let startTime: number, endTime: number;

    if (timeMatch) {
      startTime =
        parseInt(timeMatch[1]) * 3600000 +
        parseInt(timeMatch[2]) * 60000 +
        parseInt(timeMatch[3]) * 1000 +
        parseInt(timeMatch[4]);
      endTime =
        parseInt(timeMatch[5]) * 3600000 +
        parseInt(timeMatch[6]) * 60000 +
        parseInt(timeMatch[7]) * 1000 +
        parseInt(timeMatch[8]);
    } else if (shortMatch) {
      startTime =
        parseInt(shortMatch[1]) * 60000 +
        parseInt(shortMatch[2]) * 1000 +
        parseInt(shortMatch[3]);
      endTime =
        parseInt(shortMatch[4]) * 60000 +
        parseInt(shortMatch[5]) * 1000 +
        parseInt(shortMatch[6]);
    } else {
      continue;
    }

    const text = lines
      .slice(timestampLineIndex + 1)
      .join('\n')
      .trim();

    entries.push({ index: index++, startTime, endTime, text });
  }

  return entries;
}

/**
 * Parse ASS/SSA subtitle file
 */
export function parseASS(content: string): SubtitleEntry[] {
  const entries: SubtitleEntry[] = [];
  const lines = content.split('\n');

  let index = 1;
  for (const line of lines) {
    if (!line.startsWith('Dialogue:')) continue;

    // Format: Dialogue: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
    const parts = line.substring(10).split(',');
    if (parts.length < 10) continue;

    const startParts = parts[1].match(/(\d+):(\d{2}):(\d{2})\.(\d{2})/);
    const endParts = parts[2].match(/(\d+):(\d{2}):(\d{2})\.(\d{2})/);

    if (!startParts || !endParts) continue;

    const startTime =
      parseInt(startParts[1]) * 3600000 +
      parseInt(startParts[2]) * 60000 +
      parseInt(startParts[3]) * 1000 +
      parseInt(startParts[4]) * 10;

    const endTime =
      parseInt(endParts[1]) * 3600000 +
      parseInt(endParts[2]) * 60000 +
      parseInt(endParts[3]) * 1000 +
      parseInt(endParts[4]) * 10;

    // Text is everything after the 9th comma
    const text = parts
      .slice(9)
      .join(',')
      .replace(/\\N/g, '\n')
      .replace(/\{[^}]*\}/g, '') // Remove style tags
      .trim();

    entries.push({ index: index++, startTime, endTime, text });
  }

  return entries;
}

/**
 * Auto-detect and parse subtitle file
 */
export async function parseSubtitleFile(
  filePath: string
): Promise<SubtitleEntry[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.srt':
      return parseSRT(content);
    case '.vtt':
      return parseVTT(content);
    case '.ass':
    case '.ssa':
      return parseASS(content);
    default:
      // Try to auto-detect
      if (content.includes('WEBVTT')) return parseVTT(content);
      if (content.includes('[Script Info]')) return parseASS(content);
      return parseSRT(content); // Default to SRT
  }
}

// ==========================================
// Subtitle Generation (SRT format)
// ==========================================

/**
 * Format milliseconds to SRT timestamp
 */
function msToSrtTime(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${millis.toString().padStart(3, '0')}`;
}

/**
 * Generate SRT content from entries
 */
export function generateSRT(entries: SubtitleEntry[]): string {
  return entries
    .map(
      (entry, i) =>
        `${i + 1}\n${msToSrtTime(entry.startTime)} --> ${msToSrtTime(entry.endTime)}\n${entry.text}`
    )
    .join('\n\n');
}

/**
 * Adjust subtitle timing by offset
 */
export function adjustSubtitleTiming(
  entries: SubtitleEntry[],
  offsetMs: number
): SubtitleEntry[] {
  return entries.map((entry) => ({
    ...entry,
    startTime: Math.max(0, entry.startTime + offsetMs),
    endTime: Math.max(0, entry.endTime + offsetMs),
  }));
}

// ==========================================
// Subtitle Extraction
// ==========================================

/**
 * Get subtitle tracks from video file
 */
export async function getSubtitleTracks(
  videoPath: string
): Promise<SubtitleTrack[]> {
  try {
    const { stdout } = await execFile(
      'ffprobe',
      [
        '-v',
        'error',
        '-print_format',
        'json',
        '-show_streams',
        '-select_streams',
        's',
        videoPath,
      ],
      { windowsHide: true, timeout: 30000 }
    );

    const data = JSON.parse(stdout || '{}');
    const streams = data.streams || [];

    return streams.map((s: any, i: number) => ({
      index: s.index,
      language: s.tags?.language || undefined,
      title: s.tags?.title || undefined,
      codec: s.codec_name || 'unknown',
      forced: s.disposition?.forced === 1,
      default: s.disposition?.default === 1,
      embedded: true,
    }));
  } catch {
    return [];
  }
}

/**
 * Extract subtitle track from video
 */
export async function extractSubtitle(
  videoPath: string,
  trackIndex: number,
  outputPath: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await execFile(
      'ffmpeg',
      [
        '-y',
        '-i',
        videoPath,
        '-map',
        `0:${trackIndex}`,
        '-c:s',
        'srt',
        outputPath,
      ],
      { windowsHide: true, timeout: 60000 }
    );

    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ==========================================
// Sync Detection
// ==========================================

/**
 * Detect subtitle sync offset using speech detection
 * This compares when subtitles appear vs when speech is detected
 */
export async function detectSyncOffset(
  videoPath: string,
  subtitlePath: string
): Promise<SyncAnalysis> {
  try {
    // Load subtitles
    const entries = await parseSubtitleFile(subtitlePath);
    if (entries.length < 5) {
      return {
        ok: false,
        offsetMs: 0,
        confidence: 0,
        method: 'estimated',
        recommendation: 'Not enough subtitle entries to analyze',
      };
    }

    // Use ffmpeg to detect silence/speech boundaries
    // This gives us timestamps where audio changes
    const { stderr } = await execFile(
      'ffmpeg',
      [
        '-i',
        videoPath,
        '-af',
        'silencedetect=noise=-30dB:d=0.5',
        '-f',
        'null',
        '-t',
        '300', // Analyze first 5 minutes
        '-',
      ],
      { windowsHide: true, timeout: 120000 }
    );

    // Parse silence detection output
    const silenceEnds: number[] = [];
    const silenceEndMatches = stderr.matchAll(/silence_end: ([\d.]+)/g);
    for (const match of silenceEndMatches) {
      silenceEnds.push(parseFloat(match[1]) * 1000); // Convert to ms
    }

    if (silenceEnds.length < 3) {
      return {
        ok: true,
        offsetMs: 0,
        confidence: 0.3,
        method: 'estimated',
        recommendation:
          'Could not detect enough speech boundaries. Manual adjustment may be needed.',
      };
    }

    // Compare speech start times with subtitle start times
    // Find the best offset that aligns them
    const offsets: number[] = [];

    for (let i = 0; i < Math.min(entries.length, 20); i++) {
      const subStart = entries[i].startTime;

      // Find closest speech start
      let minDiff = Infinity;
      for (const speechStart of silenceEnds) {
        const diff = speechStart - subStart;
        if (Math.abs(diff) < Math.abs(minDiff) && Math.abs(diff) < 10000) {
          minDiff = diff;
        }
      }

      if (minDiff !== Infinity) {
        offsets.push(minDiff);
      }
    }

    if (offsets.length < 3) {
      return {
        ok: true,
        offsetMs: 0,
        confidence: 0.4,
        method: 'estimated',
        recommendation:
          'Limited alignment data. Subtitles may already be in sync.',
      };
    }

    // Calculate median offset (more robust than mean)
    offsets.sort((a, b) => a - b);
    const medianOffset = offsets[Math.floor(offsets.length / 2)];

    // Calculate confidence based on consistency
    const stdDev = Math.sqrt(
      offsets.reduce((sum, o) => sum + Math.pow(o - medianOffset, 2), 0) /
        offsets.length
    );
    const confidence = Math.max(0, Math.min(1, 1 - stdDev / 2000));

    const absOffset = Math.abs(medianOffset);
    let recommendation: string;

    if (absOffset < 100) {
      recommendation = 'Subtitles appear to be in sync (offset < 100ms)';
    } else if (absOffset < 500) {
      recommendation = `Minor sync issue detected. Adjust by ${medianOffset > 0 ? 'delaying' : 'advancing'} ${absOffset}ms`;
    } else if (absOffset < 2000) {
      recommendation = `Noticeable sync issue. Adjust by ${medianOffset > 0 ? 'delaying' : 'advancing'} ${absOffset}ms`;
    } else {
      recommendation = `Major sync issue (${absOffset}ms). Subtitles may be for a different version/cut.`;
    }

    return {
      ok: true,
      offsetMs: Math.round(medianOffset),
      confidence,
      method: 'speech-detection',
      recommendation,
    };
  } catch (e) {
    return {
      ok: false,
      offsetMs: 0,
      confidence: 0,
      method: 'estimated',
      recommendation: `Analysis failed: ${(e as Error).message}`,
    };
  }
}

/**
 * Auto-sync subtitles and save corrected file
 */
export async function autoSyncSubtitles(
  videoPath: string,
  subtitlePath: string,
  outputPath?: string
): Promise<{
  ok: boolean;
  offsetMs?: number;
  outputPath?: string;
  error?: string;
}> {
  const analysis = await detectSyncOffset(videoPath, subtitlePath);

  if (!analysis.ok) {
    return { ok: false, error: analysis.recommendation };
  }

  if (Math.abs(analysis.offsetMs) < 100) {
    return {
      ok: true,
      offsetMs: 0,
      outputPath: subtitlePath,
      error: 'Subtitles already in sync',
    };
  }

  try {
    const entries = await parseSubtitleFile(subtitlePath);
    const adjusted = adjustSubtitleTiming(entries, -analysis.offsetMs);
    const srtContent = generateSRT(adjusted);

    const finalPath =
      outputPath || subtitlePath.replace(/\.[^.]+$/, '.synced.srt');
    await fs.writeFile(finalPath, srtContent, 'utf-8');

    return {
      ok: true,
      offsetMs: analysis.offsetMs,
      outputPath: finalPath,
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ==========================================
// Subtitle Generation (Whisper)
// ==========================================

/**
 * Check if Whisper is available
 */
export async function checkWhisperAvailable(): Promise<{
  available: boolean;
  version?: string;
  path?: string;
}> {
  // Try different whisper commands
  const commands = ['whisper', 'whisper.exe', 'python -m whisper'];

  for (const cmd of commands) {
    try {
      const parts = cmd.split(' ');
      const { stdout } = await execFile(
        parts[0],
        [...parts.slice(1), '--help'],
        { windowsHide: true, timeout: 10000 }
      );

      if (stdout.includes('whisper') || stdout.includes('Whisper')) {
        return { available: true, path: cmd };
      }
    } catch {
      // Try next command
    }
  }

  // Also check for faster-whisper
  try {
    const { stdout } = await execFile('faster-whisper', ['--help'], {
      windowsHide: true,
      timeout: 10000,
    });
    if (stdout) {
      return { available: true, path: 'faster-whisper' };
    }
  } catch {
    // Not available
  }

  return { available: false };
}

/**
 * Generate subtitles using Whisper AI
 */
export async function generateSubtitlesWithWhisper(
  videoPath: string,
  options: {
    language?: string; // Auto-detect if not specified
    model?: 'tiny' | 'base' | 'small' | 'medium' | 'large';
    outputDir?: string;
    onProgress?: (progress: GenerationProgress) => void;
  } = {}
): Promise<GenerationResult> {
  const { language, model = 'base', outputDir, onProgress } = options;

  // Check whisper availability
  const whisperCheck = await checkWhisperAvailable();
  if (!whisperCheck.available) {
    return {
      ok: false,
      error:
        'Whisper is not installed. Install with: pip install openai-whisper',
    };
  }

  const progress: GenerationProgress = {
    status: 'pending',
    progress: 0,
  };

  const updateProgress = (update: Partial<GenerationProgress>) => {
    Object.assign(progress, update);
    onProgress?.(progress);
  };

  try {
    // Determine output directory
    const outDir = outputDir || path.dirname(videoPath);
    const baseName = path.basename(videoPath, path.extname(videoPath));

    updateProgress({
      status: 'extracting',
      progress: 10,
      currentStep: 'Preparing audio...',
    });

    // Extract audio to temp file (whisper works better with audio-only)
    const tempAudio = path.join(outDir, `${baseName}.temp.wav`);
    try {
      await execFile(
        'ffmpeg',
        [
          '-y',
          '-i',
          videoPath,
          '-vn',
          '-acodec',
          'pcm_s16le',
          '-ar',
          '16000',
          '-ac',
          '1',
          tempAudio,
        ],
        { windowsHide: true, timeout: 300000 }
      );
    } catch (e) {
      // If audio extraction fails, try direct input
      console.log('Audio extraction failed, using video directly');
    }

    const inputFile = (await fs.stat(tempAudio).catch(() => null))
      ? tempAudio
      : videoPath;

    updateProgress({
      status: 'transcribing',
      progress: 20,
      currentStep: `Transcribing with Whisper (${model} model)...`,
    });

    // Build whisper command
    const args = [
      inputFile,
      '--model',
      model,
      '--output_format',
      'srt',
      '--output_dir',
      outDir,
    ];

    if (language) {
      args.push('--language', language);
    }

    // Run whisper
    const whisperCmd = whisperCheck.path!.split(' ');
    await execFile(whisperCmd[0], [...whisperCmd.slice(1), ...args], {
      windowsHide: true,
      timeout: 3600000, // 1 hour timeout for long videos
    });

    updateProgress({
      status: 'complete',
      progress: 100,
      currentStep: 'Complete!',
    });

    // Clean up temp file
    try {
      await fs.unlink(tempAudio);
    } catch {
      // Ignore cleanup errors
    }

    // Find the output file
    const expectedOutput = path.join(
      outDir,
      `${path.basename(inputFile, path.extname(inputFile))}.srt`
    );
    const exists = await fs.stat(expectedOutput).catch(() => null);

    if (exists) {
      // Read to count segments
      const content = await fs.readFile(expectedOutput, 'utf-8');
      const entries = parseSRT(content);

      // Rename to match video name if we used temp audio
      if (inputFile === tempAudio) {
        const finalOutput = path.join(outDir, `${baseName}.srt`);
        await fs.rename(expectedOutput, finalOutput);
        return {
          ok: true,
          outputPath: finalOutput,
          segments: entries.length,
        };
      }

      return {
        ok: true,
        outputPath: expectedOutput,
        segments: entries.length,
      };
    }

    return {
      ok: false,
      error: 'Whisper completed but output file not found',
    };
  } catch (e) {
    updateProgress({
      status: 'error',
      progress: 0,
      error: (e as Error).message,
    });

    return {
      ok: false,
      error: (e as Error).message,
    };
  }
}

// ==========================================
// Subtitle Search & Download
// ==========================================

/**
 * Search for subtitles online (OpenSubtitles API)
 * Note: Requires API key for OpenSubtitles
 */
export interface SubtitleSearchResult {
  id: string;
  language: string;
  filename: string;
  downloads: number;
  rating: number;
  hearingImpaired: boolean;
  uploadDate: string;
  downloadUrl?: string;
}

export async function searchSubtitles(options: {
  imdbId?: string;
  title?: string;
  season?: number;
  episode?: number;
  language?: string;
  apiKey?: string;
}): Promise<{ ok: boolean; results?: SubtitleSearchResult[]; error?: string }> {
  // This is a placeholder - real implementation would use OpenSubtitles API
  // The API requires registration and has rate limits

  if (!options.apiKey) {
    return {
      ok: false,
      error: 'OpenSubtitles API key required. Get one at opensubtitles.org',
    };
  }

  try {
    const baseUrl = 'https://api.opensubtitles.com/api/v1';
    const params = new URLSearchParams();

    if (options.imdbId) params.set('imdb_id', options.imdbId);
    if (options.title) params.set('query', options.title);
    if (options.season) params.set('season_number', String(options.season));
    if (options.episode) params.set('episode_number', String(options.episode));
    if (options.language) params.set('languages', options.language);

    const response = await fetch(`${baseUrl}/subtitles?${params}`, {
      headers: {
        'Api-Key': options.apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return { ok: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();

    return {
      ok: true,
      results: (data.data || []).map((item: any) => ({
        id: item.id,
        language: item.attributes?.language,
        filename: item.attributes?.files?.[0]?.file_name,
        downloads: item.attributes?.download_count,
        rating: item.attributes?.ratings,
        hearingImpaired: item.attributes?.hearing_impaired,
        uploadDate: item.attributes?.upload_date,
      })),
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

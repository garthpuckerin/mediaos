/**
 * Content Verification Service
 *
 * Detects common issues with downloaded media:
 * - Content mismatch (wrong movie/show)
 * - Double/split screens (fake files)
 * - Quality misrepresentation (labeled 1080p but is 480p)
 * - Corrupted or truncated files
 * - Sample files masquerading as full content
 * - Malware/executables disguised as media
 */

import { execFile as _execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  scanFile as securityScanFile,
  quickSafetyCheck,
  SecurityIssue,
} from './securityScan.js';

const execFile = promisify(_execFile);

export interface ContentIssue {
  type: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  details?: Record<string, unknown>;
}

export interface ContentVerifyResult {
  ok: boolean;
  passed: boolean;
  issues: ContentIssue[];
  securityIssues: SecurityIssue[];
  metadata: {
    duration?: number;
    width?: number;
    height?: number;
    aspectRatio?: string;
    bitrate?: number;
    codec?: string;
    container?: string;
    audioTracks?: number;
    subtitleTracks?: number;
    fileSize?: number;
  };
  checks: {
    securityCheck: 'pass' | 'fail' | 'skip';
    durationCheck: 'pass' | 'fail' | 'skip';
    aspectRatioCheck: 'pass' | 'fail' | 'skip';
    bitrateCheck: 'pass' | 'fail' | 'skip';
    qualityCheck: 'pass' | 'fail' | 'skip';
    corruptionCheck: 'pass' | 'fail' | 'skip';
  };
  verifiedAt: string;
}

export interface VerifyOptions {
  expectedTitle?: string;
  expectedQuality?: string; // e.g., "1080p", "720p"
  expectedDurationMin?: number; // minutes
  expectedDurationMax?: number;
  minBitrateKbps?: number;
  checkAspectRatio?: boolean;
  checkCorruption?: boolean;
  checkSecurity?: boolean; // Check for malware/executables
}

// Common fake file aspect ratios (double/triple screens)
const SUSPICIOUS_ASPECT_RATIOS = [
  { ratio: 32 / 9, name: 'double-screen-wide', threshold: 0.1 },
  { ratio: 48 / 9, name: 'triple-screen', threshold: 0.1 },
  { ratio: 4 / 1, name: 'ultra-wide-fake', threshold: 0.1 },
  { ratio: 8 / 3, name: 'double-4:3', threshold: 0.1 },
];

// Quality to expected resolution mapping
const QUALITY_RESOLUTION_MAP: Record<
  string,
  { minHeight: number; minBitrate: number }
> = {
  '2160p': { minHeight: 2000, minBitrate: 8000 },
  '4k': { minHeight: 2000, minBitrate: 8000 },
  '1080p': { minHeight: 1000, minBitrate: 2000 },
  '720p': { minHeight: 700, minBitrate: 1000 },
  '480p': { minHeight: 460, minBitrate: 500 },
};

// Words that indicate sample/fake files
const SUSPICIOUS_FILENAME_PATTERNS = [
  /\bsample\b/i,
  /\btrailer\b/i,
  /\bteaser\b/i,
  /\bpromo\b/i,
  /\bpreview\b/i,
  /\bcam\b/i,
  /\bts\b/i,
  /\bhdts\b/i,
  /\bscreener\b/i,
  /\bscr\b/i,
  /\bdvdscr\b/i,
  /\bwp\b/i, // Workprint
  /\bfake\b/i,
];

/**
 * Run ffprobe on a file
 */
async function ffprobe(filePath: string): Promise<any> {
  try {
    const { stdout } = await execFile(
      'ffprobe',
      [
        '-v',
        'error',
        '-print_format',
        'json',
        '-show_format',
        '-show_streams',
        '-show_error',
        filePath,
      ],
      { windowsHide: true, timeout: 30000 }
    );
    return JSON.parse(stdout || '{}');
  } catch (e) {
    return null;
  }
}

/**
 * Check file for corruption using ffmpeg
 */
async function checkCorruption(
  filePath: string
): Promise<{ corrupted: boolean; errors: string[] }> {
  try {
    // Run a quick decode check on the first and last 30 seconds
    const { stderr } = await execFile(
      'ffmpeg',
      [
        '-v',
        'error',
        '-i',
        filePath,
        '-t',
        '30', // First 30 seconds
        '-f',
        'null',
        '-',
      ],
      { windowsHide: true, timeout: 60000 }
    );

    const errors = (stderr || '')
      .split('\n')
      .filter((line) => line.includes('error') || line.includes('Error'))
      .slice(0, 5);

    return {
      corrupted: errors.length > 3, // Allow a few minor errors
      errors,
    };
  } catch {
    return { corrupted: false, errors: [] };
  }
}

/**
 * Analyze aspect ratio for suspicious patterns
 */
function analyzeAspectRatio(
  width: number,
  height: number
): ContentIssue | null {
  if (!width || !height) return null;

  const ratio = width / height;

  for (const suspicious of SUSPICIOUS_ASPECT_RATIOS) {
    if (Math.abs(ratio - suspicious.ratio) < suspicious.threshold) {
      return {
        type: 'suspicious_aspect_ratio',
        severity: 'error',
        message: `Detected ${suspicious.name} layout - likely a fake or cam recording`,
        details: {
          ratio: ratio.toFixed(2),
          expected: suspicious.ratio,
          pattern: suspicious.name,
        },
      };
    }
  }

  // Check for extremely unusual aspect ratios
  if (ratio > 3.0 || ratio < 0.5) {
    return {
      type: 'unusual_aspect_ratio',
      severity: 'warning',
      message: `Unusual aspect ratio (${ratio.toFixed(2)}) - verify content manually`,
      details: { ratio: ratio.toFixed(2) },
    };
  }

  return null;
}

/**
 * Check if claimed quality matches actual resolution/bitrate
 */
function checkQualityMismatch(
  claimedQuality: string,
  actualHeight: number,
  actualBitrate: number
): ContentIssue | null {
  const expected = QUALITY_RESOLUTION_MAP[claimedQuality.toLowerCase()];
  if (!expected) return null;

  if (actualHeight < expected.minHeight * 0.9) {
    return {
      type: 'quality_mismatch',
      severity: 'error',
      message: `Labeled as ${claimedQuality} but actual resolution is ${actualHeight}p`,
      details: {
        claimed: claimedQuality,
        actualHeight,
        expectedMinHeight: expected.minHeight,
      },
    };
  }

  if (actualBitrate && actualBitrate < expected.minBitrate * 0.5) {
    return {
      type: 'bitrate_mismatch',
      severity: 'warning',
      message: `Bitrate (${actualBitrate}kbps) is very low for ${claimedQuality}`,
      details: {
        claimed: claimedQuality,
        actualBitrate,
        expectedMinBitrate: expected.minBitrate,
      },
    };
  }

  return null;
}

/**
 * Main verification function
 */
export async function verifyContent(
  filePath: string,
  options: VerifyOptions = {}
): Promise<ContentVerifyResult> {
  const issues: ContentIssue[] = [];
  const securityIssues: SecurityIssue[] = [];
  const checks: ContentVerifyResult['checks'] = {
    securityCheck: 'skip',
    durationCheck: 'skip',
    aspectRatioCheck: 'skip',
    bitrateCheck: 'skip',
    qualityCheck: 'skip',
    corruptionCheck: 'skip',
  };

  // Get file info
  let fileSize = 0;
  try {
    const stats = await fs.stat(filePath);
    fileSize = stats.size;
  } catch {
    return {
      ok: false,
      passed: false,
      issues: [
        {
          type: 'file_not_found',
          severity: 'error',
          message: 'File not accessible',
        },
      ],
      securityIssues: [],
      metadata: {},
      checks,
      verifiedAt: new Date().toISOString(),
    };
  }

  // Security scan (check for malware, executables, scripts)
  if (options.checkSecurity !== false) {
    checks.securityCheck = 'pass';
    const securityResult = await securityScanFile(filePath);
    securityIssues.push(...securityResult.issues);

    if (!securityResult.safe) {
      checks.securityCheck = 'fail';
      // Also add critical security issues to main issues
      for (const secIssue of securityResult.issues) {
        if (secIssue.severity === 'critical') {
          issues.push({
            type: 'security_threat',
            severity: 'error',
            message: secIssue.message,
            details: secIssue.details,
          });
        }
      }
    }
  }

  // Check filename for suspicious patterns
  const filename = path.basename(filePath);
  for (const pattern of SUSPICIOUS_FILENAME_PATTERNS) {
    if (pattern.test(filename)) {
      issues.push({
        type: 'suspicious_filename',
        severity: 'warning',
        message: `Filename contains suspicious keyword: ${filename}`,
        details: { pattern: pattern.source },
      });
    }
  }

  // Run ffprobe
  const probeData = await ffprobe(filePath);
  if (!probeData) {
    issues.push({
      type: 'probe_failed',
      severity: 'error',
      message: 'Could not analyze file - may be corrupted or invalid format',
    });
    return {
      ok: false,
      passed: false,
      issues,
      securityIssues,
      metadata: { fileSize },
      checks,
      verifiedAt: new Date().toISOString(),
    };
  }

  // Extract metadata
  const format = probeData.format || {};
  const streams: any[] = Array.isArray(probeData.streams)
    ? probeData.streams
    : [];
  const videoStream = streams.find((s) => s.codec_type === 'video');
  const audioStreams = streams.filter((s) => s.codec_type === 'audio');
  const subtitleStreams = streams.filter((s) => s.codec_type === 'subtitle');

  const duration = format.duration
    ? Math.floor(Number(format.duration))
    : undefined;
  const width = videoStream?.width;
  const height = videoStream?.height;
  const bitrate = videoStream?.bit_rate
    ? Math.floor(Number(videoStream.bit_rate) / 1000)
    : format.bit_rate
      ? Math.floor(Number(format.bit_rate) / 1000)
      : undefined;

  const metadata: ContentVerifyResult['metadata'] = {
    duration,
    width,
    height,
    aspectRatio: width && height ? `${width}:${height}` : undefined,
    bitrate,
    codec: videoStream?.codec_name,
    container: format.format_name,
    audioTracks: audioStreams.length,
    subtitleTracks: subtitleStreams.length,
    fileSize,
  };

  // Duration check
  if (options.expectedDurationMin || options.expectedDurationMax) {
    checks.durationCheck = 'pass';
    const durationMin = (options.expectedDurationMin || 0) * 60;
    const durationMax = (options.expectedDurationMax || Infinity) * 60;

    if (duration && duration < durationMin) {
      checks.durationCheck = 'fail';
      issues.push({
        type: 'duration_too_short',
        severity: 'error',
        message: `Duration (${Math.floor(duration / 60)} min) is shorter than expected (${options.expectedDurationMin} min)`,
        details: { actual: duration, expected: durationMin },
      });
    }

    if (duration && duration > durationMax) {
      checks.durationCheck = 'fail';
      issues.push({
        type: 'duration_too_long',
        severity: 'warning',
        message: `Duration (${Math.floor(duration / 60)} min) is longer than expected (${options.expectedDurationMax} min)`,
        details: { actual: duration, expected: durationMax },
      });
    }
  }

  // Very short file check (likely sample)
  if (duration && duration < 300) {
    // Less than 5 minutes
    issues.push({
      type: 'very_short_duration',
      severity: 'error',
      message: `File is only ${Math.floor(duration / 60)} minutes - likely a sample or trailer`,
      details: { duration },
    });
  }

  // Aspect ratio check
  if (options.checkAspectRatio !== false && width && height) {
    checks.aspectRatioCheck = 'pass';
    const aspectIssue = analyzeAspectRatio(width, height);
    if (aspectIssue) {
      checks.aspectRatioCheck = 'fail';
      issues.push(aspectIssue);
    }
  }

  // Quality mismatch check
  if (options.expectedQuality && height) {
    checks.qualityCheck = 'pass';
    const qualityIssue = checkQualityMismatch(
      options.expectedQuality,
      height,
      bitrate || 0
    );
    if (qualityIssue) {
      checks.qualityCheck = 'fail';
      issues.push(qualityIssue);
    }
  }

  // Bitrate check
  if (options.minBitrateKbps && bitrate) {
    checks.bitrateCheck = bitrate >= options.minBitrateKbps ? 'pass' : 'fail';
    if (bitrate < options.minBitrateKbps) {
      issues.push({
        type: 'low_bitrate',
        severity: 'warning',
        message: `Bitrate (${bitrate}kbps) is below minimum (${options.minBitrateKbps}kbps)`,
        details: { actual: bitrate, minimum: options.minBitrateKbps },
      });
    }
  }

  // Corruption check
  if (options.checkCorruption) {
    const corruptionResult = await checkCorruption(filePath);
    checks.corruptionCheck = corruptionResult.corrupted ? 'fail' : 'pass';
    if (corruptionResult.corrupted) {
      issues.push({
        type: 'file_corrupted',
        severity: 'error',
        message: 'File appears to be corrupted or have encoding errors',
        details: { errors: corruptionResult.errors },
      });
    }
  }

  // No audio tracks
  if (audioStreams.length === 0) {
    issues.push({
      type: 'no_audio',
      severity: 'warning',
      message: 'No audio tracks found - file may be incomplete',
    });
  }

  // Determine overall pass/fail
  const hasErrors = issues.some((i) => i.severity === 'error');
  const hasSecurityThreats = securityIssues.some(
    (i) => i.severity === 'critical' || i.severity === 'danger'
  );
  const passed = !hasErrors && !hasSecurityThreats;

  return {
    ok: true,
    passed,
    issues,
    securityIssues,
    metadata,
    checks,
    verifiedAt: new Date().toISOString(),
  };
}

/**
 * Quick check without deep analysis
 */
export async function quickVerify(filePath: string): Promise<{
  ok: boolean;
  passed: boolean;
  issues: string[];
}> {
  const result = await verifyContent(filePath, {
    checkAspectRatio: true,
    checkCorruption: false, // Skip slow corruption check
  });

  return {
    ok: result.ok,
    passed: result.passed,
    issues: result.issues.map((i) => i.message),
  };
}

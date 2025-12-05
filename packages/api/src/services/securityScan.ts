/**
 * Security Scanner for Media Files
 *
 * Detects malicious files disguised as media:
 * - Executables (.exe, .bat, .cmd, .ps1, .vbs, .js, .msi)
 * - Archives containing executables
 * - Double extensions (movie.mkv.exe)
 * - Autorun files
 * - Suspicious file signatures
 * - Hidden files and alternate data streams
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { execFile as _execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(_execFile);

export interface SecurityIssue {
  type: string;
  severity: 'warning' | 'danger' | 'critical';
  message: string;
  file?: string;
  details?: Record<string, unknown>;
}

export interface SecurityScanResult {
  ok: boolean;
  safe: boolean;
  issues: SecurityIssue[];
  scannedFiles: number;
  scannedAt: string;
}

// Dangerous file extensions
const EXECUTABLE_EXTENSIONS = new Set([
  '.exe',
  '.bat',
  '.cmd',
  '.com',
  '.pif',
  '.scr',
  '.msi',
  '.msp',
  '.msc',
  '.dll',
  '.sys',
  '.drv',
]);

const SCRIPT_EXTENSIONS = new Set([
  '.ps1',
  '.psm1',
  '.psd1',
  '.vbs',
  '.vbe',
  '.js',
  '.jse',
  '.ws',
  '.wsf',
  '.wsc',
  '.wsh',
  '.hta',
  '.reg',
  '.inf',
]);

const ARCHIVE_EXTENSIONS = new Set([
  '.zip',
  '.rar',
  '.7z',
  '.tar',
  '.gz',
  '.bz2',
  '.xz',
  '.iso',
  '.cab',
  '.arj',
]);

const SHORTCUT_EXTENSIONS = new Set(['.lnk', '.url', '.desktop']);

// Valid media extensions
const VALID_MEDIA_EXTENSIONS = new Set([
  // Video
  '.mp4',
  '.mkv',
  '.avi',
  '.mov',
  '.wmv',
  '.flv',
  '.webm',
  '.m4v',
  '.mpg',
  '.mpeg',
  '.ts',
  '.m2ts',
  '.vob',
  '.ogv',
  '.3gp',
  '.divx',
  '.xvid',
  // Audio
  '.mp3',
  '.flac',
  '.wav',
  '.aac',
  '.ogg',
  '.wma',
  '.m4a',
  '.opus',
  '.aiff',
  '.ape',
  '.alac',
  // Subtitles
  '.srt',
  '.ass',
  '.ssa',
  '.sub',
  '.idx',
  '.vtt',
  // Images (for artwork)
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.bmp',
  // Info files (safe)
  '.nfo',
  '.txt',
  '.sfv',
]);

// File signatures (magic bytes) for executables
const EXECUTABLE_SIGNATURES: Array<{ bytes: number[]; name: string }> = [
  { bytes: [0x4d, 0x5a], name: 'Windows Executable (MZ)' }, // PE/EXE
  { bytes: [0x7f, 0x45, 0x4c, 0x46], name: 'Linux Executable (ELF)' },
  { bytes: [0xca, 0xfe, 0xba, 0xbe], name: 'macOS Universal Binary' },
  { bytes: [0xfe, 0xed, 0xfa, 0xce], name: 'macOS Mach-O (32-bit)' },
  { bytes: [0xfe, 0xed, 0xfa, 0xcf], name: 'macOS Mach-O (64-bit)' },
  { bytes: [0xcf, 0xfa, 0xed, 0xfe], name: 'macOS Mach-O (64-bit LE)' },
];

// Suspicious patterns in filenames
const SUSPICIOUS_PATTERNS = [
  /\.(mkv|mp4|avi|mov)\.exe$/i, // Double extension ending in exe
  /\.(mkv|mp4|avi|mov)\.scr$/i, // Double extension ending in scr
  /\.(mkv|mp4|avi|mov)\s+\.exe$/i, // Spaces before exe
  /autorun\.inf$/i, // Autorun file
  /desktop\.ini$/i, // Desktop customization (can be malicious)
  /thumbs\.db$/i, // Windows thumbnail cache
  /\.ds_store$/i, // macOS metadata
  /setup\.exe$/i, // Setup files
  /install.*\.exe$/i, // Installer executables
  /crack.*\.exe$/i, // Cracked software (likely malware)
  /keygen.*\.exe$/i, // Key generators (often malware)
  /patch.*\.exe$/i, // Patcher executables
  /readme\.exe$/i, // Fake readme executables
  /password.*\.txt$/i, // Password files (social engineering)
];

/**
 * Check if file extension is dangerous
 */
function isDangerousExtension(filename: string): SecurityIssue | null {
  const ext = path.extname(filename).toLowerCase();
  const basename = path.basename(filename).toLowerCase();

  if (EXECUTABLE_EXTENSIONS.has(ext)) {
    return {
      type: 'executable_file',
      severity: 'critical',
      message: `Executable file detected: ${filename}`,
      file: filename,
      details: { extension: ext },
    };
  }

  if (SCRIPT_EXTENSIONS.has(ext)) {
    return {
      type: 'script_file',
      severity: 'critical',
      message: `Script file detected: ${filename}`,
      file: filename,
      details: { extension: ext },
    };
  }

  if (SHORTCUT_EXTENSIONS.has(ext)) {
    return {
      type: 'shortcut_file',
      severity: 'danger',
      message: `Shortcut file detected (can execute commands): ${filename}`,
      file: filename,
      details: { extension: ext },
    };
  }

  // Check for double extensions
  const parts = basename.split('.');
  if (parts.length > 2) {
    const lastExt = '.' + parts[parts.length - 1];
    const secondLastExt = '.' + parts[parts.length - 2];

    if (
      VALID_MEDIA_EXTENSIONS.has(secondLastExt) &&
      (EXECUTABLE_EXTENSIONS.has(lastExt) || SCRIPT_EXTENSIONS.has(lastExt))
    ) {
      return {
        type: 'double_extension',
        severity: 'critical',
        message: `Double extension attack detected: ${filename}`,
        file: filename,
        details: { extensions: [secondLastExt, lastExt] },
      };
    }
  }

  return null;
}

/**
 * Check for suspicious filename patterns
 */
function checkSuspiciousPatterns(filename: string): SecurityIssue | null {
  const basename = path.basename(filename).toLowerCase();

  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(basename)) {
      return {
        type: 'suspicious_filename',
        severity: 'danger',
        message: `Suspicious filename pattern: ${filename}`,
        file: filename,
        details: { pattern: pattern.source },
      };
    }
  }

  return null;
}

/**
 * Check file signature (magic bytes)
 */
async function checkFileSignature(
  filePath: string
): Promise<SecurityIssue | null> {
  try {
    const handle = await fs.open(filePath, 'r');
    try {
      const buffer = Buffer.alloc(8);
      await handle.read(buffer, 0, 8, 0);

      for (const sig of EXECUTABLE_SIGNATURES) {
        let match = true;
        for (let i = 0; i < sig.bytes.length; i++) {
          if (buffer[i] !== sig.bytes[i]) {
            match = false;
            break;
          }
        }
        if (match) {
          // Check if extension matches expectation
          const ext = path.extname(filePath).toLowerCase();
          if (VALID_MEDIA_EXTENSIONS.has(ext)) {
            return {
              type: 'disguised_executable',
              severity: 'critical',
              message: `File appears to be ${sig.name} disguised as media`,
              file: filePath,
              details: { detectedType: sig.name, claimedExtension: ext },
            };
          }
        }
      }
    } finally {
      await handle.close();
    }
  } catch {
    // Can't read file, skip signature check
  }

  return null;
}

/**
 * Check archive contents for dangerous files
 */
async function checkArchiveContents(
  archivePath: string
): Promise<SecurityIssue[]> {
  const issues: SecurityIssue[] = [];
  const ext = path.extname(archivePath).toLowerCase();

  if (!ARCHIVE_EXTENSIONS.has(ext)) {
    return issues;
  }

  // Try to list archive contents
  try {
    let files: string[] = [];

    if (ext === '.zip') {
      // Use PowerShell on Windows or unzip on Unix
      try {
        const { stdout } = await execFile(
          'powershell',
          [
            '-Command',
            `(Get-ChildItem -Path '${archivePath}' -ErrorAction SilentlyContinue | ForEach-Object { $_.Name }) -join '\n'`,
          ],
          { windowsHide: true, timeout: 10000 }
        );
        files = stdout.split('\n').filter(Boolean);
      } catch {
        // Try 7z if available
        try {
          const { stdout } = await execFile('7z', ['l', '-slt', archivePath], {
            windowsHide: true,
            timeout: 10000,
          });
          const matches = stdout.match(/Path = (.+)/g) || [];
          files = matches.map((m) => m.replace('Path = ', ''));
        } catch {
          // Can't list archive contents
        }
      }
    } else if (ext === '.rar') {
      try {
        const { stdout } = await execFile('unrar', ['l', archivePath], {
          windowsHide: true,
          timeout: 10000,
        });
        files = stdout.split('\n').filter((line) => line.trim());
      } catch {
        // unrar not available
      }
    } else if (ext === '.7z') {
      try {
        const { stdout } = await execFile('7z', ['l', '-slt', archivePath], {
          windowsHide: true,
          timeout: 10000,
        });
        const matches = stdout.match(/Path = (.+)/g) || [];
        files = matches.map((m) => m.replace('Path = ', ''));
      } catch {
        // 7z not available
      }
    }

    // Check each file in archive
    for (const file of files) {
      const fileExt = path.extname(file).toLowerCase();

      if (EXECUTABLE_EXTENSIONS.has(fileExt)) {
        issues.push({
          type: 'archive_contains_executable',
          severity: 'critical',
          message: `Archive contains executable: ${file}`,
          file: archivePath,
          details: { containedFile: file },
        });
      }

      if (SCRIPT_EXTENSIONS.has(fileExt)) {
        issues.push({
          type: 'archive_contains_script',
          severity: 'critical',
          message: `Archive contains script: ${file}`,
          file: archivePath,
          details: { containedFile: file },
        });
      }

      // Check for autorun.inf in archive
      if (file.toLowerCase() === 'autorun.inf') {
        issues.push({
          type: 'archive_contains_autorun',
          severity: 'critical',
          message: 'Archive contains autorun.inf (auto-execute risk)',
          file: archivePath,
          details: { containedFile: file },
        });
      }
    }

    // Check for password-protected archive (common for malware distribution)
    if (files.length === 0) {
      issues.push({
        type: 'archive_possibly_encrypted',
        severity: 'warning',
        message: 'Archive may be password-protected (common for malware)',
        file: archivePath,
      });
    }
  } catch {
    // Can't inspect archive
  }

  return issues;
}

/**
 * Check for hidden files or alternate data streams (Windows)
 */
async function checkHiddenThreats(filePath: string): Promise<SecurityIssue[]> {
  const issues: SecurityIssue[] = [];

  try {
    const stats = await fs.stat(filePath);

    // On Windows, check for alternate data streams
    if (process.platform === 'win32') {
      try {
        const { stdout } = await execFile(
          'powershell',
          [
            '-Command',
            `Get-Item -Path '${filePath}' -Stream * | Where-Object { $_.Stream -ne ':$DATA' } | Select-Object -ExpandProperty Stream`,
          ],
          { windowsHide: true, timeout: 5000 }
        );

        const streams = stdout.split('\n').filter(Boolean);
        for (const stream of streams) {
          if (stream.trim() && stream.trim() !== ':$DATA') {
            issues.push({
              type: 'alternate_data_stream',
              severity: 'danger',
              message: `File has alternate data stream: ${stream}`,
              file: filePath,
              details: { stream: stream.trim() },
            });
          }
        }
      } catch {
        // Can't check ADS
      }
    }
  } catch {
    // Can't stat file
  }

  return issues;
}

/**
 * Scan a single file for security issues
 */
export async function scanFile(filePath: string): Promise<SecurityScanResult> {
  const issues: SecurityIssue[] = [];
  const filename = path.basename(filePath);

  // Check file extension
  const extIssue = isDangerousExtension(filename);
  if (extIssue) issues.push(extIssue);

  // Check for suspicious patterns
  const patternIssue = checkSuspiciousPatterns(filename);
  if (patternIssue) issues.push(patternIssue);

  // Check file signature
  const sigIssue = await checkFileSignature(filePath);
  if (sigIssue) issues.push(sigIssue);

  // Check archive contents
  const archiveIssues = await checkArchiveContents(filePath);
  issues.push(...archiveIssues);

  // Check for hidden threats
  const hiddenIssues = await checkHiddenThreats(filePath);
  issues.push(...hiddenIssues);

  const hasCritical = issues.some((i) => i.severity === 'critical');
  const hasDanger = issues.some((i) => i.severity === 'danger');

  return {
    ok: true,
    safe: !hasCritical && !hasDanger,
    issues,
    scannedFiles: 1,
    scannedAt: new Date().toISOString(),
  };
}

/**
 * Scan a directory for security issues
 */
export async function scanDirectory(
  dirPath: string,
  recursive = true
): Promise<SecurityScanResult> {
  const issues: SecurityIssue[] = [];
  let scannedFiles = 0;

  async function scan(dir: string) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (recursive) {
            await scan(fullPath);
          }
        } else if (entry.isFile()) {
          scannedFiles++;

          // Quick extension check
          const extIssue = isDangerousExtension(entry.name);
          if (extIssue) {
            extIssue.file = fullPath;
            issues.push(extIssue);
          }

          // Pattern check
          const patternIssue = checkSuspiciousPatterns(entry.name);
          if (patternIssue) {
            patternIssue.file = fullPath;
            issues.push(patternIssue);
          }

          // Check file signatures for media files (might be disguised)
          const ext = path.extname(entry.name).toLowerCase();
          if (VALID_MEDIA_EXTENSIONS.has(ext)) {
            const sigIssue = await checkFileSignature(fullPath);
            if (sigIssue) issues.push(sigIssue);
          }

          // Check archives
          if (ARCHIVE_EXTENSIONS.has(ext)) {
            issues.push({
              type: 'archive_found',
              severity: 'warning',
              message: `Archive file found: ${entry.name}`,
              file: fullPath,
            });

            const archiveIssues = await checkArchiveContents(fullPath);
            issues.push(...archiveIssues);
          }
        }
      }
    } catch {
      // Permission denied or other error
    }
  }

  await scan(dirPath);

  const hasCritical = issues.some((i) => i.severity === 'critical');
  const hasDanger = issues.some((i) => i.severity === 'danger');

  return {
    ok: true,
    safe: !hasCritical && !hasDanger,
    issues,
    scannedFiles,
    scannedAt: new Date().toISOString(),
  };
}

/**
 * Quick safety check for a file path
 */
export function quickSafetyCheck(filename: string): {
  safe: boolean;
  reason?: string;
} {
  const ext = path.extname(filename).toLowerCase();

  if (EXECUTABLE_EXTENSIONS.has(ext)) {
    return { safe: false, reason: 'Executable file' };
  }

  if (SCRIPT_EXTENSIONS.has(ext)) {
    return { safe: false, reason: 'Script file' };
  }

  if (SHORTCUT_EXTENSIONS.has(ext)) {
    return { safe: false, reason: 'Shortcut file' };
  }

  // Check double extension
  const parts = path.basename(filename).toLowerCase().split('.');
  if (parts.length > 2) {
    const lastExt = '.' + parts[parts.length - 1];
    if (EXECUTABLE_EXTENSIONS.has(lastExt) || SCRIPT_EXTENSIONS.has(lastExt)) {
      return { safe: false, reason: 'Double extension detected' };
    }
  }

  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(filename)) {
      return { safe: false, reason: 'Suspicious filename pattern' };
    }
  }

  return { safe: true };
}

export type VerifyPhase = 'downloader' | 'arr' | 'player' | 'all';
export type Issue = {
  kind: string;
  severity: 'info' | 'warn' | 'error';
  message?: string;
};
export type VerifyInput = {
  phase: VerifyPhase;
  kind: string;
  id: string;
  title?: string;
  settings?: any;
};
export type VerifyResult = {
  phase: VerifyPhase;
  issues: Issue[];
  analyzedAt: string;
  topSeverity: 'info' | 'warn' | 'error' | 'none';
};

export type ProbeMetadata = {
  container?: string;
  durationSec?: number;
  video?: {
    codec?: string;
    width?: number;
    height?: number;
    bitrateKbps?: number;
    framerate?: number;
  };
  audio?: Array<{
    codec?: string;
    channels?: number;
    language?: string;
  }>;
  subtitles?: Array<{ language?: string; forced?: boolean }>;
};

type VerifyThresholds = {
  minDurationSec?: number;
  minBitrateKbpsByHeight?: Record<string, number>;
  allowedContainers?: string[];
};

function assessMetadata(md: ProbeMetadata | undefined, thresholds: VerifyThresholds | undefined): Issue[] {
  const issues: Issue[] = [];
  if (!md) return issues;
  const t = thresholds || {};
  const v = md.video || {};
  if (typeof t.minDurationSec === 'number' && (md.durationSec || 0) > 0 && (md.durationSec as number) < t.minDurationSec) {
    issues.push({ kind: 'short_duration', severity: 'warn', message: `Duration ${md.durationSec}s < ${t.minDurationSec}s` });
  }
  if (t.allowedContainers && t.allowedContainers.length > 0) {
    const allowed = t.allowedContainers.map((x) => String(x).toLowerCase());
    if (md.container && !allowed.includes(String(md.container).toLowerCase())) {
      issues.push({ kind: 'container_unsupported', severity: 'warn', message: `Container ${md.container}` });
    }
  }
  if (t.minBitrateKbpsByHeight && v.height && v.bitrateKbps) {
    const key = String(v.height);
    const min = t.minBitrateKbpsByHeight[key];
    if (typeof min === 'number' && (v.bitrateKbps as number) < min) {
      issues.push({ kind: 'encoding_low_bitrate', severity: 'warn', message: `${v.bitrateKbps}kbps < ${min}kbps for ${v.height}p` });
    }
  }
  return issues;
}

function computeTopSeverity(issues: Issue[]): VerifyResult['topSeverity'] {
  let level: VerifyResult['topSeverity'] = 'none';
  for (const it of issues) {
    if (it.severity === 'error') return 'error';
    if (it.severity === 'warn' && (level === 'none' || level === 'info')) level = 'warn';
    if (it.severity === 'info' && level === 'none') level = 'info';
  }
  return level;
}

function stubProbe(input: VerifyInput): ProbeMetadata | undefined {
  const t = (input.title || '').toLowerCase();
  const md: ProbeMetadata = {};
  if (t.includes('2160p')) {
    md.video = { height: 2160, bitrateKbps: 6000 };
  } else if (t.includes('1080p')) {
    md.video = { height: 1080, bitrateKbps: 1800 };
  } else if (t.includes('720p')) {
    md.video = { height: 720, bitrateKbps: 900 };
  } else if (t) {
    md.video = { height: 480, bitrateKbps: 600 };
  }
  md.container = 'mkv';
  md.durationSec = 45; // short duration to exercise threshold
  return md;
}

export function runVerify(input: VerifyInput): VerifyResult {
  const issues: Issue[] = [];
  const t = (input.title || '').toLowerCase();
  if (t.includes('sample')) {
    issues.push({ kind: 'wrong_content', severity: 'error', message: 'Title contains "sample"' });
  }
  if (t.includes('camrip') || t.includes('tsrip')) {
    issues.push({ kind: 'encoding_low_quality', severity: 'warn', message: 'Potential cam/TS rip' });
  }
  // metadata assessment (stubbed)
  const thresholds: VerifyThresholds = {
    minDurationSec: typeof input?.settings?.minDurationSec === 'number' ? input.settings.minDurationSec : 60,
    minBitrateKbpsByHeight: input?.settings?.minBitrateKbpsByHeight || { '720': 1500, '1080': 2500, '2160': 8000 },
    allowedContainers: input?.settings?.allowedContainers || ['mp4', 'mkv'],
  };
  const md = stubProbe(input);
  issues.push(...assessMetadata(md, thresholds));
  const analyzedAt = new Date().toISOString();
  const topSeverity = computeTopSeverity(issues);
  return { phase: input.phase, issues, analyzedAt, topSeverity };
}

import { promisify } from 'node:util';
import { execFile as _execFile } from 'node:child_process';
const execFile = promisify(_execFile);

export type ProbeRequest = { kind: string; id: string; title?: string; path?: string };
export type ProbeMetadata = {
  container?: string;
  durationSec?: number;
  video?: { codec?: string; width?: number; height?: number; bitrateKbps?: number; framerate?: number };
  audio?: Array<{ codec?: string; channels?: number; language?: string }>;
  subtitles?: Array<{ language?: string; forced?: boolean }>;
};

export async function probeMediaStub(req: ProbeRequest): Promise<ProbeMetadata> {
  const t = (req.title || '').toLowerCase();
  const md: ProbeMetadata = { container: 'mkv', durationSec: 45 };
  if (t.includes('2160p')) {
    md.video = { height: 2160, bitrateKbps: 6000 };
  } else if (t.includes('1080p')) {
    md.video = { height: 1080, bitrateKbps: 1800 };
  } else if (t.includes('720p')) {
    md.video = { height: 720, bitrateKbps: 900 };
  } else if (t) {
    md.video = { height: 480, bitrateKbps: 600 };
  }
  return md;
}

export async function probeMedia(req: ProbeRequest): Promise<ProbeMetadata> {
  if (!req.path) return probeMediaStub(req);
  try {
    const args = [
      '-v',
      'error',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      req.path,
    ];
    const { stdout } = await execFile('ffprobe', args, { windowsHide: true });
    const info = JSON.parse(stdout || '{}');
    const format = info.format || {};
    const streams: any[] = Array.isArray(info.streams) ? info.streams : [];
    const video = streams.find((s) => s.codec_type === 'video') || {};
    const audioStreams = streams.filter((s) => s.codec_type === 'audio');
    const subStreams = streams.filter((s) => s.codec_type === 'subtitle');
    const md: ProbeMetadata = {
      container: format.format_name,
      durationSec: format.duration ? Math.floor(Number(format.duration)) : undefined,
      video: (() => {
        const v: any = {};
        if (video.codec_name) v.codec = String(video.codec_name);
        if (typeof video.width === 'number') v.width = video.width;
        if (typeof video.height === 'number') v.height = video.height;
        const br = video.bit_rate ? Math.floor(Number(video.bit_rate) / 1000) : undefined;
        if (typeof br === 'number') v.bitrateKbps = br;
        if (video.r_frame_rate && typeof video.r_frame_rate === 'string') {
          const [a, b] = video.r_frame_rate.split('/').map((x: string) => Number(x));
          const fr = b ? a / b : a;
          if (Number.isFinite(fr)) v.framerate = fr;
        }
        return v;
      })(),
      audio: audioStreams.map((a) => ({
        codec: a.codec_name,
        channels: a.channels,
        language: a.tags?.language,
      })),
      subtitles: subStreams.map((s) => ({ language: s.tags?.language })),
    };
    return md;
  } catch (_e) {
    return probeMediaStub(req);
  }
}

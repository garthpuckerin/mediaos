export type ProbeRequest = { kind: string; id: string; title?: string };
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


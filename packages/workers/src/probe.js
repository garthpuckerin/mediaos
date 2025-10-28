export async function probeMediaStub(req) {
  const t = (req.title || '').toLowerCase();
  const md = { container: 'mkv', durationSec: 45 };
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

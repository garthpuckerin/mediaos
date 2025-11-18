import { execFile as _execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFile = promisify(_execFile);
export async function probeMediaStub(req) {
    const t = (req.title || '').toLowerCase();
    const md = { container: 'mkv', durationSec: 45 };
    if (t.includes('2160p')) {
        md.video = { height: 2160, bitrateKbps: 6000 };
    }
    else if (t.includes('1080p')) {
        md.video = { height: 1080, bitrateKbps: 1800 };
    }
    else if (t.includes('720p')) {
        md.video = { height: 720, bitrateKbps: 900 };
    }
    else if (t) {
        md.video = { height: 480, bitrateKbps: 600 };
    }
    return md;
}
export async function probeMedia(req) {
    if (!req.path)
        return probeMediaStub(req);
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
        const streams = Array.isArray(info.streams) ? info.streams : [];
        const video = streams.find((s) => s.codec_type === 'video') || {};
        const audioStreams = streams.filter((s) => s.codec_type === 'audio');
        const subStreams = streams.filter((s) => s.codec_type === 'subtitle');
        const md = {};
        if (format.format_name)
            md.container = String(format.format_name);
        if (format.duration) {
            const d = Math.floor(Number(format.duration));
            if (Number.isFinite(d))
                md.durationSec = d;
        }
        const v = {};
        if (video.codec_name)
            v.codec = String(video.codec_name);
        if (typeof video.width === 'number')
            v.width = video.width;
        if (typeof video.height === 'number')
            v.height = video.height;
        if (video.bit_rate) {
            const br = Math.floor(Number(video.bit_rate) / 1000);
            if (Number.isFinite(br))
                v.bitrateKbps = br;
        }
        if (video.r_frame_rate && typeof video.r_frame_rate === 'string') {
            const [a, b] = video.r_frame_rate
                .split('/')
                .map((x) => Number(x));
            const fr = b ? a / b : a;
            if (Number.isFinite(fr))
                v.framerate = fr;
        }
        if (Object.keys(v).length > 0)
            md.video = v;
        if (audioStreams.length > 0) {
            md.audio = audioStreams.map((a) => {
                const o = {};
                if (a.codec_name)
                    o.codec = String(a.codec_name);
                if (typeof a.channels === 'number')
                    o.channels = a.channels;
                if (a.tags?.language)
                    o.language = String(a.tags.language);
                return o;
            });
        }
        if (subStreams.length > 0) {
            md.subtitles = subStreams.map((s) => {
                const o = {};
                if (s.tags?.language)
                    o.language = String(s.tags.language);
                if (s.disposition?.forced === 1)
                    o.forced = true;
                return o;
            });
        }
        return md;
    }
    catch (_e) {
        return probeMediaStub(req);
    }
}

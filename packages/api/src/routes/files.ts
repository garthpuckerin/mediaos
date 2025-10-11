import type { FastifyPluginAsync } from 'fastify';
import { promises as fs } from 'fs';
import path from 'path';

type Root = { id: string; name: string; path: string };

function loadRoots(): Root[] {
  const raw = process.env['MEDIAOS_LIBRARY_ROOTS'] || '';
  // Expect JSON array or semicolon-separated id=name=path triples (for convenience)
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr.filter(Boolean) as Root[];
  } catch {}
  if (raw.includes('=')) {
    const parts = raw
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);
    return parts
      .map((p) => {
        const [id, name, pth] = p.split('=');
        if (!id || !name || !pth) return null;
        return { id, name, path: pth } as Root;
      })
      .filter(Boolean) as Root[];
  }
  return [];
}

function isSubPath(parent: string, candidate: string) {
  const rel = path.relative(parent, candidate);
  return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

const IMG_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const plugin: FastifyPluginAsync = async (app) => {
  app.get('/api/files/browse', async (req) => {
    const roots = loadRoots();
    const q = (req.query || {}) as any;
    const rootId = (q.root as string) || '';
    const rel = (q.rel as string) || '';
    if (!rootId) {
      return {
        atRoot: true as const,
        roots: roots.map(({ id, name }) => ({ id, name })),
      };
    }
    const root = roots.find((r) => r.id === rootId);
    if (!root) return { atRoot: true as const, roots: [] };
    const base = path.resolve(root.path);
    const dir = path.resolve(base, rel);
    if (!isSubPath(base, dir) && dir !== base) {
      return {
        atRoot: true as const,
        roots: roots.map(({ id, name }) => ({ id, name })),
      };
    }
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const items = await Promise.all(
      entries.map(async (de) => {
        const full = path.join(dir, de.name);
        const st = await fs.stat(full).catch(() => null);
        const ext = path.extname(de.name).toLowerCase();
        const isImage = !de.isDirectory() && IMG_EXT.has(ext);
        return {
          name: de.name,
          rel: path.relative(base, full).replace(/\\/g, '/'),
          type: de.isDirectory() ? 'dir' : 'file',
          size: st ? st.size : 0,
          mtime: st ? new Date(st.mtimeMs).toISOString() : null,
          isImage,
        };
      })
    );
    const parentRel = rel ? path.posix.dirname(rel).replace(/^\.$/, '') : null;
    return {
      atRoot: false as const,
      root: { id: root.id, name: root.name },
      rel,
      parent: parentRel,
      items: items.sort(
        (a, b) =>
          Number(b.type === 'dir') - Number(a.type === 'dir') ||
          a.name.localeCompare(b.name)
      ),
    };
  });

  app.post('/api/files/artwork/assign', async (req) => {
    // Minimal implementation: copy selected image to poster/background/banner/seasonXX in same folder
    const body = (req.body || {}) as any;
    const {
      root: rootId,
      rel,
      kind,
      season,
      overwrite,
    } = body as {
      root: string;
      rel: string;
      kind: 'poster' | 'background' | 'banner' | 'season';
      season?: number;
      overwrite?: boolean;
    };
    const roots = loadRoots();
    const root = roots.find((r) => r.id === rootId);
    if (!root) return { ok: false, error: 'invalid_root' };
    const base = path.resolve(root.path);
    const src = path.resolve(base, rel || '');
    if (!isSubPath(base, src) && src !== base)
      return { ok: false, error: 'invalid_path' };
    const ext = path.extname(src).toLowerCase();
    const dir = path.dirname(src);
    let target = '';
    if (kind === 'season') {
      const s = Math.max(
        0,
        Math.min(99, Number.isFinite(season) ? Math.trunc(season as number) : 0)
      );
      const pad = s.toString().padStart(2, '0');
      target = path.join(dir, `season${pad}${ext}`);
    } else {
      target = path.join(dir, `${kind}${ext}`);
    }
    try {
      if (!overwrite) {
        await fs
          .access(target)
          .then(() => {
            throw new Error('exists');
          })
          .catch((e) => {
            if ((e as any).message === 'exists') throw e;
          });
      }
      await fs.copyFile(src, target);
      return { ok: true, target: target.replace(base, '').replace(/\\/g, '/') };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  });
};

export default plugin;

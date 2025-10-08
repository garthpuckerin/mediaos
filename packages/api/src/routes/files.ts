import fs from 'fs';
import path from 'path';

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { getLibraryRoots } from '@mediaos/shared/config/library';

const querySchema = z.object({
  root: z.string().optional(),
  rel: z.string().optional(),
});

const plugin: FastifyPluginAsync = async (app) => {
  app.get('/api/files/browse', async (req) => {
    const { root, rel } = querySchema.parse(req.query ?? {});

    const roots = getLibraryRoots();
    const rootsPayload = roots.map((p, idx) => ({
      id: String(idx),
      name: path.basename(p) || p,
      path: p,
    }));

    if (!root) {
      return { atRoot: true, roots: rootsPayload };
    }

    const index = Number.parseInt(root, 10);
    if (!Number.isFinite(index) || index < 0 || index >= roots.length) {
      throw app.httpErrors.badRequest('Invalid root index');
    }

    const base = roots[index]!;
    const relPath = normaliseRel(rel ?? '');
    const full = path.resolve(base, relPath);

    if (!isWithin(full, base)) {
      throw app.httpErrors.badRequest('Path escapes root');
    }

    let stats: fs.Stats;
    try {
      stats = fs.statSync(full);
    } catch {
      throw app.httpErrors.notFound('Path not found');
    }

    if (!stats.isDirectory()) {
      throw app.httpErrors.badRequest('Path must be a directory');
    }

    const entries = fs.readdirSync(full, { withFileTypes: true });
    const items = entries
      .filter((e) => !e.name.startsWith('.'))
      .map((e) => {
        const abs = path.join(full, e.name);
        const st = safeStat(abs);
        const relChild = toPosix(path.relative(base, abs));
        const isImage = !e.isDirectory() && isImageFile(e.name);
        return {
          name: e.name,
          rel: relChild,
          type: e.isDirectory() ? 'dir' : 'file',
          size: st?.size ?? 0,
          mtime: st ? new Date(st.mtimeMs).toISOString() : null,
          isImage,
        };
      })
      .sort((a, b) =>
        a.type === b.type
          ? a.name.localeCompare(b.name)
          : a.type === 'dir'
            ? -1
            : 1
      );

    const parentRel =
      relPath && relPath !== '.' ? toPosix(path.dirname(relPath)) : null;

    return {
      atRoot: false,
      root: rootsPayload[index]!,
      rel: toPosix(relPath),
      parent: parentRel,
      items,
    };
  });
};

export default plugin;

function isWithin(target: string, base: string): boolean {
  const rel = path.relative(base, target);
  return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel)
    ? true
    : target === base;
}

function normaliseRel(rel: string): string {
  const normal = rel.replace(/\\/g, '/');
  return normal.startsWith('/') ? normal.slice(1) : normal;
}

function toPosix(p: string): string {
  return p.replace(/\\/g, '/');
}

function safeStat(p: string): fs.Stats | null {
  try {
    return fs.statSync(p);
  } catch {
    return null;
  }
}

function isImageFile(name: string): boolean {
  const n = name.toLowerCase();
  return (
    n.endsWith('.jpg') ||
    n.endsWith('.jpeg') ||
    n.endsWith('.png') ||
    n.endsWith('.webp') ||
    n.endsWith('.gif')
  );
}

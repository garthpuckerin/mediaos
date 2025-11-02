import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

// In-memory artwork state; replace with persistent storage.
type ArtTabs = 'poster' | 'background' | 'banner' | 'season';
type ArtRecord = {
  locked: boolean;
  current: Record<ArtTabs, string | null>;
  history: Record<ArtTabs, string[]>;
};
const artwork = new Map<string, ArtRecord>();

function ensure(title: string): ArtRecord {
  if (!artwork.has(title)) {
    artwork.set(title, {
      locked: false,
      current: { poster: null, background: null, banner: null, season: null },
      history: { poster: [], background: [], banner: [], season: [] },
    });
  }
  return artwork.get(title)!;
}

const plugin: FastifyPluginAsync = async (app) => {
  app.post('/select', async (req) => {
    const schema = z.object({
      title: z.string(),
      tab: z.custom<ArtTabs>(),
      key: z.string(),
      keep: z.number().default(10),
      lockOnSelect: z.boolean().default(false),
    });
    const { title, tab, key, keep, lockOnSelect } = schema.parse(req.body);
    const rec = ensure(title);
    const prev = rec.current[tab];
    if (prev) rec.history[tab].unshift(prev);
    rec.history[tab] = rec.history[tab].slice(0, keep);
    rec.current[tab] = key;
    if (lockOnSelect) rec.locked = true;
    return {
      ok: true,
      current: rec.current,
      history: rec.history,
      locked: rec.locked,
    };
  });

  app.post('/lock', async (req) => {
    const schema = z.object({ title: z.string(), locked: z.boolean() });
    const { title, locked } = schema.parse(req.body);
    const rec = ensure(title);
    rec.locked = locked;
    return { ok: true, locked: rec.locked };
  });

  app.post('/revert', async (req) => {
    const schema = z.object({ title: z.string(), tab: z.custom<ArtTabs>() });
    const { title, tab } = schema.parse(req.body);
    const rec = ensure(title);
    if (!rec.history[tab] || rec.history[tab].length === 0)
      return { ok: false, error: 'no_history' };
    const prev = rec.history[tab].shift()!;
    const cur = rec.current[tab];
    if (cur) rec.history[tab].unshift(cur);
    rec.current[tab] = prev;
    return { ok: true, current: rec.current, history: rec.history };
  });
};

export default plugin;

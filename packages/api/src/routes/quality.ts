import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';

import type { FastifyPluginAsync } from 'fastify';
import { authenticate, requireAdmin } from '../middleware/auth.js';

// Legacy profile type (per media kind)
type LegacyQualityProfile = { allowed: string[]; cutoff: string };
type LegacyProfiles = { [kind: string]: LegacyQualityProfile };

// New profile type (named profiles)
interface QualityItem {
  quality: string;
  allowed: boolean;
  preferred: boolean;
}

interface QualityProfile {
  id: string;
  name: string;
  upgradeAllowed: boolean;
  cutoff: string;
  qualities: QualityItem[];
  minSize?: number;
  maxSize?: number;
}

const CONFIG_DIR = path.join(process.cwd(), 'config');
const QUALITY_FILE = path.join(CONFIG_DIR, 'quality.json');
const PROFILES_FILE = path.join(CONFIG_DIR, 'quality-profiles.json');

async function ensureDir(filePath: string) {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
  } catch (_e) {
    // ignore
  }
}

// Legacy functions for backward compatibility
async function loadLegacyProfiles(): Promise<LegacyProfiles> {
  try {
    const raw = await fs.readFile(QUALITY_FILE, 'utf8');
    const json = JSON.parse(raw);
    return json || {};
  } catch (_e) {
    return {};
  }
}

// New profile functions
async function loadProfiles(): Promise<QualityProfile[]> {
  try {
    const raw = await fs.readFile(PROFILES_FILE, 'utf8');
    const json = JSON.parse(raw);
    return Array.isArray(json?.profiles) ? json.profiles : [];
  } catch {
    // Return defaults
    return getDefaultProfiles();
  }
}

async function saveProfiles(profiles: QualityProfile[]): Promise<void> {
  await ensureDir(PROFILES_FILE);
  await fs.writeFile(
    PROFILES_FILE,
    JSON.stringify({ profiles }, null, 2),
    'utf8'
  );
}

function getDefaultProfiles(): QualityProfile[] {
  const VIDEO_QUALITIES = ['2160p', '1080p', '720p', '480p'];

  return [
    {
      id: 'hd-1080p',
      name: 'HD-1080p',
      upgradeAllowed: true,
      cutoff: '1080p',
      qualities: VIDEO_QUALITIES.map((q) => ({
        quality: q,
        allowed: q === '1080p' || q === '720p',
        preferred: q === '1080p',
      })),
    },
    {
      id: 'ultra-hd',
      name: 'Ultra HD / 4K',
      upgradeAllowed: true,
      cutoff: '2160p',
      qualities: VIDEO_QUALITIES.map((q) => ({
        quality: q,
        allowed: true,
        preferred: q === '2160p',
      })),
    },
    {
      id: 'any',
      name: 'Any Quality',
      upgradeAllowed: true,
      cutoff: '2160p',
      qualities: VIDEO_QUALITIES.map((q) => ({
        quality: q,
        allowed: true,
        preferred: false,
      })),
    },
    {
      id: 'sd-only',
      name: 'SD Only (Low Bandwidth)',
      upgradeAllowed: false,
      cutoff: '480p',
      qualities: VIDEO_QUALITIES.map((q) => ({
        quality: q,
        allowed: q === '480p' || q === '720p',
        preferred: q === '720p',
      })),
    },
  ];
}

const plugin: FastifyPluginAsync = async (app) => {
  // ========================
  // Legacy API (backward compatible)
  // ========================

  app.get('/api/settings/quality', { preHandler: authenticate }, async () => {
    const profiles = await loadLegacyProfiles();
    return { ok: true, profiles };
  });

  app.post(
    '/api/settings/quality',
    { preHandler: requireAdmin },
    async (req) => {
      const body = (req.body || {}) as any;
      const profiles: LegacyProfiles = body?.profiles || {};
      await ensureDir(QUALITY_FILE);
      await fs.writeFile(
        QUALITY_FILE,
        JSON.stringify(profiles, null, 2),
        'utf8'
      );
      return { ok: true, profiles };
    }
  );

  // ========================
  // New Profile System API
  // ========================

  /**
   * GET /api/settings/quality-profiles
   * Get all quality profiles
   */
  app.get(
    '/api/settings/quality-profiles',
    { preHandler: authenticate },
    async () => {
      const profiles = await loadProfiles();
      return { ok: true, profiles };
    }
  );

  /**
   * POST /api/settings/quality-profiles
   * Save all quality profiles
   */
  app.post(
    '/api/settings/quality-profiles',
    { preHandler: requireAdmin },
    async (req) => {
      const schema = z.object({
        profiles: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            upgradeAllowed: z.boolean(),
            cutoff: z.string(),
            qualities: z.array(
              z.object({
                quality: z.string(),
                allowed: z.boolean(),
                preferred: z.boolean(),
              })
            ),
            minSize: z.number().optional(),
            maxSize: z.number().optional(),
          })
        ),
      });

      const { profiles } = schema.parse(req.body);
      await saveProfiles(profiles);

      return { ok: true, profiles };
    }
  );

  /**
   * GET /api/settings/quality-profiles/:id
   * Get a specific profile
   */
  app.get(
    '/api/settings/quality-profiles/:id',
    { preHandler: authenticate },
    async (req) => {
      const id = (req.params as any).id as string;
      const profiles = await loadProfiles();
      const profile = profiles.find((p) => p.id === id);

      if (!profile) {
        return { ok: false, error: 'Profile not found' };
      }

      return { ok: true, profile };
    }
  );

  /**
   * POST /api/settings/quality-profiles/new
   * Create a new profile
   */
  app.post(
    '/api/settings/quality-profiles/new',
    { preHandler: requireAdmin },
    async (req) => {
      const schema = z.object({
        name: z.string(),
        upgradeAllowed: z.boolean().default(true),
        cutoff: z.string(),
        qualities: z.array(
          z.object({
            quality: z.string(),
            allowed: z.boolean(),
            preferred: z.boolean(),
          })
        ),
        minSize: z.number().optional(),
        maxSize: z.number().optional(),
      });

      const data = schema.parse(req.body);
      const profiles = await loadProfiles();

      const newProfile: QualityProfile = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        ...data,
      };

      profiles.push(newProfile);
      await saveProfiles(profiles);

      return { ok: true, profile: newProfile };
    }
  );

  /**
   * PATCH /api/settings/quality-profiles/:id
   * Update a profile
   */
  app.patch(
    '/api/settings/quality-profiles/:id',
    { preHandler: requireAdmin },
    async (req) => {
      const id = (req.params as any).id as string;
      const schema = z.object({
        name: z.string().optional(),
        upgradeAllowed: z.boolean().optional(),
        cutoff: z.string().optional(),
        qualities: z
          .array(
            z.object({
              quality: z.string(),
              allowed: z.boolean(),
              preferred: z.boolean(),
            })
          )
          .optional(),
        minSize: z.number().optional(),
        maxSize: z.number().optional(),
      });

      const data = schema.parse(req.body);
      const profiles = await loadProfiles();
      const index = profiles.findIndex((p) => p.id === id);

      if (index < 0) {
        return { ok: false, error: 'Profile not found' };
      }

      profiles[index] = { ...profiles[index], ...data };
      await saveProfiles(profiles);

      return { ok: true, profile: profiles[index] };
    }
  );

  /**
   * DELETE /api/settings/quality-profiles/:id
   * Delete a profile
   */
  app.delete(
    '/api/settings/quality-profiles/:id',
    { preHandler: requireAdmin },
    async (req) => {
      const id = (req.params as any).id as string;
      const profiles = await loadProfiles();
      const index = profiles.findIndex((p) => p.id === id);

      if (index < 0) {
        return { ok: false, error: 'Profile not found' };
      }

      const [removed] = profiles.splice(index, 1);
      await saveProfiles(profiles);

      return { ok: true, profile: removed };
    }
  );

  /**
   * POST /api/settings/quality-profiles/reset
   * Reset to default profiles
   */
  app.post(
    '/api/settings/quality-profiles/reset',
    { preHandler: requireAdmin },
    async () => {
      const defaults = getDefaultProfiles();
      await saveProfiles(defaults);
      return { ok: true, profiles: defaults };
    }
  );
};

export default plugin;

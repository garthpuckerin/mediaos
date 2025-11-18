import { z } from 'zod';

/**
 * Environment configuration schema with validation
 */
const configSchema = z.object({
  // Server
  PORT: z
    .string()
    .default('8080')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(65535)),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  BASE_URL: z.string().url().default('http://localhost:8080'),

  // Security
  JWT_SECRET: z.string().min(32).optional(),
  ENCRYPTION_KEY: z.string().min(32).optional(),
  ALLOWED_ORIGINS: z
    .string()
    .default('*')
    .transform((val) => val.split(',').map((v) => v.trim())),

  // Rate Limiting
  RATE_LIMIT_MAX: z
    .string()
    .default('100')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1)),
  RATE_LIMIT_WINDOW: z
    .string()
    .default('60000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1000)),

  // Upload Limits
  UPLOAD_MAX_BYTES: z
    .string()
    .default('104857600')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1024)),

  // Database
  DB_DRIVER: z.enum(['sqlite', 'postgres']).default('sqlite'),
  SQLITE_PATH: z.string().default('/config/mediaos.sqlite'),

  // PostgreSQL (optional)
  DATABASE_URL: z.string().url().optional(),
  POSTGRES_HOST: z.string().optional(),
  POSTGRES_PORT: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .pipe(z.number().min(1).max(65535).optional()),
  POSTGRES_DB: z.string().optional(),
  POSTGRES_USER: z.string().optional(),
  POSTGRES_PASSWORD: z.string().optional(),
  POSTGRES_POOL_MIN: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 2))
    .pipe(z.number().min(0).optional()),
  POSTGRES_POOL_MAX: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .pipe(z.number().min(1).optional()),

  // Redis
  REDIS_URL: z.string().url().optional(),

  // Libraries
  LIBRARY_PATHS: z
    .string()
    .default('/media')
    .transform((val) => val.split(';').map((v) => v.trim())),

  // Downloader
  DOWNLOADER: z
    .enum(['external', 'builtin_torrent', 'builtin_nzb'])
    .default('external'),

  // qBittorrent
  QBT_URL: z.string().url().optional(),
  QBT_USERNAME: z.string().optional(),
  QBT_PASSWORD: z.string().optional(),

  // SABnzbd
  SAB_URL: z.string().url().optional(),
  SAB_API_KEY: z.string().optional(),

  // NZBGet
  NZBGET_URL: z.string().url().optional(),
  NZBGET_USERNAME: z.string().optional(),
  NZBGET_PASSWORD: z.string().optional(),

  // External Services
  TMDB_API_KEY: z.string().optional(),
  PLEX_URL: z.string().url().optional(),
  PLEX_TOKEN: z.string().optional(),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .pipe(z.number().min(1).max(65535).optional()),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),

  // Error Tracking
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : 0.1))
    .pipe(z.number().min(0).max(1).optional()),

  // Logging
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),

  // Artwork
  ART_HISTORY: z
    .string()
    .default('10')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(0)),

  // Feature Flags
  ENABLE_ANIME_PROFILE: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  ENABLE_WORKERS: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  ENABLE_INDEXERS: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  ENABLE_SUBTITLES: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
});

export type Config = z.infer<typeof configSchema>;

/**
 * Validates and parses environment configuration
 * @throws {z.ZodError} If validation fails
 */
export function validateConfig(): Config {
  try {
    return configSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment configuration validation failed:');
      for (const issue of error.issues) {
        const path = issue.path.join('.') || 'root';
        console.error(`  - ${path}: ${issue.message}`);
      }
      throw new Error('Invalid environment configuration');
    }
    throw error;
  }
}

/**
 * Validates configuration and logs warnings for missing optional values
 */
export function validateConfigWithWarnings(): Config {
  const config = validateConfig();

  // Production-specific warnings
  if (config.NODE_ENV === 'production') {
    if (!config.JWT_SECRET) {
      console.warn(
        '⚠️  JWT_SECRET not set - authentication features will be disabled'
      );
    }
    if (!config.ENCRYPTION_KEY) {
      console.warn(
        '⚠️  ENCRYPTION_KEY not set - credentials will be stored in plain text (SECURITY RISK!)'
      );
    }
    if (config.ALLOWED_ORIGINS.includes('*')) {
      console.warn(
        '⚠️  ALLOWED_ORIGINS set to * in production - this is insecure!'
      );
    }
    if (!config.SENTRY_DSN) {
      console.warn('⚠️  SENTRY_DSN not set - error tracking disabled');
    }
    if (config.LOG_LEVEL === 'debug' || config.LOG_LEVEL === 'trace') {
      console.warn(
        `⚠️  LOG_LEVEL=${config.LOG_LEVEL} in production - consider using 'info' or 'warn'`
      );
    }
  }

  // Database-specific warnings
  if (config.DB_DRIVER === 'postgres') {
    if (!config.DATABASE_URL && !config.POSTGRES_HOST) {
      console.error(
        '❌ PostgreSQL selected but no connection details provided (DATABASE_URL or POSTGRES_HOST required)'
      );
      throw new Error('Missing PostgreSQL configuration');
    }
  }

  // Downloader warnings
  if (config.DOWNLOADER === 'external') {
    const hasQbt = config.QBT_URL && config.QBT_USERNAME;
    const hasSab = config.SAB_URL && config.SAB_API_KEY;
    const hasNzb = config.NZBGET_URL && config.NZBGET_USERNAME;

    if (!hasQbt && !hasSab && !hasNzb) {
      console.warn(
        '⚠️  DOWNLOADER=external but no external downloader configured'
      );
    }
  }

  return config;
}

/**
 * Gets a typed configuration value with runtime validation
 */
export function getConfig(): Config {
  return validateConfigWithWarnings();
}

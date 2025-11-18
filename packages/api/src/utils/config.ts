import path from 'path';

/**
 * Get the configuration directory path
 * Respects CONFIG_DIR environment variable for testing
 */
export function getConfigDir(): string {
  return process.env.CONFIG_DIR || path.join(process.cwd(), 'config');
}

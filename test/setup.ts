import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';

import { setupTestDatabase, cleanupTestDatabase } from './helpers/database';
import { setupTestServer, cleanupTestServer } from './helpers/server';

// Global test setup
beforeAll(async () => {
  await setupTestDatabase();
  await setupTestServer();
});

// Global test cleanup
afterAll(async () => {
  await cleanupTestServer();
  await cleanupTestDatabase();
});

// Per-test setup
beforeEach(async () => {
  // Reset database state for each test
  await setupTestDatabase();
});

// Per-test cleanup
afterEach(async () => {
  // Clean up any test artifacts
});

// Mock external services in test environment
if (process.env['NODE_ENV'] === 'test') {
  // Mock external API calls
  (global as any).fetch = vi.fn();

  // Mock file system operations
  vi.mock('fs/promises', () => ({
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    rm: vi.fn(),
  }));
}

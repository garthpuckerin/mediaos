import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '@mediaos/adapters/src': path.resolve(__dirname, '../adapters/src'),
      '@mediaos/workers/src': path.resolve(__dirname, '../workers/src'),
    },
  },
});

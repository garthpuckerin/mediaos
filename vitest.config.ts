import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      'node_modules/**',
      'test/e2e/**',
      '**/dist/**',
      'playwright-tests/**',
      '**/node_modules/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'coverage/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/test/**',
        '**/tests/**',
        '**/__tests__/**',
        '**/*.test.*',
        '**/*.spec.*',
        'playwright-tests/**',
        'packages/web/src/main.tsx',
        'packages/api/src/index.ts'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    setupFiles: ['./test/setup.ts'],
    testTimeout: 10000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@mediaos/api': resolve(__dirname, 'packages/api/src'),
      '@mediaos/web': resolve(__dirname, 'packages/web/src'),
      '@mediaos/workers': resolve(__dirname, 'packages/workers/src'),
      '@mediaos/adapters': resolve(__dirname, 'packages/adapters/src')
    }
  }
});

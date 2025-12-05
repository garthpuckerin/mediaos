import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const authFile = join(__dirname, '.auth/user.json');

// Check if auth file exists (for non-setup projects)
const hasAuthFile = fs.existsSync(authFile);

export default defineConfig({
  testDir: './playwright-tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  
  // Important: Set reasonable timeouts to prevent hanging
  timeout: 30000, // 30 seconds per test
  expect: {
    timeout: 5000, // 5 seconds for expects
  },
  
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10000, // 10 seconds for actions
    navigationTimeout: 15000, // 15 seconds for navigation
  },
  
  projects: [
    // Setup project - runs first to authenticate
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      timeout: 30000, // 30 seconds for setup
    },
    // Main tests - can run with or without auth
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Only use storage state if auth file exists
        ...(hasAuthFile ? { storageState: authFile } : {}),
      },
      dependencies: ['setup'],
      testIgnore: /.*\.setup\.ts/,
    },
    // Chromium without auth dependency (for faster iteration)
    {
      name: 'chromium-no-auth',
      use: { 
        ...devices['Desktop Chrome'],
      },
      testIgnore: /.*\.setup\.ts/,
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        ...(hasAuthFile ? { storageState: authFile } : {}),
      },
      dependencies: ['setup'],
      testIgnore: /.*\.setup\.ts/,
    },
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        ...(hasAuthFile ? { storageState: authFile } : {}),
      },
      dependencies: ['setup'],
      testIgnore: /.*\.setup\.ts/,
    },
  ],
  
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true, // Always reuse if running
    timeout: 60000, // 60 seconds to start server
    stdout: 'ignore',
    stderr: 'pipe',
  }
});

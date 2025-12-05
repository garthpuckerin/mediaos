import { test as setup, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const authFile = join(__dirname, '../.auth/user.json');

const TEST_EMAIL = 'test@mediaos.local';
const TEST_PASSWORD = 'TestPassword123!';
const API_BASE = 'http://localhost:8080';

/**
 * Global authentication setup for Playwright tests
 * This runs once before all tests and saves the auth state
 */
setup('authenticate', async ({ page, request }) => {
  setup.setTimeout(30000); // 30 second timeout for setup

  console.log('Starting authentication setup...');

  let tokens: { accessToken?: string; refreshToken?: string } = {};

  // Step 1: Try to register or login
  try {
    console.log('Attempting registration via API...');
    const registerResponse = await request.post(
      `${API_BASE}/api/auth/register`,
      {
        data: {
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        },
      }
    );

    const registerData = await registerResponse.json();
    console.log(
      'Registration response:',
      registerData.ok ? 'success' : registerData.error
    );

    if (registerData.ok && registerData.accessToken) {
      tokens = {
        accessToken: registerData.accessToken,
        refreshToken: registerData.refreshToken,
      };
      console.log('Registration successful, tokens obtained');
    }
  } catch (err) {
    console.log('Registration error:', err);
  }

  // If registration failed (user might already exist), try login
  if (!tokens.accessToken) {
    try {
      console.log('Attempting login via API...');
      const loginResponse = await request.post(`${API_BASE}/api/auth/login`, {
        data: {
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        },
      });

      const loginData = await loginResponse.json();
      console.log(
        'Login response:',
        loginData.ok ? 'success' : loginData.error
      );

      if (loginData.ok && loginData.accessToken) {
        tokens = {
          accessToken: loginData.accessToken,
          refreshToken: loginData.refreshToken,
        };
        console.log('Login successful, tokens obtained');
      }
    } catch (err) {
      console.log('Login error:', err);
    }
  }

  // Step 2: Complete onboarding if needed
  if (tokens.accessToken) {
    try {
      // Check if setup is already complete
      const checkResponse = await request.get(
        `${API_BASE}/api/onboarding/check-setup`,
        {
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
        }
      );
      const checkData = await checkResponse.json();

      if (!checkData.setupCompleted) {
        console.log('Completing onboarding setup...');

        // Complete the setup with dummy folders (they don't need to exist for tests)
        const setupResponse = await request.post(
          `${API_BASE}/api/onboarding/setup`,
          {
            headers: { Authorization: `Bearer ${tokens.accessToken}` },
            data: {
              folders: [
                { path: 'C:\\TestMedia\\Movies', type: 'movies' },
                { path: 'C:\\TestMedia\\Series', type: 'series' },
              ],
            },
          }
        );

        const setupData = await setupResponse.json();
        console.log(
          'Onboarding setup response:',
          setupData.success ? 'success' : setupData.message
        );
      } else {
        console.log('Onboarding already complete');
      }
    } catch (err) {
      console.log('Onboarding check/setup error:', err);
    }
  }

  // Step 3: Navigate to the app and set tokens
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  if (tokens.accessToken && tokens.refreshToken) {
    // Set tokens in localStorage
    await page.evaluate(({ accessToken, refreshToken }) => {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    }, tokens);

    console.log('Tokens set in localStorage, reloading...');

    // Reload to apply authentication
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Wait a bit longer for React to hydrate
    await page.waitForTimeout(1000);

    // Verify authentication worked
    const dashboard = page.getByRole('heading', { name: 'Dashboard' });
    const isAuthenticated = await dashboard
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (isAuthenticated) {
      console.log('Authentication verified - Dashboard visible');
    } else {
      // Check if we're on onboarding
      const onboarding = page.getByText('Welcome to MediaOS');
      const isOnboarding = await onboarding
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      if (isOnboarding) {
        console.log('On onboarding page - need to complete setup');
      } else {
        console.log('Authentication may have failed - checking state');
      }
    }
  } else {
    console.log('No tokens obtained - tests will run unauthenticated');
  }

  // Save the auth state
  await page.context().storageState({ path: authFile });
  console.log('Auth state saved to:', authFile);
});

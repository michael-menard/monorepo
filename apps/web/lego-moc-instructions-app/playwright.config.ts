import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'

// Load environment variables from .env file
config({ path: '.env' })

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests one at a time for easier debugging */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* No retries - stop on first failure for debugging */
  retries: 0,
  /* Use only 1 worker to run tests sequentially */
  workers: 1,
  /* Global test timeout - fail test if it runs longer than this */
  timeout: 30000, // 30 seconds per test
  /* Global expect timeout for assertions */
  expect: {
    timeout: 10000, // 10 seconds for expect assertions
  },
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'list',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3006',

    /* Run headless by default */
    headless: true,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* More generous timeouts for React app loading */
    actionTimeout: 10000,        // 10 seconds for actions (click, fill, etc.)
    navigationTimeout: 15000,    // 15 seconds for page navigation

    /* Additional timeout configurations */
    testIdAttribute: 'data-testid', // Use data-testid for element selection
  },

  /* Configure projects for Chrome only */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'pnpm dev --port 3002',
    url: 'http://localhost:3002',
    reuseExistingServer: true, // Always reuse existing server
    timeout: 120 * 1000,
  },
})

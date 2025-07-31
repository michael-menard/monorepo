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
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Run headless by default */
    headless: true,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Aggressive timeouts - fail fast */
    actionTimeout: 3000,
    navigationTimeout: 5000,
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
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  
  /* Global timeout for tests */
  timeout: 10000,
  
  /* Stop on first failure for debugging */
  maxFailures: 1,
  
  /* Expect timeout */
  expect: {
    timeout: 3000,
  },
}) 
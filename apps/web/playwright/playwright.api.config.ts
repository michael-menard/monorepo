import { defineConfig, devices } from '@playwright/test'
import { defineBddConfig, cucumberReporter } from 'playwright-bdd'
import { config } from 'dotenv'

// Load environment variables from .env file
config({ path: '.env' })

// Define BDD configuration for API tests only
const testDir = defineBddConfig({
  features: './features/api/**/*.feature',
  steps: './steps/api/**/*.ts',
})

// API base URL for API tests (defaults to local API server)
const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3001'

/**
 * Playwright config for API tests only
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  reporter: [
    ['list'],
    // Note: cucumberReporter disabled due to playwright-bdd 8.4.2 compatibility issue
    // with Playwright 1.56.1 - "Cannot find bddTestData" errors in reporter
    // Re-enable when playwright-bdd releases fix for this issue
    // See: https://github.com/vitalets/playwright-bdd/issues
    // cucumberReporter('html', { outputFile: 'cucumber-report/api-report.html' }),
    // cucumberReporter('json', { outputFile: 'cucumber-report/api-report.json' }),
    ['html', { outputFolder: 'playwright-report/api' }],
    ['json', { outputFile: 'playwright-report/api/results.json' }],
  ],
  use: {
    baseURL: apiBaseUrl,
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 15000,
    testIdAttribute: 'data-testid',
  },
  projects: [
    {
      name: 'api-mocked',
      testMatch: /features\/api\/.*\.feature/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: apiBaseUrl,
      },
    },
    {
      name: 'api-live',
      testMatch: /features\/api\/.*\.feature/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.API_LIVE_URL || apiBaseUrl,
      },
    },
  ],
})

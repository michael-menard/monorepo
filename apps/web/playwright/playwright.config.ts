import { defineConfig, devices } from '@playwright/test'
import { defineBddConfig, cucumberReporter } from 'playwright-bdd'
import { config } from 'dotenv'

// Load environment variables from .env file
config({ path: '.env' })

// Define BDD configuration
const testDir = defineBddConfig({
  features: './features/**/*.feature',
  steps: './steps/**/*.ts',
})

// API base URL for API tests (defaults to local API server)
const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:9000'

/**
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
    cucumberReporter('html', { outputFile: 'cucumber-report/report.html' }),
    cucumberReporter('json', { outputFile: 'cucumber-report/report.json' }),
  ],
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 15000,
    testIdAttribute: 'data-testid',
  },
  projects: [
    // ─────────────────────────────────────────────────────────────────────────
    // UI E2E Projects (BDD/Cucumber Features)
    // ─────────────────────────────────────────────────────────────────────────
    {
      name: 'chromium-live',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /(?<!api\/).*\.feature/,
      webServer: {
        command: 'pnpm dev --port 3002',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120 * 1000,
        cwd: '../main-app',
      },
    },
    // ─────────────────────────────────────────────────────────────────────────
    // API Test Projects (BDD Features)
    // ─────────────────────────────────────────────────────────────────────────
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

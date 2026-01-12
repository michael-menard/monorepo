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
    baseURL: 'http://localhost:3002',
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
      name: 'chromium-mocked',
      use: { ...devices['Desktop Chrome'] },
      webServer: {
        command: 'VITE_ENABLE_MSW=true pnpm dev --port 3002',
        url: 'http://localhost:3002',
        reuseExistingServer: true,
        timeout: 120 * 1000,
        cwd: '../main-app',
      },
    },
    {
      name: 'chromium-live',
      use: { ...devices['Desktop Chrome'] },
      webServer: {
        command: 'pnpm dev --port 3002',
        url: 'http://localhost:3002',
        reuseExistingServer: true,
        timeout: 120 * 1000,
        cwd: '../main-app',
      },
    },
  ],
})

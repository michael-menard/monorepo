/**
 * Playwright config for WISH-2049 Background Compression E2E tests.
 *
 * Focused config that only processes the background compression feature file
 * to avoid missing step definitions from other incomplete features.
 *
 * Usage:
 *   pnpm bdd:gen:bg-compression && pnpm test:bg-compression
 */

import { defineConfig, devices } from '@playwright/test'
import { defineBddConfig, cucumberReporter } from 'playwright-bdd'
import { config } from 'dotenv'

config({ path: '.env' })

const testDir = defineBddConfig({
  features: './features/wishlist/wishlist-background-compression.feature',
  steps: ['./steps/wishlist-background-compression.steps.ts'],
})

export default defineConfig({
  testDir,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 60000,
  expect: {
    timeout: 15000,
  },
  reporter: [
    ['list'],
    cucumberReporter('html', {
      outputFile: 'cucumber-report/bg-compression-report.html',
    }),
    cucumberReporter('json', {
      outputFile: 'cucumber-report/bg-compression-report.json',
    }),
  ],
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 15000,
    testIdAttribute: 'data-testid',
  },
  projects: [
    {
      name: 'bg-compression-chromium',
      use: { ...devices['Desktop Chrome'] },
      webServer: {
        command: 'pnpm dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120 * 1000,
        cwd: '../main-app',
      },
    },
  ],
})

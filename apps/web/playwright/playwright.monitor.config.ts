/**
 * Playwright Config for APIP-2020 Monitor Pipeline Tests
 *
 * Uses live backend on port 4000 (LEGO_API_PORT=4000).
 * AUTH_BYPASS=true for dev access.
 * No MSW (VITE_ENABLE_MSW=false).
 */
import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'

config({ path: '.env' })

export default defineConfig({
  testDir: './tests',
  testMatch: '**/monitor-pipeline.spec.ts',
  fullyParallel: false,
  retries: 1,
  timeout: 30000,
  expect: { timeout: 15000 },
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})

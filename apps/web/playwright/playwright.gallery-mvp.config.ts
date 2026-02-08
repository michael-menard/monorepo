import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'

// Load environment variables from .env file
config({ path: '.env' })

/**
 * Gallery MVP E2E Test Config for WISH-2001
 *
 * Uses live backend on port 9000 and frontend on port 3000
 * No MSW mocking (VITE_ENABLE_MSW=false)
 */
export default defineConfig({
  testDir: './tests/wishlist',
  fullyParallel: false,
  timeout: 30000,
  expect: { timeout: 10000 },
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    testIdAttribute: 'data-testid',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // No webServer - using already running services:
  // - Frontend: http://localhost:3000
  // - Backend API: http://localhost:9000
})

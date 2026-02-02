import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'

// Load environment variables from .env file
config({ path: '.env' })

export default defineConfig({
  testDir: './tests/wishlist',
  fullyParallel: false,
  timeout: 30000,
  expect: { timeout: 10000 },
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3002',
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
  webServer: {
    // Use live API via Vite proxy (no MSW mocking for UAT)
    // - VITE_SERVERLESS_API_BASE_URL: same origin so Vite proxy can intercept and forward to backend
    // - VITE_AWS_USER_POOL_ID/CLIENT_ID: test Cognito pool for test user authentication
    command: [
      'VITE_SERVERLESS_API_BASE_URL=http://localhost:3002/api',
      'VITE_AWS_USER_POOL_ID=us-east-1_vtW1Slo3o',
      'VITE_AWS_USER_POOL_WEB_CLIENT_ID=4527ui02h63b7c0ra7vs00gua5',
      'pnpm dev --port 3002',
    ].join(' '),
    url: 'http://localhost:3002',
    reuseExistingServer: false,
    timeout: 120 * 1000,
    cwd: '../main-app',
  },
})

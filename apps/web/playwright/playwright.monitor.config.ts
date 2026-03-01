import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: '.',
  testMatch: ['**/tests/monitor-pipeline.spec.ts'],
  timeout: 30000,
  expect: { timeout: 15000 },
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})

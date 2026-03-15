import { defineConfig, devices } from '@playwright/test'
import { defineBddConfig, cucumberReporter } from 'playwright-bdd'
import { config } from 'dotenv'

config({ path: '.env' })

const testDir = defineBddConfig({
  features: './features/**/*.feature',
  steps: './steps/**/*.ts',
})

export default defineConfig({
  testDir,
  globalSetup: './e2e-global-setup.ts',
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
    baseURL: 'http://localhost:3006',
    headless: false,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm dev',
      url: 'http://localhost:3006',
      reuseExistingServer: true,
      timeout: 120 * 1000,
    },
    {
      command: 'bun run dev',
      cwd: '../../api/workflow-admin/roadmap-svc',
      url: 'http://localhost:3004/health',
      reuseExistingServer: true,
      timeout: 30 * 1000,
    },
  ],
})

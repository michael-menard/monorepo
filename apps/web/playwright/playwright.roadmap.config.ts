import { defineConfig, devices } from '@playwright/test'
import { defineBddConfig, cucumberReporter } from 'playwright-bdd'
import { config } from 'dotenv'

config({ path: '.env' })

const testDir = defineBddConfig({
  features: './features/roadmap/**/*.feature',
  steps: './steps/roadmap.steps.ts',
})

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
    cucumberReporter('html', { outputFile: 'cucumber-report/roadmap-report.html' }),
    cucumberReporter('json', { outputFile: 'cucumber-report/roadmap-report.json' }),
  ],
  use: {
    baseURL: 'http://localhost:3006',
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },
  projects: [
    {
      name: 'chromium-roadmap',
      use: { ...devices['Desktop Chrome'] },
      webServer: {
        command: 'pnpm dev',
        url: 'http://localhost:3006',
        reuseExistingServer: true,
        timeout: 120 * 1000,
        cwd: '../workflow-roadmap',
      },
    },
  ],
})

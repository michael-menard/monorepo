import { defineConfig } from '@playwright/test'

/**
 * Pipeline E2E Playwright Configuration
 *
 * Targets headless server-side pipeline processes — NOT browser UI.
 * No webServer block — the pipeline stack must already be running.
 *
 * Required environment variables:
 *   REDIS_URL              — Redis connection string (e.g. redis://localhost:6379)
 *   LANGGRAPH_SERVER_URL   — LangGraph server URL (e.g. http://localhost:8123)
 *   TEST_STORY_FEATURE_DIR — Base directory for synthetic story artifacts
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 1800000, // 30 minutes — full critical path may take this long
  reporter: [['list']],
  projects: [
    {
      name: 'pipeline-e2e',
      // No browser device — pipeline tests are headless server-side
    },
  ],
  // No webServer block — pipeline stack must be running externally
})

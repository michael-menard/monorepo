/**
 * Global Test Setup
 *
 * Provides mock environment values for all tests in the pipeline package.
 * This file is loaded before any test runs via vitest.config.ts setupFiles.
 *
 * Tests do NOT require a real .env file when this setup is used.
 * For integration tests requiring a live DB, set PIPELINE_DB_* env vars
 * or start the test DB with: pnpm db:test:start
 *
 * @see vitest.config.ts
 * @see APIP-5001 AC-5: Test Configuration
 */

/**
 * Mock environment values for testing.
 *
 * - Pipeline test DB uses port 5434 (isolated from knowledge-base on 5433)
 * - PIPELINE_DB_PASSWORD uses a test-specific value to prevent accidental production use
 */
const TEST_ENV = {
  // Test database - uses the local langgraph-test-db container on port 5434
  PIPELINE_DB_HOST: 'localhost',
  PIPELINE_DB_PORT: '5434',
  PIPELINE_DB_NAME: 'pipeline_test',
  PIPELINE_DB_USER: 'pipelineuser',
  PIPELINE_DB_PASSWORD: 'TestPassword123!',

  // Test-friendly defaults
  LOG_LEVEL: 'error', // Quiet logging during tests
}

/**
 * Set up test environment variables before any tests run.
 *
 * Only sets values that are not already defined, allowing individual
 * tests to override specific values if needed.
 */
export function setupTestEnv(): void {
  for (const [key, value] of Object.entries(TEST_ENV)) {
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

// Auto-run setup when this module is imported
setupTestEnv()

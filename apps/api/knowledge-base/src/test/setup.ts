/**
 * Global Test Setup
 *
 * Provides mock environment values for all tests in the knowledge-base package.
 * This file is loaded before any test runs via vitest.config.ts setupFiles.
 *
 * Tests do NOT require a real .env file when this setup is used.
 *
 * @see vitest.config.ts
 * @see KNOW-028 AC5: Test Configuration
 */

/**
 * Mock environment values for testing.
 *
 * - DATABASE_URL uses a test-specific pattern to prevent accidental production use
 * - OPENAI_API_KEY uses a mock sk- prefixed key
 * - Optional values use sensible test defaults
 */
const TEST_ENV = {
  // Test database - uses different port to distinguish from development
  DATABASE_URL: 'postgresql://test:test@localhost:5432/knowledge_base_test',

  // Mock OpenAI key - MSW mocks intercept actual API calls
  OPENAI_API_KEY: 'sk-test-mock-key-for-testing',

  // Test-friendly defaults
  EMBEDDING_MODEL: 'text-embedding-3-small',
  EMBEDDING_BATCH_SIZE: '10', // Smaller batch size for faster tests
  LOG_LEVEL: 'error', // Quiet logging during tests

  // KB_DB_* variables for backward compatibility tests
  KB_DB_HOST: 'localhost',
  KB_DB_PORT: '5432',
  KB_DB_NAME: 'knowledge_base_test',
  KB_DB_USER: 'test',
  KB_DB_PASSWORD: 'test',
  KB_DB_MAX_CONNECTIONS: '5',
  KB_DB_IDLE_TIMEOUT_MS: '5000',
  KB_DB_CONNECTION_TIMEOUT_MS: '3000',
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

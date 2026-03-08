/**
 * Global Test Setup for Rules Registry Sidecar
 * WINT-4020: Create Rules Registry Sidecar
 *
 * Sets DATABASE_URL for integration tests that target the local lego_dev database.
 * Unit tests mock @repo/db directly — this setup only ensures the env var is present
 * so the DB module can be imported without throwing.
 *
 * Integration tests will gracefully skip if wint.rules table does not exist.
 */

// Set test environment variables (only if not already set)
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/lego_dev'
}

if (!process.env.LOG_LEVEL) {
  process.env.LOG_LEVEL = 'error'
}

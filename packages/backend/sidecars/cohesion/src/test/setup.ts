/**
 * Global Test Setup for Cohesion Sidecar
 * WINT-4010: Create Cohesion Sidecar
 *
 * Mocks @repo/db to prevent DB connection errors in unit tests.
 * Integration tests use real DB via separate vitest config.
 */

import { vi } from 'vitest'

// Mock @repo/db — unit tests inject mock DB deps directly
vi.mock('@repo/db', () => ({
  db: {
    select: vi.fn(),
  },
}))

// Mock @repo/logger to suppress log output in tests
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Set test environment variables
const TEST_ENV: Record<string, string> = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/lego_dev',
  LOG_LEVEL: 'error',
}

for (const [key, value] of Object.entries(TEST_ENV)) {
  if (process.env[key] === undefined) {
    process.env[key] = value
  }
}

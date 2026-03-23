/**
 * Global Test Setup for HiTL Interview Sidecar
 * WINT-5010: Create HiTL Interview Sidecar
 *
 * Mocks @repo/db, @repo/knowledge-base/db, and @repo/logger
 * to prevent DB connection errors in unit tests.
 */

import { vi } from 'vitest'

// Mock @repo/db — unit tests inject mock DB deps directly
vi.mock('@repo/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}))

// Mock @repo/knowledge-base/db — prevent schema resolution errors
vi.mock('@repo/knowledge-base/db', () => ({
  hitlDecisions: { storyId: 'storyId', decisionType: 'decisionType', decisionText: 'decisionText', context: 'context', id: 'id' },
  trainingData: { dataType: 'dataType', features: 'features', labels: 'labels', storyId: 'storyId' },
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

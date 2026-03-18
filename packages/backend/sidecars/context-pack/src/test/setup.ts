/**
 * Global Test Setup for Context Pack Sidecar
 * WINT-2020: Create Context Pack Sidecar
 *
 * Sets up database environment variables for integration tests.
 * Context pack DB operations use the main lego database (port 5432, wint schema).
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load root .env (walks up from packages/backend/sidecars/context-pack to monorepo root)
config({ path: resolve(__dirname, '../../../../../.env') })

const TEST_ENV: Record<string, string> = {
  // The wint schema (contextPacks) lives in the main lego database (port 5432)
  DATABASE_URL:
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432/lego_dev',

  // Suppress noisy logs during tests
  LOG_LEVEL: 'error',
}

for (const [key, value] of Object.entries(TEST_ENV)) {
  if (process.env[key] === undefined) {
    process.env[key] = value
  }
}

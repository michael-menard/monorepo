/**
 * Global Test Setup for MCP Tools
 *
 * Provides database environment variables for integration tests.
 * The @repo/db package (used by story-management and story-compatibility)
 * requires DATABASE_URL or POSTGRES_* vars to initialize its connection pool.
 *
 * The workflow.* schema tables (stories, context_packs, etc.) live in the main
 * lego database (port 5432), not the KB database (port 5433).
 *
 * Resolution order:
 *   1. Already-set env vars (CI, local override)
 *   2. Root .env DATABASE_URL (monorepo-level config)
 *   3. Hardcoded fallback matching local docker-compose defaults
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load root .env (walks up from packages/backend/mcp-tools to monorepo root)
config({ path: resolve(__dirname, '../../../../.env') })

const TEST_ENV: Record<string, string> = {
  // The workflow schema tables live in the main lego database (port 5432).
  // Root .env already has DATABASE_URL pointing there.
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

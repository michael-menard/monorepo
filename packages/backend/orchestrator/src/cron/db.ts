/**
 * Cron DB Client
 *
 * Provides a pg Pool factory for cron jobs.
 * Backed by POSTGRES_* environment variables.
 * Mockable via vi.mock('../cron/db') in tests.
 *
 * APIP-3090: Cron Scheduler Infrastructure
 * ARCH-003: No shared pg singleton in orchestrator — scripts create their own Pool instances.
 */

import { Pool } from 'pg'

/**
 * Create a pg Pool instance backed by POSTGRES_* environment variables.
 *
 * Defaults align with local dev environment.
 *
 * @returns A pg Pool instance connected to the configured database
 */
export function getCronDbClient(): Pool {
  return new Pool({
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
    database: process.env.POSTGRES_DATABASE ?? 'postgres',
    user: process.env.POSTGRES_USER ?? 'postgres',
    password: process.env.POSTGRES_PASSWORD ?? 'postgres',
  })
}

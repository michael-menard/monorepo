/**
 * Read-only connection to the scraper database (rebrickable DB).
 *
 * Used by the steps endpoint to serve scrape_step_events audit data.
 * Separate from the main gallery DB connection in database.ts.
 */

import { resolve } from 'path'
import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { logger } from '@repo/logger'
import * as scraperSchema from '../../../../apps/scrapers/rebrickable/src/db/schema.js'

let pool: Pool | null = null
let envLoaded = false

function ensureEnv(): void {
  if (envLoaded) return
  envLoaded = true
  // Load scraper env vars — the scraper DB creds live in the scraper's .env
  const envPath = resolve(process.cwd(), 'apps/scrapers/rebrickable/.env')
  const result = config({ path: envPath })
  if (result.error) {
    logger.warn('[scraper-db] Could not load scraper .env', {
      path: envPath,
      error: result.error.message,
    })
  }
}

function getScraperPool(): Pool {
  if (!pool) {
    ensureEnv()
    const password = process.env.SCRAPER_DB_PASSWORD
    if (!password) {
      throw new Error(
        'SCRAPER_DB_PASSWORD not found. Ensure apps/scrapers/rebrickable/.env exists.',
      )
    }

    pool = new Pool({
      host: process.env.SCRAPER_DB_HOST || 'localhost',
      port: parseInt(process.env.SCRAPER_DB_PORT || '5432', 10),
      database: process.env.SCRAPER_DB_NAME || 'rebrickable',
      user: process.env.SCRAPER_DB_USER || 'postgres',
      password,
      max: 3,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  }
  return pool
}

export function getScraperDb() {
  return drizzle(getScraperPool(), { schema: scraperSchema })
}

export { scraperSchema }

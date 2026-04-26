import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { config } from 'dotenv'
import { logger } from '@repo/logger'
import * as schema from './schema.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

config({ path: resolve(__dirname, '../../.env') })

let pool: Pool | null = null

function getPool(): Pool {
  if (!pool) {
    const password = process.env.SCRAPER_DB_PASSWORD
    if (!password) {
      throw new Error('SCRAPER_DB_PASSWORD environment variable is required.')
    }

    pool = new Pool({
      host: process.env.SCRAPER_DB_HOST || 'localhost',
      port: parseInt(process.env.SCRAPER_DB_PORT || '5432', 10),
      database: process.env.SCRAPER_DB_NAME || 'rebrickable',
      user: process.env.SCRAPER_DB_USER || 'postgres',
      password,
      max: 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
    })

    pool.on('error', (err: Error) => {
      logger.error('[bricklink-mocs] Unexpected pool error', { error: err.message })
      pool = null
    })
  }
  return pool
}

export function getDbClient() {
  return drizzle(getPool(), { schema })
}

export async function closeDbClient(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
    logger.info('[bricklink-mocs] Database connection pool closed.')
  }
}

export { schema }

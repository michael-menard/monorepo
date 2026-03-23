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
      logger.error('[scraper] Unexpected pool error', { error: err.message })
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
    logger.info('[scraper] Database connection pool closed.')
  }
}

export async function testConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getPool().connect()
    try {
      await client.query('SELECT 1')
      return { success: true }
    } finally {
      client.release()
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, error: message }
  }
}

export { schema }

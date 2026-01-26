import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool, PoolConfig } from 'pg'

/**
 * Database connection for local development
 *
 * Uses Docker Postgres via DATABASE_URL environment variable.
 * For production, use RDS Proxy + Secrets Manager (handled in apps/api).
 *
 * Connection string format:
 * postgres://user:password@localhost:5432/dbname
 */

let pool: Pool | null = null
let db: NodePgDatabase<Record<string, never>> | null = null

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required')
    }

    pool = new Pool({
      connectionString,
      // Local dev: Allow multiple connections for better concurrency
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  }
  return pool
}

/**
 * Get the Drizzle database client (without schema for type inference)
 *
 * For typed queries, use createDb() with your schema instead.
 */
export function getDb(): NodePgDatabase<Record<string, never>> {
  if (!db) {
    db = drizzle(getPool())
  }
  return db
}

/**
 * Create a typed Drizzle database client with schema
 *
 * Usage:
 * ```typescript
 * import { createDb } from '@repo/api-core'
 * import * as schema from './schema'
 *
 * const db = createDb(schema)
 * const images = await db.query.galleryImages.findMany()
 * ```
 */
export function createDb<TSchema extends Record<string, unknown>>(
  schema: TSchema,
  config?: Partial<PoolConfig>
): NodePgDatabase<TSchema> {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required')
  }

  const connectionPool = new Pool({
    connectionString,
    max: config?.max ?? 10,
    idleTimeoutMillis: config?.idleTimeoutMillis ?? 30000,
    connectionTimeoutMillis: config?.connectionTimeoutMillis ?? 5000,
    ...config,
  })

  return drizzle(connectionPool, { schema })
}

/**
 * Close database connections (for cleanup/testing)
 */
export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
    db = null
  }
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await getPool().query('SELECT 1')
    return result.rows.length === 1
  } catch {
    return false
  }
}

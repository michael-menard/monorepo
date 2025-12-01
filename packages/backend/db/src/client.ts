import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

/**
 * Database Client for Lambda Functions
 *
 * Provides a configured Drizzle ORM client optimized for serverless environments.
 * Connection pooling works with RDS Proxy for efficient connection management.
 *
 * Usage in Lambda:
 * ```typescript
 * import { db } from '@repo/db/client';
 *
 * export async function handler(event) {
 *   const items = await db.select().from(schema.galleryImages);
 *   return { statusCode: 200, body: JSON.stringify(items) };
 * }
 * ```
 *
 * Environment Variables Required:
 * - POSTGRES_HOST: Database hostname (RDS Proxy endpoint recommended)
 * - POSTGRES_PORT: Database port (default: 5432)
 * - POSTGRES_USERNAME: Database user
 * - POSTGRES_PASSWORD: Database password
 * - POSTGRES_DATABASE: Database name
 * - NODE_ENV: Environment (production uses SSL)
 */

// Global connection pool (reused across Lambda invocations)
let _pool: Pool | null = null

/**
 * Get or create PostgreSQL connection pool
 * - Pool created once per Lambda container lifecycle
 * - RDS Proxy handles actual connection pooling
 * - Lambda keeps minimal pool (max 1 connection)
 */
export function getPool(): Pool {
  if (!_pool) {
    const host = process.env.POSTGRES_HOST
    const port = parseInt(process.env.POSTGRES_PORT || '5432')
    const user = process.env.POSTGRES_USERNAME
    const password = process.env.POSTGRES_PASSWORD
    const database = process.env.POSTGRES_DATABASE

    if (!host || !user || !password || !database) {
      throw new Error(
        'Missing required database environment variables: POSTGRES_HOST, POSTGRES_USERNAME, POSTGRES_PASSWORD, POSTGRES_DATABASE',
      )
    }

    _pool = new Pool({
      host,
      port,
      user,
      password,
      database,
      // Serverless-optimized connection pool settings
      max: 1, // Single connection per Lambda (RDS Proxy handles pooling)
      idleTimeoutMillis: 30000, // Close idle connections after 30s
      connectionTimeoutMillis: 5000, // Fail fast on connection issues
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })

    // Handle pool errors gracefully
    _pool.on('error', err => {
      console.error('Unexpected database pool error:', err)
    })
  }

  return _pool
}

/**
 * Drizzle ORM Database Client
 * - Type-safe queries with full schema inference
 * - Lazy-loaded relationships
 * - Transaction support
 */
export const db = drizzle(getPool(), { schema, logger: false })

/**
 * Gracefully close database connection pool
 * - Call this in Lambda cleanup if needed
 * - Generally not required as Lambda handles cleanup
 */
export async function closePool(): Promise<void> {
  if (_pool) {
    await _pool.end()
    _pool = null
  }
}

/**
 * Test database connectivity
 * - Used by health check Lambdas
 * - Returns true if connection successful
 */
export async function testConnection(): Promise<boolean> {
  try {
    const pool = getPool()
    const result = await pool.query('SELECT 1 as health_check')
    return result.rows[0]?.health_check === 1
  } catch (error) {
    console.error('Database connection test failed:', error)
    return false
  }
}

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '@/db/schema'
import { getEnv } from '@/lib/utils/env'

/**
 * Database Client Configuration for Lambda Functions
 *
 * This module provides a configured Drizzle ORM client for accessing PostgreSQL.
 * Connection pooling is optimized for serverless environments with RDS Proxy.
 *
 * Key Features:
 * - Connection reuse across Lambda invocations (initialized outside handler)
 * - RDS Proxy handles connection pooling at infrastructure level
 * - Environment-based configuration via SST Resource linking
 * - Type-safe queries with Drizzle ORM
 *
 * Usage:
 * ```typescript
 * import { db } from '@/lib/db/client';
 *
 * export async function handler(event) {
 *   const users = await db.select().from(schema.mocInstructions);
 *   return { statusCode: 200, body: JSON.stringify(users) };
 * }
 * ```
 */

// Initialize connection pool outside handler for reuse across invocations
let _pool: Pool | null = null

/**
 * Get or create PostgreSQL connection pool
 * - Pool is created once per Lambda container lifecycle
 * - RDS Proxy handles actual connection pooling
 * - Lambda connection pool kept small (max 1 connection)
 */
function getPool(): Pool {
  if (!_pool) {
    const env = getEnv()

    _pool = new Pool({
      host: env.POSTGRES_HOST,
      port: parseInt(env.POSTGRES_PORT || '5432'),
      user: env.POSTGRES_USERNAME,
      password: env.POSTGRES_PASSWORD,
      database: env.POSTGRES_DATABASE,
      // Serverless-optimized connection pool settings
      max: 1, // Single connection per Lambda (RDS Proxy handles pooling)
      idleTimeoutMillis: 30000, // Close idle connections after 30s
      connectionTimeoutMillis: 5000, // Fail fast on connection issues
      ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
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
 * - Call this in Lambda function cleanup if needed
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
 * - Used by health check Lambda
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

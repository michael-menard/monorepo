/**
 * Database Client for Pipeline (LangGraph Checkpoints)
 *
 * Provides a standalone connection pool for the pipeline PostgreSQL database.
 * This client is INTENTIONALLY isolated from @repo/db to ensure pipeline
 * storage is independent of the main application database.
 *
 * Configuration:
 * - Max connections: 3 (low per-process; matches serverless usage pattern)
 * - Idle timeout: 10s (release connections quickly)
 * - Connection timeout: 5s (fail fast)
 *
 * Environment variables (all PIPELINE_DB_* prefix):
 * - PIPELINE_DB_HOST    (default: localhost)
 * - PIPELINE_DB_PORT    (default: 5434)
 * - PIPELINE_DB_NAME    (default: pipeline_test)
 * - PIPELINE_DB_USER    (default: pipelineuser)
 * - PIPELINE_DB_PASSWORD (required)
 *
 * @see APIP-5001 AC-4: Standalone Pool Isolation
 */

import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { Pool } from 'pg'
import { config } from 'dotenv'
import { logger } from '@repo/logger'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env from package root
config({ path: resolve(__dirname, '../../.env') })

/**
 * Sanitize error messages to prevent credential leakage.
 * Removes passwords, connection strings, and other sensitive information.
 */
function sanitizeErrorMessage(message: string): string {
  // Remove password from connection strings
  let sanitized = message.replace(/password=[^&\s]+/gi, 'password=***')
  sanitized = sanitized.replace(/:[^:@]+@/g, ':***@')

  // Remove PIPELINE_DB_PASSWORD references
  sanitized = sanitized.replace(/PIPELINE_DB_PASSWORD=[^\s]+/gi, 'PIPELINE_DB_PASSWORD=***')

  // Remove any tokens or keys
  sanitized = sanitized.replace(/\b[A-Za-z0-9_-]{32,}\b/g, '***')

  return sanitized
}

/**
 * Get database configuration from environment variables.
 *
 * @returns Pool configuration object
 * @throws Error if required environment variables are missing
 */
function getPipelineDbConfig() {
  const password = process.env.PIPELINE_DB_PASSWORD

  if (!password) {
    throw new Error(
      'PIPELINE_DB_PASSWORD environment variable is required. ' +
        'Set it in your .env file or environment. ' +
        'For tests, start the DB with: pnpm db:test:start',
    )
  }

  return {
    host: process.env.PIPELINE_DB_HOST || 'localhost',
    port: parseInt(process.env.PIPELINE_DB_PORT || '5434', 10),
    database: process.env.PIPELINE_DB_NAME || 'pipeline_test',
    user: process.env.PIPELINE_DB_USER || 'pipelineuser',
    password,
    max: 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  }
}

/**
 * Singleton connection pool.
 *
 * Persists across warm invocations in Lambda context,
 * reducing connection overhead.
 */
let pool: Pool | null = null

/**
 * Get the connection pool, creating it if necessary.
 *
 * @returns Pool instance
 */
function getPool(): Pool {
  if (!pool) {
    const poolConfig = getPipelineDbConfig()
    pool = new Pool(poolConfig)

    pool.on('error', (err: Error) => {
      const sanitizedMessage = sanitizeErrorMessage(err.message)
      logger.error('[pipeline] Unexpected pool error', {
        error: sanitizedMessage,
        help: 'See src/db/README.md troubleshooting section for help.',
      })
    })
  }

  return pool
}

/**
 * Close the database connection pool.
 *
 * Call this when shutting down or during test cleanup.
 *
 * @example
 * ```typescript
 * import { closePool } from './client.js'
 * await closePool()
 * ```
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
    logger.info('[pipeline] Database connection pool closed.')
  }
}

/**
 * Test database connection.
 *
 * Attempts to connect and run a simple query.
 *
 * @returns Object with success status and optional error message
 *
 * @example
 * ```typescript
 * const result = await testConnection()
 * if (!result.success) {
 *   console.error('Connection failed:', result.error)
 * }
 * ```
 */
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
    const sanitized = sanitizeErrorMessage(message)

    if (message.includes('ECONNREFUSED')) {
      return {
        success: false,
        error: `Connection refused on port ${process.env.PIPELINE_DB_PORT || '5434'}. Is the test DB running? Try: pnpm db:test:start\n\nOriginal error: ${sanitized}`,
      }
    }

    if (message.includes('password authentication failed')) {
      return {
        success: false,
        error: `Authentication failed. Check PIPELINE_DB_USER and PIPELINE_DB_PASSWORD in .env\n\nOriginal error: ${sanitized}`,
      }
    }

    if (message.includes('does not exist')) {
      return {
        success: false,
        error: `Database not found. Run: pnpm db:migrate:test\n\nOriginal error: ${sanitized}`,
      }
    }

    return {
      success: false,
      error: `Connection failed: ${sanitized}\n\nSee src/db/README.md troubleshooting section for help.`,
    }
  }
}

/**
 * Execute a query using the pool.
 *
 * Convenience wrapper for one-off queries.
 *
 * @param sql - SQL query string
 * @param params - Query parameters
 * @returns Query result
 */
export async function query(sql: string, params?: unknown[]) {
  return getPool().query(sql, params)
}

/**
 * Get a client from the pool for transactional queries.
 *
 * IMPORTANT: Always release the client when done.
 *
 * @returns Pool client (must be released)
 */
export async function getClient() {
  return getPool().connect()
}

/**
 * Database Client for Knowledge Base
 *
 * Provides connection pooling optimized for serverless (Lambda) context.
 *
 * Configuration:
 * - Max connections: 10 (suitable for Lambda concurrency)
 * - Idle timeout: 10s (release connections quickly)
 * - Connection timeout: 5s (fail fast)
 *
 * @see .env.example for configuration options
 */

import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { config } from 'dotenv'
import { logger } from '@repo/logger'
import * as schema from './schema.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env from package root
config({ path: resolve(__dirname, '../../.env') })

/**
 * Database configuration from environment variables.
 */
interface DbConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
  maxConnections: number
  idleTimeoutMs: number
  connectionTimeoutMs: number
}

/**
 * Sanitize error messages to prevent credential leakage.
 * Removes passwords, connection strings, and other sensitive information.
 */
function sanitizeErrorMessage(message: string): string {
  // Remove password from connection strings
  let sanitized = message.replace(/password=[^&\s]+/gi, 'password=***')
  sanitized = sanitized.replace(/:[^:@]+@/g, ':***@')

  // Remove KB_DB_PASSWORD references
  sanitized = sanitized.replace(/KB_DB_PASSWORD=[^\s]+/gi, 'KB_DB_PASSWORD=***')

  // Remove any tokens or keys
  sanitized = sanitized.replace(/\b[A-Za-z0-9_-]{16,}\b/g, '***')

  return sanitized
}

/**
 * Get database configuration from environment variables.
 *
 * @returns Database configuration object
 * @throws Error if required environment variables are missing
 */
function getDbConfig(): DbConfig {
  const password = process.env.KB_DB_PASSWORD

  if (!password) {
    throw new Error(
      'KB_DB_PASSWORD environment variable is required. ' +
        'Set it in your .env file or environment. ' +
        'See .env.example for guidance.',
    )
  }

  return {
    host: process.env.KB_DB_HOST || 'localhost',
    port: parseInt(process.env.KB_DB_PORT || '5433', 10),
    database: process.env.KB_DB_NAME || 'knowledgebase',
    user: process.env.KB_DB_USER || 'kbuser',
    password,
    maxConnections: parseInt(process.env.KB_DB_MAX_CONNECTIONS || '10', 10),
    idleTimeoutMs: parseInt(process.env.KB_DB_IDLE_TIMEOUT_MS || '10000', 10),
    connectionTimeoutMs: parseInt(process.env.KB_DB_CONNECTION_TIMEOUT_MS || '5000', 10),
  }
}

/**
 * Singleton connection pool.
 *
 * In Lambda context, this pool persists across warm invocations,
 * reducing connection overhead.
 */
let pool: Pool | null = null

/**
 * Create a new connection pool with error handling.
 *
 * @param config - Database configuration
 * @returns Configured Pool instance
 */
function createPool(dbConfig: DbConfig): Pool {
  const newPool = new Pool({
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    password: dbConfig.password,
    max: dbConfig.maxConnections,
    idleTimeoutMillis: dbConfig.idleTimeoutMs,
    connectionTimeoutMillis: dbConfig.connectionTimeoutMs,
  })

  // Handle pool errors
  newPool.on('error', (err: Error) => {
    // Sanitize error message to avoid leaking credentials
    const sanitizedMessage = sanitizeErrorMessage(err.message)
    logger.error('[knowledge-base] Unexpected pool error', {
      error: sanitizedMessage,
      help: 'See README.md troubleshooting section for help.',
    })
  })

  return newPool
}

/**
 * Get the connection pool, creating it if necessary.
 *
 * @returns Pool instance
 */
function getPool(): Pool {
  if (!pool) {
    const dbConfig = getDbConfig()
    pool = createPool(dbConfig)
  }
  return pool
}

/**
 * Get a Drizzle database client.
 *
 * @example
 * ```typescript
 * import { getDbClient } from '@repo/knowledge-base/db'
 *
 * const db = getDbClient()
 * const entries = await db.select().from(knowledgeEntries)
 * ```
 *
 * @returns Drizzle database client with schema
 */
export function getDbClient() {
  return drizzle(getPool(), { schema })
}

/**
 * Close the database connection pool.
 *
 * Call this when shutting down the application or during cleanup.
 *
 * @example
 * ```typescript
 * import { closeDbClient } from '@repo/knowledge-base/db'
 *
 * // In cleanup/shutdown handler
 * await closeDbClient()
 * ```
 */
export async function closeDbClient(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
    console.log('[knowledge-base] Database connection pool closed.')
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

    // Provide helpful error messages
    if (message.includes('ECONNREFUSED')) {
      return {
        success: false,
        error: `Connection refused. Is Docker running? Try: docker-compose up -d\n\nOriginal error: ${message}`,
      }
    }

    if (message.includes('password authentication failed')) {
      return {
        success: false,
        error: `Authentication failed. Check KB_DB_USER and KB_DB_PASSWORD in .env\n\nOriginal error: ${message}`,
      }
    }

    if (message.includes('does not exist')) {
      return {
        success: false,
        error: `Database not found. Run: pnpm db:init\n\nOriginal error: ${message}`,
      }
    }

    return {
      success: false,
      error: `Connection failed: ${message}\n\nSee README.md troubleshooting section for help.`,
    }
  }
}

// Export schema for convenience
export { schema }

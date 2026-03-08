/**
 * Database Client for Knowledge Base
 *
 * Provides connection pooling optimized for serverless (Lambda) context.
 *
 * Configuration:
 * - Max connections: 3 (per-process; reads DB_POOL_SIZE or KB_DB_MAX_CONNECTIONS)
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

/**
 * Type for the Drizzle database client with knowledge base schema.
 */
export type KnowledgeBaseDb = ReturnType<typeof drizzle<typeof schema>>

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
    maxConnections: parseInt(process.env.DB_POOL_SIZE || process.env.KB_DB_MAX_CONNECTIONS || '3', 10),
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
 * Drain a replaced pool asynchronously.
 * Waits for borrowed connections to return, then closes the pool.
 * Silently ignores errors since the pool is already being replaced.
 */
function drainOldPool(oldPool: Pool): void {
  oldPool.end().catch(err => {
    logger.warn('[knowledge-base] Error draining old pool (safe to ignore)', {
      error: err instanceof Error ? err.message : String(err),
    })
  })
}

/**
 * Replace the current pool, draining the old one safely.
 */
function replacePool(): void {
  if (pool) {
    const oldPool = pool
    pool = null
    drainOldPool(oldPool)
  }
}

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
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  })

  // Handle pool errors — recreate pool on fatal connection failures
  newPool.on('error', (err: Error) => {
    const sanitizedMessage = sanitizeErrorMessage(err.message)
    logger.error('[knowledge-base] Unexpected pool error, will recreate pool on next use', {
      error: sanitizedMessage,
    })
    // Replace pool so the next getPool() call creates a fresh one.
    // drainOldPool handles cleanup asynchronously.
    replacePool()
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

/**
 * Execute a database operation with a single retry on transient connection errors.
 *
 * Catches socket resets, broken pipes, and pool exhaustion timeouts,
 * waits 200ms, then retries once. Non-transient errors are thrown immediately.
 */
const TRANSIENT_PATTERNS = [
  'econnreset',
  'econnrefused',
  'epipe',
  'socket hang up',
  'connection terminated unexpectedly',
  'client has encountered a connection error',
  'timeout expired',
  'read econnreset',
  'write epipe',
  'cannot use a pool after calling end',
  'remaining connection slots are reserved',
  'too many clients already',
  'sorry, too many clients',
]

function isTransientError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const msg = err.message.toLowerCase()
  return TRANSIENT_PATTERNS.some(p => msg.includes(p))
}

export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  checkCircuitBreaker()
  try {
    const result = await fn()
    recordSuccess()
    return result
  } catch (err) {
    if (!isTransientError(err)) {
      // Non-transient errors don't count against the circuit breaker
      throw err
    }
    recordFailure()
    logger.warn('[knowledge-base] Transient DB error, retrying in 200ms', {
      error: err instanceof Error ? err.message : String(err),
    })
    // Force pool recreation before retry, draining old pool safely
    replacePool()
    await new Promise(resolve => setTimeout(resolve, 200))
    try {
      const result = await fn()
      recordSuccess()
      return result
    } catch (retryErr) {
      if (isTransientError(retryErr)) recordFailure()
      throw retryErr
    }
  }
}

// =============================================================================
// Circuit Breaker
// =============================================================================

const CIRCUIT_BREAKER = {
  /** Number of consecutive failures before opening the circuit */
  failureThreshold: 3,
  /** How long the circuit stays open before allowing a probe (ms) */
  resetTimeoutMs: 5000,
  /** Health check interval (ms) */
  healthCheckIntervalMs: 30000,

  // State
  consecutiveFailures: 0,
  state: 'closed' as 'closed' | 'open' | 'half-open',
  lastFailureTime: 0,
  healthCheckTimer: null as ReturnType<typeof setInterval> | null,
}

/**
 * Record a successful DB operation — resets the circuit breaker.
 */
export function recordSuccess(): void {
  if (CIRCUIT_BREAKER.consecutiveFailures > 0) {
    logger.info('[knowledge-base] Circuit breaker reset after successful operation')
  }
  CIRCUIT_BREAKER.consecutiveFailures = 0
  CIRCUIT_BREAKER.state = 'closed'
}

/**
 * Record a failed DB operation — may trip the circuit breaker.
 */
export function recordFailure(): void {
  CIRCUIT_BREAKER.consecutiveFailures++
  CIRCUIT_BREAKER.lastFailureTime = Date.now()

  if (CIRCUIT_BREAKER.consecutiveFailures >= CIRCUIT_BREAKER.failureThreshold) {
    CIRCUIT_BREAKER.state = 'open'
    logger.error('[knowledge-base] Circuit breaker OPEN — DB unreachable', {
      consecutiveFailures: CIRCUIT_BREAKER.consecutiveFailures,
      resetTimeoutMs: CIRCUIT_BREAKER.resetTimeoutMs,
    })
  }
}

/**
 * Check if the circuit breaker allows a request through.
 * Throws if the circuit is open and reset timeout hasn't elapsed.
 */
export function checkCircuitBreaker(): void {
  if (CIRCUIT_BREAKER.state === 'closed') return

  const elapsed = Date.now() - CIRCUIT_BREAKER.lastFailureTime
  if (elapsed >= CIRCUIT_BREAKER.resetTimeoutMs) {
    // Allow one probe request through (half-open)
    CIRCUIT_BREAKER.state = 'half-open'
    logger.info('[knowledge-base] Circuit breaker half-open, allowing probe request')
    return
  }

  throw new Error(
    `Circuit breaker is OPEN — DB has failed ${CIRCUIT_BREAKER.consecutiveFailures} consecutive times. ` +
      `Retry in ${CIRCUIT_BREAKER.resetTimeoutMs - elapsed}ms.`,
  )
}

/**
 * Start periodic health check that probes DB connectivity in the background.
 * Resets the circuit breaker on success, increments failures on error.
 */
export function startHealthCheck(): void {
  if (CIRCUIT_BREAKER.healthCheckTimer) return

  CIRCUIT_BREAKER.healthCheckTimer = setInterval(async () => {
    try {
      const result = await testConnection()
      if (result.success) {
        recordSuccess()
      } else {
        recordFailure()
      }
    } catch {
      recordFailure()
    }
  }, CIRCUIT_BREAKER.healthCheckIntervalMs)

  // Don't prevent process exit
  CIRCUIT_BREAKER.healthCheckTimer.unref()
}

/**
 * Stop the periodic health check.
 */
export function stopHealthCheck(): void {
  if (CIRCUIT_BREAKER.healthCheckTimer) {
    clearInterval(CIRCUIT_BREAKER.healthCheckTimer)
    CIRCUIT_BREAKER.healthCheckTimer = null
  }
}

// Export schema for convenience
export { schema }

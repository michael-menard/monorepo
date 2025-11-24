/**
 * Database Query Retry Wrapper
 *
 * Implements retry logic specifically for database operations with:
 * - Detection of retryable PostgreSQL error codes
 * - Exponential backoff with jitter
 * - Structured logging of retry attempts
 *
 * Usage:
 * ```typescript
 * import { queryWithRetry } from '@/core/database/retry'
 *
 * const users = await queryWithRetry(() =>
 *   db.select().from(schema.users).where(eq(schema.users.id, userId))
 * )
 * ```
 */

import { retryWithBackoff } from '@/core/utils/retry'
import { DatabaseError } from '@/core/utils/responses'
import { createLogger } from '@/core/observability/logger'

const logger = createLogger('db-retry')

/**
 * PostgreSQL error codes that should trigger a retry
 * Source: https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
const RETRYABLE_POSTGRES_CODES = new Set([
  '40001', // serialization_failure (transaction conflict)
  '40P01', // deadlock_detected
  '53000', // insufficient_resources
  '53100', // disk_full
  '53200', // out_of_memory
  '53300', // too_many_connections
  '53400', // configuration_limit_exceeded
  '08000', // connection_exception
  '08003', // connection_does_not_exist
  '08006', // connection_failure
  '08001', // sqlclient_unable_to_establish_sqlconnection
  '08004', // sqlserver_rejected_establishment_of_sqlconnection
  '57P03', // cannot_connect_now
])

/**
 * Check if a PostgreSQL error is retryable based on error code
 *
 * @param error - The error to check
 * @returns true if the error should be retried
 */
function isPostgresErrorRetryable(error: unknown): boolean {
  // Check if error has a PostgreSQL error code
  if (error && typeof error === 'object' && 'code' in error) {
    const pgError = error as { code: string }
    return RETRYABLE_POSTGRES_CODES.has(pgError.code)
  }

  // Check error message for common retryable patterns
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('deadlock') ||
      message.includes('too many connections')
    )
  }

  return false
}

/**
 * Execute a database query with automatic retry on transient failures
 *
 * Retries database operations that fail due to:
 * - Connection issues
 * - Deadlocks and serialization failures
 * - Resource exhaustion (connections, memory)
 *
 * @param queryFn - The database query function to execute
 * @param context - Optional context for logging (e.g., 'getUserById')
 * @returns The result of the query
 * @throws DatabaseError if query fails after all retries
 *
 * @example
 * ```typescript
 * // Simple query
 * const user = await queryWithRetry(
 *   () => db.select().from(users).where(eq(users.id, userId)),
 *   'getUserById'
 * )
 *
 * // Transaction
 * const result = await queryWithRetry(
 *   () => db.transaction(async (tx) => {
 *     await tx.insert(users).values(newUser)
 *     await tx.insert(profiles).values(newProfile)
 *     return { success: true }
 *   }),
 *   'createUserWithProfile'
 * )
 * ```
 */
export async function queryWithRetry<T>(queryFn: () => Promise<T>, context?: string): Promise<T> {
  return retryWithBackoff(
    async () => {
      try {
        return await queryFn()
      } catch (error) {
        // Determine if error is retryable
        const isRetryable = isPostgresErrorRetryable(error)

        // Extract error code if available
        const errorCode =
          error && typeof error === 'object' && 'code' in error
            ? (error as { code: string }).code
            : 'unknown'

        logger.warn('Database query error', {
          context,
          errorCode,
          isRetryable,
          errorMessage: error instanceof Error ? error.message : String(error),
        })

        // Throw DatabaseError with appropriate retry flag
        throw new DatabaseError(error instanceof Error ? error.message : 'Database query failed', {
          context,
          errorCode,
          originalError: error instanceof Error ? error.name : typeof error,
          isRetryable,
        })
      }
    },
    {
      maxAttempts: 3,
      baseDelay: 200, // Start with 200ms delay
      maxDelay: 2000, // Cap at 2 seconds
      jitter: true, // Prevent thundering herd on database
      context: context ? `db:${context}` : 'db',
    },
  )
}

/**
 * Execute a database transaction with automatic retry
 *
 * Specialized wrapper for database transactions that provides:
 * - Automatic retry on deadlocks and serialization failures
 * - Proper error handling and logging
 *
 * @param transactionFn - The transaction function to execute
 * @param context - Optional context for logging
 * @returns The result of the transaction
 *
 * @example
 * ```typescript
 * const result = await transactionWithRetry(
 *   async (tx) => {
 *     const user = await tx.insert(users).values(newUser).returning()
 *     await tx.insert(profiles).values({ userId: user[0].id, ...profileData })
 *     return user[0]
 *   },
 *   'createUserWithProfile'
 * )
 * ```
 */
export async function transactionWithRetry<T>(
  transactionFn: (tx: any) => Promise<T>,
  context?: string,
): Promise<T> {
  // Import db here to avoid circular dependencies
  const { db } = await import('./client')

  return queryWithRetry(
    () => db.transaction(transactionFn),
    context ? `transaction:${context}` : 'transaction',
  )
}

/**
 * Helper to determine if a database error is a connection error
 *
 * @param error - The error to check
 * @returns true if error is connection-related
 */
export function isConnectionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const pgError = error as { code?: string }
  const connectionCodes = ['08000', '08003', '08006', '08001', '08004', '57P03']

  if (pgError.code && connectionCodes.includes(pgError.code)) {
    return true
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('connection') ||
      message.includes('econnrefused') ||
      message.includes('econnreset') ||
      message.includes('etimedout')
    )
  }

  return false
}

/**
 * Helper to determine if a database error is a deadlock
 *
 * @param error - The error to check
 * @returns true if error is a deadlock
 */
export function isDeadlockError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const pgError = error as { code?: string }
  return pgError.code === '40P01' || pgError.code === '40001'
}

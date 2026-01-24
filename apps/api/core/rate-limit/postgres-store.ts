/**
 * PostgreSQL Rate Limit Store
 *
 * Story 3.1.31: Extract Rate Limit Package
 *
 * Implements RateLimitStore interface using PostgreSQL with atomic upserts.
 * Uses the existing user_daily_uploads table for backwards compatibility.
 *
 * Key format: "feature:userId:YYYY-MM-DD"
 * Example: "moc-upload:abc123:2024-01-15"
 */

import type { RateLimitStore, RateLimitResult } from '@repo/rate-limit'
import { sql, eq, and } from 'drizzle-orm'
import { getDbAsync } from '@/core/database/client'
import { userDailyUploads } from '@/core/database/schema'
import { createLogger } from '@/core/observability/logger'

const logger = createLogger('postgres-rate-limit-store')

/**
 * Parse a rate limit key to extract userId and date
 *
 * @param key - Key in format "feature:userId:YYYY-MM-DD"
 * @returns Parsed components or null if invalid
 */
const parseKey = (key: string): { feature: string; userId: string; day: string } | null => {
  const parts = key.split(':')
  if (parts.length < 3) {
    return null
  }
  // Handle keys like "moc-upload:userId:2024-01-15"
  // Feature can contain hyphens, so we need to be careful
  // Assume format: feature:userId:YYYY-MM-DD where date is always 10 chars
  const day = parts[parts.length - 1]
  const userId = parts[parts.length - 2]
  const feature = parts.slice(0, -2).join(':')

  if (!day || !userId || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return null
  }

  return { feature, userId, day }
}

/**
 * Get the start of the next UTC day (midnight)
 */
const getNextUTCMidnight = (): Date => {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
}

/**
 * Get seconds until next UTC midnight
 */
const getSecondsUntilMidnight = (): number => {
  const now = new Date()
  const nextMidnight = getNextUTCMidnight()
  return Math.ceil((nextMidnight.getTime() - now.getTime()) / 1000)
}

/**
 * Create a PostgreSQL-backed rate limit store
 *
 * Uses atomic upserts with WHERE guards for concurrency safety.
 * The key format must be "feature:userId:YYYY-MM-DD".
 *
 * @returns RateLimitStore implementation
 *
 * @example
 * ```typescript
 * import { createRateLimiter, generateDailyKey } from '@repo/rate-limit'
 * import { createPostgresRateLimitStore } from './postgres-store'
 *
 * const store = createPostgresRateLimitStore()
 * const rateLimiter = createRateLimiter(store)
 *
 * const key = generateDailyKey('moc-upload', userId)
 * const result = await rateLimiter.checkLimit(key, { maxRequests: 100, windowMs: DAY })
 * ```
 */
export const createPostgresRateLimitStore = (): RateLimitStore => ({
  checkAndIncrement: async (key: string, limit: number): Promise<RateLimitResult> => {
    const parsed = parseKey(key)
    if (!parsed) {
      throw new Error(`Invalid rate limit key format: ${key}. Expected "feature:userId:YYYY-MM-DD"`)
    }

    const { userId, day } = parsed
    const db = await getDbAsync()

    logger.debug('Checking rate limit', { key, userId, day, limit })

    try {
      // Step 1: Try to increment existing row (atomic with WHERE guard)
      const updateResult = await db.execute(sql`
        UPDATE user_daily_uploads
        SET count = count + 1, updated_at = NOW()
        WHERE user_id = ${userId} AND day = ${day}::date AND count < ${limit}
        RETURNING count
      `)

      if (updateResult.rows.length > 0) {
        const newCount = updateResult.rows[0]?.count as number
        const remaining = limit - newCount
        const resetAt = getNextUTCMidnight()

        logger.debug('Rate limit incremented', { key, newCount, remaining })

        return {
          allowed: true,
          remaining,
          currentCount: newCount,
          resetAt,
          nextAllowedAt: resetAt,
          retryAfterSeconds: 0,
        }
      }

      // Step 2: No row updated - either no row exists or limit reached
      // Try to insert a new row (first request of the day)
      const insertResult = await db.execute(sql`
        INSERT INTO user_daily_uploads (user_id, day, count, updated_at)
        VALUES (${userId}, ${day}::date, 1, NOW())
        ON CONFLICT (user_id, day) DO NOTHING
        RETURNING count
      `)

      if (insertResult.rows.length > 0) {
        const newCount = 1
        const remaining = limit - newCount
        const resetAt = getNextUTCMidnight()

        logger.debug('Rate limit initialized', { key, newCount, remaining })

        return {
          allowed: true,
          remaining,
          currentCount: newCount,
          resetAt,
          nextAllowedAt: resetAt,
          retryAfterSeconds: 0,
        }
      }

      // Step 3: Insert failed due to conflict - row exists but limit reached
      const existingRow = await db
        .select({ count: userDailyUploads.count })
        .from(userDailyUploads)
        .where(
          and(eq(userDailyUploads.userId, userId), eq(userDailyUploads.day, sql`${day}::date`)),
        )
        .limit(1)

      const currentCount = existingRow[0]?.count ?? limit
      const resetAt = getNextUTCMidnight()
      const retryAfterSeconds = getSecondsUntilMidnight()

      logger.warn('Rate limit exceeded', {
        key,
        currentCount,
        limit,
        resetAt: resetAt.toISOString(),
        retryAfterSeconds,
      })

      return {
        allowed: false,
        remaining: 0,
        currentCount,
        resetAt,
        nextAllowedAt: resetAt,
        retryAfterSeconds,
      }
    } catch (error) {
      logger.error('Rate limit check failed', { key, error })
      throw error
    }
  },

  reset: async (key: string): Promise<void> => {
    const parsed = parseKey(key)
    if (!parsed) {
      throw new Error(`Invalid rate limit key format: ${key}. Expected "feature:userId:YYYY-MM-DD"`)
    }

    const { userId, day } = parsed
    const db = await getDbAsync()

    logger.debug('Resetting rate limit', { key, userId, day })

    await db
      .delete(userDailyUploads)
      .where(and(eq(userDailyUploads.userId, userId), eq(userDailyUploads.day, sql`${day}::date`)))
  },

  getCount: async (key: string): Promise<number> => {
    const parsed = parseKey(key)
    if (!parsed) {
      throw new Error(`Invalid rate limit key format: ${key}. Expected "feature:userId:YYYY-MM-DD"`)
    }

    const { userId, day } = parsed
    const db = await getDbAsync()

    const result = await db
      .select({ count: userDailyUploads.count })
      .from(userDailyUploads)
      .where(and(eq(userDailyUploads.userId, userId), eq(userDailyUploads.day, sql`${day}::date`)))
      .limit(1)

    return result[0]?.count ?? 0
  },
})

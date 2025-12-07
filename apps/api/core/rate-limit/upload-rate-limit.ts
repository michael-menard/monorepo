/**
 * Upload Rate Limit Service
 *
 * Story 3.1.6: Rate Limiting and Observability
 *
 * Provides per-user/day rate limiting for upload operations using PostgreSQL.
 * Uses atomic upsert with WHERE guard to ensure concurrency safety.
 *
 * Usage:
 * ```typescript
 * const result = await checkAndIncrementDailyLimit(userId, maxPerDay)
 * if (!result.allowed) {
 *   // Return 429 with result.nextAllowedAt and result.retryAfterSeconds
 * }
 * ```
 */

import { getDbAsync } from '@/core/database/client'
import { userDailyUploads } from '@/core/database/schema'
import { createLogger } from '@/core/observability/logger'
import { sql, eq, and } from 'drizzle-orm'
import { z } from 'zod'

const logger = createLogger('upload-rate-limit')

/**
 * Rate limit check result schema
 */
export const RateLimitResultSchema = z.object({
  allowed: z.boolean(),
  remaining: z.number().int().nonnegative(),
  currentCount: z.number().int().nonnegative(),
  nextAllowedAt: z.date(),
  retryAfterSeconds: z.number().int().nonnegative(),
})

export type RateLimitResult = z.infer<typeof RateLimitResultSchema>

/**
 * Get the start of the next UTC day
 */
const getNextUTCMidnight = (): Date => {
  const now = new Date()
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  return tomorrow
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
 * Get current UTC date as YYYY-MM-DD string
 */
const getCurrentUTCDateString = (): string => {
  const now = new Date()
  return now.toISOString().split('T')[0]
}

/**
 * Check and increment daily upload limit for a user.
 *
 * Uses atomic upsert with WHERE guard to ensure concurrency safety:
 * 1. Try UPDATE with WHERE count < limit
 * 2. If no rows updated, try INSERT with count = 1 (if under limit)
 * 3. If still no rows, limit is exceeded
 *
 * @param userId - The user's Cognito ID
 * @param maxPerDay - Maximum uploads allowed per day
 * @returns RateLimitResult with allowed status and retry info
 */
export const checkAndIncrementDailyLimit = async (
  userId: string,
  maxPerDay: number,
): Promise<RateLimitResult> => {
  const db = await getDbAsync()
  const today = getCurrentUTCDateString()

  logger.debug('Checking rate limit', { userId, maxPerDay, today })

  try {
    // Step 1: Try to increment existing row (atomic with WHERE guard)
    const updateResult = await db.execute(sql`
      UPDATE user_daily_uploads
      SET count = count + 1, updated_at = NOW()
      WHERE user_id = ${userId} AND day = ${today}::date AND count < ${maxPerDay}
      RETURNING count
    `)

    if (updateResult.rows.length > 0) {
      // Successfully incremented
      const newCount = updateResult.rows[0].count as number
      const remaining = maxPerDay - newCount

      logger.debug('Rate limit incremented', { userId, newCount, remaining })

      return {
        allowed: true,
        remaining,
        currentCount: newCount,
        nextAllowedAt: getNextUTCMidnight(),
        retryAfterSeconds: 0,
      }
    }

    // Step 2: No row updated - either no row exists or limit reached
    // Try to insert a new row (first upload of the day)
    const insertResult = await db.execute(sql`
      INSERT INTO user_daily_uploads (user_id, day, count, updated_at)
      VALUES (${userId}, ${today}::date, 1, NOW())
      ON CONFLICT (user_id, day) DO NOTHING
      RETURNING count
    `)

    if (insertResult.rows.length > 0) {
      // Successfully inserted first upload of the day
      const newCount = 1
      const remaining = maxPerDay - newCount

      logger.debug('Rate limit initialized', { userId, newCount, remaining })

      return {
        allowed: true,
        remaining,
        currentCount: newCount,
        nextAllowedAt: getNextUTCMidnight(),
        retryAfterSeconds: 0,
      }
    }

    // Step 3: Insert failed due to conflict - row exists but limit reached
    // Fetch current count for logging
    const existingRow = await db
      .select({ count: userDailyUploads.count })
      .from(userDailyUploads)
      .where(
        and(eq(userDailyUploads.userId, userId), eq(userDailyUploads.day, sql`${today}::date`)),
      )
      .limit(1)

    const currentCount = existingRow[0]?.count ?? maxPerDay
    const nextAllowedAt = getNextUTCMidnight()
    const retryAfterSeconds = getSecondsUntilMidnight()

    logger.warn('Rate limit exceeded', {
      userId,
      currentCount,
      maxPerDay,
      nextAllowedAt: nextAllowedAt.toISOString(),
      retryAfterSeconds,
    })

    return {
      allowed: false,
      remaining: 0,
      currentCount,
      nextAllowedAt,
      retryAfterSeconds,
    }
  } catch (error) {
    logger.error('Rate limit check failed', { userId, error })
    throw error
  }
}

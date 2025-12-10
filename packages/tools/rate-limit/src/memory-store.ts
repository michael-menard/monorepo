/**
 * In-Memory Rate Limit Store
 *
 * Story 3.1.31: Extract Rate Limit Package
 *
 * A simple in-memory implementation of RateLimitStore for testing
 * and development purposes. Not suitable for production use with
 * multiple instances.
 */

import type { RateLimitStore, RateLimitResult } from './types'

interface RateLimitEntry {
  count: number
  resetAt: Date
}

/**
 * Create an in-memory rate limit store
 *
 * @param getResetTime - Function to calculate the next reset time (defaults to next UTC midnight)
 * @returns A RateLimitStore implementation
 *
 * @example
 * ```typescript
 * import { createRateLimiter, createInMemoryStore } from '@repo/rate-limit'
 *
 * const store = createInMemoryStore()
 * const rateLimiter = createRateLimiter(store)
 * ```
 */
export const createInMemoryStore = (
  getResetTime: () => Date = getNextUTCMidnight,
): RateLimitStore => {
  const entries = new Map<string, RateLimitEntry>()

  const getSecondsUntilReset = (resetAt: Date): number => {
    const now = new Date()
    return Math.max(0, Math.ceil((resetAt.getTime() - now.getTime()) / 1000))
  }

  const isExpired = (entry: RateLimitEntry): boolean => {
    return new Date() >= entry.resetAt
  }

  return {
    checkAndIncrement: async (key: string, limit: number): Promise<RateLimitResult> => {
      let entry = entries.get(key)

      // Reset if expired
      if (entry && isExpired(entry)) {
        entries.delete(key)
        entry = undefined
      }

      const resetAt = entry?.resetAt ?? getResetTime()

      if (!entry) {
        // First request
        entry = { count: 1, resetAt }
        entries.set(key, entry)

        return {
          allowed: true,
          remaining: limit - 1,
          currentCount: 1,
          resetAt,
          nextAllowedAt: resetAt,
          retryAfterSeconds: 0,
        }
      }

      if (entry.count >= limit) {
        // Limit exceeded
        return {
          allowed: false,
          remaining: 0,
          currentCount: entry.count,
          resetAt: entry.resetAt,
          nextAllowedAt: entry.resetAt,
          retryAfterSeconds: getSecondsUntilReset(entry.resetAt),
        }
      }

      // Increment
      entry.count += 1
      const remaining = Math.max(0, limit - entry.count)

      return {
        allowed: true,
        remaining,
        currentCount: entry.count,
        resetAt: entry.resetAt,
        nextAllowedAt: entry.resetAt,
        retryAfterSeconds: 0,
      }
    },

    reset: async (key: string): Promise<void> => {
      entries.delete(key)
    },

    getCount: async (key: string): Promise<number> => {
      const entry = entries.get(key)
      if (!entry || isExpired(entry)) {
        return 0
      }
      return entry.count
    },
  }
}

/**
 * Get the start of the next UTC day (midnight)
 */
const getNextUTCMidnight = (): Date => {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
}

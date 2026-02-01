import { logger } from '@repo/logger'
import type { RedisClient } from '../../../core/cache/index.js'
import type { FeatureFlagCache, CachedFeatureFlags } from '../ports/index.js'
import type { FeatureFlag } from '../types.js'

/**
 * Redis Cache Adapter for Feature Flags (WISH-2019)
 *
 * Implements FeatureFlagCache interface using Redis for distributed caching.
 *
 * Features:
 * - Cache key pattern: feature_flags:{environment} (AC 15)
 * - Graceful error handling - returns null on errors (AC 3)
 * - Non-blocking writes - failures don't throw (AC 3)
 * - TTL-based expiration (AC 7)
 */

// ─────────────────────────────────────────────────────────────────────────
// Cache Key Helpers (AC 15)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Generate cache key for environment flags
 * Pattern: feature_flags:{environment}
 */
function envCacheKey(environment: string): string {
  return `feature_flags:${environment}`
}

// ─────────────────────────────────────────────────────────────────────────
// Serialization Helpers
// ─────────────────────────────────────────────────────────────────────────

interface SerializedCacheData {
  flags: Record<string, FeatureFlag>
  expiresAt: number
}

function serializeFlags(flags: FeatureFlag[], expiresAt: number): string {
  const flagsRecord: Record<string, FeatureFlag> = {}
  for (const flag of flags) {
    flagsRecord[flag.flagKey] = flag
  }
  return JSON.stringify({ flags: flagsRecord, expiresAt })
}

function deserializeFlags(data: string): CachedFeatureFlags | null {
  try {
    const parsed = JSON.parse(data) as SerializedCacheData

    // Reconstruct dates from JSON
    const flagsMap = new Map<string, FeatureFlag>()
    for (const [key, flag] of Object.entries(parsed.flags)) {
      flagsMap.set(key, {
        ...flag,
        createdAt: new Date(flag.createdAt),
        updatedAt: new Date(flag.updatedAt),
      })
    }

    return {
      flags: flagsMap,
      expiresAt: parsed.expiresAt,
    }
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Redis Cache Adapter Factory
// ─────────────────────────────────────────────────────────────────────────

/**
 * Create Redis cache adapter for feature flags
 *
 * @param redis - Redis client instance, or null to disable caching
 * @returns FeatureFlagCache implementation
 */
export function createRedisCacheAdapter(redis: RedisClient | null): FeatureFlagCache {
  return {
    /**
     * Get all cached flags for an environment (AC 2)
     * Returns null on cache miss or error (AC 3)
     */
    async get(environment: string): Promise<CachedFeatureFlags | null> {
      if (!redis) {
        return null
      }

      try {
        const key = envCacheKey(environment)
        const data = await redis.get(key)

        if (!data) {
          logger.debug('Redis cache miss', { environment, key })
          return null
        }

        const result = deserializeFlags(data)
        if (result) {
          logger.debug('Redis cache hit', { environment, key, flagCount: result.flags.size })
        }
        return result
      } catch (error) {
        // AC 3: Graceful error handling - return null to trigger DB fallback
        logger.error('Redis GET failed', {
          environment,
          error: (error as Error).message,
        })
        return null
      }
    },

    /**
     * Set all flags for an environment with TTL (AC 2, AC 7)
     * Fails silently on error (AC 3)
     */
    async set(environment: string, flags: FeatureFlag[], ttlMs: number): Promise<void> {
      if (!redis) {
        return
      }

      try {
        const key = envCacheKey(environment)
        const expiresAt = Date.now() + ttlMs
        const data = serializeFlags(flags, expiresAt)

        // AC 7: TTL in seconds (convert from ms)
        const ttlSeconds = Math.ceil(ttlMs / 1000)
        await redis.setex(key, ttlSeconds, data)

        logger.debug('Redis cache set', {
          environment,
          key,
          flagCount: flags.length,
          ttlSeconds,
        })
      } catch (error) {
        // AC 3: Non-blocking write failure
        logger.error('Redis SET failed', {
          environment,
          error: (error as Error).message,
        })
      }
    },

    /**
     * Get a single cached flag (AC 2)
     * Returns null on cache miss or error (AC 3)
     */
    async getFlag(environment: string, flagKey: string): Promise<FeatureFlag | null> {
      if (!redis) {
        return null
      }

      try {
        const cached = await this.get(environment)
        if (!cached) {
          return null
        }

        const flag = cached.flags.get(flagKey)
        if (flag) {
          logger.debug('Redis flag hit', { environment, flagKey })
        }
        return flag ?? null
      } catch (error) {
        logger.error('Redis getFlag failed', {
          environment,
          flagKey,
          error: (error as Error).message,
        })
        return null
      }
    },

    /**
     * Invalidate cache for an environment (AC 8)
     * Fails silently on error (AC 3)
     */
    async invalidate(environment: string): Promise<void> {
      if (!redis) {
        return
      }

      try {
        const key = envCacheKey(environment)
        await redis.del(key)
        logger.info('Redis cache invalidated', { environment, key })
      } catch (error) {
        // AC 3: Non-blocking - stale cache will expire via TTL
        logger.error('Redis invalidate failed', {
          environment,
          error: (error as Error).message,
        })
      }
    },

    /**
     * Invalidate all feature flag caches (AC 8)
     * Uses SCAN to find and delete all feature_flags:* keys
     * Fails silently on error (AC 3)
     */
    async invalidateAll(): Promise<void> {
      if (!redis) {
        return
      }

      try {
        // Use SCAN to find all feature_flags:* keys (memory-safe iteration)
        const keys: string[] = []
        let cursor = '0'

        do {
          const [nextCursor, foundKeys] = await redis.scan(
            cursor,
            'MATCH',
            'feature_flags:*',
            'COUNT',
            100,
          )
          cursor = nextCursor
          keys.push(...foundKeys)
        } while (cursor !== '0')

        if (keys.length > 0) {
          await redis.del(...keys)
          logger.info('Redis all caches invalidated', { keyCount: keys.length })
        } else {
          logger.debug('Redis invalidateAll: no keys found')
        }
      } catch (error) {
        logger.error('Redis invalidateAll failed', {
          error: (error as Error).message,
        })
      }
    },
  }
}

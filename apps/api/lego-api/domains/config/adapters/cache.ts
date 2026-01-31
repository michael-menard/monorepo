import type { FeatureFlagCache, CachedFeatureFlags } from '../ports/index.js'
import type { FeatureFlag } from '../types.js'

/**
 * In-Memory Feature Flag Cache (WISH-2009 - AC17)
 *
 * Simple Map-based cache with TTL.
 * MVP implementation - can be replaced with Redis adapter later.
 */

/**
 * Create an in-memory feature flag cache
 */
export function createInMemoryCache(): FeatureFlagCache {
  // Cache structure: environment -> { flags: Map<flagKey, FeatureFlag>, expiresAt: number }
  const cache = new Map<string, CachedFeatureFlags>()

  return {
    /**
     * Get all cached flags for an environment
     * Returns null if cache miss or expired
     */
    get(environment: string): CachedFeatureFlags | null {
      const cached = cache.get(environment)

      // Cache miss
      if (!cached) {
        return null
      }

      // Check expiration
      if (Date.now() > cached.expiresAt) {
        // Expired - remove and return null
        cache.delete(environment)
        return null
      }

      return cached
    },

    /**
     * Set all flags for an environment with TTL
     */
    set(environment: string, flags: FeatureFlag[], ttlMs: number): void {
      const flagsMap = new Map<string, FeatureFlag>()

      for (const flag of flags) {
        flagsMap.set(flag.flagKey, flag)
      }

      cache.set(environment, {
        flags: flagsMap,
        expiresAt: Date.now() + ttlMs,
      })
    },

    /**
     * Get a single cached flag
     * Returns null if cache miss or expired
     */
    getFlag(environment: string, flagKey: string): FeatureFlag | null {
      const cached = this.get(environment)

      if (!cached) {
        return null
      }

      return cached.flags.get(flagKey) ?? null
    },

    /**
     * Invalidate cache for an environment
     */
    invalidate(environment: string): void {
      cache.delete(environment)
    },

    /**
     * Invalidate all caches
     */
    invalidateAll(): void {
      cache.clear()
    },
  }
}

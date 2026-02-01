import type { FeatureFlagCache, CachedFeatureFlags } from '../ports/index.js'
import type { FeatureFlag, UserOverride } from '../types.js'

/**
 * In-Memory Feature Flag Cache (WISH-2009 - AC17)
 *
 * Simple Map-based cache with TTL.
 * MVP implementation - can be replaced with Redis adapter later.
 */

/**
 * Cached user override with expiration
 */
interface CachedUserOverride {
  override: UserOverride | null
  expiresAt: number
}

/**
 * Create an in-memory feature flag cache
 */
export function createInMemoryCache(): FeatureFlagCache {
  // Cache structure: environment -> { flags: Map<flagKey, FeatureFlag>, expiresAt: number }
  const cache = new Map<string, CachedFeatureFlags>()

  // User override cache: flagId:userId -> { override, expiresAt } (WISH-2039)
  const userOverrideCache = new Map<string, CachedUserOverride>()

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
      // Directly access local cache to avoid typing issues with interface's Promise union
      const cached = cache.get(environment)

      if (!cached) {
        return null
      }

      // Check expiration
      if (Date.now() > cached.expiresAt) {
        cache.delete(environment)
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
      userOverrideCache.clear()
    },

    // ─────────────────────────────────────────────────────────────────────────
    // User Override Cache Methods (WISH-2039)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get user override from cache
     * Returns null if cache miss or expired, or if override doesn't exist
     */
    getUserOverride(flagId: string, userId: string): UserOverride | null {
      const key = `${flagId}:${userId}`
      const cached = userOverrideCache.get(key)

      if (!cached) {
        return null
      }

      if (Date.now() > cached.expiresAt) {
        userOverrideCache.delete(key)
        return null
      }

      return cached.override
    },

    /**
     * Set user override in cache
     */
    setUserOverride(flagId: string, userId: string, override: UserOverride, ttlMs: number): void {
      const key = `${flagId}:${userId}`
      userOverrideCache.set(key, {
        override,
        expiresAt: Date.now() + ttlMs,
      })
    },

    /**
     * Invalidate user override cache entry
     */
    invalidateUserOverride(flagId: string, userId: string): void {
      const key = `${flagId}:${userId}`
      userOverrideCache.delete(key)
    },

    /**
     * Invalidate all user overrides for a flag
     */
    invalidateUserOverridesForFlag(flagId: string): void {
      // Iterate and delete all keys starting with flagId:
      for (const key of userOverrideCache.keys()) {
        if (key.startsWith(`${flagId}:`)) {
          userOverrideCache.delete(key)
        }
      }
    },
  }
}

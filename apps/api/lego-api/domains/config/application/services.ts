import { createHash } from 'crypto'
import { ok, err, type Result } from '@repo/api-core'
import type { FeatureFlagRepository, FeatureFlagCache } from '../ports/index.js'
import type {
  FeatureFlag,
  UpdateFeatureFlagInput,
  FeatureFlagsResponse,
  FeatureFlagDetailResponse,
  FeatureFlagError,
} from '../types.js'

/**
 * Feature Flag Service (WISH-2009)
 *
 * Business logic for feature flag evaluation.
 * Uses SHA-256 for deterministic user ID hashing (AC23).
 */

// Default cache TTL: 5 minutes (AC17)
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000

/**
 * Feature Flag Service Dependencies
 */
export interface FeatureFlagServiceDeps {
  flagRepo: FeatureFlagRepository
  cache: FeatureFlagCache
  cacheTtlMs?: number
}

/**
 * Create the Feature Flag Service
 */
export function createFeatureFlagService(deps: FeatureFlagServiceDeps) {
  const { flagRepo, cache, cacheTtlMs = DEFAULT_CACHE_TTL_MS } = deps

  /**
   * Hash user ID to a number between 0-99 using SHA-256 (AC23)
   * Ensures deterministic rollout - same userId always gets same result
   */
  function hashUserIdToPercentage(userId: string): number {
    const hash = createHash('sha256').update(userId).digest('hex')
    // Take first 8 characters of hex and convert to number, then mod 100
    const hashInt = parseInt(hash.substring(0, 8), 16)
    return hashInt % 100
  }

  /**
   * Load all flags from cache or database
   */
  async function loadFlags(environment: string): Promise<Map<string, FeatureFlag>> {
    // Check cache first
    const cached = cache.get(environment)
    if (cached) {
      return cached.flags
    }

    // Cache miss - load from database
    const flags = await flagRepo.findAllByEnvironment(environment)

    // Populate cache
    cache.set(environment, flags, cacheTtlMs)

    // Return as map
    const flagsMap = new Map<string, FeatureFlag>()
    for (const flag of flags) {
      flagsMap.set(flag.flagKey, flag)
    }

    return flagsMap
  }

  return {
    // ─────────────────────────────────────────────────────────────────────
    // Flag Evaluation (AC2, AC3)
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Evaluate a single feature flag
     *
     * - If enabled = false: Return false
     * - If enabled = true and rolloutPercentage = 100: Return true
     * - If enabled = true and rolloutPercentage < 100: Hash userId to determine inclusion
     * - If no userId provided: Return true (logged-in check only)
     */
    async evaluateFlag(
      flagKey: string,
      userId?: string,
      environment: string = 'production',
    ): Promise<boolean> {
      const flags = await loadFlags(environment)
      const flag = flags.get(flagKey)

      // Flag not found - default to false (safe default)
      if (!flag) {
        return false
      }

      // Flag disabled - return false
      if (!flag.enabled) {
        return false
      }

      // Flag enabled with 100% rollout - return true
      if (flag.rolloutPercentage >= 100) {
        return true
      }

      // Flag enabled with 0% rollout - return false
      if (flag.rolloutPercentage <= 0) {
        return false
      }

      // No userId provided - return true (flag is enabled, user is logged in)
      if (!userId) {
        return true
      }

      // Percentage-based rollout
      const userPercentage = hashUserIdToPercentage(userId)
      return userPercentage < flag.rolloutPercentage
    },

    /**
     * Evaluate all flags for a user (optimized batch evaluation)
     */
    async evaluateAllFlags(
      userId?: string,
      environment: string = 'production',
    ): Promise<FeatureFlagsResponse> {
      const flags = await loadFlags(environment)
      const result: FeatureFlagsResponse = {}

      for (const [flagKey, flag] of flags) {
        // Same logic as evaluateFlag but inlined for efficiency
        if (!flag.enabled) {
          result[flagKey] = false
          continue
        }

        if (flag.rolloutPercentage >= 100) {
          result[flagKey] = true
          continue
        }

        if (flag.rolloutPercentage <= 0) {
          result[flagKey] = false
          continue
        }

        if (!userId) {
          result[flagKey] = true
          continue
        }

        const userPercentage = hashUserIdToPercentage(userId)
        result[flagKey] = userPercentage < flag.rolloutPercentage
      }

      return result
    },

    // ─────────────────────────────────────────────────────────────────────
    // Flag Retrieval (AC4, AC5)
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Get all flags as key-value pairs
     */
    async getAllFlags(
      userId?: string,
      environment: string = 'production',
    ): Promise<FeatureFlagsResponse> {
      return this.evaluateAllFlags(userId, environment)
    },

    /**
     * Get a single flag with metadata
     */
    async getFlag(
      flagKey: string,
      environment: string = 'production',
    ): Promise<Result<FeatureFlagDetailResponse, FeatureFlagError>> {
      const result = await flagRepo.findByKey(flagKey, environment)

      if (!result.ok) {
        return err('NOT_FOUND')
      }

      const flag = result.data

      return ok({
        key: flag.flagKey,
        enabled: flag.enabled,
        rolloutPercentage: flag.rolloutPercentage,
        description: flag.description,
      })
    },

    // ─────────────────────────────────────────────────────────────────────
    // Flag Management (AC6)
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Update a feature flag (admin only)
     * Invalidates cache after update
     */
    async updateFlag(
      flagKey: string,
      input: UpdateFeatureFlagInput,
      environment: string = 'production',
    ): Promise<Result<FeatureFlagDetailResponse, FeatureFlagError>> {
      const result = await flagRepo.update(flagKey, input, environment)

      if (!result.ok) {
        return result
      }

      // Invalidate cache (AC7 - cache invalidation on update)
      cache.invalidate(environment)

      const flag = result.data

      return ok({
        key: flag.flagKey,
        enabled: flag.enabled,
        rolloutPercentage: flag.rolloutPercentage,
        description: flag.description,
      })
    },

    // ─────────────────────────────────────────────────────────────────────
    // Cache Management
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Invalidate cache for an environment
     */
    invalidateCache(environment: string = 'production'): void {
      cache.invalidate(environment)
    },

    /**
     * Invalidate all caches
     */
    invalidateAllCaches(): void {
      cache.invalidateAll()
    },

    // ─────────────────────────────────────────────────────────────────────
    // Utility (exposed for testing)
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Hash user ID to percentage (exposed for testing)
     */
    _hashUserIdToPercentage: hashUserIdToPercentage,
  }
}

// Export the service type for use in routes
export type FeatureFlagService = ReturnType<typeof createFeatureFlagService>

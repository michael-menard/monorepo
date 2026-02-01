import { createHash } from 'crypto'
import { ok, err, type Result } from '@repo/api-core'
import type {
  FeatureFlagRepository,
  FeatureFlagCache,
  UserOverrideRepository,
} from '../ports/index.js'
import type {
  FeatureFlag,
  UpdateFeatureFlagInput,
  FeatureFlagsResponse,
  FeatureFlagDetailResponse,
  FeatureFlagError,
  UserOverride,
  UserOverrideResponse,
  UserOverridesListResponse,
  OverrideType,
} from '../types.js'

/**
 * Feature Flag Service (WISH-2009, updated WISH-2019, WISH-2039)
 *
 * Business logic for feature flag evaluation.
 * Uses SHA-256 for deterministic user ID hashing (AC23).
 *
 * WISH-2019: Updated to support async cache operations (Redis).
 * Cache methods now return Promise | sync values for flexibility.
 *
 * WISH-2039: Added user-level targeting with include/exclude lists.
 * Evaluation priority: exclusion > inclusion > percentage
 */

// Default cache TTL: 5 minutes (AC17)
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000

// Rate limiting: Max 100 user override changes per flag per hour (WISH-2039 AC7)
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT_MAX_CHANGES = 100

/**
 * Feature Flag Service Dependencies
 */
export interface FeatureFlagServiceDeps {
  flagRepo: FeatureFlagRepository
  cache: FeatureFlagCache
  userOverrideRepo?: UserOverrideRepository
  cacheTtlMs?: number
}

/**
 * Create the Feature Flag Service
 */
export function createFeatureFlagService(deps: FeatureFlagServiceDeps) {
  const { flagRepo, cache, userOverrideRepo, cacheTtlMs = DEFAULT_CACHE_TTL_MS } = deps

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
   * Load all flags from cache or database (AC 4 - Database Fallback)
   *
   * WISH-2019: Now awaits cache operations for Redis support.
   * Falls back to database if cache miss or cache unavailable.
   */
  async function loadFlags(environment: string): Promise<Map<string, FeatureFlag>> {
    // Check cache first (now async for Redis support)
    const cached = await cache.get(environment)
    if (cached) {
      return cached.flags
    }

    // Cache miss or unavailable - load from database (AC 4)
    const flags = await flagRepo.findAllByEnvironment(environment)

    // Populate cache (non-blocking for Redis, fire-and-forget pattern)
    // Using void to indicate intentional fire-and-forget
    void Promise.resolve(cache.set(environment, flags, cacheTtlMs))

    // Return as map
    const flagsMap = new Map<string, FeatureFlag>()
    for (const flag of flags) {
      flagsMap.set(flag.flagKey, flag)
    }

    return flagsMap
  }

  // Rate limiter state: flagId -> { count, windowStart } (WISH-2039)
  const rateLimitState = new Map<string, { count: number; windowStart: number }>()

  /**
   * Check rate limit for user override modifications (WISH-2039 AC7)
   * Returns true if request is allowed, false if rate limited
   */
  function checkRateLimit(flagId: string): boolean {
    const now = Date.now()
    const state = rateLimitState.get(flagId)

    if (!state || now - state.windowStart > RATE_LIMIT_WINDOW_MS) {
      // New window or expired window
      rateLimitState.set(flagId, { count: 1, windowStart: now })
      return true
    }

    if (state.count >= RATE_LIMIT_MAX_CHANGES) {
      return false
    }

    state.count++
    return true
  }

  /**
   * Get user override with caching (WISH-2039)
   */
  async function getUserOverride(flagId: string, userId: string): Promise<UserOverride | null> {
    if (!userOverrideRepo) return null

    // Check cache first
    if (cache.getUserOverride) {
      const cached = await cache.getUserOverride(flagId, userId)
      // Cache returns null for both "not cached" and "cached as no override"
      // We need a way to distinguish - for now, always query DB if null
      if (cached !== null) {
        return cached
      }
    }

    // Query database
    const override = await userOverrideRepo.findByFlagAndUser(flagId, userId)

    // Cache the result if override exists
    // Note: We only cache positive results to avoid caching "no override" state
    if (cache.setUserOverride && override) {
      void Promise.resolve(cache.setUserOverride(flagId, userId, override, cacheTtlMs))
    }

    return override
  }

  return {
    // ─────────────────────────────────────────────────────────────────────
    // Flag Evaluation (AC2, AC3, WISH-2039)
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Evaluate a single feature flag
     *
     * WISH-2039 Evaluation Priority:
     * 1. Explicit exclusion: User in exclude list -> return false
     * 2. Explicit inclusion: User in include list -> return true
     * 3. Percentage-based: Fall back to existing percentage rollout logic
     *
     * Original WISH-2009 logic:
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

      // WISH-2039: Check user overrides if userId provided and userOverrideRepo is configured
      if (userId && userOverrideRepo) {
        const override = await getUserOverride(flag.id, userId)
        if (override) {
          // Exclusion takes priority - return false
          if (override.overrideType === 'exclude') {
            return false
          }
          // Inclusion - return true
          if (override.overrideType === 'include') {
            return true
          }
        }
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

      // Invalidate cache (AC7/AC8 - cache invalidation on update)
      // WISH-2019: Await for Redis, sync for InMemory
      await cache.invalidate(environment)

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
     * WISH-2019: Now async for Redis support
     */
    async invalidateCache(environment: string = 'production'): Promise<void> {
      await cache.invalidate(environment)
    },

    /**
     * Invalidate all caches
     * WISH-2019: Now async for Redis support
     */
    async invalidateAllCaches(): Promise<void> {
      await cache.invalidateAll()
    },

    // ─────────────────────────────────────────────────────────────────────
    // User Override Management (WISH-2039)
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Add or update a user override (admin only)
     * Implements AC3: POST /api/admin/flags/:flagKey/users
     */
    async addUserOverride(
      flagKey: string,
      input: {
        userId: string
        overrideType: OverrideType
        reason?: string
        createdBy?: string
      },
      environment: string = 'production',
    ): Promise<Result<UserOverrideResponse, FeatureFlagError>> {
      if (!userOverrideRepo) {
        return err('DB_ERROR')
      }

      // Find the flag first
      const flagResult = await flagRepo.findByKey(flagKey, environment)
      if (!flagResult.ok) {
        return err('NOT_FOUND')
      }
      const flag = flagResult.data

      // Check rate limit (AC7)
      if (!checkRateLimit(flag.id)) {
        return err('RATE_LIMITED')
      }

      // Upsert the override
      const result = await userOverrideRepo.upsert(flag.id, input)
      if (!result.ok) {
        return err('DB_ERROR')
      }

      // Invalidate cache for this user/flag
      if (cache.invalidateUserOverride) {
        await cache.invalidateUserOverride(flag.id, input.userId)
      }

      const override = result.data
      return ok({
        userId: override.userId,
        overrideType: override.overrideType,
        reason: override.reason,
        createdBy: override.createdBy,
        createdAt: override.createdAt,
      })
    },

    /**
     * Remove a user override (admin only)
     * Implements AC4: DELETE /api/admin/flags/:flagKey/users/:userId
     */
    async removeUserOverride(
      flagKey: string,
      userId: string,
      environment: string = 'production',
    ): Promise<Result<void, FeatureFlagError>> {
      if (!userOverrideRepo) {
        return err('DB_ERROR')
      }

      // Find the flag first
      const flagResult = await flagRepo.findByKey(flagKey, environment)
      if (!flagResult.ok) {
        return err('NOT_FOUND')
      }
      const flag = flagResult.data

      // Check rate limit (AC7)
      if (!checkRateLimit(flag.id)) {
        return err('RATE_LIMITED')
      }

      // Delete the override
      const result = await userOverrideRepo.delete(flag.id, userId)
      if (!result.ok) {
        return err('NOT_FOUND')
      }

      // Invalidate cache for this user/flag
      if (cache.invalidateUserOverride) {
        await cache.invalidateUserOverride(flag.id, userId)
      }

      return ok(undefined)
    },

    /**
     * List all user overrides for a flag (admin only)
     * Implements AC5: GET /api/admin/flags/:flagKey/users
     */
    async listUserOverrides(
      flagKey: string,
      pagination: { page?: number; pageSize?: number } = {},
      environment: string = 'production',
    ): Promise<Result<UserOverridesListResponse, FeatureFlagError>> {
      if (!userOverrideRepo) {
        return err('DB_ERROR')
      }

      // Find the flag first
      const flagResult = await flagRepo.findByKey(flagKey, environment)
      if (!flagResult.ok) {
        return err('NOT_FOUND')
      }
      const flag = flagResult.data

      const page = pagination.page ?? 1
      const pageSize = Math.min(pagination.pageSize ?? 50, 500) // Default 50, max 500

      // Get paginated overrides
      const { overrides, total } = await userOverrideRepo.findAllByFlag(flag.id, { page, pageSize })

      // Split into includes and excludes
      const includes: UserOverrideResponse[] = []
      const excludes: UserOverrideResponse[] = []

      for (const override of overrides) {
        const response: UserOverrideResponse = {
          userId: override.userId,
          overrideType: override.overrideType,
          reason: override.reason,
          createdBy: override.createdBy,
          createdAt: override.createdAt,
        }

        if (override.overrideType === 'include') {
          includes.push(response)
        } else {
          excludes.push(response)
        }
      }

      return ok({
        includes,
        excludes,
        pagination: {
          page,
          pageSize,
          total,
        },
      })
    },

    // ─────────────────────────────────────────────────────────────────────
    // Utility (exposed for testing)
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Hash user ID to percentage (exposed for testing)
     */
    _hashUserIdToPercentage: hashUserIdToPercentage,

    /**
     * Check rate limit for testing (WISH-2039)
     */
    _checkRateLimit: checkRateLimit,
  }
}

// Export the service type for use in routes
export type FeatureFlagService = ReturnType<typeof createFeatureFlagService>

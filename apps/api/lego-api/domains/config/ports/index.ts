import type { Result } from '@repo/api-core'
import type { FeatureFlag, CreateFeatureFlagInput, UpdateFeatureFlagInput } from '../types.js'

/**
 * Feature Flag Domain Ports (WISH-2009)
 *
 * These interfaces define what the domain needs from infrastructure.
 * Implementations (adapters) are in repositories.ts and cache.ts.
 */

// ─────────────────────────────────────────────────────────────────────────
// Feature Flag Repository Port
// ─────────────────────────────────────────────────────────────────────────

export interface FeatureFlagRepository {
  /**
   * Find feature flag by key and environment
   */
  findByKey(flagKey: string, environment?: string): Promise<Result<FeatureFlag, 'NOT_FOUND'>>

  /**
   * Find all feature flags for an environment
   */
  findAllByEnvironment(environment?: string): Promise<FeatureFlag[]>

  /**
   * Create a new feature flag
   */
  create(input: CreateFeatureFlagInput): Promise<Result<FeatureFlag, 'ALREADY_EXISTS' | 'DB_ERROR'>>

  /**
   * Update an existing feature flag
   */
  update(
    flagKey: string,
    input: UpdateFeatureFlagInput,
    environment?: string,
  ): Promise<Result<FeatureFlag, 'NOT_FOUND' | 'DB_ERROR'>>

  /**
   * Delete a feature flag
   */
  delete(flagKey: string, environment?: string): Promise<Result<void, 'NOT_FOUND'>>
}

// ─────────────────────────────────────────────────────────────────────────
// Feature Flag Cache Port
// ─────────────────────────────────────────────────────────────────────────

/**
 * Cached feature flag data
 */
export interface CachedFeatureFlags {
  flags: Map<string, FeatureFlag>
  expiresAt: number
}

export interface FeatureFlagCache {
  /**
   * Get all cached flags for an environment
   * Returns null if cache miss or expired
   */
  get(environment: string): CachedFeatureFlags | null

  /**
   * Set all flags for an environment with TTL
   */
  set(environment: string, flags: FeatureFlag[], ttlMs: number): void

  /**
   * Get a single cached flag
   * Returns null if cache miss or expired
   */
  getFlag(environment: string, flagKey: string): FeatureFlag | null

  /**
   * Invalidate cache for an environment
   */
  invalidate(environment: string): void

  /**
   * Invalidate all caches
   */
  invalidateAll(): void
}

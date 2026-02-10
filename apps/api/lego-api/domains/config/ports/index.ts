import type { Result } from '@repo/api-core'
import type {
  FeatureFlag,
  CreateFeatureFlagInput,
  UpdateFeatureFlagInput,
  UserOverride,
  OverrideType,
  Schedule,
  ScheduleStatus,
  ScheduleUpdates,
  ScheduleError,
  CreateScheduleRequest,
  ScheduleResponse,
  ScheduleListResponse,
} from '../types.js'

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

/**
 * Feature Flag Cache Interface (WISH-2009, updated for WISH-2019)
 *
 * Methods return Promise | sync values to support both:
 * - InMemoryCache (sync, for local dev without Redis)
 * - RedisCacheAdapter (async, for production)
 */
export interface FeatureFlagCache {
  /**
   * Get all cached flags for an environment
   * Returns null if cache miss or expired
   */
  get(environment: string): Promise<CachedFeatureFlags | null> | CachedFeatureFlags | null

  /**
   * Set all flags for an environment with TTL
   */
  set(environment: string, flags: FeatureFlag[], ttlMs: number): Promise<void> | void

  /**
   * Get a single cached flag
   * Returns null if cache miss or expired
   */
  getFlag(environment: string, flagKey: string): Promise<FeatureFlag | null> | FeatureFlag | null

  /**
   * Invalidate cache for an environment
   */
  invalidate(environment: string): Promise<void> | void

  /**
   * Invalidate all caches
   */
  invalidateAll(): Promise<void> | void

  /**
   * Get user override from cache (WISH-2039)
   */
  getUserOverride?(
    flagId: string,
    userId: string,
  ): Promise<UserOverride | null> | UserOverride | null

  /**
   * Set user override in cache (WISH-2039)
   */
  setUserOverride?(
    flagId: string,
    userId: string,
    override: UserOverride,
    ttlMs: number,
  ): Promise<void> | void

  /**
   * Invalidate user override cache (WISH-2039)
   */
  invalidateUserOverride?(flagId: string, userId: string): Promise<void> | void

  /**
   * Invalidate all user overrides for a flag (WISH-2039)
   */
  invalidateUserOverridesForFlag?(flagId: string): Promise<void> | void
}

// ─────────────────────────────────────────────────────────────────────────
// User Override Repository Port (WISH-2039)
// ─────────────────────────────────────────────────────────────────────────

/**
 * User override pagination input
 */
export interface UserOverridePagination {
  page: number
  pageSize: number
}

/**
 * User override repository interface
 */
export interface UserOverrideRepository {
  /**
   * Find a specific user override
   */
  findByFlagAndUser(flagId: string, userId: string): Promise<UserOverride | null>

  /**
   * Find all overrides for a flag with pagination
   */
  findAllByFlag(
    flagId: string,
    pagination: UserOverridePagination,
  ): Promise<{
    overrides: UserOverride[]
    total: number
  }>

  /**
   * Create or update a user override (upsert)
   */
  upsert(
    flagId: string,
    input: {
      userId: string
      overrideType: OverrideType
      reason?: string
      createdBy?: string
    },
  ): Promise<Result<UserOverride, 'DB_ERROR'>>

  /**
   * Delete a user override
   */
  delete(flagId: string, userId: string): Promise<Result<void, 'NOT_FOUND'>>

  /**
   * Delete all overrides for a flag
   */
  deleteAllByFlag(flagId: string): Promise<void>
}

// ─────────────────────────────────────────────────────────────────────────
// Schedule Repository Port (WISH-2119, WISH-20260)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Schedule repository interface
 */
export interface ScheduleRepository {
  /**
   * Create a new schedule for a flag
   */
  create(input: {
    flagId: string
    scheduledAt: Date
    updates: ScheduleUpdates
    createdBy?: string // WISH-20280
  }): Promise<Result<Schedule, ScheduleError>>

  /**
   * Find all schedules for a flag
   */
  findAllByFlag(flagId: string): Promise<Schedule[]>

  /**
   * Find schedule by ID
   */
  findById(scheduleId: string): Promise<Result<Schedule, 'NOT_FOUND'>>

  /**
   * Find pending schedules ready to process with row-level locking
   */
  findPendingWithLock(limit?: number): Promise<Schedule[]>

  /**
   * Update schedule status after processing
   */
  updateStatus(
    scheduleId: string,
    status: ScheduleStatus,
    options?: {
      appliedAt?: Date
      errorMessage?: string
    },
  ): Promise<Result<void, 'NOT_FOUND'>>

  /**
   * Update retry metadata for failed schedules (WISH-20260)
   */
  updateRetryMetadata(
    scheduleId: string,
    retryCount: number,
    nextRetryAt: Date | null,
    lastError: string,
  ): Promise<Result<void, ScheduleError>>

  /**
   * Cancel a schedule
   */
  cancel(scheduleId: string, cancelledBy?: string): Promise<Result<Schedule, ScheduleError>>
}

// ─────────────────────────────────────────────────────────────────────────
// Schedule Service Port (WISH-2119)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Schedule service interface
 */
export interface ScheduleService {
  /**
   * Create a new schedule for a flag
   */
  createSchedule(
    flagKey: string,
    input: CreateScheduleRequest,
  ): Promise<Result<ScheduleResponse, ScheduleError>>

  /**
   * List all schedules for a flag
   */
  listSchedules(flagKey: string): Promise<Result<ScheduleListResponse, ScheduleError>>

  /**
   * Cancel a schedule
   */
  cancelSchedule(
    flagKey: string,
    scheduleId: string,
  ): Promise<Result<ScheduleResponse, ScheduleError>>
}

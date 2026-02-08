import type { Result } from '@repo/api-core'
import type { UserQuotaRow, UserAddonRow, QuotaType, Tier, ActiveAddon } from '../types.js'

/**
 * Authorization Domain Ports
 *
 * These interfaces define what the domain needs from infrastructure.
 * Implementations (adapters) are in repositories.ts.
 */

// ─────────────────────────────────────────────────────────────────────────
// User Quota Repository Port
// ─────────────────────────────────────────────────────────────────────────

export interface UserQuotaRepository {
  /**
   * Find user quota by user ID
   */
  findByUserId(userId: string): Promise<Result<UserQuotaRow, 'NOT_FOUND'>>

  /**
   * Create a new user quota record with default tier limits
   * Called on first auth request if user doesn't exist (lazy initialization)
   */
  create(userId: string, tier: Tier): Promise<UserQuotaRow>

  /**
   * Find or create user quota (lazy initialization pattern)
   * Returns existing record or creates new one with free-tier defaults
   */
  findOrCreate(userId: string): Promise<UserQuotaRow>

  /**
   * Reserve a quota unit atomically
   * Uses UPDATE...WHERE current < limit pattern for race-condition safety
   *
   * @returns true if quota was reserved, false if quota exceeded
   */
  reserveQuota(userId: string, quotaType: QuotaType): Promise<boolean>

  /**
   * Release a quota unit (called when resource is deleted)
   */
  releaseQuota(userId: string, quotaType: QuotaType): Promise<void>

  /**
   * Update storage usage in MB
   */
  updateStorageUsage(userId: string, deltaMb: number): Promise<Result<void, 'QUOTA_EXCEEDED'>>

  /**
   * Update user tier (e.g., after payment)
   * Also updates limits based on new tier defaults
   */
  updateTier(userId: string, tier: Tier): Promise<Result<UserQuotaRow, 'NOT_FOUND'>>

  /**
   * Set adult verification status
   */
  setAdultStatus(userId: string, isAdult: boolean): Promise<Result<void, 'NOT_FOUND'>>

  /**
   * Suspend user account
   */
  suspend(userId: string, reason: string): Promise<Result<void, 'NOT_FOUND'>>

  /**
   * Unsuspend user account
   */
  unsuspend(userId: string): Promise<Result<void, 'NOT_FOUND'>>
}

// ─────────────────────────────────────────────────────────────────────────
// User Addon Repository Port
// ─────────────────────────────────────────────────────────────────────────

export interface UserAddonRepository {
  /**
   * Find all active (non-expired) addons for a user
   */
  findActiveByUserId(userId: string): Promise<ActiveAddon[]>

  /**
   * Find all addons for a user (including expired)
   */
  findAllByUserId(userId: string): Promise<UserAddonRow[]>

  /**
   * Add an addon for a user
   */
  addAddon(
    userId: string,
    addonType: string,
    quantity: number,
    expiresAt?: Date,
    paymentReference?: string,
  ): Promise<UserAddonRow>

  /**
   * Remove an addon for a user
   */
  removeAddon(userId: string, addonType: string): Promise<Result<void, 'NOT_FOUND'>>

  /**
   * Clean up expired addons (maintenance job)
   */
  cleanupExpired(): Promise<number>
}

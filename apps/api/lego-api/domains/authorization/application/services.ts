import type { Result } from '@repo/api-core'
import { ok, err } from '@repo/api-core'
import { logger } from '@repo/logger'
import type { UserQuotaRepository, UserAddonRepository } from '../ports/index.js'
import type {
  UserPermissions,
  Feature,
  QuotaType,
  Tier,
  AuthorizationError,
  QuotaInfo,
  UserQuotas,
} from '../types.js'
import { TIER_FEATURES, FEATURE_REQUIRED_TIER } from '../types.js'

/**
 * Authorization Service Dependencies
 *
 * Injected via function parameters - no global state.
 */
export interface AuthorizationServiceDeps {
  quotaRepo: UserQuotaRepository
  addonRepo: UserAddonRepository
}

/**
 * Create the Authorization Service
 *
 * Pure business logic for permission checking and quota management.
 * All I/O is done through injected ports.
 */
export function createAuthorizationService(deps: AuthorizationServiceDeps) {
  const { quotaRepo, addonRepo } = deps

  return {
    // ─────────────────────────────────────────────────────────────────────
    // Permission Lookup
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Get user permissions (lazy initialization)
     *
     * Creates user quota record if not exists (free-tier defaults).
     * This is the main entry point for permission checks.
     */
    async getUserPermissions(userId: string): Promise<UserPermissions> {
      try {
        // Get or create user quota
        const quotaRow = await quotaRepo.findOrCreate(userId)

        // Get active addons
        const addons = await addonRepo.findActiveByUserId(userId)

        // Build permissions object
        const tier = quotaRow.tier as Tier
        const features = TIER_FEATURES[tier] as Feature[]

        // Calculate quotas with addon bonuses
        const quotas = buildQuotas(quotaRow, addons)

        return {
          userId,
          tier,
          isAdmin: tier === 'admin',
          isAdult: quotaRow.isAdult,
          isSuspended: quotaRow.isSuspended,
          suspendedReason: quotaRow.suspendedReason,
          features: [...features], // Copy to make mutable
          quotas,
          addons,
          chatHistoryDays: quotaRow.chatHistoryDays,
        }
      } catch (error) {
        logger.error('Failed to get user permissions:', error)
        // Return minimal permissions on error (fail-safe)
        return getMinimalPermissions(userId)
      }
    },

    // ─────────────────────────────────────────────────────────────────────
    // Permission Checks
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Check if user has access to a feature
     */
    hasFeature(permissions: UserPermissions, feature: Feature): boolean {
      if (permissions.isAdmin) return true
      return permissions.features.includes(feature)
    },

    /**
     * Require a feature - throws AuthorizationError if not available
     */
    requireFeature(
      permissions: UserPermissions,
      feature: Feature,
    ): Result<void, AuthorizationError> {
      if (permissions.isSuspended) {
        return err('ACCOUNT_SUSPENDED')
      }

      if (this.hasFeature(permissions, feature)) {
        return ok(undefined)
      }

      return err('FEATURE_NOT_AVAILABLE')
    },

    /**
     * Require adult verification
     */
    requireAdult(permissions: UserPermissions): Result<void, AuthorizationError> {
      if (permissions.isSuspended) {
        return err('ACCOUNT_SUSPENDED')
      }

      if (permissions.isAdult) {
        return ok(undefined)
      }

      return err('ADULT_REQUIRED')
    },

    /**
     * Get the minimum required tier for a feature
     */
    getRequiredTier(feature: Feature): Tier {
      return FEATURE_REQUIRED_TIER[feature]
    },

    // ─────────────────────────────────────────────────────────────────────
    // Quota Management
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Check if user has quota available (without reserving)
     */
    hasQuotaAvailable(permissions: UserPermissions, quotaType: QuotaType): boolean {
      if (permissions.isAdmin) return true

      const quota = permissions.quotas[quotaType]
      return quota.remaining === null || quota.remaining > 0
    },

    /**
     * Reserve a quota unit atomically
     *
     * @returns true if quota was reserved, false if quota exceeded
     */
    async reserveQuota(userId: string, quotaType: QuotaType): Promise<boolean> {
      return quotaRepo.reserveQuota(userId, quotaType)
    },

    /**
     * Release a quota unit (called when resource is deleted)
     */
    async releaseQuota(userId: string, quotaType: QuotaType): Promise<void> {
      return quotaRepo.releaseQuota(userId, quotaType)
    },

    /**
     * Update storage usage
     */
    async updateStorageUsage(
      userId: string,
      deltaMb: number,
    ): Promise<Result<void, 'QUOTA_EXCEEDED'>> {
      return quotaRepo.updateStorageUsage(userId, deltaMb)
    },

    // ─────────────────────────────────────────────────────────────────────
    // Tier Management
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Update user tier (called after payment verification)
     */
    async updateTier(
      userId: string,
      tier: Tier,
    ): Promise<Result<UserPermissions, AuthorizationError>> {
      const result = await quotaRepo.updateTier(userId, tier)

      if (!result.ok) {
        return err('NOT_FOUND')
      }

      // Return updated permissions
      return ok(await this.getUserPermissions(userId))
    },

    // ─────────────────────────────────────────────────────────────────────
    // User Status Management
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Set adult verification status
     */
    async setAdultStatus(
      userId: string,
      isAdult: boolean,
    ): Promise<Result<void, AuthorizationError>> {
      const result = await quotaRepo.setAdultStatus(userId, isAdult)

      if (!result.ok) {
        return err('NOT_FOUND')
      }

      return ok(undefined)
    },

    /**
     * Suspend a user account (admin action)
     */
    async suspendUser(userId: string, reason: string): Promise<Result<void, AuthorizationError>> {
      const result = await quotaRepo.suspend(userId, reason)

      if (!result.ok) {
        return err('NOT_FOUND')
      }

      return ok(undefined)
    },

    /**
     * Unsuspend a user account (admin action)
     */
    async unsuspendUser(userId: string): Promise<Result<void, AuthorizationError>> {
      const result = await quotaRepo.unsuspend(userId)

      if (!result.ok) {
        return err('NOT_FOUND')
      }

      return ok(undefined)
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

/**
 * Build quota information from database row and addons
 */
function buildQuotas(
  row: {
    mocsCount: number
    wishlistsCount: number
    galleriesCount: number
    setlistsCount: number
    storageUsedMb: number
    mocsLimit: number | null
    wishlistsLimit: number | null
    galleriesLimit: number | null
    setlistsLimit: number | null
    storageLimitMb: number | null
  },
  addons: Array<{ type: string; quantity: number }>,
): UserQuotas {
  // Calculate addon bonuses
  const addonBonuses = {
    mocs: 0,
    galleries: 0,
    storage: 0,
  }

  for (const addon of addons) {
    if (addon.type === 'extra-mocs') {
      addonBonuses.mocs += addon.quantity
    } else if (addon.type === 'extra-galleries') {
      addonBonuses.galleries += addon.quantity
    } else if (addon.type === 'extra-storage') {
      addonBonuses.storage += addon.quantity * 100 // 100MB per unit
    }
  }

  return {
    mocs: buildQuotaInfo(row.mocsCount, row.mocsLimit, addonBonuses.mocs),
    wishlists: buildQuotaInfo(row.wishlistsCount, row.wishlistsLimit, 0),
    galleries: buildQuotaInfo(row.galleriesCount, row.galleriesLimit, addonBonuses.galleries),
    setlists: buildQuotaInfo(row.setlistsCount, row.setlistsLimit, 0),
    storage: buildQuotaInfo(row.storageUsedMb, row.storageLimitMb, addonBonuses.storage),
  }
}

/**
 * Build a single quota info object
 */
function buildQuotaInfo(current: number, limit: number | null, addonBonus: number): QuotaInfo {
  const effectiveLimit = limit === null ? null : limit + addonBonus

  return {
    current,
    limit: effectiveLimit,
    remaining: effectiveLimit === null ? null : Math.max(0, effectiveLimit - current),
  }
}

/**
 * Return minimal permissions for error cases (fail-safe)
 */
function getMinimalPermissions(userId: string): UserPermissions {
  return {
    userId,
    tier: 'free-tier',
    isAdmin: false,
    isAdult: false,
    isSuspended: false,
    suspendedReason: null,
    features: ['moc', 'wishlist', 'profile'],
    quotas: {
      mocs: { current: 0, limit: 5, remaining: 5 },
      wishlists: { current: 0, limit: 1, remaining: 1 },
      galleries: { current: 0, limit: 0, remaining: 0 },
      setlists: { current: 0, limit: 0, remaining: 0 },
      storage: { current: 0, limit: 50, remaining: 50 },
    },
    addons: [],
    chatHistoryDays: 7,
  }
}

// Export the service type for use in routes
export type AuthorizationService = ReturnType<typeof createAuthorizationService>

import { eq, and, or, sql, isNull, gt } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { Result } from '@repo/api-core'
import { ok, err } from '@repo/api-core'
import type * as schema from '@repo/database-schema'
import type { UserQuotaRepository, UserAddonRepository } from '../ports/index.js'
import type {
  UserQuotaRow,
  UserAddonRow,
  QuotaType,
  Tier,
  ActiveAddon,
  AddonType,
} from '../types.js'
import { TIER_LIMITS } from '../types.js'

type Schema = typeof schema

// ─────────────────────────────────────────────────────────────────────────
// User Quota Repository Implementation
// ─────────────────────────────────────────────────────────────────────────

/**
 * Create a UserQuotaRepository implementation using Drizzle
 */
export function createUserQuotaRepository(
  db: NodePgDatabase<Schema>,
  schema: Schema,
): UserQuotaRepository {
  const { userQuotas } = schema

  return {
    async findByUserId(userId: string): Promise<Result<UserQuotaRow, 'NOT_FOUND'>> {
      const rows = await db.select().from(userQuotas).where(eq(userQuotas.userId, userId)).limit(1)

      const row = rows[0]
      if (!row) {
        return err('NOT_FOUND')
      }

      return ok(mapRowToUserQuota(row))
    },

    async create(userId: string, tier: Tier): Promise<UserQuotaRow> {
      const limits = TIER_LIMITS[tier]

      const [row] = await db
        .insert(userQuotas)
        .values({
          userId,
          tier,
          mocsCount: 0,
          wishlistsCount: 0,
          galleriesCount: 0,
          setlistsCount: 0,
          storageUsedMb: 0,
          mocsLimit: limits.mocs,
          wishlistsLimit: limits.wishlists,
          galleriesLimit: limits.galleries,
          setlistsLimit: limits.setlists,
          storageLimitMb: limits.storageMb,
          chatHistoryDays: limits.chatHistoryDays,
          isAdult: false,
          isSuspended: false,
        })
        .returning()

      return mapRowToUserQuota(row)
    },

    async findOrCreate(userId: string): Promise<UserQuotaRow> {
      // Try to find existing
      const rows = await db.select().from(userQuotas).where(eq(userQuotas.userId, userId)).limit(1)

      const existing = rows[0]
      if (existing) {
        return mapRowToUserQuota(existing)
      }

      // Create with free-tier defaults
      return this.create(userId, 'free-tier')
    },

    async reserveQuota(userId: string, quotaType: QuotaType): Promise<boolean> {
      // Map quota type to column names
      const countColumn = getCountColumn(quotaType)
      const limitColumn = getLimitColumn(quotaType)

      // Atomic UPDATE with WHERE clause to prevent race conditions
      // Only increments if current < limit (or limit is NULL for unlimited)
      const result = await db.execute(sql`
        UPDATE user_quotas
        SET ${sql.identifier(countColumn)} = ${sql.identifier(countColumn)} + 1,
            updated_at = NOW()
        WHERE user_id = ${userId}
          AND (
            ${sql.identifier(limitColumn)} IS NULL
            OR ${sql.identifier(countColumn)} < ${sql.identifier(limitColumn)}
          )
      `)

      // If no rows were updated, either user doesn't exist or quota exceeded
      return (result.rowCount ?? 0) > 0
    },

    async releaseQuota(userId: string, quotaType: QuotaType): Promise<void> {
      const countColumn = getCountColumn(quotaType)

      // Decrement count, but never go below 0
      await db.execute(sql`
        UPDATE user_quotas
        SET ${sql.identifier(countColumn)} = GREATEST(0, ${sql.identifier(countColumn)} - 1),
            updated_at = NOW()
        WHERE user_id = ${userId}
      `)
    },

    async updateStorageUsage(
      userId: string,
      deltaMb: number,
    ): Promise<Result<void, 'QUOTA_EXCEEDED'>> {
      if (deltaMb > 0) {
        // Increasing storage - check limit
        const result = await db.execute(sql`
          UPDATE user_quotas
          SET storage_used_mb = storage_used_mb + ${deltaMb},
              updated_at = NOW()
          WHERE user_id = ${userId}
            AND (
              storage_limit_mb IS NULL
              OR storage_used_mb + ${deltaMb} <= storage_limit_mb
            )
        `)

        if ((result.rowCount ?? 0) === 0) {
          return err('QUOTA_EXCEEDED')
        }
      } else {
        // Decreasing storage - always allowed
        await db.execute(sql`
          UPDATE user_quotas
          SET storage_used_mb = GREATEST(0, storage_used_mb + ${deltaMb}),
              updated_at = NOW()
          WHERE user_id = ${userId}
        `)
      }

      return ok(undefined)
    },

    async updateTier(userId: string, tier: Tier): Promise<Result<UserQuotaRow, 'NOT_FOUND'>> {
      const limits = TIER_LIMITS[tier]

      const [row] = await db
        .update(userQuotas)
        .set({
          tier,
          mocsLimit: limits.mocs,
          wishlistsLimit: limits.wishlists,
          galleriesLimit: limits.galleries,
          setlistsLimit: limits.setlists,
          storageLimitMb: limits.storageMb,
          chatHistoryDays: limits.chatHistoryDays,
          updatedAt: new Date(),
        })
        .where(eq(userQuotas.userId, userId))
        .returning()

      if (!row) {
        return err('NOT_FOUND')
      }

      return ok(mapRowToUserQuota(row))
    },

    async setAdultStatus(userId: string, isAdult: boolean): Promise<Result<void, 'NOT_FOUND'>> {
      const result = await db
        .update(userQuotas)
        .set({
          isAdult,
          updatedAt: new Date(),
        })
        .where(eq(userQuotas.userId, userId))

      if ((result.rowCount ?? 0) === 0) {
        return err('NOT_FOUND')
      }

      return ok(undefined)
    },

    async suspend(userId: string, reason: string): Promise<Result<void, 'NOT_FOUND'>> {
      const result = await db
        .update(userQuotas)
        .set({
          isSuspended: true,
          suspendedAt: new Date(),
          suspendedReason: reason,
          updatedAt: new Date(),
        })
        .where(eq(userQuotas.userId, userId))

      if ((result.rowCount ?? 0) === 0) {
        return err('NOT_FOUND')
      }

      return ok(undefined)
    },

    async unsuspend(userId: string): Promise<Result<void, 'NOT_FOUND'>> {
      const result = await db
        .update(userQuotas)
        .set({
          isSuspended: false,
          suspendedAt: null,
          suspendedReason: null,
          updatedAt: new Date(),
        })
        .where(eq(userQuotas.userId, userId))

      if ((result.rowCount ?? 0) === 0) {
        return err('NOT_FOUND')
      }

      return ok(undefined)
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────
// User Addon Repository Implementation
// ─────────────────────────────────────────────────────────────────────────

/**
 * Create a UserAddonRepository implementation using Drizzle
 */
export function createUserAddonRepository(
  db: NodePgDatabase<Schema>,
  schema: Schema,
): UserAddonRepository {
  const { userAddons } = schema

  return {
    async findActiveByUserId(userId: string): Promise<ActiveAddon[]> {
      const rows = await db
        .select()
        .from(userAddons)
        .where(
          and(
            eq(userAddons.userId, userId),
            or(isNull(userAddons.expiresAt), gt(userAddons.expiresAt, new Date())),
          ),
        )

      return rows.map(row => ({
        type: row.addonType as AddonType,
        quantity: row.quantity,
        expiresAt: row.expiresAt,
      }))
    },

    async findAllByUserId(userId: string): Promise<UserAddonRow[]> {
      const rows = await db.select().from(userAddons).where(eq(userAddons.userId, userId))

      return rows.map(mapRowToUserAddon)
    },

    async addAddon(
      userId: string,
      addonType: string,
      quantity: number,
      expiresAt?: Date,
      paymentReference?: string,
    ): Promise<UserAddonRow> {
      // Upsert - if addon exists, update quantity and expiration
      const [row] = await db
        .insert(userAddons)
        .values({
          userId,
          addonType,
          quantity,
          expiresAt: expiresAt ?? null,
          paymentReference: paymentReference ?? null,
        })
        .onConflictDoUpdate({
          target: [userAddons.userId, userAddons.addonType],
          set: {
            quantity,
            expiresAt: expiresAt ?? null,
            paymentReference: paymentReference ?? null,
          },
        })
        .returning()

      return mapRowToUserAddon(row)
    },

    async removeAddon(userId: string, addonType: string): Promise<Result<void, 'NOT_FOUND'>> {
      const result = await db
        .delete(userAddons)
        .where(and(eq(userAddons.userId, userId), eq(userAddons.addonType, addonType)))

      if ((result.rowCount ?? 0) === 0) {
        return err('NOT_FOUND')
      }

      return ok(undefined)
    },

    async cleanupExpired(): Promise<number> {
      const result = await db
        .delete(userAddons)
        .where(and(sql`${userAddons.expiresAt} IS NOT NULL`, sql`${userAddons.expiresAt} < NOW()`))

      return result.rowCount ?? 0
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function getCountColumn(quotaType: QuotaType): string {
  const mapping: Record<QuotaType, string> = {
    mocs: 'mocs_count',
    wishlists: 'wishlists_count',
    galleries: 'galleries_count',
    setlists: 'setlists_count',
    storage: 'storage_used_mb',
  }
  return mapping[quotaType]
}

function getLimitColumn(quotaType: QuotaType): string {
  const mapping: Record<QuotaType, string> = {
    mocs: 'mocs_limit',
    wishlists: 'wishlists_limit',
    galleries: 'galleries_limit',
    setlists: 'setlists_limit',
    storage: 'storage_limit_mb',
  }
  return mapping[quotaType]
}

function mapRowToUserQuota(row: {
  userId: string
  tier: string
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
  chatHistoryDays: number | null
  isAdult: boolean
  isSuspended: boolean
  suspendedAt: Date | null
  suspendedReason: string | null
  createdAt: Date
  updatedAt: Date
}): UserQuotaRow {
  return {
    userId: row.userId,
    tier: row.tier as Tier,
    mocsCount: row.mocsCount,
    wishlistsCount: row.wishlistsCount,
    galleriesCount: row.galleriesCount,
    setlistsCount: row.setlistsCount,
    storageUsedMb: row.storageUsedMb,
    mocsLimit: row.mocsLimit,
    wishlistsLimit: row.wishlistsLimit,
    galleriesLimit: row.galleriesLimit,
    setlistsLimit: row.setlistsLimit,
    storageLimitMb: row.storageLimitMb,
    chatHistoryDays: row.chatHistoryDays,
    isAdult: row.isAdult,
    isSuspended: row.isSuspended,
    suspendedAt: row.suspendedAt,
    suspendedReason: row.suspendedReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function mapRowToUserAddon(row: {
  userId: string
  addonType: string
  purchasedAt: Date
  expiresAt: Date | null
  quantity: number
  paymentReference: string | null
  createdAt: Date
}): UserAddonRow {
  return {
    userId: row.userId,
    addonType: row.addonType as AddonType,
    purchasedAt: row.purchasedAt,
    expiresAt: row.expiresAt,
    quantity: row.quantity,
    paymentReference: row.paymentReference,
    createdAt: row.createdAt,
  }
}

import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

/**
 * User Quotas Table
 *
 * Stores user tier information and usage quotas for the freemium model.
 * The database is authoritative for all permissions - Cognito groups are informational only.
 *
 * Lazy initialization: Records are created on first auth request if not exists.
 *
 * @remarks
 * - userId is the Cognito sub claim (not a FK to any users table)
 * - Limits are nullable for admin tier (unlimited)
 * - Usage counts are atomically updated via UPDATE...WHERE to prevent race conditions
 */
export const userQuotas = pgTable(
  'user_quotas',
  {
    // Primary key - Cognito user ID (sub claim from JWT)
    userId: text('user_id').primaryKey().notNull(),

    // ─────────────────────────────────────────────────────────────────────────
    // Tier Information
    // ─────────────────────────────────────────────────────────────────────────

    /** User's subscription tier */
    tier: text('tier').notNull().default('free-tier'),

    // ─────────────────────────────────────────────────────────────────────────
    // Usage Tracking (current counts)
    // ─────────────────────────────────────────────────────────────────────────

    /** Current number of MOCs owned by user */
    mocsCount: integer('mocs_count').notNull().default(0),

    /** Current number of wishlists owned by user */
    wishlistsCount: integer('wishlists_count').notNull().default(0),

    /** Current number of galleries owned by user */
    galleriesCount: integer('galleries_count').notNull().default(0),

    /** Current number of setlists owned by user */
    setlistsCount: integer('setlists_count').notNull().default(0),

    /** Current storage used in MB */
    storageUsedMb: integer('storage_used_mb').notNull().default(0),

    // ─────────────────────────────────────────────────────────────────────────
    // Limits (nullable = unlimited for admin tier)
    // ─────────────────────────────────────────────────────────────────────────

    /** Maximum number of MOCs allowed (null = unlimited) */
    mocsLimit: integer('mocs_limit'),

    /** Maximum number of wishlists allowed (null = unlimited) */
    wishlistsLimit: integer('wishlists_limit'),

    /** Maximum number of galleries allowed (null = unlimited) */
    galleriesLimit: integer('galleries_limit'),

    /** Maximum number of setlists allowed (null = unlimited) */
    setlistsLimit: integer('setlists_limit'),

    /** Maximum storage in MB (null = unlimited) */
    storageLimitMb: integer('storage_limit_mb'),

    /** Number of days to retain chat history (null = unlimited) */
    chatHistoryDays: integer('chat_history_days'),

    // ─────────────────────────────────────────────────────────────────────────
    // User Flags
    // ─────────────────────────────────────────────────────────────────────────

    /** Whether user has verified adult status (required for chat) */
    isAdult: boolean('is_adult').notNull().default(false),

    /** Whether user account is suspended */
    isSuspended: boolean('is_suspended').notNull().default(false),

    /** When the account was suspended */
    suspendedAt: timestamp('suspended_at'),

    /** Reason for suspension (admin note) */
    suspendedReason: text('suspended_reason'),

    // ─────────────────────────────────────────────────────────────────────────
    // Timestamps
    // ─────────────────────────────────────────────────────────────────────────

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    // Index for tier-based queries (e.g., find all pro users)
    tierIdx: index('idx_user_quotas_tier').on(table.tier),

    // Index for suspended users (admin dashboard)
    suspendedIdx: index('idx_user_quotas_suspended').on(table.isSuspended),

    // Check constraint: tier must be one of the valid values
    tierCheck: check('tier_check', sql`tier IN ('admin', 'free-tier', 'pro-tier', 'power-tier')`),

    // Check constraint: counts cannot be negative
    mocsCountCheck: check('mocs_count_check', sql`mocs_count >= 0`),
    wishlistsCountCheck: check('wishlists_count_check', sql`wishlists_count >= 0`),
    galleriesCountCheck: check('galleries_count_check', sql`galleries_count >= 0`),
    setlistsCountCheck: check('setlists_count_check', sql`setlists_count >= 0`),
    storageUsedCheck: check('storage_used_check', sql`storage_used_mb >= 0`),
  }),
)

/**
 * User Addons Table
 *
 * Stores purchased add-on features for users.
 * Addons extend a user's capabilities beyond their base tier.
 *
 * @example
 * - Extra storage pack
 * - Additional gallery slots
 * - Extended chat history
 */
export const userAddons = pgTable(
  'user_addons',
  {
    // Composite primary key: userId + addonType
    userId: text('user_id').notNull(),
    addonType: text('addon_type').notNull(),

    /** When the addon was purchased */
    purchasedAt: timestamp('purchased_at').notNull().defaultNow(),

    /** When the addon expires (null = never expires) */
    expiresAt: timestamp('expires_at'),

    /** Quantity of the addon (e.g., 5 extra gallery slots) */
    quantity: integer('quantity').notNull().default(1),

    /** Stripe subscription/payment ID for reference */
    paymentReference: text('payment_reference'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  table => ({
    // Composite unique constraint (user can only have one of each addon type)
    userAddonUnique: uniqueIndex('user_addons_user_addon_unique').on(table.userId, table.addonType),

    // Index for looking up all addons for a user
    userIdx: index('idx_user_addons_user_id').on(table.userId),

    // Index for finding expired addons (cleanup job)
    expiresIdx: index('idx_user_addons_expires_at').on(table.expiresAt),

    // Check constraint: addon_type must be valid
    addonTypeCheck: check(
      'addon_type_check',
      sql`addon_type IN ('extra-storage', 'extra-galleries', 'extra-mocs', 'chat-history-extension')`,
    ),

    // Check constraint: quantity must be positive
    quantityCheck: check('quantity_check', sql`quantity > 0`),
  }),
)

// ─────────────────────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * User Quotas Relations
 *
 * One-to-many relationship: user can have multiple addons
 */
export const userQuotasRelations = relations(userQuotas, ({ many }) => ({
  addons: many(userAddons),
}))

/**
 * User Addons Relations
 *
 * Many-to-one relationship: addon belongs to a user
 */
export const userAddonsRelations = relations(userAddons, ({ one }) => ({
  userQuota: one(userQuotas, {
    fields: [userAddons.userId],
    references: [userQuotas.userId],
  }),
}))

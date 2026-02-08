import { z } from 'zod'

/**
 * Authorization Domain Types
 *
 * Zod schemas for validation + type inference.
 * Defines the tier system, features, quotas, and user permissions.
 */

// ─────────────────────────────────────────────────────────────────────────
// Tier Types
// ─────────────────────────────────────────────────────────────────────────

/**
 * User subscription tiers
 */
export const TierSchema = z.enum(['admin', 'free-tier', 'pro-tier', 'power-tier'])
export type Tier = z.infer<typeof TierSchema>

// ─────────────────────────────────────────────────────────────────────────
// Feature Types
// ─────────────────────────────────────────────────────────────────────────

/**
 * Features available in the platform
 * Each feature can be gated by tier
 */
export const FeatureSchema = z.enum([
  'moc',
  'wishlist',
  'profile',
  'gallery',
  'chat',
  'reviews',
  'user_discovery',
  'setlist',
  'privacy_advanced',
  'inspiration',
])
export type Feature = z.infer<typeof FeatureSchema>

// ─────────────────────────────────────────────────────────────────────────
// Quota Types
// ─────────────────────────────────────────────────────────────────────────

/**
 * Quota types for resource limits
 */
export const QuotaTypeSchema = z.enum(['mocs', 'wishlists', 'galleries', 'setlists', 'storage'])
export type QuotaType = z.infer<typeof QuotaTypeSchema>

/**
 * Individual quota information
 */
export const QuotaInfoSchema = z.object({
  current: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative().nullable(), // null = unlimited
  remaining: z.number().int().nullable(), // null = unlimited
})
export type QuotaInfo = z.infer<typeof QuotaInfoSchema>

/**
 * All quotas for a user
 */
export const UserQuotasSchema = z.object({
  mocs: QuotaInfoSchema,
  wishlists: QuotaInfoSchema,
  galleries: QuotaInfoSchema,
  setlists: QuotaInfoSchema,
  storage: QuotaInfoSchema,
})
export type UserQuotas = z.infer<typeof UserQuotasSchema>

// ─────────────────────────────────────────────────────────────────────────
// Addon Types
// ─────────────────────────────────────────────────────────────────────────

/**
 * Addon types that can be purchased
 */
export const AddonTypeSchema = z.enum([
  'extra-storage',
  'extra-galleries',
  'extra-mocs',
  'chat-history-extension',
])
export type AddonType = z.infer<typeof AddonTypeSchema>

/**
 * Active addon information
 */
export const ActiveAddonSchema = z.object({
  type: AddonTypeSchema,
  quantity: z.number().int().positive(),
  expiresAt: z.date().nullable(),
})
export type ActiveAddon = z.infer<typeof ActiveAddonSchema>

// ─────────────────────────────────────────────────────────────────────────
// User Permissions (Aggregate)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Complete user permissions object
 * Returned from authorization service after lookup
 */
export const UserPermissionsSchema = z.object({
  userId: z.string(),
  tier: TierSchema,
  isAdmin: z.boolean(),
  isAdult: z.boolean(),
  isSuspended: z.boolean(),
  suspendedReason: z.string().nullable(),
  features: z.array(FeatureSchema),
  quotas: UserQuotasSchema,
  addons: z.array(ActiveAddonSchema),
  chatHistoryDays: z.number().int().nullable(), // null = unlimited
})
export type UserPermissions = z.infer<typeof UserPermissionsSchema>

// ─────────────────────────────────────────────────────────────────────────
// Database Row Types
// ─────────────────────────────────────────────────────────────────────────

/**
 * User quota row from database
 * Represents the raw database record
 */
export const UserQuotaRowSchema = z.object({
  userId: z.string(),
  tier: TierSchema,
  mocsCount: z.number().int(),
  wishlistsCount: z.number().int(),
  galleriesCount: z.number().int(),
  setlistsCount: z.number().int(),
  storageUsedMb: z.number().int(),
  mocsLimit: z.number().int().nullable(),
  wishlistsLimit: z.number().int().nullable(),
  galleriesLimit: z.number().int().nullable(),
  setlistsLimit: z.number().int().nullable(),
  storageLimitMb: z.number().int().nullable(),
  chatHistoryDays: z.number().int().nullable(),
  isAdult: z.boolean(),
  isSuspended: z.boolean(),
  suspendedAt: z.date().nullable(),
  suspendedReason: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type UserQuotaRow = z.infer<typeof UserQuotaRowSchema>

/**
 * User addon row from database
 */
export const UserAddonRowSchema = z.object({
  userId: z.string(),
  addonType: AddonTypeSchema,
  purchasedAt: z.date(),
  expiresAt: z.date().nullable(),
  quantity: z.number().int(),
  paymentReference: z.string().nullable(),
  createdAt: z.date(),
})
export type UserAddonRow = z.infer<typeof UserAddonRowSchema>

// ─────────────────────────────────────────────────────────────────────────
// Tier Configuration
// ─────────────────────────────────────────────────────────────────────────

/**
 * Features available for each tier
 */
export const TIER_FEATURES: Record<Tier, readonly Feature[]> = {
  admin: [
    'moc',
    'wishlist',
    'profile',
    'gallery',
    'chat',
    'reviews',
    'user_discovery',
    'setlist',
    'privacy_advanced',
    'inspiration',
  ],
  'free-tier': ['moc', 'wishlist', 'profile', 'inspiration'],
  'pro-tier': [
    'moc',
    'wishlist',
    'profile',
    'gallery',
    'chat',
    'reviews',
    'user_discovery',
    'inspiration',
  ],
  'power-tier': [
    'moc',
    'wishlist',
    'profile',
    'gallery',
    'chat',
    'reviews',
    'user_discovery',
    'setlist',
    'privacy_advanced',
    'inspiration',
  ],
} as const

/**
 * Default limits for each tier
 * null = unlimited
 */
export const TIER_LIMITS: Record<
  Tier,
  {
    mocs: number | null
    wishlists: number | null
    galleries: number | null
    setlists: number | null
    storageMb: number | null
    chatHistoryDays: number | null
  }
> = {
  admin: {
    mocs: null,
    wishlists: null,
    galleries: null,
    setlists: null,
    storageMb: null,
    chatHistoryDays: null,
  },
  'free-tier': {
    mocs: 5,
    wishlists: 1,
    galleries: 0,
    setlists: 0,
    storageMb: 50,
    chatHistoryDays: 7,
  },
  'pro-tier': {
    mocs: 100,
    wishlists: 20,
    galleries: 20,
    setlists: 0,
    storageMb: 1000,
    chatHistoryDays: 30,
  },
  'power-tier': {
    mocs: 200,
    wishlists: 40,
    galleries: 40,
    setlists: null, // unlimited
    storageMb: 2000,
    chatHistoryDays: 90,
  },
} as const

/**
 * Map feature to minimum required tier
 */
export const FEATURE_REQUIRED_TIER: Record<Feature, Tier> = {
  moc: 'free-tier',
  wishlist: 'free-tier',
  profile: 'free-tier',
  gallery: 'pro-tier',
  chat: 'pro-tier',
  reviews: 'pro-tier',
  user_discovery: 'pro-tier',
  setlist: 'power-tier',
  privacy_advanced: 'power-tier',
  inspiration: 'free-tier',
} as const

// ─────────────────────────────────────────────────────────────────────────
// Error Types
// ─────────────────────────────────────────────────────────────────────────

export type AuthorizationError =
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'QUOTA_EXCEEDED'
  | 'FEATURE_NOT_AVAILABLE'
  | 'ACCOUNT_SUSPENDED'
  | 'ADULT_REQUIRED'
  | 'DB_ERROR'

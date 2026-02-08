import { z } from 'zod'

/**
 * Permissions API Schemas
 *
 * Zod schemas for authorization/permissions types.
 * Mirrors the backend authorization domain types.
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
 * Note: expiresAt is a string (ISO date) from API, transformed to Date if needed
 */
export const ActiveAddonSchema = z.object({
  type: AddonTypeSchema,
  quantity: z.number().int().positive(),
  expiresAt: z.string().datetime().nullable(),
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
// API Response Schemas
// ─────────────────────────────────────────────────────────────────────────

/**
 * Response for GET /authorization/me/features
 */
export const FeaturesResponseSchema = z.object({
  features: z.array(FeatureSchema),
})
export type FeaturesResponse = z.infer<typeof FeaturesResponseSchema>

// ─────────────────────────────────────────────────────────────────────────
// Tier Configuration (mirrors backend)
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
  ],
  'free-tier': ['moc', 'wishlist', 'profile'],
  'pro-tier': ['moc', 'wishlist', 'profile', 'gallery', 'chat', 'reviews', 'user_discovery'],
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
  ],
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
} as const

/**
 * Human-readable tier names for display
 */
export const TIER_DISPLAY_NAMES: Record<Tier, string> = {
  admin: 'Admin',
  'free-tier': 'Free',
  'pro-tier': 'Pro',
  'power-tier': 'Power',
} as const

/**
 * Human-readable feature names for display
 */
export const FEATURE_DISPLAY_NAMES: Record<Feature, string> = {
  moc: 'MOCs',
  wishlist: 'Wishlist',
  profile: 'Profile',
  gallery: 'Gallery',
  chat: 'Chat',
  reviews: 'Reviews',
  user_discovery: 'User Discovery',
  setlist: 'Set Lists',
  privacy_advanced: 'Advanced Privacy',
} as const

/**
 * Human-readable quota type names for display
 */
export const QUOTA_DISPLAY_NAMES: Record<QuotaType, string> = {
  mocs: 'MOCs',
  wishlists: 'Wishlists',
  galleries: 'Galleries',
  setlists: 'Set Lists',
  storage: 'Storage',
} as const

// ─────────────────────────────────────────────────────────────────────────
// Error Types
// ─────────────────────────────────────────────────────────────────────────

/**
 * Authorization error codes from backend
 */
export const AuthorizationErrorCodeSchema = z.enum([
  'NOT_FOUND',
  'FORBIDDEN',
  'QUOTA_EXCEEDED',
  'FEATURE_NOT_AVAILABLE',
  'ACCOUNT_SUSPENDED',
  'ADULT_REQUIRED',
  'DB_ERROR',
])
export type AuthorizationErrorCode = z.infer<typeof AuthorizationErrorCodeSchema>

/**
 * Feature error response from backend (403)
 */
export const FeatureErrorResponseSchema = z.object({
  error: z.literal('FEATURE_NOT_AVAILABLE'),
  message: z.string(),
  feature: FeatureSchema,
  requiredTier: TierSchema,
  currentTier: TierSchema,
})
export type FeatureErrorResponse = z.infer<typeof FeatureErrorResponseSchema>

/**
 * Quota error response from backend (429)
 */
export const QuotaErrorResponseSchema = z.object({
  error: z.literal('QUOTA_EXCEEDED'),
  message: z.string(),
  quotaType: QuotaTypeSchema,
  current: z.number(),
  limit: z.number(),
})
export type QuotaErrorResponse = z.infer<typeof QuotaErrorResponseSchema>

/**
 * Suspended error response from backend (403)
 */
export const SuspendedErrorResponseSchema = z.object({
  error: z.literal('ACCOUNT_SUSPENDED'),
  message: z.string(),
  reason: z.string().nullable(),
})
export type SuspendedErrorResponse = z.infer<typeof SuspendedErrorResponseSchema>

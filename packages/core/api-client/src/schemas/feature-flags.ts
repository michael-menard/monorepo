/**
 * Feature Flag Zod Schemas (WISH-2009 - AC16, AC20)
 *
 * Shared schemas for frontend/backend alignment.
 * Runtime validation and type inference.
 */
import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────────
// Feature Flag Base Schema
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Feature flag from database
 */
export const FeatureFlagSchema = z.object({
  id: z.string().uuid(),
  flagKey: z.string().min(1).max(100),
  enabled: z.boolean(),
  rolloutPercentage: z.number().int().min(0).max(100),
  description: z.string().nullable(),
  environment: z.string().default('production'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type FeatureFlag = z.infer<typeof FeatureFlagSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Response Schemas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/config/flags response - all flags as object
 * Example: { "wishlist-gallery": true, "wishlist-add-item": false }
 */
export const FeatureFlagsResponseSchema = z.record(z.string(), z.boolean())

export type FeatureFlagsResponse = z.infer<typeof FeatureFlagsResponseSchema>

/**
 * GET /api/config/flags/:flagKey response - single flag with metadata
 */
export const FeatureFlagDetailResponseSchema = z.object({
  key: z.string(),
  enabled: z.boolean(),
  rolloutPercentage: z.number().int().min(0).max(100),
  description: z.string().nullable(),
})

export type FeatureFlagDetailResponse = z.infer<typeof FeatureFlagDetailResponseSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Admin Update Schema
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/admin/flags/:flagKey request body
 */
export const UpdateFeatureFlagInputSchema = z.object({
  enabled: z.boolean().optional(),
  rolloutPercentage: z.number().int().min(0).max(100).optional(),
  description: z.string().max(500).optional(),
})

export type UpdateFeatureFlagInput = z.infer<typeof UpdateFeatureFlagInputSchema>

// ─────────────────────────────────────────────────────────────────────────────
// User Override Schemas (WISH-2039)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Override type: 'include' forces flag true, 'exclude' forces flag false
 */
export const OverrideTypeSchema = z.enum(['include', 'exclude'])

export type OverrideType = z.infer<typeof OverrideTypeSchema>

/**
 * POST /api/admin/flags/:flagKey/users request body
 */
export const AddUserOverrideRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required').max(255, 'User ID too long'),
  overrideType: OverrideTypeSchema,
  reason: z.string().max(500).optional(),
})

export type AddUserOverrideRequest = z.infer<typeof AddUserOverrideRequestSchema>

/**
 * User override response (single item)
 * Note: createdAt is string (ISO datetime) for JSON serialization
 */
export const UserOverrideResponseSchema = z.object({
  userId: z.string(),
  overrideType: OverrideTypeSchema,
  reason: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string().datetime(),
})

export type UserOverrideResponse = z.infer<typeof UserOverrideResponseSchema>

/**
 * GET /api/admin/flags/:flagKey/users response
 */
export const UserOverridesListResponseSchema = z.object({
  includes: z.array(UserOverrideResponseSchema),
  excludes: z.array(UserOverrideResponseSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1).max(500),
    total: z.number().int().min(0),
  }),
})

export type UserOverridesListResponse = z.infer<typeof UserOverridesListResponseSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Known Flag Keys (Type Safety)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Known wishlist feature flag keys (WISH-2009 - AC13)
 */
export const WishlistFlagKeys = {
  GALLERY: 'wishlist-gallery',
  ADD_ITEM: 'wishlist-add-item',
  EDIT_ITEM: 'wishlist-edit-item',
  GOT_IT: 'wishlist-got-it',
  REORDER: 'wishlist-reorder',
} as const

export type WishlistFlagKey = (typeof WishlistFlagKeys)[keyof typeof WishlistFlagKeys]
// ─────────────────────────────────────────────────────────────────────────────
// Feature Flag Schedule Schemas (WISH-2119 - AC11, AC13)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schedule status enum
 */
export const ScheduleStatusSchema = z.enum(['pending', 'applied', 'failed', 'cancelled'])

export type ScheduleStatus = z.infer<typeof ScheduleStatusSchema>

/**
 * Schedule updates object - specifies which flag properties to update
 * At least one property is required
 */
export const ScheduleUpdatesSchema = z
  .object({
    enabled: z.boolean().optional(),
    rolloutPercentage: z.number().int().min(0).max(100).optional(),
  })
  .refine(data => data.enabled !== undefined || data.rolloutPercentage !== undefined, {
    message: 'At least one update property (enabled or rolloutPercentage) is required',
  })

export type ScheduleUpdates = z.infer<typeof ScheduleUpdatesSchema>

/**
 * POST /api/admin/flags/:flagKey/schedule request body
 */
export const CreateScheduleRequestSchema = z.object({
  scheduledAt: z
    .string()
    .datetime({ message: 'scheduledAt must be a valid ISO 8601 datetime' })
    .refine(
      dateStr => {
        const scheduledTime = new Date(dateStr)
        return scheduledTime.getTime() > Date.now()
      },
      { message: 'scheduledAt must be in the future' },
    ),
  updates: ScheduleUpdatesSchema,
})

export type CreateScheduleRequest = z.infer<typeof CreateScheduleRequestSchema>

/**
 * Schedule response (single schedule)
 */
export const ScheduleResponseSchema = z.object({
  id: z.string().uuid(),
  flagKey: z.string(),
  scheduledAt: z.string().datetime(), // ISO 8601 for API responses
  status: ScheduleStatusSchema,
  updates: z.object({
    enabled: z.boolean().optional(),
    rolloutPercentage: z.number().int().min(0).max(100).optional(),
  }),
  appliedAt: z.string().datetime().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.string().datetime(),
})

export type ScheduleResponse = z.infer<typeof ScheduleResponseSchema>

/**
 * GET /api/admin/flags/:flagKey/schedule response
 */
export const ScheduleListResponseSchema = z.array(ScheduleResponseSchema)

export type ScheduleListResponse = z.infer<typeof ScheduleListResponseSchema>

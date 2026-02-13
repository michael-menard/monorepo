import { z } from 'zod'

/**
 * Feature Flag Domain Types (WISH-2009)
 *
 * Zod schemas for validation + type inference
 */

// ─────────────────────────────────────────────────────────────────────────
// Feature Flag Schemas
// ─────────────────────────────────────────────────────────────────────────

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
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type FeatureFlag = z.infer<typeof FeatureFlagSchema>

/**
 * Create feature flag input
 */
export const CreateFeatureFlagInputSchema = z.object({
  flagKey: z
    .string()
    .min(1, 'Flag key is required')
    .max(100, 'Flag key must be less than 100 characters'),
  enabled: z.boolean().default(false),
  rolloutPercentage: z.number().int().min(0).max(100).default(0),
  description: z.string().max(500).optional(),
  environment: z.string().max(20).default('production'),
})

export type CreateFeatureFlagInput = z.infer<typeof CreateFeatureFlagInputSchema>

/**
 * Update feature flag input (admin endpoint)
 */
export const UpdateFeatureFlagInputSchema = z.object({
  enabled: z.boolean().optional(),
  rolloutPercentage: z.number().int().min(0).max(100).optional(),
  description: z.string().max(500).optional(),
})

export type UpdateFeatureFlagInput = z.infer<typeof UpdateFeatureFlagInputSchema>

// ─────────────────────────────────────────────────────────────────────────
// Response Schemas
// ─────────────────────────────────────────────────────────────────────────

/**
 * GET /api/config/flags response - all flags as object
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

// ─────────────────────────────────────────────────────────────────────────
// User Override Schemas (WISH-2039)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Override type: 'include' forces flag true, 'exclude' forces flag false
 */
export const OverrideTypeSchema = z.enum(['include', 'exclude'])

export type OverrideType = z.infer<typeof OverrideTypeSchema>

/**
 * User override from database
 */
export const UserOverrideSchema = z.object({
  id: z.string().uuid(),
  flagId: z.string().uuid(),
  userId: z.string().min(1).max(255),
  overrideType: OverrideTypeSchema,
  reason: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.date(),
})

export type UserOverride = z.infer<typeof UserOverrideSchema>

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
 */
export const UserOverrideResponseSchema = z.object({
  userId: z.string(),
  overrideType: OverrideTypeSchema,
  reason: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.date(),
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

// ─────────────────────────────────────────────────────────────────────────
// Error Types
// ─────────────────────────────────────────────────────────────────────────

export type FeatureFlagError =
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'VALIDATION_ERROR'
  | 'DB_ERROR'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'

// ─────────────────────────────────────────────────────────────────────────
// Feature Flag Schedule Schemas (WISH-2119, WISH-20260)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Schedule status enum
 */
export const ScheduleStatusSchema = z.enum(['pending', 'applied', 'failed', 'cancelled'])

export type ScheduleStatus = z.infer<typeof ScheduleStatusSchema>

/**
 * Schedule updates object - specifies which flag properties to update
 * At least one property is required (AC12)
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
 * POST /api/admin/flags/:flagKey/schedule request body (AC1)
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
 * Schedule from database (AC11, WISH-20260)
 */
export const ScheduleSchema = z.object({
  id: z.string().uuid(),
  flagId: z.string().uuid(),
  scheduledAt: z.date(),
  status: ScheduleStatusSchema,
  updates: z.object({
    enabled: z.boolean().optional(),
    rolloutPercentage: z.number().int().min(0).max(100).optional(),
  }),
  appliedAt: z.date().nullable(),
  errorMessage: z.string().nullable(),
  retryCount: z.number().int().min(0).default(0),
  maxRetries: z.number().int().min(0).max(10).default(3),
  nextRetryAt: z.date().nullable(),
  lastError: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type Schedule = z.infer<typeof ScheduleSchema>

/**
 * Schedule response (single schedule) - AC1, AC4, WISH-20260
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
  retryCount: z.number().int().min(0).optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
  nextRetryAt: z.string().datetime().nullable().optional(),
  lastError: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
})

export type ScheduleResponse = z.infer<typeof ScheduleResponseSchema>

/**
 * GET /api/admin/flags/:flagKey/schedule response - AC3
 */
export const ScheduleListResponseSchema = z.array(ScheduleResponseSchema)

export type ScheduleListResponse = z.infer<typeof ScheduleListResponseSchema>

/**
 * Schedule error types
 */
export type ScheduleError =
  | 'NOT_FOUND'
  | 'INVALID_FLAG'
  | 'ALREADY_APPLIED'
  | 'VALIDATION_ERROR'
  | 'DB_ERROR'

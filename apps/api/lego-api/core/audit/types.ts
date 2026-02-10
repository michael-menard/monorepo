/**
 * Audit Logging Types (WISH-20280)
 *
 * Defines audit event types and schemas for flag schedule operations.
 * CloudWatch-only logging (no database persistence in MVP).
 */

import { z } from 'zod'

/**
 * Audit event types for flag schedule operations
 */
export const AuditEventTypeSchema = z.enum([
  'flag_schedule.created',
  'flag_schedule.cancelled',
  'flag_schedule.applied',
  'flag_schedule.failed',
])

export type AuditEventType = z.infer<typeof AuditEventTypeSchema>

/**
 * Flag state metadata for applied events
 */
export const FlagStateSchema = z.object({
  enabled: z.boolean(),
  rolloutPercentage: z.number().int().min(0).max(100).optional(),
})

export type FlagState = z.infer<typeof FlagStateSchema>

/**
 * Common metadata fields for all audit events
 */
export const BaseAuditMetadataSchema = z.object({
  scheduleId: z.string().uuid(),
  flagKey: z.string(),
})

/**
 * Created event metadata
 */
export const CreatedEventMetadataSchema = BaseAuditMetadataSchema.extend({
  scheduledAt: z.string().datetime(),
  updates: z.record(z.unknown()),
  adminUserId: z.string(),
  adminEmail: z.string().email().optional(),
})

export type CreatedEventMetadata = z.infer<typeof CreatedEventMetadataSchema>

/**
 * Cancelled event metadata
 */
export const CancelledEventMetadataSchema = BaseAuditMetadataSchema.extend({
  scheduledAt: z.string().datetime(),
  adminUserId: z.string(),
  adminEmail: z.string().email().optional(),
  reason: z.string(),
})

export type CancelledEventMetadata = z.infer<typeof CancelledEventMetadataSchema>

/**
 * Applied event metadata (automatic cron job)
 */
export const AppliedEventMetadataSchema = BaseAuditMetadataSchema.extend({
  updates: z.record(z.unknown()),
  appliedAt: z.string().datetime(),
  flagState: FlagStateSchema,
})

export type AppliedEventMetadata = z.infer<typeof AppliedEventMetadataSchema>

/**
 * Failed event metadata (automatic cron job)
 */
export const FailedEventMetadataSchema = BaseAuditMetadataSchema.extend({
  errorMessage: z.string(),
  failedAt: z.string().datetime(),
})

export type FailedEventMetadata = z.infer<typeof FailedEventMetadataSchema>

/**
 * Union type for all metadata schemas
 */
export type AuditEventMetadata =
  | CreatedEventMetadata
  | CancelledEventMetadata
  | AppliedEventMetadata
  | FailedEventMetadata

/**
 * Complete audit event structure
 */
export const AuditEventSchema = z.object({
  eventType: AuditEventTypeSchema,
  timestamp: z.string().datetime(),
  metadata: z.union([
    CreatedEventMetadataSchema,
    CancelledEventMetadataSchema,
    AppliedEventMetadataSchema,
    FailedEventMetadataSchema,
  ]),
})

export type AuditEvent = z.infer<typeof AuditEventSchema>

/**
 * Audit Logging Type Definitions
 *
 * Zod schemas for audit log entries, queries, and retention operations.
 *
 * @see KNOW-018 for audit logging requirements
 */

import { z } from 'zod'

// ============================================================================
// Core Audit Types
// ============================================================================

/**
 * Audit operation types.
 */
export const AuditOperationSchema = z.enum(['add', 'update', 'delete'])
export type AuditOperation = z.infer<typeof AuditOperationSchema>

/**
 * Audit log entry schema.
 *
 * Represents a single audit log record in the database.
 */
export const AuditLogEntrySchema = z.object({
  /** Unique identifier for the audit log entry */
  id: z.string().uuid(),

  /** ID of the knowledge entry being audited (null if entry was deleted with CASCADE) */
  entry_id: z.string().uuid().nullable(),

  /** Type of operation performed */
  operation: AuditOperationSchema,

  /** Entry state before the operation (null for add operations) */
  previous_value: z.record(z.unknown()).nullable(),

  /** Entry state after the operation (null for delete operations) */
  new_value: z.record(z.unknown()).nullable(),

  /** When the operation occurred */
  timestamp: z.date(),

  /** MCP session context (correlation_id, client info, etc.) */
  user_context: z.record(z.unknown()).nullable(),

  /** When the audit log entry was created */
  created_at: z.date(),
})
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>

/**
 * New audit log entry schema (for inserts).
 */
export const NewAuditLogEntrySchema = AuditLogEntrySchema.omit({ created_at: true }).extend({
  created_at: z.date().optional(),
})
export type NewAuditLogEntry = z.infer<typeof NewAuditLogEntrySchema>

// ============================================================================
// Query Input Schemas
// ============================================================================

/**
 * Pagination options schema.
 */
export const PaginationOptionsSchema = z.object({
  /** Maximum number of results to return (default 100, max 1000) */
  limit: z.number().int().min(1).max(1000).optional().default(100),

  /** Number of results to skip for pagination (default 0) */
  offset: z.number().int().min(0).optional().default(0),
})
export type PaginationOptions = z.infer<typeof PaginationOptionsSchema>

/**
 * Input schema for kb_audit_by_entry tool.
 *
 * Query audit logs for a specific knowledge entry.
 */
export const AuditByEntryInputSchema = z.object({
  /** UUID of the entry to query audit logs for */
  entry_id: z.string().uuid(),

  /** Maximum number of results (default 100, max 1000) */
  limit: z.number().int().min(1).max(1000).optional().default(100),

  /** Number of results to skip (default 0) */
  offset: z.number().int().min(0).optional().default(0),
})
export type AuditByEntryInput = z.infer<typeof AuditByEntryInputSchema>

/**
 * Input schema for kb_audit_query tool.
 *
 * Query audit logs by time range and optional filters.
 */
export const AuditQueryInputSchema = z
  .object({
    /** Start of time range (ISO 8601) */
    start_date: z.coerce.date(),

    /** End of time range (ISO 8601) */
    end_date: z.coerce.date(),

    /** Filter by operation type (optional) */
    operation: AuditOperationSchema.optional(),

    /** Maximum number of results (default 100, max 1000) */
    limit: z.number().int().min(1).max(1000).optional().default(100),

    /** Number of results to skip (default 0) */
    offset: z.number().int().min(0).optional().default(0),
  })
  .refine(data => data.end_date >= data.start_date, {
    message: 'end_date must be after start_date',
    path: ['end_date'],
  })
export type AuditQueryInput = z.infer<typeof AuditQueryInputSchema>

/**
 * Input schema for kb_audit_retention_cleanup tool.
 *
 * Manually trigger retention policy cleanup.
 */
export const AuditRetentionInputSchema = z.object({
  /** Delete logs older than this many days (default 90, min 1) */
  retention_days: z.number().int().min(1).optional().default(90),

  /** If true, report count without deleting (default false) */
  dry_run: z.boolean().optional().default(false),
})
export type AuditRetentionInput = z.infer<typeof AuditRetentionInputSchema>

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Audit log entry response (without embedding, formatted for API response).
 */
export const AuditLogResponseSchema = z.object({
  id: z.string().uuid(),
  entry_id: z.string().uuid().nullable(),
  operation: AuditOperationSchema,
  previous_value: z.record(z.unknown()).nullable(),
  new_value: z.record(z.unknown()).nullable(),
  timestamp: z.string(), // ISO 8601 string
  user_context: z.record(z.unknown()).nullable(),
})
export type AuditLogResponse = z.infer<typeof AuditLogResponseSchema>

/**
 * Audit query result with metadata.
 */
export const AuditQueryResultSchema = z.object({
  results: z.array(AuditLogResponseSchema),
  metadata: z.object({
    total: z.number().int(),
    limit: z.number().int(),
    offset: z.number().int(),
    correlation_id: z.string().optional(),
  }),
})
export type AuditQueryResult = z.infer<typeof AuditQueryResultSchema>

/**
 * Retention cleanup result.
 */
export const RetentionCleanupResultSchema = z.object({
  deleted_count: z.number().int(),
  retention_days: z.number().int(),
  cutoff_date: z.string(), // ISO 8601 string
  dry_run: z.boolean(),
  duration_ms: z.number(),
  batches_processed: z.number().int(),
  correlation_id: z.string().optional(),
})
export type RetentionCleanupResult = z.infer<typeof RetentionCleanupResultSchema>

// ============================================================================
// Configuration Schemas
// ============================================================================

/**
 * Audit configuration from environment variables.
 */
export const AuditConfigSchema = z.object({
  /** Enable/disable audit logging */
  enabled: z.boolean().default(true),

  /** Retention period in days */
  retentionDays: z.number().int().min(1).default(90),

  /** Continue on audit write failure */
  softFail: z.boolean().default(true),
})
export type AuditConfig = z.infer<typeof AuditConfigSchema>

/**
 * Parse audit configuration from environment variables.
 */
export function parseAuditConfig(): AuditConfig {
  return AuditConfigSchema.parse({
    enabled: process.env.AUDIT_ENABLED !== 'false',
    retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS || '90', 10),
    softFail: process.env.AUDIT_SOFT_FAIL !== 'false',
  })
}

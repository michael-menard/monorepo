/**
 * KB Writer Adapter Type Definitions
 *
 * Zod schemas for KB write operations with runtime validation.
 *
 * @see LNGG-0050 for adapter implementation
 */

import { z } from 'zod'

// ============================================================================
// Enums
// ============================================================================

/**
 * Entry type enum (matches KB schema)
 */
export const EntryTypeSchema = z.enum(['note', 'decision', 'constraint', 'runbook', 'lesson'])

export type EntryType = z.infer<typeof EntryTypeSchema>

/**
 * Role enum (matches KB schema)
 */
export const RoleSchema = z.enum(['pm', 'dev', 'qa', 'all'])

export type Role = z.infer<typeof RoleSchema>

// ============================================================================
// KB Dependencies
// ============================================================================

/**
 * KB dependencies for write operations
 */
export const KbDepsSchema = z.object({
  /** Database connection (Drizzle instance) */
  db: z.unknown(),
  /** Embedding client for vector generation */
  embeddingClient: z.unknown(),
})

export type KbDeps = z.infer<typeof KbDepsSchema>

// ============================================================================
// Configuration
// ============================================================================

/**
 * KB Writer configuration with optional dependencies
 */
export const KbWriterConfigSchema = z.object({
  /** KB dependencies (optional - if missing, returns no-op writer) */
  kbDeps: z
    .object({
      db: z.unknown(),
      embeddingClient: z.unknown(),
      kbSearchFn: z.function().args(z.unknown(), z.unknown()).returns(z.promise(z.unknown())),
      kbAddFn: z.function().args(z.unknown(), z.unknown()).returns(z.promise(z.unknown())),
    })
    .optional(),
  /** Similarity threshold for deduplication (default 0.85) */
  dedupeThreshold: z.number().min(0).max(1).default(0.85),
})

export type KbWriterConfig = z.infer<typeof KbWriterConfigSchema>

// ============================================================================
// Write Requests
// ============================================================================

/**
 * Lesson write request
 */
export const KbLessonRequestSchema = z.object({
  content: z.string().min(10).max(10000),
  storyId: z.string().max(100),
  category: z.string().max(100).optional(),
  domain: z.string().max(100).optional(),
  severity: z.enum(['high', 'medium', 'low']).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  role: RoleSchema.default('all'),
})

export type KbLessonRequest = z.infer<typeof KbLessonRequestSchema>

/**
 * Decision write request
 */
export const KbDecisionRequestSchema = z.object({
  content: z.string().min(10).max(10000),
  storyId: z.string().max(100),
  title: z.string().max(200).optional(),
  rationale: z.string().max(5000).optional(),
  consequences: z.string().max(5000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  role: RoleSchema.default('all'),
})

export type KbDecisionRequest = z.infer<typeof KbDecisionRequestSchema>

/**
 * Constraint write request
 */
export const KbConstraintRequestSchema = z.object({
  content: z.string().min(10).max(10000),
  storyId: z.string().max(100),
  scope: z.string().max(200).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  role: RoleSchema.default('all'),
})

export type KbConstraintRequest = z.infer<typeof KbConstraintRequestSchema>

/**
 * Runbook write request
 */
export const KbRunbookRequestSchema = z.object({
  content: z.string().min(10).max(10000),
  storyId: z.string().max(100),
  title: z.string().max(200).optional(),
  steps: z.array(z.string().max(500)).max(50).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  role: RoleSchema.default('all'),
})

export type KbRunbookRequest = z.infer<typeof KbRunbookRequestSchema>

/**
 * Note write request
 */
export const KbNoteRequestSchema = z.object({
  content: z.string().min(10).max(10000),
  storyId: z.string().max(100).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  role: RoleSchema.default('all'),
})

export type KbNoteRequest = z.infer<typeof KbNoteRequestSchema>

/**
 * Generic write request (discriminated union)
 */
export const KbWriteRequestSchema = z.discriminatedUnion('entryType', [
  KbLessonRequestSchema.extend({ entryType: z.literal('lesson') }),
  KbDecisionRequestSchema.extend({ entryType: z.literal('decision') }),
  KbConstraintRequestSchema.extend({ entryType: z.literal('constraint') }),
  KbRunbookRequestSchema.extend({ entryType: z.literal('runbook') }),
  KbNoteRequestSchema.extend({ entryType: z.literal('note') }),
])

export type KbWriteRequest = z.infer<typeof KbWriteRequestSchema>

// ============================================================================
// Write Results
// ============================================================================

/**
 * Successful write result
 */
export const KbWriteSuccessSchema = z.object({
  success: z.literal(true),
  id: z.string(),
  skipped: z.literal(false),
})

export type KbWriteSuccess = z.infer<typeof KbWriteSuccessSchema>

/**
 * Skipped write result (duplicate detected)
 */
export const KbWriteSkippedSchema = z.object({
  success: z.literal(false),
  skipped: z.literal(true),
  reason: z.string(),
  similarity: z.number().optional(),
})

export type KbWriteSkipped = z.infer<typeof KbWriteSkippedSchema>

/**
 * Failed write result
 */
export const KbWriteErrorSchema = z.object({
  success: z.literal(false),
  skipped: z.literal(false),
  error: z.string(),
})

export type KbWriteError = z.infer<typeof KbWriteErrorSchema>

/**
 * Write result (union)
 */
export const KbWriteResultSchema = z.union([
  KbWriteSuccessSchema,
  KbWriteSkippedSchema,
  KbWriteErrorSchema,
])

export type KbWriteResult = z.infer<typeof KbWriteResultSchema>

/**
 * Batch write result
 */
export const KbBatchWriteResultSchema = z.object({
  totalRequests: z.number(),
  successCount: z.number(),
  skippedCount: z.number(),
  errorCount: z.number(),
  results: z.array(KbWriteResultSchema),
  errors: z.array(z.string()),
})

export type KbBatchWriteResult = z.infer<typeof KbBatchWriteResultSchema>

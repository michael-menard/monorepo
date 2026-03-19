/**
 * Zod schemas for the Embedding Worker
 *
 * All types use z.infer<> — no TypeScript interface keyword.
 *
 * @see CDBE-4030 AC-8, AC-10
 */

import { z } from 'zod'

/**
 * Worker configuration schema.
 *
 * pollIntervalMs:    How often the polling fallback runs (default 5 minutes)
 * batchSize:         Max notifications before flushing batch (default 25)
 * batchWindowMs:     Max time to wait before flushing batch (default 50ms)
 * backfillBatchSize: Rows per backfill batch (default 50)
 * backfillDelayMs:   Inter-batch delay during backfill (default 500ms)
 */
export const WorkerConfigSchema = z.object({
  pollIntervalMs: z
    .number()
    .int()
    .positive()
    .default(5 * 60 * 1000),
  batchSize: z.number().int().positive().default(25),
  batchWindowMs: z.number().int().positive().default(50),
  backfillBatchSize: z.number().int().positive().default(50),
  backfillDelayMs: z.number().int().nonnegative().default(500),
})

export type WorkerConfig = z.infer<typeof WorkerConfigSchema>

/**
 * Notification payload arriving on the knowledge_embedding_needed channel.
 *
 * Published by the pg_notify trigger in migration 1012:
 *   pg_notify('knowledge_embedding_needed', json_build_object('table', '<name>', 'id', NEW.id::text)::text)
 */
export const NotificationPayloadSchema = z.object({
  table: z.string().min(1),
  id: z.string().uuid(),
})

export type NotificationPayload = z.infer<typeof NotificationPayloadSchema>

/**
 * The five knowledge tables that the worker manages.
 * These must match the table names in the migration 1012 trigger definitions.
 */
export const KnowledgeTableSchema = z.enum([
  'lessons_learned',
  'adrs',
  'code_standards',
  'rules',
  'cohesion_rules',
])

export type KnowledgeTable = z.infer<typeof KnowledgeTableSchema>

export const KNOWLEDGE_TABLES: readonly KnowledgeTable[] = [
  'lessons_learned',
  'adrs',
  'code_standards',
  'rules',
  'cohesion_rules',
] as const

/**
 * Result of writing an embedding back to the database for a single row.
 */
export const EmbeddingWriteResultSchema = z.object({
  table: KnowledgeTableSchema,
  id: z.string().uuid(),
  success: z.boolean(),
  error: z.string().optional(),
})

export type EmbeddingWriteResult = z.infer<typeof EmbeddingWriteResultSchema>

/**
 * A deduplicated pending notification item in the batch buffer.
 * Keyed by `${table}:${id}` to prevent duplicate embedding calls.
 */
export const PendingNotificationSchema = z.object({
  table: KnowledgeTableSchema,
  id: z.string().uuid(),
})

export type PendingNotification = z.infer<typeof PendingNotificationSchema>

/**
 * Per-table row returned from the polling fallback NULL sweep query.
 */
export const NullEmbeddingRowSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
})

export type NullEmbeddingRow = z.infer<typeof NullEmbeddingRowSchema>

/**
 * Backfill result — per-table row counts.
 */
export const BackfillResultSchema = z.object({
  table: KnowledgeTableSchema,
  rowsProcessed: z.number().int().nonnegative(),
})

export type BackfillResult = z.infer<typeof BackfillResultSchema>

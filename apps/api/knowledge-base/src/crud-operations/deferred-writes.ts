/**
 * Deferred KB Writes Processing (KBMEM-022)
 *
 * Handles failed KB writes by queueing them to a DB table for later processing.
 * When KB is unavailable during a write operation, the write is saved to the
 * deferred_writes table and processed when KB reconnects.
 *
 * If the DB is completely down, the write is silently lost (accepted tradeoff).
 */

import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { eq, and, isNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import { logger } from '@repo/logger'
import { deferredWrites } from '../db/schema.js'

// ============================================================================
// Schema Definitions
// ============================================================================

/**
 * Supported deferred operation types.
 */
export const DeferredOperationTypeSchema = z.enum([
  'kb_add',
  'kb_add_decision',
  'kb_add_constraint',
  'kb_add_lesson',
  'kb_add_runbook',
  'kb_add_task',
  'kb_update',
  'kb_update_task',
  'kb_update_work_state',
])

export type DeferredOperationType = z.infer<typeof DeferredOperationTypeSchema>

/**
 * Schema for a deferred write entry (DB row shape).
 */
export const DeferredWriteEntrySchema = z.object({
  /** Unique ID for this deferred write */
  id: z.string().uuid(),

  /** The operation type that failed */
  operation: DeferredOperationTypeSchema,

  /** The payload that was being written */
  payload: z.record(z.unknown()),

  /** When the write was created */
  created_at: z.coerce.date(),

  /** Error message from the failed attempt */
  error: z.string().nullable(),

  /** Number of retry attempts */
  retry_count: z.number().int().min(0).default(0),

  /** Last retry attempt timestamp */
  last_retry: z.coerce.date().nullable().optional(),

  /** Story ID if applicable */
  story_id: z.string().nullable().optional(),

  /** Agent that attempted the write */
  agent: z.string().nullable().optional(),

  /** When the write was successfully processed */
  processed_at: z.coerce.date().nullable().optional(),
})

export type DeferredWriteEntry = z.infer<typeof DeferredWriteEntrySchema>

/**
 * Schema for kb_queue_deferred_write input.
 */
export const KbQueueDeferredWriteInputSchema = z.object({
  /** The operation type that failed */
  operation: DeferredOperationTypeSchema,

  /** The payload that was being written */
  payload: z.record(z.unknown()),

  /** Error message from the failed attempt */
  error: z.string(),

  /** Story ID if applicable */
  story_id: z.string().optional(),

  /** Agent that attempted the write */
  agent: z.string().optional(),
})

export type KbQueueDeferredWriteInput = z.infer<typeof KbQueueDeferredWriteInputSchema>

/**
 * Schema for kb_process_deferred_writes input.
 */
export const KbProcessDeferredWritesInputSchema = z.object({
  /** Dry run - list writes without processing (default: false) */
  dry_run: z.boolean().optional().default(false),

  /** Maximum writes to process (default: 50) */
  limit: z.number().int().positive().max(200).optional().default(50),

  /** Only process writes for specific operation type */
  operation: DeferredOperationTypeSchema.optional(),

  /** Only process writes for specific story */
  story_id: z.string().optional(),
})

export type KbProcessDeferredWritesInput = z.infer<typeof KbProcessDeferredWritesInputSchema>

/**
 * Schema for kb_list_deferred_writes input.
 */
export const KbListDeferredWritesInputSchema = z.object({
  /** Maximum writes to return (default: 50) */
  limit: z.number().int().positive().max(200).optional().default(50),

  /** Filter by operation type */
  operation: DeferredOperationTypeSchema.optional(),

  /** Filter by story ID */
  story_id: z.string().optional(),
})

export type KbListDeferredWritesInput = z.infer<typeof KbListDeferredWritesInputSchema>

// ============================================================================
// Result Types
// ============================================================================

/**
 * Result of queueing a deferred write.
 */
export const QueueDeferredWriteResultSchema = z.object({
  success: z.boolean(),
  id: z.string(),
  message: z.string(),
})

export type QueueDeferredWriteResult = z.infer<typeof QueueDeferredWriteResultSchema>

/**
 * Result of processing a single deferred write.
 */
export const ProcessedWriteSchema = z.object({
  id: z.string(),
  operation: DeferredOperationTypeSchema,
  status: z.enum(['success', 'failed', 'skipped']),
  error: z.string().optional(),
})

export type ProcessedWrite = z.infer<typeof ProcessedWriteSchema>

/**
 * Result of processing deferred writes.
 */
export const ProcessDeferredWritesResultSchema = z.object({
  success: z.boolean(),
  dry_run: z.boolean(),
  total: z.number(),
  processed: z.number(),
  succeeded: z.number(),
  failed: z.number(),
  writes: z.array(ProcessedWriteSchema),
  message: z.string(),
})

export type ProcessDeferredWritesResult = z.infer<typeof ProcessDeferredWritesResultSchema>

/**
 * Result of listing deferred writes.
 */
export const ListDeferredWritesResultSchema = z.object({
  success: z.boolean(),
  total: z.number(),
  writes: z.array(DeferredWriteEntrySchema),
  message: z.string(),
})

export type ListDeferredWritesResult = z.infer<typeof ListDeferredWritesResultSchema>

// ============================================================================
// Dependencies
// ============================================================================

/**
 * Database dependency for deferred write operations.
 */
export interface DeferredWritesDeps {
  db: NodePgDatabase<typeof import('../db/schema.js')>
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Maximum retry count before marking as permanent failure.
 */
export const MAX_RETRY_COUNT = 5

// ============================================================================
// Operations
// ============================================================================

/**
 * Queue a failed write for later processing.
 *
 * @param input - Write details to queue
 * @param deps - Database dependency
 * @returns Queue result
 */
export async function kb_queue_deferred_write(
  input: KbQueueDeferredWriteInput,
  deps: DeferredWritesDeps,
): Promise<QueueDeferredWriteResult> {
  const validated = KbQueueDeferredWriteInputSchema.parse(input)

  const [row] = await deps.db
    .insert(deferredWrites)
    .values({
      operation: validated.operation,
      payload: validated.payload,
      error: validated.error,
      storyId: validated.story_id ?? null,
      agent: validated.agent ?? null,
    })
    .returning({ id: deferredWrites.id })

  return {
    success: true,
    id: row.id,
    message: `Queued deferred write for ${validated.operation}`,
  }
}

/**
 * List pending deferred writes.
 *
 * @param input - Filter options
 * @param deps - Database dependency
 * @returns List of deferred writes
 */
export async function kb_list_deferred_writes(
  input: KbListDeferredWritesInput,
  deps: DeferredWritesDeps,
): Promise<ListDeferredWritesResult> {
  const validated = KbListDeferredWritesInputSchema.parse(input)

  // Build conditions: always filter unprocessed
  const conditions = [isNull(deferredWrites.processedAt)]

  if (validated.operation) {
    conditions.push(eq(deferredWrites.operation, validated.operation))
  }

  if (validated.story_id) {
    conditions.push(eq(deferredWrites.storyId, validated.story_id))
  }

  const rows = await deps.db
    .select()
    .from(deferredWrites)
    .where(and(...conditions))
    .orderBy(deferredWrites.createdAt)
    .limit(validated.limit)

  // Count total unprocessed
  const [countResult] = await deps.db
    .select({ count: sql<number>`count(*)::int` })
    .from(deferredWrites)
    .where(isNull(deferredWrites.processedAt))

  const total = countResult?.count ?? 0

  // Map DB rows to API shape
  const writes: DeferredWriteEntry[] = rows.map(row => ({
    id: row.id,
    operation: row.operation as DeferredOperationType,
    payload: row.payload as Record<string, unknown>,
    created_at: row.createdAt,
    error: row.error,
    retry_count: row.retryCount,
    last_retry: row.lastRetry,
    story_id: row.storyId,
    agent: row.agent,
    processed_at: row.processedAt,
  }))

  return {
    success: true,
    total,
    writes,
    message: `Found ${writes.length} deferred writes (${total} total unprocessed)`,
  }
}

/**
 * Process deferred writes.
 *
 * Replays rows through the provided processor callback. On success, marks
 * `processed_at`. On failure, increments `retry_count`.
 *
 * @param input - Process options
 * @param deps - Database dependency
 * @param processor - Callback to process individual writes
 * @returns Process result
 */
export async function kb_process_deferred_writes(
  input: KbProcessDeferredWritesInput,
  deps: DeferredWritesDeps,
  processor?: (entry: DeferredWriteEntry) => Promise<{ success: boolean; error?: string }>,
): Promise<ProcessDeferredWritesResult> {
  const validated = KbProcessDeferredWritesInputSchema.parse(input)

  // Build conditions: always filter unprocessed
  const conditions = [isNull(deferredWrites.processedAt)]

  if (validated.operation) {
    conditions.push(eq(deferredWrites.operation, validated.operation))
  }

  if (validated.story_id) {
    conditions.push(eq(deferredWrites.storyId, validated.story_id))
  }

  const rows = await deps.db
    .select()
    .from(deferredWrites)
    .where(and(...conditions))
    .orderBy(deferredWrites.createdAt)
    .limit(validated.limit)

  // Map to entries
  const writesToProcess: DeferredWriteEntry[] = rows.map(row => ({
    id: row.id,
    operation: row.operation as DeferredOperationType,
    payload: row.payload as Record<string, unknown>,
    created_at: row.createdAt,
    error: row.error,
    retry_count: row.retryCount,
    last_retry: row.lastRetry,
    story_id: row.storyId,
    agent: row.agent,
    processed_at: row.processedAt,
  }))

  if (validated.dry_run) {
    return {
      success: true,
      dry_run: true,
      total: writesToProcess.length,
      processed: 0,
      succeeded: 0,
      failed: 0,
      writes: writesToProcess.map(w => ({
        id: w.id,
        operation: w.operation,
        status: 'skipped' as const,
      })),
      message: `Would process ${writesToProcess.length} deferred writes (dry run)`,
    }
  }

  if (!processor) {
    return {
      success: false,
      dry_run: false,
      total: writesToProcess.length,
      processed: 0,
      succeeded: 0,
      failed: 0,
      writes: [],
      message: 'No processor provided - cannot process deferred writes',
    }
  }

  // Process each write
  const results: ProcessedWrite[] = []
  let succeeded = 0
  let failed = 0

  for (const entry of writesToProcess) {
    // Skip if max retries exceeded
    if (entry.retry_count >= MAX_RETRY_COUNT) {
      results.push({
        id: entry.id,
        operation: entry.operation,
        status: 'skipped',
        error: `Max retries (${MAX_RETRY_COUNT}) exceeded`,
      })
      continue
    }

    try {
      const result = await processor(entry)

      if (result.success) {
        // Mark as processed
        await deps.db
          .update(deferredWrites)
          .set({ processedAt: new Date() })
          .where(eq(deferredWrites.id, entry.id))

        results.push({
          id: entry.id,
          operation: entry.operation,
          status: 'success',
        })
        succeeded++
      } else {
        // Increment retry count
        await deps.db
          .update(deferredWrites)
          .set({
            retryCount: sql`retry_count + 1`,
            lastRetry: new Date(),
            error: result.error ?? entry.error,
          })
          .where(eq(deferredWrites.id, entry.id))

        results.push({
          id: entry.id,
          operation: entry.operation,
          status: 'failed',
          error: result.error,
        })
        failed++
      }
    } catch (error) {
      // Increment retry count on exception too
      await deps.db
        .update(deferredWrites)
        .set({
          retryCount: sql`retry_count + 1`,
          lastRetry: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        .where(eq(deferredWrites.id, entry.id))

      results.push({
        id: entry.id,
        operation: entry.operation,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      failed++
    }
  }

  return {
    success: true,
    dry_run: false,
    total: writesToProcess.length,
    processed: results.length,
    succeeded,
    failed,
    writes: results,
    message: `Processed ${results.length} deferred writes: ${succeeded} succeeded, ${failed} failed`,
  }
}

/**
 * Clear all unprocessed deferred writes.
 *
 * @param deps - Database dependency
 * @returns Number of writes cleared
 */
export async function kb_clear_deferred_writes(
  deps: DeferredWritesDeps,
): Promise<{ cleared: number; message: string }> {
  const result = await deps.db
    .delete(deferredWrites)
    .where(isNull(deferredWrites.processedAt))
    .returning({ id: deferredWrites.id })

  const count = result.length

  return {
    cleared: count,
    message: `Cleared ${count} deferred writes`,
  }
}

/**
 * Helper to wrap a KB operation with deferred write fallback.
 *
 * On connection error: tries to queue to DB.
 * If DB queue also fails: logs warning and accepts loss.
 */
export async function withDeferredFallback<T>(
  operation: () => Promise<T>,
  context: {
    operation: DeferredOperationType
    payload: Record<string, unknown>
    story_id?: string
    agent?: string
    deps: DeferredWritesDeps
  },
): Promise<{ success: true; result: T } | { success: false; queued: boolean; id?: string }> {
  try {
    const result = await operation()
    return { success: true, result }
  } catch (error) {
    // Check if this is a connection error
    const isConnectionError =
      error instanceof Error &&
      (error.message.includes('ECONNREFUSED') ||
        error.message.includes('connection') ||
        error.message.includes('timeout'))

    if (isConnectionError) {
      // Try to queue to DB
      try {
        const queueResult = await kb_queue_deferred_write(
          {
            operation: context.operation,
            payload: context.payload,
            error: error instanceof Error ? error.message : 'Unknown error',
            story_id: context.story_id,
            agent: context.agent,
          },
          context.deps,
        )

        return { success: false, queued: true, id: queueResult.id }
      } catch (queueError) {
        // DB is also down — accept the loss
        logger.warn('Deferred write lost: DB unavailable for both operation and queue', {
          operation: context.operation,
          story_id: context.story_id,
          original_error: error instanceof Error ? error.message : 'Unknown error',
          queue_error: queueError instanceof Error ? queueError.message : 'Unknown error',
        })

        return { success: false, queued: false }
      }
    }

    // Re-throw non-connection errors
    throw error
  }
}

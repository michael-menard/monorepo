/**
 * Deferred KB Writes Processing (KBMEM-022)
 *
 * Handles failed KB writes by queueing them for later processing.
 * When KB is unavailable during a write operation, the write is
 * saved to a deferred writes file and processed when KB reconnects.
 *
 * @see plans/future/kb-memory-architecture/PLAN.md
 */

import { readFile, writeFile, access, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { constants } from 'node:fs'
import { z } from 'zod'

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
 * Schema for a deferred write entry.
 */
export const DeferredWriteEntrySchema = z.object({
  /** Unique ID for this deferred write */
  id: z.string().uuid(),

  /** The operation type that failed */
  operation: DeferredOperationTypeSchema,

  /** The payload that was being written */
  payload: z.record(z.unknown()),

  /** When the write was attempted */
  timestamp: z.string().datetime(),

  /** Error message from the failed attempt */
  error: z.string(),

  /** Number of retry attempts */
  retry_count: z.number().int().min(0).default(0),

  /** Last retry attempt timestamp */
  last_retry: z.string().datetime().optional(),

  /** Story ID if applicable */
  story_id: z.string().optional(),

  /** Agent that attempted the write */
  agent: z.string().optional(),
})

export type DeferredWriteEntry = z.infer<typeof DeferredWriteEntrySchema>

/**
 * Schema for the deferred writes file structure.
 */
export const DeferredWritesFileSchema = z.object({
  /** Schema version for forward compatibility */
  version: z.literal('1.0'),

  /** Array of deferred writes */
  writes: z.array(DeferredWriteEntrySchema),

  /** Last updated timestamp */
  updated_at: z.string().datetime(),
})

export type DeferredWritesFile = z.infer<typeof DeferredWritesFileSchema>

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
export interface QueueDeferredWriteResult {
  success: boolean
  id: string
  message: string
}

/**
 * Result of processing a single deferred write.
 */
export interface ProcessedWrite {
  id: string
  operation: DeferredOperationType
  status: 'success' | 'failed' | 'skipped'
  error?: string
}

/**
 * Result of processing deferred writes.
 */
export interface ProcessDeferredWritesResult {
  success: boolean
  dry_run: boolean
  total: number
  processed: number
  succeeded: number
  failed: number
  writes: ProcessedWrite[]
  message: string
}

/**
 * Result of listing deferred writes.
 */
export interface ListDeferredWritesResult {
  success: boolean
  total: number
  writes: DeferredWriteEntry[]
  message: string
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Default path for deferred writes file.
 * Relative to the git worktree root at /_implementation/
 */
export const DEFAULT_DEFERRED_WRITES_PATH = '_implementation/DEFERRED-KB-WRITES.yaml'

/**
 * Maximum retry count before marking as permanent failure.
 */
export const MAX_RETRY_COUNT = 5

// ============================================================================
// File Operations
// ============================================================================

/**
 * Check if a file exists.
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK)
    return true
  } catch {
    return false
  }
}

/**
 * Read deferred writes file.
 */
export async function readDeferredWritesFile(filePath: string): Promise<DeferredWritesFile> {
  if (!(await fileExists(filePath))) {
    return {
      version: '1.0',
      writes: [],
      updated_at: new Date().toISOString(),
    }
  }

  const content = await readFile(filePath, 'utf-8')

  // Parse YAML-like format (simple JSON for now)
  const parsed = JSON.parse(content)
  return DeferredWritesFileSchema.parse(parsed)
}

/**
 * Write deferred writes file.
 */
export async function writeDeferredWritesFile(
  filePath: string,
  data: DeferredWritesFile,
): Promise<void> {
  // Ensure directory exists
  const dir = dirname(filePath)
  await mkdir(dir, { recursive: true })

  // Write as JSON (could be YAML if we add a YAML library)
  const content = JSON.stringify(data, null, 2)
  await writeFile(filePath, content, 'utf-8')
}

// ============================================================================
// Operations
// ============================================================================

/**
 * Queue a failed write for later processing.
 *
 * @param input - Write details to queue
 * @param filePath - Path to deferred writes file
 * @returns Queue result
 */
export async function kb_queue_deferred_write(
  input: KbQueueDeferredWriteInput,
  filePath: string = DEFAULT_DEFERRED_WRITES_PATH,
): Promise<QueueDeferredWriteResult> {
  const validated = KbQueueDeferredWriteInputSchema.parse(input)

  // Read existing file
  const data = await readDeferredWritesFile(filePath)

  // Create new entry
  const id = crypto.randomUUID()
  const entry: DeferredWriteEntry = {
    id,
    operation: validated.operation,
    payload: validated.payload,
    timestamp: new Date().toISOString(),
    error: validated.error,
    retry_count: 0,
    story_id: validated.story_id,
    agent: validated.agent,
  }

  // Add to writes array
  data.writes.push(entry)
  data.updated_at = new Date().toISOString()

  // Write back
  await writeDeferredWritesFile(filePath, data)

  return {
    success: true,
    id,
    message: `Queued deferred write for ${validated.operation}`,
  }
}

/**
 * List pending deferred writes.
 *
 * @param input - Filter options
 * @param filePath - Path to deferred writes file
 * @returns List of deferred writes
 */
export async function kb_list_deferred_writes(
  input: KbListDeferredWritesInput,
  filePath: string = DEFAULT_DEFERRED_WRITES_PATH,
): Promise<ListDeferredWritesResult> {
  const validated = KbListDeferredWritesInputSchema.parse(input)

  // Read file
  const data = await readDeferredWritesFile(filePath)

  // Filter writes
  let writes = data.writes

  if (validated.operation) {
    writes = writes.filter(w => w.operation === validated.operation)
  }

  if (validated.story_id) {
    writes = writes.filter(w => w.story_id === validated.story_id)
  }

  // Apply limit
  writes = writes.slice(0, validated.limit)

  return {
    success: true,
    total: data.writes.length,
    writes,
    message: `Found ${writes.length} deferred writes (${data.writes.length} total)`,
  }
}

/**
 * Process deferred writes.
 *
 * This function would normally invoke the actual KB operations, but we don't
 * have access to the database connection here. Instead, this function is meant
 * to be called with a processor callback that handles the actual writes.
 *
 * @param input - Process options
 * @param filePath - Path to deferred writes file
 * @param processor - Callback to process individual writes
 * @returns Process result
 */
export async function kb_process_deferred_writes(
  input: KbProcessDeferredWritesInput,
  filePath: string = DEFAULT_DEFERRED_WRITES_PATH,
  processor?: (entry: DeferredWriteEntry) => Promise<{ success: boolean; error?: string }>,
): Promise<ProcessDeferredWritesResult> {
  const validated = KbProcessDeferredWritesInputSchema.parse(input)

  // Read file
  const data = await readDeferredWritesFile(filePath)

  // Filter writes to process
  let writesToProcess = data.writes

  if (validated.operation) {
    writesToProcess = writesToProcess.filter(w => w.operation === validated.operation)
  }

  if (validated.story_id) {
    writesToProcess = writesToProcess.filter(w => w.story_id === validated.story_id)
  }

  // Limit
  writesToProcess = writesToProcess.slice(0, validated.limit)

  if (validated.dry_run) {
    // Dry run - just return what would be processed
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
  const successIds: string[] = []

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
        results.push({
          id: entry.id,
          operation: entry.operation,
          status: 'success',
        })
        succeeded++
        successIds.push(entry.id)
      } else {
        results.push({
          id: entry.id,
          operation: entry.operation,
          status: 'failed',
          error: result.error,
        })
        failed++

        // Update retry count
        const idx = data.writes.findIndex(w => w.id === entry.id)
        if (idx !== -1) {
          data.writes[idx].retry_count++
          data.writes[idx].last_retry = new Date().toISOString()
          if (result.error) {
            data.writes[idx].error = result.error
          }
        }
      }
    } catch (error) {
      results.push({
        id: entry.id,
        operation: entry.operation,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      failed++
    }
  }

  // Remove successful writes from file
  data.writes = data.writes.filter(w => !successIds.includes(w.id))
  data.updated_at = new Date().toISOString()
  await writeDeferredWritesFile(filePath, data)

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
 * Clear all deferred writes (for cleanup/reset).
 *
 * @param filePath - Path to deferred writes file
 * @returns Number of writes cleared
 */
export async function kb_clear_deferred_writes(
  filePath: string = DEFAULT_DEFERRED_WRITES_PATH,
): Promise<{ cleared: number; message: string }> {
  const data = await readDeferredWritesFile(filePath)
  const count = data.writes.length

  data.writes = []
  data.updated_at = new Date().toISOString()
  await writeDeferredWritesFile(filePath, data)

  return {
    cleared: count,
    message: `Cleared ${count} deferred writes`,
  }
}

/**
 * Helper to wrap a KB operation with deferred write fallback.
 *
 * @example
 * ```typescript
 * const result = await withDeferredFallback(
 *   () => kb_add({ content, role }),
 *   { operation: 'kb_add', payload: { content, role }, story_id }
 * )
 * ```
 */
export async function withDeferredFallback<T>(
  operation: () => Promise<T>,
  context: {
    operation: DeferredOperationType
    payload: Record<string, unknown>
    story_id?: string
    agent?: string
    filePath?: string
  },
): Promise<{ success: true; result: T } | { success: false; queued: true; id: string }> {
  try {
    const result = await operation()
    return { success: true, result }
  } catch (error) {
    // Check if this is a KB unavailable error
    const isKbUnavailable =
      error instanceof Error &&
      (error.message.includes('ECONNREFUSED') ||
        error.message.includes('connection') ||
        error.message.includes('timeout'))

    if (isKbUnavailable) {
      // Queue for later
      const queueResult = await kb_queue_deferred_write(
        {
          operation: context.operation,
          payload: context.payload,
          error: error instanceof Error ? error.message : 'Unknown error',
          story_id: context.story_id,
          agent: context.agent,
        },
        context.filePath,
      )

      return { success: false, queued: true, id: queueResult.id }
    }

    // Re-throw non-connection errors
    throw error
  }
}

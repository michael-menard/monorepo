/**
 * Bulk Import Implementation
 *
 * Imports multiple knowledge entries using batch processing and the EmbeddingClient.
 *
 * Features:
 * - Batch processing with configurable batch size
 * - Progress logging every 100 entries
 * - Dry run mode for validation without writes
 * - Validate-only mode for structure validation
 * - Detailed error reporting with partial success
 * - Cost estimation and logging
 * - Session ID tracking for rollback support
 *
 * @see KNOW-006 AC3, AC4
 */

import { v4 as uuidv4 } from 'uuid'
import { logger } from '@repo/logger'
import { kb_add, type KbAddDeps } from '../crud-operations/index.js'
import type { EmbeddingClient } from '../embedding-client/index.js'
import { ParsedEntrySchema } from '../parsers/__types__/index.js'
import {
  type BulkImportInput,
  type BulkImportResult,
  type ImportError,
  type ImportProgressEvent,
  BulkImportInputSchema,
  estimateImportCost,
  formatCostEstimate,
  BULK_IMPORT_BATCH_SIZE,
  PROGRESS_LOG_INTERVAL,
} from './__types__/index.js'

/**
 * Dependencies for bulk import operation.
 */
export interface KbBulkImportDeps {
  /** Database client */
  db: KbAddDeps['db']

  /** Embedding client */
  embeddingClient: EmbeddingClient
}

/**
 * Bulk import knowledge entries.
 *
 * @param input - Bulk import input with entries and options
 * @param deps - Database and embedding client dependencies
 * @returns Bulk import result with success/failure counts and errors
 *
 * @example
 * ```typescript
 * const result = await kbBulkImport({
 *   entries: parsedEntries,
 *   dry_run: false,
 * }, deps)
 *
 * console.log(`Imported ${result.succeeded}/${result.total} entries`)
 * ```
 */
export async function kbBulkImport(
  input: BulkImportInput,
  deps: KbBulkImportDeps,
): Promise<BulkImportResult> {
  const startTime = Date.now()
  const sessionId = uuidv4()

  // Validate input
  const validated = BulkImportInputSchema.parse(input)
  const { entries, dry_run = false, validate_only = false } = validated

  // Initialize result
  const result: BulkImportResult = {
    total: entries.length,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    errors: [],
    duration_ms: 0,
    dry_run,
    validate_only,
    session_id: sessionId,
    created_entry_ids: [],
  }

  // Handle empty input
  if (entries.length === 0) {
    result.duration_ms = Date.now() - startTime
    logger.info('kbBulkImport: No entries to import', {
      session_id: sessionId,
      duration_ms: result.duration_ms,
    })
    return result
  }

  // Calculate and log cost estimate
  const estimatedCost = estimateImportCost(entries)
  result.estimated_cost_usd = estimatedCost

  logger.info('kbBulkImport: Starting bulk import', {
    session_id: sessionId,
    total_entries: entries.length,
    dry_run,
    validate_only,
    estimated_cost_usd: formatCostEstimate(estimatedCost),
    total_chars: entries.reduce((sum, e) => sum + e.content.length, 0),
  })

  // Validate all entries first
  const validationErrors: ImportError[] = []
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    const validation = ParsedEntrySchema.safeParse(entry)
    if (!validation.success) {
      validationErrors.push({
        index: i,
        reason: validation.error.issues
          .map(issue => `${issue.path.join('.')}: ${issue.message}`)
          .join('; '),
        code: 'VALIDATION_ERROR',
      })
    }
  }

  // If validation-only mode, return early
  if (validate_only) {
    result.failed = validationErrors.length
    result.skipped = entries.length - validationErrors.length
    result.errors = validationErrors
    result.duration_ms = Date.now() - startTime

    logger.info('kbBulkImport: Validate-only completed', {
      session_id: sessionId,
      validation_errors: validationErrors.length,
      valid_entries: result.skipped,
      duration_ms: result.duration_ms,
    })

    return result
  }

  // If dry run, simulate success for valid entries
  if (dry_run) {
    result.succeeded = entries.length - validationErrors.length
    result.failed = validationErrors.length
    result.errors = validationErrors
    result.duration_ms = Date.now() - startTime

    logger.info('kbBulkImport: Dry run completed', {
      session_id: sessionId,
      would_import: result.succeeded,
      validation_errors: result.failed,
      estimated_cost_usd: formatCostEstimate(estimatedCost),
      duration_ms: result.duration_ms,
    })

    return result
  }

  // Process entries in batches
  const errors: ImportError[] = [...validationErrors]
  const validIndices = new Set<number>()
  for (let i = 0; i < entries.length; i++) {
    if (!validationErrors.some(e => e.index === i)) {
      validIndices.add(i)
    }
  }

  const validEntries = entries.filter((_, i) => validIndices.has(i))
  const createdIds: string[] = []

  // Process in batches
  for (let batchStart = 0; batchStart < validEntries.length; batchStart += BULK_IMPORT_BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BULK_IMPORT_BATCH_SIZE, validEntries.length)
    const batch = validEntries.slice(batchStart, batchEnd)

    // Process batch entries sequentially
    for (let i = 0; i < batch.length; i++) {
      const globalIndex = batchStart + i
      const originalIndex = Array.from(validIndices)[globalIndex]
      const entry = batch[i]

      try {
        // Call kb_add with entry data
        const entryId = await kb_add(
          {
            content: entry.content,
            role: entry.role,
            tags: entry.tags ?? null,
          },
          deps,
        )

        createdIds.push(entryId)
        result.succeeded++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        const isEmbeddingError =
          errorMessage.includes('embedding') || errorMessage.includes('OpenAI')
        const isDatabaseError =
          errorMessage.includes('database') ||
          errorMessage.includes('drizzle') ||
          errorMessage.includes('postgres')

        errors.push({
          index: originalIndex,
          reason: errorMessage,
          code: isEmbeddingError
            ? 'EMBEDDING_ERROR'
            : isDatabaseError
              ? 'DATABASE_ERROR'
              : 'UNKNOWN_ERROR',
        })
        result.failed++

        logger.warn('kbBulkImport: Entry import failed', {
          session_id: sessionId,
          index: originalIndex,
          error: errorMessage,
        })
      }
    }

    // Log progress
    const processed = Math.min(batchEnd, validEntries.length)
    if (processed % PROGRESS_LOG_INTERVAL === 0 || processed === validEntries.length) {
      const progress: ImportProgressEvent = {
        current_index: processed,
        total_entries: entries.length,
        processed: processed + validationErrors.length,
        succeeded: result.succeeded,
        failed: result.failed + validationErrors.length,
        progress_percent: Math.round((processed / validEntries.length) * 100),
        elapsed_ms: Date.now() - startTime,
      }

      // Estimate remaining time
      if (processed > 0) {
        const msPerEntry = progress.elapsed_ms / processed
        progress.estimated_remaining_ms = Math.round(msPerEntry * (validEntries.length - processed))
      }

      logger.info('kbBulkImport: Progress', {
        session_id: sessionId,
        ...progress,
      })
    }
  }

  // Finalize result
  result.failed += validationErrors.length
  result.errors = errors
  result.created_entry_ids = createdIds
  result.duration_ms = Date.now() - startTime

  // Log completion with structured metrics (AC20)
  logger.info('kbBulkImport: Completed', {
    session_id: sessionId,
    total: result.total,
    succeeded: result.succeeded,
    failed: result.failed,
    duration_ms: result.duration_ms,
    entries_per_second:
      result.succeeded > 0 ? (result.succeeded / (result.duration_ms / 1000)).toFixed(2) : '0',
    estimated_cost_usd: formatCostEstimate(estimatedCost),
    error_count: result.errors.length,
  })

  return result
}

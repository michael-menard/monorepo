/**
 * Seed Type Schemas
 *
 * Zod schemas for bulk import operations and results.
 *
 * @see KNOW-006 AC3, AC4 for bulk import requirements
 */

import { z } from 'zod'
import { ParsedEntrySchema } from '../../parsers/__types__/index.js'

/**
 * Maximum entries per bulk import call.
 *
 * @see KNOW-006 AC3 - Enforces max 1000 entries per call
 */
export const MAX_BULK_IMPORT_ENTRIES = 1000

/**
 * Batch size for processing entries.
 * Balances memory usage with API efficiency.
 */
export const BULK_IMPORT_BATCH_SIZE = 10

/**
 * Progress logging interval.
 * Logs progress every N entries.
 */
export const PROGRESS_LOG_INTERVAL = 100

/**
 * Schema for bulk import input.
 *
 * @see KNOW-006 AC3
 */
export const BulkImportInputSchema = z.object({
  /** Array of parsed entries to import */
  entries: z
    .array(ParsedEntrySchema)
    .max(
      MAX_BULK_IMPORT_ENTRIES,
      `Cannot import more than ${MAX_BULK_IMPORT_ENTRIES} entries per call`,
    ),

  /** Dry run mode - validates without writing to database */
  dry_run: z.boolean().optional().default(false),

  /** Validate only mode - validates structure without generating embeddings */
  validate_only: z.boolean().optional().default(false),
})

export type BulkImportInput = z.infer<typeof BulkImportInputSchema>

/**
 * Schema for individual import error.
 *
 * @see KNOW-006 AC4
 */
export const ImportErrorSchema = z.object({
  /** Index of the failed entry in the input array */
  index: z.number().int().min(0),

  /** Error reason/message */
  reason: z.string(),

  /** Entry ID if known (e.g., from YAML id field) */
  entry_id: z.string().optional(),

  /** Error code for programmatic handling */
  code: z
    .enum(['VALIDATION_ERROR', 'EMBEDDING_ERROR', 'DATABASE_ERROR', 'UNKNOWN_ERROR'])
    .optional(),
})

export type ImportError = z.infer<typeof ImportErrorSchema>

/**
 * Schema for bulk import result.
 *
 * @see KNOW-006 AC3, AC4
 */
export const BulkImportResultSchema = z.object({
  /** Total number of entries in input */
  total: z.number().int().min(0),

  /** Number of successfully imported entries */
  succeeded: z.number().int().min(0),

  /** Number of failed entries */
  failed: z.number().int().min(0),

  /** Number of skipped entries (e.g., validation-only mode) */
  skipped: z.number().int().min(0),

  /** Array of error details for failed entries */
  errors: z.array(ImportErrorSchema),

  /** Total duration in milliseconds */
  duration_ms: z.number().int().min(0),

  /** Whether this was a dry run */
  dry_run: z.boolean(),

  /** Whether this was validate-only mode */
  validate_only: z.boolean(),

  /** Session ID for tracking/rollback */
  session_id: z.string().uuid().optional(),

  /** Estimated API cost in USD */
  estimated_cost_usd: z.number().min(0).optional(),

  /** IDs of successfully created entries */
  created_entry_ids: z.array(z.string().uuid()).optional(),
})

export type BulkImportResult = z.infer<typeof BulkImportResultSchema>

/**
 * Schema for progress event (for logging/monitoring).
 */
export const ImportProgressEventSchema = z.object({
  /** Current entry index being processed */
  current_index: z.number().int().min(0),

  /** Total entries to process */
  total_entries: z.number().int().min(0),

  /** Entries processed so far */
  processed: z.number().int().min(0),

  /** Entries succeeded so far */
  succeeded: z.number().int().min(0),

  /** Entries failed so far */
  failed: z.number().int().min(0),

  /** Progress percentage (0-100) */
  progress_percent: z.number().min(0).max(100),

  /** Elapsed time in milliseconds */
  elapsed_ms: z.number().int().min(0),

  /** Estimated remaining time in milliseconds */
  estimated_remaining_ms: z.number().int().min(0).optional(),
})

export type ImportProgressEvent = z.infer<typeof ImportProgressEventSchema>

/**
 * Dependencies for bulk import operation.
 */
export interface KbBulkImportDeps {
  /** Database client for kb_add operations */
  db: unknown

  /** Embedding client for generating embeddings */
  embeddingClient: {
    generateEmbedding: (text: string) => Promise<number[]>
    generateEmbeddingsBatch: (texts: string[]) => Promise<number[][]>
  }
}

/**
 * Calculate estimated API cost for bulk import.
 *
 * @param entries - Array of entries to import
 * @returns Estimated cost in USD
 *
 * Formula: (total_chars / 4 / 1000) * 0.00002
 * Based on text-embedding-3-small pricing
 */
export function estimateImportCost(entries: Array<{ content: string }>): number {
  const totalChars = entries.reduce((sum, entry) => sum + entry.content.length, 0)
  const estimatedTokens = totalChars / 4
  const costPerThousandTokens = 0.00002
  return (estimatedTokens / 1000) * costPerThousandTokens
}

/**
 * Format cost estimate for display.
 *
 * @param cost - Cost in USD
 * @returns Formatted string (e.g., "$0.02")
 */
export function formatCostEstimate(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`
  }
  return `$${cost.toFixed(2)}`
}

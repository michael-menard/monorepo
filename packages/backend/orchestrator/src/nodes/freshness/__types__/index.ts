/**
 * KB Freshness Check - Zod Schemas
 *
 * Defines input/output schemas for runKbFreshnessCheck.
 *
 * @see APIP-4060 AC-8, AC-9
 */

import { z } from 'zod'

/**
 * Configuration schema for KB freshness check.
 *
 * Defaults:
 * - staleDays: 90
 * - dryRun: false
 * - batchSize: 500
 * - maxDurationMs: 300000 (5 minutes)
 */
export const KbFreshnessConfigSchema = z.object({
  /** Number of days after which an entry is considered stale */
  staleDays: z.number().int().positive().default(90),

  /** If true, scan only — no DB mutations performed */
  dryRun: z.boolean().default(false),

  /** Number of entries to process per batch */
  batchSize: z.number().int().positive().default(500),

  /**
   * Maximum run duration in milliseconds.
   * Processing halts at batch boundary when exceeded (default 5 min).
   */
  maxDurationMs: z.number().positive().default(300000),
})

export type KbFreshnessConfig = z.infer<typeof KbFreshnessConfigSchema>

/**
 * Result schema for KB freshness check.
 *
 * @see APIP-4060 AC-7
 */
export const KbFreshnessResultSchema = z.object({
  /** Number of entries auto-archived (referencing confirmed non-existent files) */
  archived_count: z.number().int().min(0),

  /** Number of entries flagged with 'stale-candidate' tag (aged, file exists or no path) */
  flagged_count: z.number().int().min(0),

  /** Number of entries skipped (no file reference, or per-entry error) */
  skipped_count: z.number().int().min(0),

  /** Total entries scanned across all batches */
  entries_scanned: z.number().int().min(0),

  /** Total elapsed time in milliseconds */
  duration_ms: z.number().min(0),

  /** Whether the run was in dry-run mode (no mutations) */
  dry_run: z.boolean(),

  /** Number of batches processed */
  batches_processed: z.number().int().min(0),

  /**
   * Whether processing was truncated early due to maxDurationMs being exceeded.
   * Partial counts are returned when true.
   */
  truncated: z.boolean(),
})

export type KbFreshnessResult = z.infer<typeof KbFreshnessResultSchema>

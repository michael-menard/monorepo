/**
 * Change Telemetry Module
 *
 * Zod schema and write function for wint.change_telemetry rows.
 * Captures per-change-attempt data as raw input for the model affinity
 * learning system (APIP-3020).
 *
 * Story: APIP-3010 - Change Telemetry Table and Instrumentation
 *
 * Architecture:
 * - ChangeTelemetrySchema defines the shape of a telemetry record (Zod-first, no interfaces)
 * - writeTelemetry() is fire-and-continue: it awaits the DB write but catches all
 *   errors and returns void without rethrowing — telemetry must NEVER block the change loop
 * - DB is injected (not imported) for testability and loose coupling
 *
 * Gating:
 * - AC-7 (change-loop instrumentation call sites) is GATED on APIP-1030
 * - TODO(APIP-1030): Wire writeTelemetry() calls into change-loop.ts once APIP-1030 is merged
 */

import { z } from 'zod'
import { logger } from '@repo/logger'

// ============================================================================
// Zod Schema
// ============================================================================

/**
 * ChangeTelemetrySchema
 *
 * Mirrors the wint.change_telemetry SQL table columns.
 * All fields match the CHECK constraints defined in the migration.
 *
 * Nullable fields: escalatedTo, errorCode, errorMessage, durationMs
 * These are optional depending on the outcome and calling context.
 */
export const ChangeTelemetrySchema = z.object({
  // Story linkage
  storyId: z.string().min(1),

  // Model / affinity fields
  modelId: z.string().min(1),
  affinityKey: z.string().min(1),

  // Change classification — must match CHECK constraint values in 0028 migration
  changeType: z
    .enum(['unknown', 'add', 'modify', 'delete', 'rename', 'refactor'])
    .default('unknown'),
  fileType: z
    .enum(['unknown', 'ts', 'tsx', 'sql', 'yaml', 'json', 'md', 'sh', 'other'])
    .default('unknown'),

  // Outcome — 4 defined values per AC-3
  outcome: z.enum(['pass', 'fail', 'abort', 'budget_exhausted']),

  // Token usage
  tokensIn: z.number().int().min(0).default(0),
  tokensOut: z.number().int().min(0).default(0),

  // Escalation / retry metadata (nullable)
  escalatedTo: z.string().nullable().default(null),
  retryCount: z.number().int().min(0).default(0),

  // Error capture (nullable — only meaningful on fail/abort)
  errorCode: z.string().nullable().default(null),
  errorMessage: z.string().nullable().default(null),

  // Timing (nullable — not all callers will measure)
  durationMs: z.number().int().min(0).nullable().default(null),
})

/**
 * ChangeTelemetry type — inferred from ChangeTelemetrySchema.
 * Do NOT declare a TypeScript interface; use z.infer<> exclusively.
 */
export type ChangeTelemetry = z.infer<typeof ChangeTelemetrySchema>

// ============================================================================
// Minimal DB interface for dependency injection
// ============================================================================

/**
 * DbQueryable
 *
 * Minimal interface satisfied by pg.Pool and pg.Client.
 * Defines only the query method needed by writeTelemetry().
 * Using a named Zod schema is impractical for a DB client, so this is typed
 * as a structural duck-type compatible with pg's Pool/Client.
 *
 * Callers inject their own pg.Pool instance; this module never imports pg directly.
 */
export const DbQueryableSchema = z.object({
  query: z.function().args(z.string(), z.array(z.unknown()).optional()).returns(z.promise(z.any())),
})

export type DbQueryable = z.infer<typeof DbQueryableSchema>

// ============================================================================
// writeTelemetry
// ============================================================================

/**
 * writeTelemetry
 *
 * Writes a single change telemetry record to wint.change_telemetry.
 *
 * Fire-and-continue: awaits the DB write but swallows all errors via try/catch.
 * Logs a warning on failure — caller receives void regardless of outcome.
 *
 * DB failures MUST NOT propagate to the change loop (AC-6, risk note in story.yaml).
 *
 * @param record - Validated ChangeTelemetry record to persist
 * @param db - Injected pg-compatible database client (Pool or Client)
 * @returns Promise<void> — always resolves, never rejects
 *
 * TODO(APIP-1030): Call writeTelemetry() from change-loop.ts once APIP-1030 is merged (AC-7)
 */
export async function writeTelemetry(record: ChangeTelemetry, db: DbQueryable): Promise<void> {
  try {
    const validated = ChangeTelemetrySchema.parse(record)

    await db.query(
      `INSERT INTO wint.change_telemetry (
        story_id,
        model_id,
        affinity_key,
        change_type,
        file_type,
        outcome,
        tokens_in,
        tokens_out,
        escalated_to,
        retry_count,
        error_code,
        error_message,
        duration_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        validated.storyId,
        validated.modelId,
        validated.affinityKey,
        validated.changeType,
        validated.fileType,
        validated.outcome,
        validated.tokensIn,
        validated.tokensOut,
        validated.escalatedTo,
        validated.retryCount,
        validated.errorCode,
        validated.errorMessage,
        validated.durationMs,
      ],
    )
  } catch (err) {
    // Telemetry failures must never propagate — log and continue
    logger.warn(
      'writeTelemetry: failed to write change telemetry row — continuing without error',
      {
        err: err instanceof Error ? err.message : String(err),
        storyId: record.storyId,
        outcome: record.outcome,
      },
    )
  }
}

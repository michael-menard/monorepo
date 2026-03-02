/**
 * KB Freshness Check
 *
 * Scans knowledge base entries older than a configurable age threshold and:
 * - Auto-archives entries referencing confirmed non-existent file paths
 * - Flags borderline entries with a 'stale-candidate' tag
 * - Returns a structured summary with counts and timing metadata
 *
 * Designed as a standalone async function for APIP-3090 cron registration.
 * No LangGraph imports. Transport-agnostic.
 *
 * All infrastructure dependencies are fully injectable for testability.
 *
 * @see APIP-4060
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import { KbFreshnessConfigSchema } from './__types__/index.js'
import type { KbFreshnessConfig, KbFreshnessResult } from './__types__/index.js'

// ---------------------------------------------------------------------------
// File path extraction heuristic (AC-3)
// ---------------------------------------------------------------------------

/**
 * Regex for extracting file path references from KB entry content.
 *
 * Conservative: only matches paths with explicit file extensions.
 * Note: paths in code blocks are an acceptable false-positive class —
 * the conservative archival policy (archive ONLY confirmed non-existent paths)
 * provides adequate protection without complex code-block stripping.
 *
 * @see APIP-4060 AC-3
 */
export const FILE_PATH_REGEX = /(apps|packages|src)\/[^\s'"`.,\]]+\.(ts|tsx|js|json|md)/g

/**
 * Extract the first file path reference from entry content.
 * Multiple matches: process the first confirmed non-existent path (archive trumps flag).
 * Returns null if no match found.
 */
export function extractFirstFilePath(content: string): string | null {
  FILE_PATH_REGEX.lastIndex = 0
  const match = FILE_PATH_REGEX.exec(content)
  return match ? match[0] : null
}

// ---------------------------------------------------------------------------
// Injectable types (AC-1)
// ---------------------------------------------------------------------------

/**
 * Minimal shape of a knowledge entry required for freshness operations.
 * Matches the relevant subset of KnowledgeEntry from @repo/knowledge-base.
 */
export const FreshnessKnowledgeEntrySchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  role: z.string(),
  tags: z.array(z.string()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  archived: z.boolean(),
  archivedAt: z.date().nullable(),
})

export type FreshnessKnowledgeEntry = z.infer<typeof FreshnessKnowledgeEntrySchema>

// NOTE: The following interfaces define injectable function/method contracts
// for dependency injection. Zod cannot validate function shapes at runtime,
// so these remain as TypeScript interfaces by design.

/**
 * Minimal embedding client shape (no-op mock acceptable in tests).
 * Required by kb_update internally even for non-content mutations (archival + tag).
 *
 * @see APIP-4060 AC-1
 */
export interface FreshnessEmbeddingClient {
  generateEmbedding: (content: string) => Promise<number[]>
}

/**
 * Injectable audit logger interface.
 * Matches AuditLogger.logUpdate from apps/api/knowledge-base/src/audit/audit-logger.ts.
 */
export interface FreshnessAuditLogger {
  logUpdate: (
    entryId: string,
    previousEntry: FreshnessKnowledgeEntry,
    newEntry: FreshnessKnowledgeEntry,
    userContext?: Record<string, unknown>,
  ) => Promise<void>
}

/**
 * Injectable kb_update function shape.
 * Matches kb_update from apps/api/knowledge-base/src/crud-operations/kb-update.ts.
 */
export type FreshnessKbUpdateFn = (
  input: { id: string; archived?: boolean; archived_at?: Date; tags?: string[] | null },
  deps: { db: unknown; embeddingClient: FreshnessEmbeddingClient },
) => Promise<FreshnessKnowledgeEntry>

/**
 * Injectable filesystem interface for file existence checks (AC-3).
 * Default: node:fs.existsSync. Inject a mock for testing.
 */
export interface FreshnessFs {
  existsSync: (path: string) => boolean
}

/**
 * Injectable Drizzle batch query function (AC-14).
 *
 * Caller provides a function that executes:
 *   db.select().from(knowledgeEntries)
 *     .where(and(lt(createdAt, cutoff), eq(archived, false)))
 *     .limit(batchSize).offset(offset)
 *
 * This abstraction allows full injection for unit tests without the
 * @repo/knowledge-base build dependency.
 */
export type FreshnessBatchQueryFn = (
  cutoff: Date,
  limit: number,
  offset: number,
) => Promise<FreshnessKnowledgeEntry[]>

/**
 * Dependencies for runKbFreshnessCheck (AC-1).
 *
 * All fields except batchQuery are optional with documented defaults:
 * - batchQuery: REQUIRED — provides the Drizzle batch select (AC-14)
 * - fs: defaults to node:fs.existsSync
 * - embeddingClient: no-op mock default (acceptable per AC-1)
 * - auditLogger: REQUIRED for production; must implement logUpdate
 * - kbUpdate: REQUIRED for production; must implement kb_update signature
 */
export interface KbFreshnessCheckDeps {
  /** Drizzle batch query function — executes the staleness select (AC-14) */
  batchQuery: FreshnessBatchQueryFn
  /** kb_update function for archival and flag mutations (AC-4, AC-5) */
  kbUpdate: FreshnessKbUpdateFn
  /** Audit logger for tracking mutations (AC-4, AC-15) */
  auditLogger: FreshnessAuditLogger
  /** Filesystem for file existence checks (AC-3); defaults to node:fs */
  fs?: FreshnessFs
  /** Embedding client passed to kbUpdate; no-op mock acceptable (AC-1) */
  embeddingClient?: FreshnessEmbeddingClient
  /** Raw db reference passed through to kbUpdate */
  db: unknown
}

// ---------------------------------------------------------------------------
// Cutoff date calculation
// ---------------------------------------------------------------------------

/**
 * Calculate cutoff date for staleness filter.
 * Entries with createdAt before this date are stale candidates.
 */
export function calculateCutoffDate(staleDays: number): Date {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - staleDays)
  cutoff.setHours(0, 0, 0, 0)
  return cutoff
}

// ---------------------------------------------------------------------------
// Main function (AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-11)
// ---------------------------------------------------------------------------

/**
 * Run KB freshness check.
 *
 * Scans KB entries older than `config.staleDays` (default: 90) that are not
 * yet archived. For each candidate:
 * - If content references a confirmed non-existent file path: auto-archive (AC-4)
 * - If aged with no confirmed non-existent path (file exists): flag 'stale-candidate' (AC-5)
 * - If no file path reference in content: skip (increment skipped_count)
 *
 * In dry-run mode (AC-6): counts returned without any DB mutations.
 * Time-bounded (AC-13): halts at batch boundary if maxDurationMs exceeded.
 * Per-entry errors do not abort the batch (AC-12).
 *
 * Uses direct Drizzle queries via the injected batchQuery (AC-14).
 * Uses in-memory batch entries as previousEntry for AuditLogger (AC-15).
 *
 * @param deps - Injectable dependencies
 * @param config - Configuration with Zod defaults applied
 * @returns Structured result with counts, timing, and truncation flag
 *
 * @see APIP-4060
 */
export async function runKbFreshnessCheck(
  deps: KbFreshnessCheckDeps,
  config: KbFreshnessConfig,
): Promise<KbFreshnessResult> {
  const startTime = Date.now()

  // Validate and apply defaults to config (AC-9)
  const validatedConfig = KbFreshnessConfigSchema.parse(config)
  const { staleDays, dryRun, batchSize, maxDurationMs } = validatedConfig

  // Resolve optional deps with defaults
  const fsModule: FreshnessFs = deps.fs ?? { existsSync: (await import('node:fs')).existsSync }
  const embeddingClient: FreshnessEmbeddingClient = deps.embeddingClient ?? {
    generateEmbedding: async () => [],
  }

  const cutoff = calculateCutoffDate(staleDays)

  logger.info('Starting KB freshness check', {
    staleDays,
    dryRun,
    batchSize,
    maxDurationMs,
    cutoff: cutoff.toISOString(),
  })

  // Result accumulators
  let archived_count = 0
  let flagged_count = 0
  let skipped_count = 0
  let entries_scanned = 0
  let batches_processed = 0
  let truncated = false

  let offset = 0

  // Batch loop pattern (AC-14) — mirrors retention-policy.ts structure
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // AC-14: Fetch next batch via injected Drizzle query
    // Equivalent to: db.select().from(knowledgeEntries)
    //   .where(and(lt(createdAt, cutoff), eq(archived, false)))
    //   .limit(batchSize).offset(offset)
    const batch = await deps.batchQuery(cutoff, batchSize, offset)

    if (batch.length === 0) {
      break
    }

    batches_processed++
    entries_scanned += batch.length

    logger.debug('KB freshness batch started', {
      batch: batches_processed,
      count: batch.length,
      offset,
    })

    // Process each entry in the batch
    for (const entry of batch) {
      try {
        // AC-3: Extract first file path reference from entry content
        const filePath = extractFirstFilePath(entry.content)

        if (filePath === null) {
          // No file path reference — skip (not flagged or archived)
          skipped_count++
          continue
        }

        // Check whether the referenced file exists in the repository
        const fileExists = fsModule.existsSync(filePath)

        if (dryRun) {
          // AC-6: Dry-run mode — accumulate counts, no mutations
          if (!fileExists) {
            archived_count++
          } else {
            flagged_count++
          }
          continue
        }

        if (!fileExists) {
          // AC-4: Auto-archive entries referencing confirmed non-existent file paths
          const newEntry = await deps.kbUpdate(
            { id: entry.id, archived: true, archived_at: new Date() },
            { db: deps.db, embeddingClient },
          )

          // AC-15: in-memory batch entry serves as previousEntry — no separate fetch needed
          try {
            await deps.auditLogger.logUpdate(entry.id, entry, newEntry)
          } catch (auditErr) {
            logger.error('AuditLogger.logUpdate failed (soft fail)', {
              entry_id: entry.id,
              error: auditErr instanceof Error ? auditErr.message : String(auditErr),
            })
          }

          archived_count++
        } else {
          // AC-5: Flag aged entries where file still exists ('stale-candidate' tag)
          const existingTags = entry.tags ?? []
          const newTags = existingTags.includes('stale-candidate')
            ? existingTags
            : [...existingTags, 'stale-candidate']

          const newEntry = await deps.kbUpdate(
            { id: entry.id, tags: newTags },
            { db: deps.db, embeddingClient },
          )

          // AC-15: in-memory batch entry serves as previousEntry
          try {
            await deps.auditLogger.logUpdate(entry.id, entry, newEntry)
          } catch (auditErr) {
            logger.error('AuditLogger.logUpdate failed (soft fail)', {
              entry_id: entry.id,
              error: auditErr instanceof Error ? auditErr.message : String(auditErr),
            })
          }

          flagged_count++
        }
      } catch (entryErr) {
        // AC-12: Per-entry errors do not abort the batch
        logger.error('KB freshness: per-entry processing error, skipping', {
          entry_id: entry.id,
          error: entryErr instanceof Error ? entryErr.message : String(entryErr),
        })
        skipped_count++
      }
    }

    logger.debug('KB freshness batch complete', {
      batch: batches_processed,
      archived: archived_count,
      flagged: flagged_count,
      skipped: skipped_count,
    })

    // Exit if last batch was smaller than batchSize (no more entries remain)
    if (batch.length < batchSize) {
      break
    }

    offset += batchSize

    // AC-13: Time truncation — halt at batch boundary if maxDurationMs exceeded
    if (Date.now() - startTime > maxDurationMs) {
      truncated = true
      logger.warn('KB freshness check truncated: maxDurationMs exceeded', {
        maxDurationMs,
        elapsed_ms: Date.now() - startTime,
        batches_processed,
        entries_scanned,
      })
      break
    }
  }

  const duration_ms = Date.now() - startTime

  const result: KbFreshnessResult = {
    archived_count,
    flagged_count,
    skipped_count,
    entries_scanned,
    duration_ms,
    dry_run: dryRun,
    batches_processed,
    truncated,
  }

  logger.info('KB freshness check complete', {
    ...result,
    cutoff: cutoff.toISOString(),
  })

  return result
}

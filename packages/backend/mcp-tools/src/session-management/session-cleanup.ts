/**
 * Session Cleanup MCP Tool
 * WINT-0110 AC-5: Archives old completed sessions with dryRun safety
 *
 * Features:
 * - Default dryRun=true (safety mechanism - requires explicit opt-in)
 * - Deletes only completed sessions (endedAt IS NOT NULL)
 * - Retention period in days (default 90)
 * - Returns count of deleted sessions and cutoff date
 * - Zod validation at entry
 * - Resilient error handling
 */

import { and, isNotNull, lt, sql } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { contextSessions } from '@repo/knowledge-base/db'
import {
  SessionCleanupInputSchema,
  type SessionCleanupInput,
  type SessionCleanupResult,
} from './__types__/index.js'

/**
 * Clean up old completed sessions (archives by deletion)
 *
 * SAFETY: Defaults to dryRun=true - must explicitly set dryRun=false to delete
 *
 * @param input - Cleanup parameters with safety controls
 * @returns Cleanup result with count and cutoff date
 *
 * @example Dry run (default - no deletion)
 * ```typescript
 * const result = await sessionCleanup({
 *   retentionDays: 90,
 * })
 * console.log(`Would delete ${result.deletedCount} sessions`)
 * ```
 *
 * @example Actual cleanup (explicit opt-in)
 * ```typescript
 * const result = await sessionCleanup({
 *   retentionDays: 90,
 *   dryRun: false, // MUST explicitly set to false
 * })
 * console.log(`Deleted ${result.deletedCount} sessions`)
 * ```
 */
export async function sessionCleanup(
  input: Partial<SessionCleanupInput> = {},
): Promise<SessionCleanupResult> {
  // Validate input - fail fast if invalid (AC-6)
  const parsed = SessionCleanupInputSchema.parse(input)

  try {
    // Calculate cutoff date (retention period from now)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - parsed.retentionDays)

    if (parsed.dryRun) {
      // DRY RUN: Count sessions that would be deleted (AC-5)
      const sessionsToDelete = await db
        .select({ count: sql<number>`count(*)` })
        .from(contextSessions)
        .where(
          and(
            isNotNull(contextSessions.endedAt), // Only completed sessions
            lt(contextSessions.endedAt, cutoffDate), // Older than retention period
          ),
        )

      const count = Number(sessionsToDelete[0]?.count ?? 0)

      return {
        deletedCount: count,
        dryRun: true,
        cutoffDate,
      }
    } else {
      // ACTUAL CLEANUP: Delete old completed sessions (AC-5)
      const deletedSessions = await db
        .delete(contextSessions)
        .where(
          and(
            isNotNull(contextSessions.endedAt), // Only completed sessions (SAFETY)
            lt(contextSessions.endedAt, cutoffDate), // Older than retention period
          ),
        )
        .returning()

      return {
        deletedCount: deletedSessions.length,
        dryRun: false,
        cutoffDate,
      }
    }
  } catch (error) {
    // Database errors: log warning, return zero count
    logger.warn(
      `[mcp-tools] Failed to cleanup sessions (dryRun=${parsed.dryRun}):`,
      error instanceof Error ? error.message : String(error),
    )

    return {
      deletedCount: 0,
      dryRun: parsed.dryRun,
      cutoffDate: new Date(),
    }
  }
}

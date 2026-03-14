/**
 * Worktree Mark Complete MCP Tool
 * WINT-1130 AC-8: Updates worktree status (merged/abandoned) and timestamps
 *
 * Features:
 * - Updates status to 'merged' or 'abandoned'
 * - Sets corresponding timestamp (mergedAt or abandonedAt)
 * - Merges metadata with existing metadata object
 * - Zod validation at entry
 * - Resilient error handling (returns null if worktree not found)
 */

import { eq, sql } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { worktrees } from '@repo/knowledge-base/src/db'
import {
  WorktreeMarkCompleteInputSchema,
  type WorktreeMarkCompleteInput,
  type WorktreeMarkCompleteOutput,
} from './__types__/index.js'

/**
 * Mark worktree as complete (merged or abandoned)
 *
 * @param input - Worktree ID, status (merged/abandoned), optional metadata
 * @returns Success indicator or null if update failed
 *
 * @example Mark worktree as merged
 * ```typescript
 * const result = await worktreeMarkComplete({
 *   worktreeId: '123e4567-e89b-12d3-a456-426614174000',
 *   status: 'merged',
 *   metadata: { prNumber: 123, reason: 'Merged to main' },
 * })
 * ```
 *
 * @example Mark worktree as abandoned
 * ```typescript
 * const result = await worktreeMarkComplete({
 *   worktreeId: '123e4567-e89b-12d3-a456-426614174000',
 *   status: 'abandoned',
 *   metadata: { reason: 'Story cancelled' },
 * })
 * ```
 *
 * @example Handle non-existent worktree
 * ```typescript
 * const result = await worktreeMarkComplete({
 *   worktreeId: '00000000-0000-0000-0000-000000000000',
 *   status: 'merged',
 * })
 * // Returns null (worktree not found)
 * ```
 */
export async function worktreeMarkComplete(
  input: WorktreeMarkCompleteInput,
): Promise<WorktreeMarkCompleteOutput> {
  // Validate input - fail fast if invalid
  const parsed = WorktreeMarkCompleteInputSchema.parse(input)

  try {
    // Build update values dynamically based on status
    const now = new Date()
    const updateValues: any = {
      status: parsed.status,
      updatedAt: now,
    }

    // Set corresponding timestamp
    if (parsed.status === 'merged') {
      updateValues.mergedAt = now
    } else if (parsed.status === 'abandoned') {
      updateValues.abandonedAt = now
    }

    // Merge metadata if provided
    if (parsed.metadata) {
      updateValues.metadata = sql`
        COALESCE(${worktrees.metadata}, '{}'::jsonb) || ${JSON.stringify(parsed.metadata)}::jsonb
      `
    }

    const result = await db
      .update(worktrees)
      .set(updateValues)
      .where(eq(worktrees.id, parsed.worktreeId))
      .returning()

    if (result.length === 0) {
      // Worktree not found - return null (not an error)
      return null
    }

    return { success: true }
  } catch (error) {
    // Database errors: log warning, return null
    logger.warn(
      `[mcp-tools] Failed to mark worktree '${parsed.worktreeId}' as ${parsed.status}:`,
      error instanceof Error ? error.message : String(error),
    )
    return null
  }
}

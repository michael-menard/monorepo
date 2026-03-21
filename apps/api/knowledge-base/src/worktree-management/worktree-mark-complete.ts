/**
 * Worktree Mark Complete MCP Tool
 * WINT-1130 AC-8: Updates worktree status (merged/abandoned) and timestamps
 */

import { eq, sql } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { worktrees } from '../db/index.js'
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
 */
export async function worktreeMarkComplete(
  input: WorktreeMarkCompleteInput,
): Promise<WorktreeMarkCompleteOutput> {
  const parsed = WorktreeMarkCompleteInputSchema.parse(input)

  try {
    const now = new Date()
    const updateValues: any = {
      status: parsed.status,
      updatedAt: now,
    }

    if (parsed.status === 'merged') {
      updateValues.mergedAt = now
    } else if (parsed.status === 'abandoned') {
      updateValues.abandonedAt = now
    }

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
      return null
    }

    return { success: true }
  } catch (error) {
    logger.warn(
      `[worktree-management] Failed to mark worktree '${parsed.worktreeId}' as ${parsed.status}:`,
      error instanceof Error ? error.message : String(error),
    )
    return null
  }
}

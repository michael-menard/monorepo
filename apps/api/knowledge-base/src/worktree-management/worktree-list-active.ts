/**
 * Worktree List Active MCP Tool
 * WINT-1130 AC-7: Lists all active worktrees with pagination
 */

import { eq, desc } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { worktrees, stories } from '../db/index.js'
import {
  WorktreeListActiveInputSchema,
  type WorktreeListActiveInput,
  type WorktreeListActiveOutput,
} from './__types__/index.js'

/**
 * Query all active worktrees with pagination
 *
 * @param input - Pagination parameters (limit, offset)
 * @returns Array of active worktree records
 */
export async function worktreeListActive(
  input: WorktreeListActiveInput,
): Promise<WorktreeListActiveOutput> {
  const parsed = WorktreeListActiveInputSchema.parse(input)

  try {
    const results = await db
      .select({
        id: worktrees.id,
        storyId: stories.storyId,
        worktreePath: worktrees.worktreePath,
        branchName: worktrees.branchName,
        status: worktrees.status,
        createdAt: worktrees.createdAt,
        updatedAt: worktrees.updatedAt,
        mergedAt: worktrees.mergedAt,
        abandonedAt: worktrees.abandonedAt,
        metadata: worktrees.metadata,
      })
      .from(worktrees)
      .innerJoin(stories, eq(worktrees.storyId, stories.storyId))
      .where(eq(worktrees.status, 'active'))
      .orderBy(desc(worktrees.createdAt))
      .limit(parsed.limit)
      .offset(parsed.offset)

    return results.map(wt => ({
      ...wt,
      status: wt.status as 'active',
      metadata: wt.metadata ?? {},
    }))
  } catch (error) {
    logger.warn(
      '[worktree-management] Failed to list active worktrees:',
      error instanceof Error ? error.message : String(error),
    )
    return []
  }
}

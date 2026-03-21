/**
 * Worktree Get By Story MCP Tool
 * WINT-1130 AC-6: Retrieves active worktree for a story (or null)
 */

import { eq, and } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { getDbClient } from '../db/client.js'
import { worktrees, stories } from '../db/index.js'
import {
  WorktreeGetByStoryInputSchema,
  type WorktreeGetByStoryInput,
  type WorktreeGetByStoryOutput,
} from './__types__/index.js'

/**
 * Get active worktree for a story by UUID or human-readable ID
 *
 * @param input - Story ID (UUID or WINT-1130 format)
 * @returns Active worktree record or null if not found
 */
export async function worktreeGetByStory(
  input: WorktreeGetByStoryInput,
): Promise<WorktreeGetByStoryOutput> {
  const parsed = WorktreeGetByStoryInputSchema.parse(input)

  try {
    const [worktree] = await getDbClient()
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
      .where(and(eq(stories.storyId, parsed.storyId), eq(worktrees.status, 'active')))
      .limit(1)

    if (!worktree) {
      return null
    }

    return {
      ...worktree,
      status: worktree.status as 'active',
      metadata: worktree.metadata ?? {},
    }
  } catch (error) {
    logger.warn(
      `[worktree-management] Failed to get worktree for story '${parsed.storyId}':`,
      error instanceof Error ? error.message : String(error),
    )
    return null
  }
}

/**
 * Worktree Register MCP Tool
 * WINT-1130 AC-5: Creates new worktree record in database
 *
 * Features:
 * - Zod validation at entry (fail fast)
 * - FK constraint enforcement (storyId must exist in stories table)
 * - Resilient error handling (logs warnings, returns null on error)
 */

import { eq } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { worktrees, stories } from '@repo/knowledge-base/db'
import {
  WorktreeRegisterInputSchema,
  type WorktreeRegisterInput,
  type WorktreeRegisterOutput,
} from './__types__/index.js'

/**
 * Register a new worktree in the database
 *
 * @param input - Worktree registration parameters (storyId, worktreePath, branchName)
 * @returns Created worktree record or null if registration failed
 */
export async function worktreeRegister(
  input: WorktreeRegisterInput,
): Promise<WorktreeRegisterOutput> {
  const parsed = WorktreeRegisterInputSchema.parse(input)

  try {
    // Verify story exists before inserting
    const [story] = await db
      .select({ storyId: stories.storyId })
      .from(stories)
      .where(eq(stories.storyId, parsed.storyId))
      .limit(1)

    if (!story) {
      logger.warn(`[mcp-tools] Story '${parsed.storyId}' not found for worktree registration`)
      return null
    }

    const [worktree] = await db
      .insert(worktrees)
      .values({
        storyId: story.storyId,
        worktreePath: parsed.worktreePath,
        branchName: parsed.branchName,
        status: 'active',
      })
      .returning()

    return {
      id: worktree.id,
      storyId: worktree.storyId,
      worktreePath: worktree.worktreePath,
      branchName: worktree.branchName,
      status: 'active',
      createdAt: worktree.createdAt,
      updatedAt: worktree.updatedAt,
    }
  } catch (error) {
    logger.warn(
      `[mcp-tools] Failed to register worktree for story '${parsed.storyId}':`,
      error instanceof Error ? error.message : String(error),
    )
    return null
  }
}

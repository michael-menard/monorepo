/**
 * Worktree Get By Story MCP Tool
 * WINT-1130 AC-6: Retrieves active worktree for a story (or null)
 *
 * Features:
 * - Dual ID support: UUID or human-readable storyId
 * - Returns active worktree only (status='active')
 * - Returns null if no active worktree found (not an error)
 * - Zod validation at entry
 * - Resilient error handling
 */

import { eq, and, or } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { worktrees, stories } from '@repo/knowledge-base/src/db'
import {
  WorktreeGetByStoryInputSchema,
  type WorktreeGetByStoryInput,
  type WorktreeGetByStoryOutput,
} from './__types__/index.js'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Get active worktree for a story by UUID or human-readable ID
 *
 * @param input - Story ID (UUID or WINT-1130 format)
 * @returns Active worktree record or null if not found
 *
 * @example Query by UUID
 * ```typescript
 * const worktree = await worktreeGetByStory({
 *   storyId: '123e4567-e89b-12d3-a456-426614174000',
 * })
 * ```
 *
 * @example Query by human-readable ID
 * ```typescript
 * const worktree = await worktreeGetByStory({
 *   storyId: 'WINT-1130',
 * })
 * ```
 *
 * @example Handle no active worktree
 * ```typescript
 * const worktree = await worktreeGetByStory({
 *   storyId: 'WINT-1130',
 * })
 * // Returns null if no active worktree (not an error)
 * ```
 */
export async function worktreeGetByStory(
  input: WorktreeGetByStoryInput,
): Promise<WorktreeGetByStoryOutput> {
  // Validate input - fail fast if invalid
  const parsed = WorktreeGetByStoryInputSchema.parse(input)

  try {
    // Join with stories table to support both UUID and human-readable ID lookup
    const [worktree] = await db
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
      .innerJoin(stories, eq(worktrees.storyId, stories.id))
      .where(
        and(
          UUID_REGEX.test(parsed.storyId)
            ? or(eq(stories.id, parsed.storyId), eq(stories.storyId, parsed.storyId))
            : eq(stories.storyId, parsed.storyId),
          eq(worktrees.status, 'active'),
        ),
      )
      .limit(1)

    if (!worktree) {
      return null
    }

    // Convert metadata from nullable to Record (default to empty object)
    return {
      ...worktree,
      metadata: worktree.metadata ?? {},
    }
  } catch (error) {
    // Database errors: log warning, return null
    logger.warn(
      `[mcp-tools] Failed to get worktree for story '${parsed.storyId}':`,
      error instanceof Error ? error.message : String(error),
    )
    return null
  }
}

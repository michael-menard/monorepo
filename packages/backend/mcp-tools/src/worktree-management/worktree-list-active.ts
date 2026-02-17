/**
 * Worktree List Active MCP Tool
 * WINT-1130 AC-7: Lists all active worktrees with pagination
 *
 * Features:
 * - Pagination with limit (default 50, max 1000) and offset
 * - Filters by status='active'
 * - Results ordered by createdAt DESC (newest first)
 * - Zod validation at entry
 * - Resilient error handling (returns empty array on error)
 */

import { eq, desc } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { worktrees, stories } from '@repo/database-schema'
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
 *
 * @example Get all active worktrees (default pagination)
 * ```typescript
 * const worktrees = await worktreeListActive({})
 * // Returns up to 50 active worktrees
 * ```
 *
 * @example Get active worktrees with custom pagination
 * ```typescript
 * const worktrees = await worktreeListActive({
 *   limit: 100,
 *   offset: 50,
 * })
 * ```
 *
 * @example Handle empty result set
 * ```typescript
 * const worktrees = await worktreeListActive({
 *   offset: 999999,
 * })
 * // Returns empty array [] (not null)
 * ```
 */
export async function worktreeListActive(
  input: WorktreeListActiveInput,
): Promise<WorktreeListActiveOutput> {
  // Validate input - fail fast if invalid
  const parsed = WorktreeListActiveInputSchema.parse(input)

  try {
    // Join with stories to get human-readable storyId
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
      .innerJoin(stories, eq(worktrees.storyId, stories.id))
      .where(eq(worktrees.status, 'active'))
      .orderBy(desc(worktrees.createdAt))
      .limit(parsed.limit)
      .offset(parsed.offset)

    // Convert metadata from nullable to Record (default to empty object)
    return results.map(wt => ({
      ...wt,
      metadata: wt.metadata ?? {},
    }))
  } catch (error) {
    // Database errors: log warning, return empty array (not null)
    logger.warn(
      '[mcp-tools] Failed to list active worktrees:',
      error instanceof Error ? error.message : String(error),
    )
    return []
  }
}

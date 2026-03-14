/**
 * Worktree Register MCP Tool
 * WINT-1130 AC-5: Creates new worktree record in database
 *
 * Features:
 * - Zod validation at entry (fail fast)
 * - FK constraint enforcement (storyId must exist)
 * - Concurrent registration prevention (partial unique index)
 * - Resilient error handling (logs warnings, returns null on error)
 * - Auto-generated UUID for worktree ID
 */

import { eq } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { worktrees, stories } from '@repo/knowledge-base/src/db'
import {
  WorktreeRegisterInputSchema,
  type WorktreeRegisterInput,
  type WorktreeRegisterOutput,
} from './__types__/index.js'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Register a new worktree in the database
 *
 * @param input - Worktree registration parameters (storyId, worktreePath, branchName)
 * @returns Created worktree record or null if registration failed
 *
 * @example Register worktree for story
 * ```typescript
 * const worktree = await worktreeRegister({
 *   storyId: 'WINT-1130',
 *   worktreePath: '/Users/dev/monorepo-wt-WINT-1130',
 *   branchName: 'feature/WINT-1130',
 * })
 * ```
 *
 * @example Handle FK constraint violation (story doesn't exist)
 * ```typescript
 * const worktree = await worktreeRegister({
 *   storyId: 'NONEXIST-0001',
 *   worktreePath: '/tmp/wt',
 *   branchName: 'test',
 * })
 * // Returns null, logs warning about FK constraint
 * ```
 *
 * @example Handle concurrent registration (unique constraint violation)
 * ```typescript
 * // First registration succeeds
 * const wt1 = await worktreeRegister({
 *   storyId: 'WINT-1130',
 *   worktreePath: '/tmp/wt-1',
 *   branchName: 'branch-1',
 * })
 *
 * // Second registration for same story fails (partial unique index enforced)
 * const wt2 = await worktreeRegister({
 *   storyId: 'WINT-1130',
 *   worktreePath: '/tmp/wt-2',
 *   branchName: 'branch-2',
 * })
 * // wt2 is null, logs warning about concurrent registration
 * ```
 */
export async function worktreeRegister(
  input: WorktreeRegisterInput,
): Promise<WorktreeRegisterOutput> {
  // Validate input - fail fast if invalid
  const parsed = WorktreeRegisterInputSchema.parse(input)

  try {
    // Resolve human-readable storyId to UUID (FK column requires UUID)
    let storyUuid = parsed.storyId
    if (!UUID_REGEX.test(parsed.storyId)) {
      const [story] = await db
        .select({ id: stories.id })
        .from(stories)
        .where(eq(stories.storyId, parsed.storyId))
        .limit(1)
      if (!story) {
        logger.warn(`[mcp-tools] Story '${parsed.storyId}' not found for worktree registration`)
        return null
      }
      storyUuid = story.id
    }

    const [worktree] = await db
      .insert(worktrees)
      .values({
        storyId: storyUuid,
        worktreePath: parsed.worktreePath,
        branchName: parsed.branchName,
        status: 'active',
      })
      .returning()

    return {
      id: worktree.id,
      storyId: parsed.storyId,
      worktreePath: worktree.worktreePath,
      branchName: worktree.branchName,
      status: 'active',
      createdAt: worktree.createdAt,
      updatedAt: worktree.updatedAt,
    }
  } catch (error) {
    // FK constraint violation or unique constraint violation
    logger.warn(
      `[mcp-tools] Failed to register worktree for story '${parsed.storyId}':`,
      error instanceof Error ? error.message : String(error),
    )
    return null
  }
}

/**
 * Worktree lifecycle management.
 *
 * AC-3: Creates worktrees at dispatch time and removes on story completion/failure.
 * AC-9: Cleanup is non-blocking — slot release happens in finally even if git fails.
 *
 * Uses execFile (not exec) for git commands per security constraints.
 *
 * @module supervisor/worktree-lifecycle
 */

import { execFile } from 'child_process'
import { promisify } from 'util'
import { logger } from '@repo/logger'

const execFileAsync = promisify(execFile)

/**
 * Creates an isolated git worktree for the given story.
 *
 * AC-3: Worktrees are created at dispatch time.
 * Uses `git worktree add --detach <path>` to create a detached worktree.
 *
 * @param repoRoot - Absolute path to the git repository root
 * @param worktreePath - Target path for the new worktree
 * @param storyId - Story identifier (for logging)
 */
export async function createWorktree(
  repoRoot: string,
  worktreePath: string,
  storyId: string,
): Promise<void> {
  logger.info('Creating worktree', { storyId, worktreePath, repoRoot })

  await execFileAsync('git', ['worktree', 'add', '--detach', worktreePath], {
    cwd: repoRoot,
  })

  logger.info('Worktree created', { storyId, worktreePath })
}

/**
 * Removes a git worktree after story completion or failure.
 *
 * AC-9: Non-blocking cleanup pattern (WINT-1150).
 * Errors are caught and logged but NOT re-thrown.
 * Slot release must happen in the calling finally block regardless.
 *
 * @param repoRoot - Absolute path to the git repository root
 * @param worktreePath - Worktree path to remove
 * @param storyId - Story identifier (for logging)
 */
export async function removeWorktree(
  repoRoot: string,
  worktreePath: string,
  storyId: string,
): Promise<void> {
  try {
    await execFileAsync('git', ['worktree', 'remove', '--force', worktreePath], {
      cwd: repoRoot,
    })
    logger.info('Worktree removed', { storyId, worktreePath })
  } catch (error) {
    // AC-9: Do NOT re-throw — slot must be released regardless of cleanup outcome.
    // EC-3: Cleanup failure must not block story completion.
    logger.warn('Worktree cleanup failed, continuing', { storyId, worktreePath, error })
  }
}

/**
 * Create Worktree Node
 *
 * Creates a git worktree at worktrees/{storyId} using git worktree add.
 * Records the worktree path in graph state.
 *
 * Uses injectable gitRunner pattern (matches merge/cleanup-worktree.ts).
 * Non-blocking cleanup uses void IIFE with git worktree remove --force (GAP-2).
 *
 * Logs: worktree_created event with storyId, attemptNumber, durationMs.
 *
 * APIP-1031 AC-3
 */

import { spawn } from 'child_process'
import * as path from 'path'
import { logger } from '@repo/logger'
import type { ImplementationGraphState } from '../graphs/implementation.js'

// ============================================================================
// GitRunner type (matches cleanup-worktree.ts pattern)
// ============================================================================

export type GitRunner = (
  args: string[],
  opts: { cwd: string; env?: Record<string, string> },
) => Promise<{ exitCode: number; stdout: string; stderr: string }>

// ============================================================================
// Default git runner (spawn-based for testability)
// ============================================================================

function defaultGitRunner(
  args: string[],
  opts: { cwd: string; env?: Record<string, string> },
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const env = opts.env ?? (process.env as Record<string, string>)
    const proc = spawn('git', args, { cwd: opts.cwd, env })
    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })
    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })
    proc.on('close', code => {
      resolve({ exitCode: code ?? 1, stdout, stderr })
    })
    proc.on('error', reject)
  })
}

// ============================================================================
// Non-blocking cleanup (GAP-2)
// ============================================================================

/**
 * Schedules a non-blocking worktree cleanup via void IIFE.
 * Fire-and-forget — not awaited by caller.
 * Uses injectable gitRunner for testability (GAP-2 adaptation).
 */
export function scheduleWorktreeCleanup(
  worktreePath: string,
  mainRepoDir: string,
  gitRunner: GitRunner,
  storyId: string,
): void {
  // void IIFE — non-blocking, never awaited by caller (GAP-2 pattern)
  void (async () => {
    try {
      const result = await gitRunner(['worktree', 'remove', '--force', worktreePath], {
        cwd: mainRepoDir,
        env: process.env as Record<string, string>,
      })
      if (result.exitCode !== 0) {
        logger.warn('worktree_cleanup_failed', {
          storyId,
          stage: 'implementation',
          durationMs: 0,
          worktreePath,
          stderr: result.stderr,
        })
      }
    } catch (error) {
      logger.warn('worktree_cleanup_error', {
        storyId,
        stage: 'implementation',
        durationMs: 0,
        worktreePath,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  })()
}

// ============================================================================
// Node factory
// ============================================================================

/**
 * Creates the create-worktree node with injectable gitRunner.
 *
 * @param opts.gitRunner - Injectable git runner (defaults to spawn-based runner)
 * @param opts.repoRoot - Repository root override (defaults to process.cwd())
 */
export function createCreateWorktreeNode(
  opts: { gitRunner?: GitRunner; repoRoot?: string } = {},
): (state: ImplementationGraphState) => Promise<Partial<ImplementationGraphState>> {
  const gitRunner = opts.gitRunner ?? defaultGitRunner
  const repoRoot = opts.repoRoot ?? process.cwd()

  return async (state: ImplementationGraphState): Promise<Partial<ImplementationGraphState>> => {
    const startTime = Date.now()
    const { storyId, attemptNumber } = state

    const worktreePath = path.join(repoRoot, 'worktrees', storyId)
    const branchName = `impl/${storyId}`

    // Create the worktree with a new branch
    try {
      const result = await gitRunner(['worktree', 'add', '-b', branchName, worktreePath], {
        cwd: repoRoot,
        env: process.env as Record<string, string>,
      })

      if (result.exitCode !== 0) {
        const errMsg = result.stderr || result.stdout || 'git worktree add failed'
        logger.warn('worktree_create_failed', {
          storyId,
          stage: 'implementation',
          durationMs: Date.now() - startTime,
          attemptNumber,
          error: errMsg,
        })

        return {
          worktreePath: null,
          worktreeCreated: false,
          errors: [`git worktree add failed: ${errMsg}`],
        }
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      logger.warn('worktree_create_failed', {
        storyId,
        stage: 'implementation',
        durationMs: Date.now() - startTime,
        attemptNumber,
        error: errMsg,
      })

      return {
        worktreePath: null,
        worktreeCreated: false,
        errors: [`git worktree add threw: ${errMsg}`],
      }
    }

    const durationMs = Date.now() - startTime

    logger.info('worktree_created', {
      storyId,
      stage: 'implementation',
      durationMs,
      attemptNumber,
      worktreePath,
      branchName,
    })

    return {
      worktreePath,
      worktreeCreated: true,
    }
  }
}

// ============================================================================
// Default exported node (plain async function for StateGraph.addNode)
// ============================================================================

/**
 * Default create-worktree node for use in StateGraph.addNode().
 * Plain async function — NOT wrapped in createToolNode (GAP-3).
 */
export async function createWorktreeNode(
  state: ImplementationGraphState,
): Promise<Partial<ImplementationGraphState>> {
  const node = createCreateWorktreeNode()
  return node(state)
}

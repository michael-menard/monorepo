/**
 * Cleanup Worktree Node
 *
 * Cleans up the git worktree and branch after merge (on all terminal paths):
 * 1. git worktree remove --force {worktreeDir}
 * 2. git branch -d {storyBranch} (falls back to -D on MERGE_FAIL/BLOCKED path)
 *
 * All errors emit logger.warn() only — NEVER changes mergeVerdict.
 * Sets worktreeCleanedUp: true on success, false on error.
 *
 * Runs on ALL terminal paths (MERGE_COMPLETE, MERGE_FAIL, MERGE_BLOCKED).
 *
 * AC-8, AC-17
 */

import { spawn } from 'child_process'
import * as path from 'path'
import { logger } from '@repo/logger'
import type { MergeGraphState, MergeGraphConfig } from '../../graphs/merge.js'

// ============================================================================
// Types
// ============================================================================

export type GitRunner = (
  args: string[],
  opts: { cwd: string; env?: Record<string, string> },
) => Promise<{ exitCode: number; stdout: string; stderr: string }>

// ============================================================================
// Default git runner
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
// Node Factory (AC-8)
// ============================================================================

/**
 * Creates the cleanup-worktree node function.
 */
export function createCleanupWorktreeNode(
  config: MergeGraphConfig,
  opts: {
    gitRunner?: GitRunner
  } = {},
): (state: MergeGraphState) => Promise<Partial<MergeGraphState>> {
  const gitRunner = opts.gitRunner ?? defaultGitRunner

  return async (state: MergeGraphState): Promise<Partial<MergeGraphState>> => {
    const startTime = Date.now()
    const { storyId, mergeVerdict } = state
    const { worktreeDir, storyBranch } = config

    logger.info('merge_cleanup_started', {
      storyId,
      stage: 'merge',
      durationMs: 0,
      worktreeDir,
      storyBranch,
      mergeVerdict,
    })

    // Main repo dir: parent of the worktree
    const mainRepoDir = path.resolve(worktreeDir, '..')

    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
    }

    let worktreeCleanedUp = false
    const warnings: string[] = []

    // ---- Step 1: git worktree remove --force {worktreeDir} ----
    try {
      const worktreeResult = await gitRunner(
        ['worktree', 'remove', '--force', worktreeDir],
        { cwd: mainRepoDir, env },
      )

      if (worktreeResult.exitCode !== 0) {
        const warning = `git worktree remove failed: ${worktreeResult.stderr || worktreeResult.stdout}`
        logger.warn('merge_cleanup_started', {
          storyId,
          stage: 'merge',
          durationMs: Date.now() - startTime,
          warning,
        })
        warnings.push(warning)
      } else {
        worktreeCleanedUp = true
      }
    } catch (error) {
      const warning = `git worktree remove threw: ${error instanceof Error ? error.message : String(error)}`
      logger.warn('merge_cleanup_started', {
        storyId,
        stage: 'merge',
        durationMs: Date.now() - startTime,
        warning,
      })
      warnings.push(warning)
    }

    // ---- Step 2: git branch -d/-D {storyBranch} ----
    // Use -D (force delete) on MERGE_FAIL or MERGE_BLOCKED since branch may be unmerged
    const isMergeFailOrBlocked =
      mergeVerdict === 'MERGE_FAIL' || mergeVerdict === 'MERGE_BLOCKED'

    try {
      const deleteFlag = isMergeFailOrBlocked ? '-D' : '-d'
      const deleteResult = await gitRunner(
        ['branch', deleteFlag, storyBranch],
        { cwd: mainRepoDir, env },
      )

      if (deleteResult.exitCode !== 0 && !isMergeFailOrBlocked) {
        // Try -D as fallback for unmerged branch
        const forceDeleteResult = await gitRunner(
          ['branch', '-D', storyBranch],
          { cwd: mainRepoDir, env },
        )

        if (forceDeleteResult.exitCode !== 0) {
          const warning = `git branch -D failed: ${forceDeleteResult.stderr || forceDeleteResult.stdout}`
          logger.warn('merge_cleanup_started', {
            storyId,
            stage: 'merge',
            durationMs: Date.now() - startTime,
            warning,
          })
          warnings.push(warning)
        }
      } else if (deleteResult.exitCode !== 0) {
        const warning = `git branch ${deleteFlag} failed: ${deleteResult.stderr || deleteResult.stdout}`
        logger.warn('merge_cleanup_started', {
          storyId,
          stage: 'merge',
          durationMs: Date.now() - startTime,
          warning,
        })
        warnings.push(warning)
      }
    } catch (error) {
      const warning = `git branch delete threw: ${error instanceof Error ? error.message : String(error)}`
      logger.warn('merge_cleanup_started', {
        storyId,
        stage: 'merge',
        durationMs: Date.now() - startTime,
        warning,
      })
      warnings.push(warning)
    }

    logger.info('merge_cleanup_complete', {
      storyId,
      stage: 'merge',
      durationMs: Date.now() - startTime,
      worktreeCleanedUp,
      warnings: warnings.length,
    })

    return {
      worktreeCleanedUp,
      warnings,
    }
  }
}

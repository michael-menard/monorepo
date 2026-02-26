/**
 * Rebase Branch Node
 *
 * Rebases the story branch on the main branch:
 * 1. git fetch origin {mainBranch}
 * 2. git rebase origin/{mainBranch}
 * 3. git push --force-with-lease
 *
 * On rebase failure: git rebase --abort, set MERGE_BLOCKED.
 * Sets rebaseSuccess flag in state.
 *
 * AC-4, AC-17
 */

import { spawn } from 'child_process'
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
// Node Factory (AC-4)
// ============================================================================

/**
 * Creates the rebase-branch node function.
 */
export function createRebaseBranchNode(
  config: MergeGraphConfig,
  opts: {
    gitRunner?: GitRunner
  } = {},
): (state: MergeGraphState) => Promise<Partial<MergeGraphState>> {
  const gitRunner = opts.gitRunner ?? defaultGitRunner

  return async (state: MergeGraphState): Promise<Partial<MergeGraphState>> => {
    const startTime = Date.now()
    const { storyId } = state
    const { worktreeDir, mainBranch } = config

    logger.info('merge_rebase_started', {
      storyId,
      stage: 'merge',
      durationMs: 0,
      worktreeDir,
      mainBranch,
    })

    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
    }

    // ---- Step 1: git fetch origin {mainBranch} ----
    const fetchResult = await gitRunner(['fetch', 'origin', mainBranch], {
      cwd: worktreeDir,
      env,
    })

    if (fetchResult.exitCode !== 0) {
      const reason = `git fetch failed: ${fetchResult.stderr || fetchResult.stdout}`
      logger.warn('merge_rebase_complete', {
        storyId,
        stage: 'merge',
        durationMs: Date.now() - startTime,
        status: 'fetch_failed',
        reason,
      })
      return {
        mergeVerdict: 'MERGE_BLOCKED',
        rebaseSuccess: false,
        errors: [reason],
      }
    }

    // ---- Step 2: git rebase origin/{mainBranch} ----
    const rebaseResult = await gitRunner(['rebase', `origin/${mainBranch}`], {
      cwd: worktreeDir,
      env,
    })

    if (rebaseResult.exitCode !== 0) {
      // Extract conflict info from output
      const conflictInfo = rebaseResult.stderr || rebaseResult.stdout
      const reason = `Rebase conflict on ${conflictInfo} — manual intervention required`

      // Abort the rebase to restore clean state
      await gitRunner(['rebase', '--abort'], { cwd: worktreeDir, env })

      logger.warn('merge_rebase_complete', {
        storyId,
        stage: 'merge',
        durationMs: Date.now() - startTime,
        status: 'conflict',
        reason,
      })

      return {
        mergeVerdict: 'MERGE_BLOCKED',
        rebaseSuccess: false,
        errors: [reason],
      }
    }

    // ---- Step 3: git push --force-with-lease ----
    const pushResult = await gitRunner(['push', '--force-with-lease'], {
      cwd: worktreeDir,
      env,
    })

    if (pushResult.exitCode !== 0) {
      const reason = `Push failed after rebase: ${pushResult.stderr || pushResult.stdout}`
      logger.warn('merge_rebase_complete', {
        storyId,
        stage: 'merge',
        durationMs: Date.now() - startTime,
        status: 'push_failed',
        reason,
      })
      return {
        mergeVerdict: 'MERGE_BLOCKED',
        rebaseSuccess: false,
        errors: [reason],
      }
    }

    logger.info('merge_rebase_complete', {
      storyId,
      stage: 'merge',
      durationMs: Date.now() - startTime,
      status: 'success',
    })

    return {
      rebaseSuccess: true,
    }
  }
}

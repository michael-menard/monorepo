/**
 * Squash Merge Node
 *
 * Executes the squash merge:
 * 1. gh pr merge {prNumber} --squash --subject --body
 * 2. gh pr view --json mergeCommit to extract SHA
 *
 * Sets mergeVerdict: 'MERGE_COMPLETE' on success, 'MERGE_FAIL' on error.
 * Records mergeCommitSha in state.
 *
 * AC-7, AC-17
 */

import { spawn } from 'child_process'
import { logger } from '@repo/logger'
import { generateQaSummary } from '../../artifacts/qa-verify.js'
import type { MergeGraphState, MergeGraphConfig } from '../../graphs/merge.js'

// ============================================================================
// Types
// ============================================================================

export type GhRunner = (
  args: string[],
  opts: { cwd: string; env?: Record<string, string> },
) => Promise<{ exitCode: number; stdout: string; stderr: string }>

// ============================================================================
// Default gh runner
// ============================================================================

function defaultGhRunner(
  args: string[],
  opts: { cwd: string; env?: Record<string, string> },
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const env = opts.env ?? (process.env as Record<string, string>)
    const proc = spawn('gh', args, { cwd: opts.cwd, env })
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
// Node Factory (AC-7)
// ============================================================================

/**
 * Creates the squash-merge node function.
 */
export function createSquashMergeNode(
  config: MergeGraphConfig,
  opts: {
    ghRunner?: GhRunner
  } = {},
): (state: MergeGraphState) => Promise<Partial<MergeGraphState>> {
  const ghRunner = opts.ghRunner ?? defaultGhRunner

  return async (state: MergeGraphState): Promise<Partial<MergeGraphState>> => {
    const startTime = Date.now()
    const { storyId, prNumber, qaVerify } = state
    const { worktreeDir, storyId: configStoryId, storyTitle } = config

    if (!prNumber) {
      const reason = 'No PR number in state — cannot squash merge'
      return {
        mergeVerdict: 'MERGE_FAIL',
        errors: [reason],
      }
    }

    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      ...(config.ghToken ? { GH_TOKEN: config.ghToken } : {}),
    }

    const qaSummary = qaVerify ? generateQaSummary(qaVerify) : 'QA passed'
    const commitSubject = `${configStoryId}: ${storyTitle}`
    const commitBody = `${qaSummary}\n\nCo-authored-by: APIP Pipeline <noreply@pipeline>`

    logger.info('merge_squash_started', {
      storyId,
      stage: 'merge',
      durationMs: 0,
      prNumber,
    })

    // ---- gh pr merge --squash ----
    const mergeResult = await ghRunner(
      [
        'pr', 'merge', String(prNumber),
        '--squash',
        '--subject', commitSubject,
        '--body', commitBody,
      ],
      { cwd: worktreeDir, env },
    )

    if (mergeResult.exitCode !== 0) {
      const reason = `gh pr merge failed: ${mergeResult.stderr || mergeResult.stdout}`
      logger.warn('merge_squash_complete', {
        storyId,
        stage: 'merge',
        durationMs: Date.now() - startTime,
        prNumber,
        status: 'failed',
        reason,
      })
      return {
        mergeVerdict: 'MERGE_FAIL',
        errors: [reason],
      }
    }

    // ---- Extract merge commit SHA ----
    let mergeCommitSha: string | null = null

    const viewResult = await ghRunner(
      ['pr', 'view', String(prNumber), '--json', 'mergeCommit'],
      { cwd: worktreeDir, env },
    )

    if (viewResult.exitCode === 0 && viewResult.stdout.trim()) {
      try {
        const data = JSON.parse(viewResult.stdout)
        mergeCommitSha = data.mergeCommit?.oid ?? null
      } catch {
        // Ignore parse error — SHA is optional
      }
    }

    logger.info('merge_squash_complete', {
      storyId,
      stage: 'merge',
      durationMs: Date.now() - startTime,
      prNumber,
      mergeCommitSha,
      status: 'success',
    })

    return {
      mergeVerdict: 'MERGE_COMPLETE',
      mergeCommitSha,
    }
  }
}

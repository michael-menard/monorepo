/**
 * Create or Update PR Node
 *
 * Creates or updates a GitHub PR for the story branch:
 * 1. Check if PR exists for story branch
 * 2. If no PR: gh pr create --title --body --base
 * 3. If PR exists: gh pr edit --body
 *
 * PR body includes: story ID, title, QA summary, changed files, automation notice.
 * Records prNumber and prUrl in state.
 *
 * AC-5, AC-17
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
// PR Body Builder
// ============================================================================

function buildPrBody(
  storyId: string,
  storyTitle: string,
  qaSummary: string,
  acsVerified: Array<{ ac_id: string; status: string }>,
): string {
  const acLines = acsVerified
    .map(ac => `- ${ac.ac_id}: ${ac.status}`)
    .join('\n')

  return [
    `## ${storyId}: ${storyTitle}`,
    '',
    '### QA Summary',
    qaSummary,
    '',
    '### AC Verification',
    acLines || '_(no ACs verified)_',
    '',
    '---',
    '_Automated PR by APIP pipeline — do not manually merge_',
  ].join('\n')
}

// ============================================================================
// Node Factory (AC-5)
// ============================================================================

/**
 * Creates the create-or-update-pr node function.
 */
export function createCreateOrUpdatePrNode(
  config: MergeGraphConfig,
  opts: {
    ghRunner?: GhRunner
  } = {},
): (state: MergeGraphState) => Promise<Partial<MergeGraphState>> {
  const ghRunner = opts.ghRunner ?? defaultGhRunner

  return async (state: MergeGraphState): Promise<Partial<MergeGraphState>> => {
    const startTime = Date.now()
    const { storyId } = state
    const { worktreeDir, storyBranch, storyTitle, mainBranch } = config

    const qaVerify = state.qaVerify
    if (!qaVerify) {
      const reason = 'No QA artifact in state — cannot create PR'
      return {
        mergeVerdict: 'MERGE_FAIL',
        errors: [reason],
      }
    }

    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      ...(config.ghToken ? { GH_TOKEN: config.ghToken } : {}),
    }

    const qaSummary = generateQaSummary(qaVerify)
    const prBody = buildPrBody(storyId, storyTitle, qaSummary, qaVerify.acs_verified)

    // ---- Step 1: Check if PR exists ----
    const listResult = await ghRunner(
      ['pr', 'list', '--head', storyBranch, '--json', 'number,url'],
      { cwd: worktreeDir, env },
    )

    let existingPrNumber: number | null = null
    let existingPrUrl: string | null = null

    if (listResult.exitCode === 0 && listResult.stdout.trim()) {
      try {
        const prs = JSON.parse(listResult.stdout)
        if (Array.isArray(prs) && prs.length > 0) {
          existingPrNumber = prs[0].number
          existingPrUrl = prs[0].url
        }
      } catch {
        // Ignore parse error — treat as no existing PR
      }
    }

    if (existingPrNumber !== null) {
      // ---- Step 2a: Update existing PR ----
      logger.info('merge_pr_updated', {
        storyId,
        stage: 'merge',
        durationMs: 0,
        prNumber: existingPrNumber,
      })

      const editResult = await ghRunner(
        ['pr', 'edit', String(existingPrNumber), '--body', prBody],
        { cwd: worktreeDir, env },
      )

      if (editResult.exitCode !== 0) {
        const reason = `gh pr edit failed: ${editResult.stderr || editResult.stdout}`
        logger.warn('merge_pr_updated', {
          storyId,
          stage: 'merge',
          durationMs: Date.now() - startTime,
          prNumber: existingPrNumber,
          status: 'failed',
          reason,
        })
        return {
          mergeVerdict: 'MERGE_FAIL',
          errors: [reason],
        }
      }

      logger.info('merge_pr_updated', {
        storyId,
        stage: 'merge',
        durationMs: Date.now() - startTime,
        prNumber: existingPrNumber,
        prUrl: existingPrUrl,
        status: 'success',
      })

      return {
        prNumber: existingPrNumber,
        prUrl: existingPrUrl,
      }
    } else {
      // ---- Step 2b: Create new PR ----
      const createResult = await ghRunner(
        [
          'pr', 'create',
          '--title', `${storyId}: ${storyTitle}`,
          '--body', prBody,
          '--base', mainBranch,
        ],
        { cwd: worktreeDir, env },
      )

      if (createResult.exitCode !== 0) {
        const reason = `gh pr create failed: ${createResult.stderr || createResult.stdout}`
        logger.warn('merge_pr_created', {
          storyId,
          stage: 'merge',
          durationMs: Date.now() - startTime,
          status: 'failed',
          reason,
        })
        return {
          mergeVerdict: 'MERGE_FAIL',
          errors: [reason],
        }
      }

      // Extract PR URL from output (gh pr create outputs the URL)
      const prUrl = createResult.stdout.trim()

      // Get PR number from URL or via another gh call
      let prNumber: number | null = null
      const viewResult = await ghRunner(
        ['pr', 'view', '--head', storyBranch, '--json', 'number'],
        { cwd: worktreeDir, env },
      )

      if (viewResult.exitCode === 0) {
        try {
          const data = JSON.parse(viewResult.stdout)
          prNumber = data.number ?? null
        } catch {
          // Ignore parse error
        }
      }

      logger.info('merge_pr_created', {
        storyId,
        stage: 'merge',
        durationMs: Date.now() - startTime,
        prNumber,
        prUrl,
        status: 'success',
      })

      return {
        prNumber,
        prUrl: prUrl || null,
      }
    }
  }
}

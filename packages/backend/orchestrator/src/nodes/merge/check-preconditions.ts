/**
 * Check Preconditions Node
 *
 * Gates merge on:
 * 1. QA-VERIFY.yaml exists and parses successfully
 * 2. QA verdict is PASS (qaPassedSuccessfully check)
 * 3. gh auth status succeeds (GitHub CLI is authenticated)
 *
 * Sets mergeVerdict: 'MERGE_BLOCKED' on any failure.
 * On success, sets qaVerify in state and routes to rebase-branch.
 *
 * AC-3, AC-17
 */

import { spawn } from 'child_process'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as yaml from 'yaml'
import { logger } from '@repo/logger'
import { QaVerifySchema, qaPassedSuccessfully } from '../../artifacts/qa-verify.js'
import type { MergeGraphState, MergeGraphConfig } from '../../graphs/merge.js'

// ============================================================================
// Types
// ============================================================================

export type SubprocessRunner = (
  args: string[],
  opts: { cwd: string; env?: Record<string, string> },
) => Promise<{ exitCode: number; stdout: string; stderr: string }>

// ============================================================================
// Default subprocess runner
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
// Node Factory (AC-3)
// ============================================================================

/**
 * Creates the check-preconditions node function.
 * Returns an async function operating on MergeGraphState for direct use in StateGraph.
 */
export function createCheckPreconditionsNode(
  config: MergeGraphConfig,
  opts: {
    ghRunner?: SubprocessRunner
  } = {},
): (state: MergeGraphState) => Promise<Partial<MergeGraphState>> {
  const ghRunner = opts.ghRunner ?? defaultGhRunner

  return async (state: MergeGraphState): Promise<Partial<MergeGraphState>> => {
    const startTime = Date.now()
    const { storyId } = state

    logger.info('merge_preconditions_check', {
      storyId,
      stage: 'merge',
      durationMs: 0,
      status: 'started',
    })

    // ---- Step 1: Load QA-VERIFY.yaml ----
    // If qaVerify already set in state (passed via runMerge), skip file load
    let qaVerify = state.qaVerify

    if (!qaVerify) {
      const qaPath = path.join(
        config.featureDir,
        'in-progress',
        storyId,
        '_implementation',
        'QA-VERIFY.yaml',
      )

      try {
        const raw = await fs.readFile(qaPath, 'utf-8')
        const parsed = yaml.parse(raw)
        const result = QaVerifySchema.safeParse(parsed)

        if (!result.success) {
          const reason = `QA artifact invalid or missing: ${result.error.message}`
          logger.warn('merge_preconditions_check', {
            storyId,
            stage: 'merge',
            durationMs: Date.now() - startTime,
            status: 'blocked',
            reason,
          })
          return {
            mergeVerdict: 'MERGE_BLOCKED',
            errors: [reason],
          }
        }

        qaVerify = result.data
      } catch (error) {
        const reason = `QA artifact invalid or missing: ${error instanceof Error ? error.message : String(error)}`
        logger.warn('merge_preconditions_check', {
          storyId,
          stage: 'merge',
          durationMs: Date.now() - startTime,
          status: 'blocked',
          reason,
        })
        return {
          mergeVerdict: 'MERGE_BLOCKED',
          errors: [reason],
        }
      }
    }

    // ---- Step 2: Check QA passed ----
    if (!qaPassedSuccessfully(qaVerify)) {
      const reason = `QA verdict is not PASS: ${qaVerify.verdict}`
      logger.warn('merge_preconditions_check', {
        storyId,
        stage: 'merge',
        durationMs: Date.now() - startTime,
        status: 'blocked',
        reason,
      })
      return {
        mergeVerdict: 'MERGE_BLOCKED',
        qaVerify,
        errors: [reason],
      }
    }

    // ---- Step 3: Check gh auth status ----
    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      ...(config.ghToken ? { GH_TOKEN: config.ghToken } : {}),
    }

    try {
      const authResult = await ghRunner(['auth', 'status'], {
        cwd: config.worktreeDir,
        env,
      })

      if (authResult.exitCode !== 0) {
        const reason =
          'GitHub CLI not authenticated — run `gh auth login` on the server or set GH_TOKEN environment variable'
        logger.warn('merge_preconditions_check', {
          storyId,
          stage: 'merge',
          durationMs: Date.now() - startTime,
          status: 'blocked',
          reason,
        })
        return {
          mergeVerdict: 'MERGE_BLOCKED',
          errors: [reason],
        }
      }
    } catch (error) {
      const reason =
        'GitHub CLI not authenticated — run `gh auth login` on the server or set GH_TOKEN environment variable'
      logger.warn('merge_preconditions_check', {
        storyId,
        stage: 'merge',
        durationMs: Date.now() - startTime,
        status: 'blocked',
        reason,
        error: error instanceof Error ? error.message : String(error),
      })
      return {
        mergeVerdict: 'MERGE_BLOCKED',
        errors: [reason],
      }
    }

    // ---- All preconditions passed ----
    logger.info('merge_preconditions_check', {
      storyId,
      stage: 'merge',
      durationMs: Date.now() - startTime,
      status: 'passed',
    })

    return {
      qaVerify,
    }
  }
}

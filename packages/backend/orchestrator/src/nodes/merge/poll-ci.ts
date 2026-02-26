/**
 * Poll CI Node
 *
 * Polls GitHub CI checks for the PR until all checks complete or timeout.
 * Uses exponential back-off with ±10% jitter.
 *
 * IMPORTANT: AC-20 mandates NOT using createToolNode() (10s hardcoded timeout).
 * This node returns a plain async function suitable for StateGraph.addNode().
 * If a createNode() wrapper is needed, it can be applied in the graph.
 *
 * Internal async loop (not LangGraph edges per poll) to avoid excessive checkpoints.
 *
 * AC-6, AC-20, AC-17
 */

import { spawn } from 'child_process'
import { logger } from '@repo/logger'
import type { MergeGraphState, MergeGraphConfig } from '../../graphs/merge.js'

// ============================================================================
// Types
// ============================================================================

export type GhRunner = (
  args: string[],
  opts: { cwd: string; env?: Record<string, string> },
) => Promise<{ exitCode: number; stdout: string; stderr: string }>

export type SleepFn = (ms: number) => Promise<void>

// ============================================================================
// Default runners
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

const defaultSleepFn: SleepFn = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms))

// ============================================================================
// CI Check Evaluation
// ============================================================================

type CiCheckState = 'pass' | 'fail' | 'running'

function evaluateChecks(checks: Array<{ state: string; conclusion: string }>): CiCheckState {
  if (checks.length === 0) {
    return 'running'
  }

  // If any check failed
  if (checks.some(c => c.conclusion === 'failure' || c.conclusion === 'cancelled')) {
    return 'fail'
  }

  // If all completed with success/skipped/neutral
  if (
    checks.every(
      c =>
        c.state === 'COMPLETED' &&
        (c.conclusion === 'success' || c.conclusion === 'skipped' || c.conclusion === 'neutral'),
    )
  ) {
    return 'pass'
  }

  return 'running'
}

// ============================================================================
// Node Factory (AC-6, AC-20)
// ============================================================================

/**
 * Creates the poll-ci node function.
 *
 * AC-20: Does NOT use createToolNode() (10s timeout incompatible with 30-min CI polling).
 * Returns a plain async function operating on MergeGraphState.
 * The graph wires it directly via StateGraph.addNode().
 */
export function createPollCiNode(
  config: MergeGraphConfig,
  opts: {
    ghRunner?: GhRunner
    sleepFn?: SleepFn
  } = {},
): (state: MergeGraphState) => Promise<Partial<MergeGraphState>> {
  const ghRunner = opts.ghRunner ?? defaultGhRunner
  const sleepFn = opts.sleepFn ?? defaultSleepFn

  return async (state: MergeGraphState): Promise<Partial<MergeGraphState>> => {
    const { storyId, prNumber } = state
    const { worktreeDir, ciTimeoutMs, ciPollIntervalMs, ciPollMaxIntervalMs } = config

    if (!prNumber) {
      const reason = 'No PR number in state — cannot poll CI'
      return {
        mergeVerdict: 'MERGE_FAIL',
        ciStatus: 'fail',
        errors: [reason],
      }
    }

    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      ...(config.ghToken ? { GH_TOKEN: config.ghToken } : {}),
    }

    // AC-6: Internal async polling loop with exponential back-off
    let interval = ciPollIntervalMs
    let ciPollCount = state.ciPollCount ?? 0
    const startTime = Date.now()

    while (Date.now() - startTime < ciTimeoutMs) {
      const pollStart = Date.now()

      // Poll gh pr checks
      const checksResult = await ghRunner(
        ['pr', 'checks', String(prNumber), '--json', 'name,state,conclusion'],
        { cwd: worktreeDir, env },
      )

      let checks: Array<{ name: string; state: string; conclusion: string }> = []

      if (checksResult.exitCode === 0 && checksResult.stdout.trim()) {
        try {
          checks = JSON.parse(checksResult.stdout)
        } catch {
          // Ignore parse error — treat as still running
        }
      }

      ciPollCount++
      const ciState = evaluateChecks(checks)

      logger.info('merge_ci_poll', {
        storyId,
        stage: 'merge',
        durationMs: Date.now() - pollStart,
        ciPollCount,
        ciStatus: ciState,
        prNumber,
        checksCount: checks.length,
      })

      if (ciState === 'pass') {
        logger.info('merge_ci_complete', {
          storyId,
          stage: 'merge',
          durationMs: Date.now() - startTime,
          ciStatus: 'pass',
          ciPollCount,
          prNumber,
        })
        return {
          ciStatus: 'pass',
          ciPollCount,
        }
      }

      if (ciState === 'fail') {
        logger.warn('merge_ci_complete', {
          storyId,
          stage: 'merge',
          durationMs: Date.now() - startTime,
          ciStatus: 'fail',
          ciPollCount,
          prNumber,
        })
        return {
          mergeVerdict: 'MERGE_FAIL',
          ciStatus: 'fail',
          ciPollCount,
          errors: [`CI checks failed after ${ciPollCount} polls`],
        }
      }

      // Still running — apply exponential back-off with ±10% jitter (AC-6b)
      const jitter = 0.9 + Math.random() * 0.2 // ±10%
      interval = Math.min(interval * 2, ciPollMaxIntervalMs) * jitter

      await sleepFn(interval)
    }

    // Timeout exceeded
    logger.warn('merge_ci_complete', {
      storyId,
      stage: 'merge',
      durationMs: Date.now() - startTime,
      ciStatus: 'timeout',
      ciPollCount,
      prNumber,
      ciTimeoutMs,
    })

    return {
      mergeVerdict: 'MERGE_BLOCKED',
      ciStatus: 'timeout',
      ciPollCount,
      errors: [`CI polling timed out after ${ciTimeoutMs}ms (${ciPollCount} polls)`],
    }
  }
}

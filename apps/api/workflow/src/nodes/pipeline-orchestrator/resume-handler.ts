/**
 * resume_handler Node (pipeline-orchestrator) — DETERMINISTIC
 *
 * On pipeline startup, queries the checkpoint repository for the latest
 * checkpoint matching the given thread_id or story_id. If found:
 * - Deserializes the saved PipelineOrchestratorV2State
 * - Verifies the worktree still exists (via `git worktree list`)
 * - Recreates the worktree from the branch if missing but branch exists
 * - Determines the resume node (the next node after the checkpointed one)
 *
 * If no checkpoint is found, signals a fresh start.
 *
 * Uses injectable adapters for shell execution and checkpoint queries
 * to support unit testing without real DB or filesystem.
 *
 * ORCH-5010: Checkpoint/Resume Integration
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { PipelineOrchestratorV2State } from '../../state/pipeline-orchestrator-v2-state.js'
import type { CheckpointPayload } from '../../checkpointer/__types__/index.js'
import { getNextOrchestratorNode } from '../../checkpointer/phase-mapping.js'
import type { ShellExecResult } from './worktree-manager.js'

// ============================================================================
// Zod Schemas
// ============================================================================

export const ResumeHandlerConfigSchema = z.object({
  /** LangGraph thread ID (pipeline run UUID) for checkpoint lookup */
  threadId: z.string().min(1),
  /** Optional story ID for fallback checkpoint lookup */
  storyId: z.string().optional(),
  /** Root path of the monorepo for worktree operations */
  monorepoRoot: z.string().default('/tmp/monorepo'),
})

export type ResumeHandlerConfig = z.infer<typeof ResumeHandlerConfigSchema>

export const ResumeResultSchema = z.object({
  /** Whether a checkpoint was found and resume is possible */
  shouldResume: z.boolean(),
  /** The node to resume at (next node after the checkpointed one) */
  resumeNode: z.string().nullable(),
  /** The node that was last completed (from checkpoint) */
  lastCompletedNode: z.string().nullable(),
  /** The deserialized state from the checkpoint */
  restoredState: z.record(z.unknown()).nullable(),
  /** Whether the worktree was present or had to be recovered */
  worktreeRecovered: z.boolean(),
  /** Human-readable reason for the resume decision */
  reason: z.string(),
})

export type ResumeResult = z.infer<typeof ResumeResultSchema>

// ============================================================================
// Injectable Adapter Types
// ============================================================================

/**
 * Queries the checkpoint repository for the latest checkpoint
 * by thread_id. Returns payload, node name, and phase.
 */
export type CheckpointQueryFn = (threadId: string) => Promise<{
  payload: CheckpointPayload
  nodeName: string
  phase: string
} | null>

/**
 * Queries the checkpoint repository for the latest checkpoint
 * by story_id. Used as fallback when thread_id lookup fails.
 */
export type CheckpointQueryByStoryFn = (storyId: string) => Promise<{
  payload: CheckpointPayload
  nodeName: string
  phase: string
} | null>

/**
 * Executes a shell command and returns stdout/stderr/exitCode.
 * Used for `git worktree list` and `git worktree add`.
 */
export type ShellExecFn = (
  cmd: string,
  args: string[],
  opts?: { cwd?: string },
) => Promise<ShellExecResult>

export const ResumeHandlerAdaptersSchema = z.object({
  checkpointQuery: z.function().optional(),
  checkpointQueryByStory: z.function().optional(),
  shellExec: z.function().optional(),
})

export type ResumeHandlerAdapters = {
  checkpointQuery?: CheckpointQueryFn
  checkpointQueryByStory?: CheckpointQueryByStoryFn
  shellExec?: ShellExecFn
}

// ============================================================================
// Default Adapter Implementations
// ============================================================================

/**
 * Default shell executor using child_process.execFile.
 */
export const defaultShellExec: ShellExecFn = async (cmd, args, opts) => {
  // Dynamic import to avoid bundling child_process in non-Node environments
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { execFile } = require('child_process') as typeof import('child_process')
  return new Promise<ShellExecResult>(resolve => {
    execFile(cmd, args, { cwd: opts?.cwd }, (err, stdout, stderr) => {
      resolve({
        stdout: stdout ?? '',
        stderr: stderr ?? '',
        exitCode: err ? (err as NodeJS.ErrnoException & { code?: number }).code ? 1 : 1 : 0,
      })
    })
  })
}

// ============================================================================
// Pure Logic
// ============================================================================

/**
 * Parses `git worktree list` output and checks whether a worktree path exists.
 */
export function isWorktreePresent(worktreeListOutput: string, worktreePath: string): boolean {
  if (!worktreePath) return false
  const lines = worktreeListOutput.split('\n')
  return lines.some(line => line.trim().startsWith(worktreePath))
}

/**
 * Checks whether a git branch exists on the remote.
 */
export function isBranchInRemoteOutput(lsBranchOutput: string, branch: string): boolean {
  if (!branch) return false
  const lines = lsBranchOutput.split('\n')
  return lines.some(line => line.includes(`refs/heads/${branch}`))
}

/**
 * Determines the resume node from the last completed node name.
 * Returns null for terminal nodes or nodes with conditional routing
 * (the graph's own routing logic handles those).
 */
export function determineResumeNode(lastCompletedNode: string): string | null {
  return getNextOrchestratorNode(lastCompletedNode)
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the resume_handler LangGraph node.
 *
 * DETERMINISTIC — no LLM calls. Queries checkpoint DB, verifies
 * worktree state, and determines resume point.
 *
 * @param config - Resume handler configuration (threadId, storyId, monorepoRoot)
 * @param adapters - Injectable adapters for testing
 * @returns Async function that returns ResumeResult
 */
export function createResumeHandlerNode(
  config: ResumeHandlerConfig,
  adapters: ResumeHandlerAdapters = {},
) {
  const resolved = ResumeHandlerConfigSchema.parse(config)
  const shellExec = adapters.shellExec ?? defaultShellExec

  return async (
    _state: PipelineOrchestratorV2State,
  ): Promise<Partial<PipelineOrchestratorV2State> & { resumeResult: ResumeResult }> => {
    logger.info('resume_handler: checking for checkpoint', {
      threadId: resolved.threadId,
      storyId: resolved.storyId,
    })

    // --- Step 1: Query checkpoint by threadId ---
    let checkpoint: {
      payload: CheckpointPayload
      nodeName: string
      phase: string
    } | null = null

    if (adapters.checkpointQuery) {
      try {
        checkpoint = await adapters.checkpointQuery(resolved.threadId)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.warn('resume_handler: checkpoint query by threadId failed', { error: msg })
      }
    }

    // --- Step 2: Fallback to storyId query ---
    if (!checkpoint && resolved.storyId && adapters.checkpointQueryByStory) {
      try {
        checkpoint = await adapters.checkpointQueryByStory(resolved.storyId)
        if (checkpoint) {
          logger.info('resume_handler: found checkpoint via storyId fallback', {
            storyId: resolved.storyId,
            nodeName: checkpoint.nodeName,
          })
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.warn('resume_handler: checkpoint query by storyId failed', { error: msg })
      }
    }

    // --- Step 3: No checkpoint found → fresh start ---
    if (!checkpoint) {
      logger.info('resume_handler: no checkpoint found, starting fresh')
      const resumeResult: ResumeResult = {
        shouldResume: false,
        resumeNode: null,
        lastCompletedNode: null,
        restoredState: null,
        worktreeRecovered: false,
        reason: 'No checkpoint found for threadId or storyId',
      }
      return { resumeResult }
    }

    // --- Step 4: Deserialize state from checkpoint ---
    const stateSnapshot = checkpoint.payload.state_snapshot
    const lastCompletedNode = checkpoint.nodeName
    const resumeNode = determineResumeNode(lastCompletedNode)

    logger.info('resume_handler: checkpoint found', {
      lastCompletedNode,
      resumeNode,
      phase: checkpoint.phase,
    })

    if (!resumeNode) {
      // Terminal node or conditional routing — let graph handle it
      logger.info('resume_handler: last node has conditional routing, deferring to graph', {
        lastCompletedNode,
      })
      const resumeResult: ResumeResult = {
        shouldResume: true,
        resumeNode: null,
        lastCompletedNode,
        restoredState: stateSnapshot,
        worktreeRecovered: false,
        reason: `Checkpoint at conditional node '${lastCompletedNode}', graph routing will decide`,
      }
      return {
        resumeResult,
        ...(stateSnapshot as Partial<PipelineOrchestratorV2State>),
      }
    }

    // --- Step 5: Verify worktree exists ---
    let worktreeRecovered = false
    const worktreePath = (stateSnapshot as Record<string, unknown>).worktreePath as string | null
    const branch = (stateSnapshot as Record<string, unknown>).branch as string | null

    if (worktreePath) {
      try {
        const wtListResult = await shellExec('git', ['worktree', 'list'], {
          cwd: resolved.monorepoRoot,
        })

        if (wtListResult.exitCode === 0 && isWorktreePresent(wtListResult.stdout, worktreePath)) {
          logger.info('resume_handler: worktree verified', { worktreePath })
        } else if (branch) {
          // Worktree missing — attempt recovery from branch
          logger.info('resume_handler: worktree missing, attempting recovery', {
            worktreePath,
            branch,
          })

          // Check if branch exists on remote
          const lsRemoteResult = await shellExec(
            'git',
            ['ls-remote', '--heads', 'origin', branch],
            { cwd: resolved.monorepoRoot },
          )

          if (
            lsRemoteResult.exitCode === 0 &&
            isBranchInRemoteOutput(lsRemoteResult.stdout, branch)
          ) {
            // Recreate worktree from the remote branch
            const addResult = await shellExec(
              'git',
              ['worktree', 'add', worktreePath, branch],
              { cwd: resolved.monorepoRoot },
            )

            if (addResult.exitCode === 0) {
              worktreeRecovered = true
              logger.info('resume_handler: worktree recovered from branch', {
                worktreePath,
                branch,
              })
            } else {
              logger.warn('resume_handler: worktree recovery failed', {
                stderr: addResult.stderr,
              })
            }
          } else {
            logger.warn('resume_handler: branch not found on remote, cannot recover worktree', {
              branch,
            })
          }
        } else {
          logger.warn('resume_handler: worktree missing and no branch to recover from', {
            worktreePath,
          })
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.warn('resume_handler: worktree verification failed', { error: msg })
      }
    }

    // --- Step 6: Build resume result ---
    const resumeResult: ResumeResult = {
      shouldResume: true,
      resumeNode,
      lastCompletedNode,
      restoredState: stateSnapshot,
      worktreeRecovered,
      reason: `Resuming at '${resumeNode}' after completed '${lastCompletedNode}'${worktreeRecovered ? ' (worktree recovered)' : ''}`,
    }

    return {
      resumeResult,
      ...(stateSnapshot as Partial<PipelineOrchestratorV2State>),
    }
  }
}

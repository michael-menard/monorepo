/**
 * Git Operations Nodes (pipeline-orchestrator) — DETERMINISTIC
 *
 * Handles git operations in the pipeline:
 * - commitPush: stages, commits, and pushes changes
 * - createPr: creates a pull request via gh CLI
 * - mergePr: merges a pull request via gh CLI
 *
 * Shell execution is injectable for testability.
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { PipelineOrchestratorV2State } from '../../state/pipeline-orchestrator-v2-state.js'
import type { ShellExecFn } from './worktree-manager.js'

// ============================================================================
// Schemas
// ============================================================================

export const GitOpsConfigSchema = z.object({
  monorepoRoot: z.string().min(1),
  defaultBaseBranch: z.string().default('main'),
})

export type GitOpsConfig = z.infer<typeof GitOpsConfigSchema> & {
  shellExec?: ShellExecFn
}

export const CommitPushResultSchema = z.object({
  committed: z.boolean(),
  pushed: z.boolean(),
  commitSha: z.string().nullable().default(null),
  error: z.string().optional(),
})

export type CommitPushResult = z.infer<typeof CommitPushResultSchema>

export const CreatePrResultSchema = z.object({
  prCreated: z.boolean(),
  prUrl: z.string().nullable().default(null),
  prNumber: z.number().nullable().default(null),
  error: z.string().optional(),
})

export type CreatePrResult = z.infer<typeof CreatePrResultSchema>

export const MergePrResultSchema = z.object({
  merged: z.boolean(),
  error: z.string().optional(),
})

export type MergePrResult = z.infer<typeof MergePrResultSchema>

// ============================================================================
// Default Shell Exec Stub
// ============================================================================

const noopShellExec: ShellExecFn = async (_cmd, _args, _opts) => ({
  stdout: '',
  stderr: '',
  exitCode: 0,
})

// ============================================================================
// Node Factories
// ============================================================================

/**
 * Creates the commit_push LangGraph node.
 *
 * Stages all changes, commits with a conventional message, and pushes.
 */
export function createCommitPushNode(config: GitOpsConfig) {
  const exec = config.shellExec ?? noopShellExec

  return async (
    state: PipelineOrchestratorV2State,
  ): Promise<Partial<PipelineOrchestratorV2State>> => {
    const { currentStoryId, worktreePath } = state
    const cwd = worktreePath ?? config.monorepoRoot

    logger.info('commit_push: starting', { storyId: currentStoryId, cwd })

    // Stage all changes
    const addResult = await exec('git', ['add', '-A'], { cwd })
    if (addResult.exitCode !== 0) {
      logger.warn('commit_push: git add failed', { stderr: addResult.stderr })
      return {
        pipelinePhase: 'commit_push',
        errors: [`commit_push: git add failed: ${addResult.stderr}`],
      }
    }

    // Commit
    const commitMsg = `feat(${currentStoryId}): automated implementation`
    const commitResult = await exec('git', ['commit', '-m', commitMsg], { cwd })
    if (commitResult.exitCode !== 0) {
      logger.warn('commit_push: git commit failed', { stderr: commitResult.stderr })
      return {
        pipelinePhase: 'commit_push',
        errors: [`commit_push: git commit failed: ${commitResult.stderr}`],
      }
    }

    // Get commit SHA
    const shaResult = await exec('git', ['rev-parse', 'HEAD'], { cwd })
    const commitSha = shaResult.stdout.trim() || null

    // Push
    const pushResult = await exec('git', ['push', '-u', 'origin', 'HEAD'], { cwd })
    if (pushResult.exitCode !== 0) {
      logger.warn('commit_push: git push failed', { stderr: pushResult.stderr })
      return {
        pipelinePhase: 'commit_push',
        errors: [`commit_push: git push failed: ${pushResult.stderr}`],
      }
    }

    logger.info('commit_push: complete', { storyId: currentStoryId, commitSha })

    return {
      pipelinePhase: 'commit_push',
    }
  }
}

/**
 * Creates the create_pr LangGraph node.
 *
 * Creates a pull request using gh CLI.
 */
export function createCreatePrNode(config: GitOpsConfig) {
  const exec = config.shellExec ?? noopShellExec

  return async (
    state: PipelineOrchestratorV2State,
  ): Promise<Partial<PipelineOrchestratorV2State>> => {
    const { currentStoryId, worktreePath } = state
    const cwd = worktreePath ?? config.monorepoRoot

    logger.info('create_pr: starting', { storyId: currentStoryId })

    const prResult = await exec(
      'gh',
      [
        'pr',
        'create',
        '--title',
        `feat(${currentStoryId}): automated implementation`,
        '--body',
        `Automated PR for story ${currentStoryId}`,
        '--base',
        config.defaultBaseBranch,
      ],
      { cwd },
    )

    if (prResult.exitCode !== 0) {
      logger.warn('create_pr: gh pr create failed', { stderr: prResult.stderr })
      return {
        pipelinePhase: 'create_pr',
        errors: [`create_pr: failed: ${prResult.stderr}`],
      }
    }

    logger.info('create_pr: complete', {
      storyId: currentStoryId,
      prUrl: prResult.stdout.trim(),
    })

    return {
      pipelinePhase: 'create_pr',
    }
  }
}

/**
 * Creates the merge_pr LangGraph node.
 *
 * Merges the current PR using gh CLI with squash merge.
 */
export function createMergePrNode(config: GitOpsConfig) {
  const exec = config.shellExec ?? noopShellExec

  return async (
    state: PipelineOrchestratorV2State,
  ): Promise<Partial<PipelineOrchestratorV2State>> => {
    const { currentStoryId, worktreePath } = state
    const cwd = worktreePath ?? config.monorepoRoot

    logger.info('merge_pr: starting', { storyId: currentStoryId })

    const mergeResult = await exec('gh', ['pr', 'merge', '--squash', '--delete-branch'], { cwd })

    if (mergeResult.exitCode !== 0) {
      logger.warn('merge_pr: gh pr merge failed', { stderr: mergeResult.stderr })
      return {
        pipelinePhase: 'merge_cleanup',
        errors: [`merge_pr: failed: ${mergeResult.stderr}`],
      }
    }

    logger.info('merge_pr: complete', { storyId: currentStoryId })

    return {
      pipelinePhase: 'merge_cleanup',
    }
  }
}

/**
 * Git Operations Nodes (pipeline-orchestrator) — DETERMINISTIC
 *
 * Manages git and GitHub operations for the pipeline:
 * - commitPushNode: stages, commits (conventional commit), and pushes to origin
 * - createPrNode: creates a GitHub PR (or detects existing one)
 * - mergePrNode: fetches main, rebases, and merges via `wt merge --yes`
 *
 * Shell execution is injectable for testability.
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { ShellExecFn } from './worktree-manager.js'

// ============================================================================
// Schemas
// ============================================================================

export const CommitPushResultSchema = z.object({
  committed: z.boolean(),
  pushed: z.boolean(),
  commitSha: z.string().optional(),
  nothingToCommit: z.boolean(),
  error: z.string().optional(),
})

export type CommitPushResult = z.infer<typeof CommitPushResultSchema>

export const CreatePrResultSchema = z.object({
  prUrl: z.string().nullable(),
  prNumber: z.number().nullable(),
  alreadyExists: z.boolean(),
  error: z.string().optional(),
})

export type CreatePrResult = z.infer<typeof CreatePrResultSchema>

export const MergePrResultSchema = z.object({
  merged: z.boolean(),
  conflict: z.boolean(),
  error: z.string().optional(),
})

export type MergePrResult = z.infer<typeof MergePrResultSchema>

// ============================================================================
// Config schemas
// ============================================================================

export const CommitPushConfigSchema = z.object({
  worktreePath: z.string().min(1),
  storyId: z.string().min(1),
  branch: z.string().min(1),
  commitMessage: z.string().min(1),
})

export type CommitPushConfig = z.infer<typeof CommitPushConfigSchema> & {
  shellExec: ShellExecFn
}

export const CreatePrConfigSchema = z.object({
  worktreePath: z.string().min(1),
  storyId: z.string().min(1),
  branch: z.string().min(1),
  title: z.string().min(1),
  body: z.string(),
})

export type CreatePrConfig = z.infer<typeof CreatePrConfigSchema> & {
  shellExec: ShellExecFn
}

export const MergePrConfigSchema = z.object({
  worktreePath: z.string().min(1),
  storyId: z.string().min(1),
  branch: z.string().min(1),
  monorepoRoot: z.string().min(1),
})

export type MergePrConfig = z.infer<typeof MergePrConfigSchema> & {
  shellExec: ShellExecFn
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parses commit SHA from `git commit` output.
 * Typical output: `[branch abc1234] commit message`
 */
export function parseCommitSha(stdout: string): string | undefined {
  const match = stdout.match(/\[[\w/.-]+\s+([a-f0-9]+)\]/)
  return match?.[1]
}

/**
 * Parses PR URL from `gh pr create` output.
 * Typical output: `https://github.com/owner/repo/pull/123`
 */
export function parsePrUrl(stdout: string): string | null {
  const match = stdout.match(/(https:\/\/github\.com\/\S+\/pull\/\d+)/)
  return match?.[1] ?? null
}

/**
 * Extracts PR number from a GitHub PR URL.
 */
export function parsePrNumber(url: string): number | null {
  const match = url.match(/\/pull\/(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

/**
 * Parses `gh pr list --json` output to find existing PR.
 * Returns { prUrl, prNumber } or null.
 */
export function parseExistingPr(jsonOutput: string): { prUrl: string; prNumber: number } | null {
  try {
    const prs = JSON.parse(jsonOutput)
    if (Array.isArray(prs) && prs.length > 0) {
      const pr = prs[0]
      if (pr.url && pr.number) {
        return { prUrl: pr.url, prNumber: pr.number }
      }
    }
  } catch {
    // not valid JSON — ignore
  }
  return null
}

// ============================================================================
// Node Factories
// ============================================================================

/**
 * Creates the commitPush LangGraph node.
 *
 * Stages all changes, commits with a conventional commit message, and pushes.
 * Handles "nothing to commit" gracefully.
 */
export function createCommitPushNode(config: CommitPushConfig) {
  const { shellExec, worktreePath, storyId, branch, commitMessage } = config

  return async (): Promise<{ commitPushResult: CommitPushResult }> => {
    logger.info('commitPushNode: starting', { storyId, branch, worktreePath })

    // Step 1: git add -A
    const addResult = await shellExec('git', ['add', '-A'], { cwd: worktreePath })
    if (addResult.exitCode !== 0) {
      const error = `git add failed (exit ${addResult.exitCode}): ${addResult.stderr}`
      logger.error('commitPushNode: git add failed', { storyId, stderr: addResult.stderr })
      return {
        commitPushResult: {
          committed: false,
          pushed: false,
          nothingToCommit: false,
          error,
        },
      }
    }

    // Step 2: git status --porcelain to check for changes
    const statusResult = await shellExec('git', ['status', '--porcelain'], { cwd: worktreePath })
    if (statusResult.stdout.trim() === '') {
      logger.info('commitPushNode: nothing to commit', { storyId })
      return {
        commitPushResult: {
          committed: false,
          pushed: false,
          nothingToCommit: true,
        },
      }
    }

    // Step 3: git commit
    const commitResult = await shellExec('git', ['commit', '-m', commitMessage], {
      cwd: worktreePath,
    })
    if (commitResult.exitCode !== 0) {
      const error = `git commit failed (exit ${commitResult.exitCode}): ${commitResult.stderr}`
      logger.error('commitPushNode: git commit failed', {
        storyId,
        stderr: commitResult.stderr,
      })
      return {
        commitPushResult: {
          committed: false,
          pushed: false,
          nothingToCommit: false,
          error,
        },
      }
    }

    const commitSha = parseCommitSha(commitResult.stdout)
    logger.info('commitPushNode: committed', { storyId, commitSha })

    // Step 4: git push -u origin <branch>
    const pushResult = await shellExec('git', ['push', '-u', 'origin', branch], {
      cwd: worktreePath,
    })
    if (pushResult.exitCode !== 0) {
      const error = `git push failed (exit ${pushResult.exitCode}): ${pushResult.stderr}`
      logger.error('commitPushNode: git push failed', {
        storyId,
        stderr: pushResult.stderr,
      })
      return {
        commitPushResult: {
          committed: true,
          pushed: false,
          commitSha,
          nothingToCommit: false,
          error,
        },
      }
    }

    logger.info('commitPushNode: pushed', { storyId, branch })

    return {
      commitPushResult: {
        committed: true,
        pushed: true,
        commitSha,
        nothingToCommit: false,
      },
    }
  }
}

/**
 * Creates the createPr LangGraph node.
 *
 * Checks for an existing PR on the branch first (idempotent).
 * If none, creates one via `gh pr create`.
 */
export function createCreatePrNode(config: CreatePrConfig) {
  const { shellExec, worktreePath, storyId, branch, title, body } = config

  return async (): Promise<{ createPrResult: CreatePrResult }> => {
    logger.info('createPrNode: starting', { storyId, branch })

    // Step 1: Check for existing PR
    const listResult = await shellExec(
      'gh',
      ['pr', 'list', '--head', branch, '--json', 'number,url'],
      { cwd: worktreePath },
    )

    if (listResult.exitCode === 0) {
      const existing = parseExistingPr(listResult.stdout)
      if (existing) {
        logger.info('createPrNode: PR already exists', {
          storyId,
          prUrl: existing.prUrl,
          prNumber: existing.prNumber,
        })
        return {
          createPrResult: {
            prUrl: existing.prUrl,
            prNumber: existing.prNumber,
            alreadyExists: true,
          },
        }
      }
    }

    // Step 2: Create PR
    const createResult = await shellExec(
      'gh',
      ['pr', 'create', '--title', title, '--body', body, '--base', 'main'],
      { cwd: worktreePath },
    )

    if (createResult.exitCode !== 0) {
      // Check if stderr indicates PR already exists (race condition)
      if (createResult.stderr.includes('already exists')) {
        logger.info('createPrNode: PR already exists (from stderr)', { storyId })
        return {
          createPrResult: {
            prUrl: null,
            prNumber: null,
            alreadyExists: true,
          },
        }
      }

      const error = `gh pr create failed (exit ${createResult.exitCode}): ${createResult.stderr}`
      logger.error('createPrNode: gh pr create failed', {
        storyId,
        stderr: createResult.stderr,
      })
      return {
        createPrResult: {
          prUrl: null,
          prNumber: null,
          alreadyExists: false,
          error,
        },
      }
    }

    const prUrl = parsePrUrl(createResult.stdout)
    const prNumber = prUrl ? parsePrNumber(prUrl) : null

    logger.info('createPrNode: PR created', { storyId, prUrl, prNumber })

    return {
      createPrResult: {
        prUrl,
        prNumber,
        alreadyExists: false,
      },
    }
  }
}

/**
 * Creates the mergePr LangGraph node.
 *
 * Fetches main, rebases onto origin/main, then runs `wt merge --yes`.
 * If rebase fails, aborts rebase and returns conflict=true (preserves worktree).
 */
export function createMergePrNode(config: MergePrConfig) {
  const { shellExec, worktreePath, storyId, branch, monorepoRoot } = config

  return async (): Promise<{ mergePrResult: MergePrResult }> => {
    logger.info('mergePrNode: starting', { storyId, branch })

    // Step 1: git fetch origin main
    const fetchResult = await shellExec('git', ['fetch', 'origin', 'main'], {
      cwd: worktreePath,
    })
    if (fetchResult.exitCode !== 0) {
      const error = `git fetch failed (exit ${fetchResult.exitCode}): ${fetchResult.stderr}`
      logger.error('mergePrNode: git fetch failed', { storyId, stderr: fetchResult.stderr })
      return { mergePrResult: { merged: false, conflict: false, error } }
    }

    // Step 2: git rebase origin/main
    const rebaseResult = await shellExec('git', ['rebase', 'origin/main'], {
      cwd: worktreePath,
    })
    if (rebaseResult.exitCode !== 0) {
      logger.warn('mergePrNode: rebase conflict detected, aborting rebase', {
        storyId,
        stderr: rebaseResult.stderr,
      })

      // Abort the failed rebase
      await shellExec('git', ['rebase', '--abort'], { cwd: worktreePath })

      return {
        mergePrResult: {
          merged: false,
          conflict: true,
          error: `Rebase conflict: ${rebaseResult.stderr}`,
        },
      }
    }

    logger.info('mergePrNode: rebase successful', { storyId })

    // Step 3: wt merge --yes (from monorepo root, targeting the branch)
    const mergeResult = await shellExec('wt', ['merge', branch, '--yes'], {
      cwd: monorepoRoot,
    })
    if (mergeResult.exitCode !== 0) {
      // Check if already merged
      if (
        mergeResult.stderr.includes('already merged') ||
        mergeResult.stdout.includes('already merged')
      ) {
        logger.info('mergePrNode: already merged', { storyId })
        return { mergePrResult: { merged: true, conflict: false } }
      }

      const error = `wt merge failed (exit ${mergeResult.exitCode}): ${mergeResult.stderr}`
      logger.error('mergePrNode: wt merge failed', {
        storyId,
        stderr: mergeResult.stderr,
        stdout: mergeResult.stdout,
      })
      return { mergePrResult: { merged: false, conflict: false, error } }
    }

    logger.info('mergePrNode: merged successfully', { storyId, branch })

    return { mergePrResult: { merged: true, conflict: false } }
  }
}

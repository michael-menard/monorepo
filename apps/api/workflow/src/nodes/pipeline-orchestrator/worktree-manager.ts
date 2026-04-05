/**
 * Worktree Management Nodes (pipeline-orchestrator) — DETERMINISTIC
 *
 * Manages git worktree lifecycle via the `wt` (worktrunk) CLI tool.
 * - createWorktreeNode: pulls main, creates or reuses a worktree for a story
 * - cleanupWorktreeNode: removes a worktree after merge, handles errors gracefully
 *
 * Shell execution is injectable for testability.
 */

import { z } from 'zod'
import { execFile } from 'node:child_process'
import { logger } from '@repo/logger'

// ============================================================================
// Injectable Adapter Types
// ============================================================================

export const ShellExecResultSchema = z.object({
  stdout: z.string(),
  stderr: z.string(),
  exitCode: z.number(),
})

export type ShellExecResult = z.infer<typeof ShellExecResultSchema>

export type ShellExecFn = (
  cmd: string,
  args: string[],
  opts?: { cwd?: string },
) => Promise<ShellExecResult>

// ============================================================================
// Schemas
// ============================================================================

export const WorktreeNodeConfigSchema = z.object({
  monorepoRoot: z.string().min(1),
})

export type WorktreeNodeConfig = z.infer<typeof WorktreeNodeConfigSchema> & {
  shellExec?: ShellExecFn
}

export const WorktreeResultSchema = z.object({
  worktreePath: z.string(),
  branch: z.string(),
  created: z.boolean(),
  reused: z.boolean(),
})

export type WorktreeResult = z.infer<typeof WorktreeResultSchema>

export const CleanupResultSchema = z.object({
  removed: z.boolean(),
  error: z.string().optional(),
})

export type CleanupResult = z.infer<typeof CleanupResultSchema>

// ============================================================================
// Default Shell Exec
// ============================================================================

export function defaultShellExec(
  cmd: string,
  args: string[],
  opts?: { cwd?: string },
): Promise<ShellExecResult> {
  return new Promise(resolve => {
    execFile(cmd, args, { cwd: opts?.cwd }, (error, stdout, stderr) => {
      const exitCode = error && 'code' in error ? ((error.code as number) ?? 1) : error ? 1 : 0
      resolve({
        stdout: stdout ?? '',
        stderr: stderr ?? '',
        exitCode,
      })
    })
  })
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parses `wt list` output to find an existing worktree for a given storyId.
 * Returns the worktree path if found, or null.
 *
 * Expected `wt list` output format includes lines like:
 *   <path>  <branch>  [clean]
 * or similar tabular output with the branch name present.
 */
export function parseWtListForStory(wtListOutput: string, storyId: string): string | null {
  const lines = wtListOutput.split('\n')
  for (const line of lines) {
    if (line.includes(storyId)) {
      // Extract path — first token on the line, or look for .worktrees/<storyId>
      const worktreePathMatch = line.match(/(\S*\.worktrees\/\S+)/)
      if (worktreePathMatch) {
        return worktreePathMatch[1]
      }
      // Fallback: first non-empty token
      const firstToken = line.trim().split(/\s+/)[0]
      if (firstToken) {
        return firstToken
      }
    }
  }
  return null
}

/**
 * Parses `wt switch --create` stdout for the worktree path.
 * Looks for pattern like: `worktree @ <path>`
 */
export function parseWtSwitchOutput(stdout: string, storyId: string, monorepoRoot: string): string {
  const pathMatch = stdout.match(/worktree\s+@\s+(\S+)/)
  if (pathMatch) {
    return pathMatch[1]
  }
  // Fallback to conventional path
  return `${monorepoRoot}/.worktrees/${storyId}`
}

// ============================================================================
// Node Factories
// ============================================================================

/**
 * Creates the createWorktree LangGraph node.
 *
 * Pulls main, checks for existing worktree, creates one if needed.
 * Returns WorktreeResult with worktreePath and status flags.
 */
export function createWorktreeNode(config: WorktreeNodeConfig) {
  const exec = config.shellExec ?? defaultShellExec
  const { monorepoRoot } = config

  return async (state: {
    storyId: string
  }): Promise<{
    worktreeResult: WorktreeResult
    worktreePath: string
  }> => {
    const { storyId } = state

    logger.info('createWorktreeNode: starting', { storyId, monorepoRoot })

    // Step 1: git pull origin main
    const pullResult = await exec('git', ['pull', 'origin', 'main'], { cwd: monorepoRoot })
    if (pullResult.exitCode !== 0) {
      logger.warn('createWorktreeNode: git pull failed, continuing anyway', {
        storyId,
        exitCode: pullResult.exitCode,
        stderr: pullResult.stderr,
      })
    }

    // Step 2: Check if worktree already exists via `wt list`
    const listResult = await exec('wt', ['list'], { cwd: monorepoRoot })

    if (listResult.exitCode === 0) {
      const existingPath = parseWtListForStory(listResult.stdout, storyId)
      if (existingPath) {
        logger.info('createWorktreeNode: reusing existing worktree', {
          storyId,
          worktreePath: existingPath,
        })

        const result: WorktreeResult = {
          worktreePath: existingPath,
          branch: storyId,
          created: false,
          reused: true,
        }

        return {
          worktreeResult: result,
          worktreePath: existingPath,
        }
      }
    }

    // Step 3: Create or switch to worktree
    // Check if branch already exists (git branch or worktree from previous run)
    // If so, switch to it. Otherwise, create new.
    logger.info('createWorktreeNode: creating/switching worktree', { storyId })

    const branchCheck = await exec(
      'git',
      ['show-ref', '--verify', '--quiet', `refs/heads/${storyId}`],
      {
        cwd: monorepoRoot,
      },
    )
    const branchExists = branchCheck.exitCode === 0

    const wtBin = process.env.WORKTRUNK_BIN ?? '/opt/homebrew/bin/wt'
    const switchArgs = branchExists
      ? ['switch', storyId, '--yes']
      : ['switch', '--create', storyId, '--yes']

    logger.info('createWorktreeNode: wt command', { wtBin, args: switchArgs, branchExists })

    const switchResult = await exec(wtBin, switchArgs, {
      cwd: monorepoRoot,
    })

    if (switchResult.exitCode !== 0) {
      const errorMsg = `wt switch --create failed (exit ${switchResult.exitCode}): ${switchResult.stderr}`
      logger.error('createWorktreeNode: failed to create worktree', {
        storyId,
        exitCode: switchResult.exitCode,
        stderr: switchResult.stderr,
        stdout: switchResult.stdout,
      })
      throw new Error(errorMsg)
    }

    const worktreePath = parseWtSwitchOutput(switchResult.stdout, storyId, monorepoRoot)

    logger.info('createWorktreeNode: worktree created', {
      storyId,
      worktreePath,
    })

    const result: WorktreeResult = {
      worktreePath,
      branch: storyId,
      created: true,
      reused: false,
    }

    return {
      worktreeResult: result,
      worktreePath,
    }
  }
}

/**
 * Creates the cleanupWorktree LangGraph node.
 *
 * Removes the worktree after merge. Never throws — gracefully
 * returns error info since the story is already merged at this point.
 */
export function createCleanupWorktreeNode(config: WorktreeNodeConfig) {
  const exec = config.shellExec ?? defaultShellExec
  const { monorepoRoot } = config

  return async (state: {
    storyId: string
  }): Promise<{
    cleanupResult: CleanupResult
  }> => {
    const { storyId } = state

    logger.info('cleanupWorktreeNode: starting', { storyId })

    try {
      const removeResult = await exec('wt', ['remove', storyId, '--yes', '--force'], {
        cwd: monorepoRoot,
      })

      if (removeResult.exitCode !== 0) {
        const errorMsg = `wt remove failed (exit ${removeResult.exitCode}): ${removeResult.stderr}`
        logger.warn('cleanupWorktreeNode: removal failed', {
          storyId,
          exitCode: removeResult.exitCode,
          stderr: removeResult.stderr,
        })

        return {
          cleanupResult: { removed: false, error: errorMsg },
        }
      }

      logger.info('cleanupWorktreeNode: worktree removed', { storyId })

      return {
        cleanupResult: { removed: true },
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      logger.warn('cleanupWorktreeNode: unexpected error during removal', {
        storyId,
        error: errorMsg,
      })

      return {
        cleanupResult: { removed: false, error: errorMsg },
      }
    }
  }
}

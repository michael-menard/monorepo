/**
 * Change Loop Node
 *
 * Implements the per-ChangeSpec dispatch → code-gen → micro-verify → atomic commit loop.
 * Invoked once per iteration of the change loop within the implementation graph.
 * On pass: writes commit record to completedChanges, advances currentChangeIndex.
 * On retryable fail: returns routing signal for retry edge.
 * On maxRetries exhausted: returns routing signal for abort edge.
 * On BudgetExhaustedError: stores abortReason, re-throws to abort edge.
 *
 * Idempotency contract:
 *   Before processing a ChangeSpec, the node checks whether its id already
 *   appears in state.completedChanges. If found, the spec is skipped (resume
 *   after partial failure). This ensures re-entry into the loop from a
 *   checkpoint does not produce duplicate commits.
 *
 * Spawn pattern:
 *   All subprocess invocations (micro-verify) use child_process.spawn wrapped
 *   in Promise — matching the run-unit-tests.ts pattern (ARCH-001).
 *   No execSync, no execa.
 *
 * APIP-1032 AC-5, AC-6, AC-7, AC-8
 */

import { spawn } from 'child_process'
import * as path from 'path'
import * as fs from 'fs/promises'
import { z } from 'zod'
import { logger } from '@repo/logger'
import type { ImplementationGraphState } from '../graphs/implementation.js'
import { CommitRecordSchema } from '../graphs/implementation.js'
import type { ChangeSpec } from '../artifacts/change-spec.js'
import type { IModelDispatch } from '../pipeline/i-model-dispatch.js'
import { BudgetExhaustedError } from '../pipeline/__types__/index.js'

// ============================================================================
// Constants
// ============================================================================

/** Maximum per-ChangeSpec retry attempts before aborting */
export const MAX_CHANGE_RETRIES = 3

// ============================================================================
// ChangeLoopResult — routing signals returned by the node
// ============================================================================

/**
 * Routing signal schema — communicated through changeLoopStatus field in state.
 * Used by afterChangeLoop conditional edge to determine next node.
 */
export const ChangeLoopStatusSchema = z.enum(['pass', 'retry', 'abort', 'complete'])
export type ChangeLoopStatus = z.infer<typeof ChangeLoopStatusSchema>

// ============================================================================
// Helpers
// ============================================================================

/**
 * Type-safe helper to construct Partial<ImplementationGraphState> returns.
 * Single cast point — prevents scattered `as` casts throughout the node.
 */
function toStateUpdate(
  update: Partial<ImplementationGraphState>,
): Partial<ImplementationGraphState> {
  return update
}

/**
 * Derive the package filter (e.g. @repo/orchestrator) from a file_path.
 * For file_change variant: derive from file_path prefix.
 * Fallback to empty string (run all packages) if derivation fails.
 *
 * @example
 * derivePackageFilter('packages/backend/orchestrator/src/foo.ts') === '@repo/orchestrator'
 */
export function derivePackageFilter(filePath: string): string {
  // Normalize path separators
  const normalized = filePath.replace(/\\/g, '/')
  // packages/<scope>/<name>/... → @repo/<name>
  const match = normalized.match(/^packages\/[^/]+\/([^/]+)\//)
  if (match) {
    return `@repo/${match[1]}`
  }
  // apps/<name>/... → @repo/<name>-app (best-effort)
  const appMatch = normalized.match(/^apps\/[^/]+\/([^/]+)\//)
  if (appMatch) {
    return `@repo/${appMatch[1]}`
  }
  return ''
}

/**
 * Spawns a subprocess and returns exit code + captured output.
 * Uses child_process.spawn wrapped in Promise (ARCH-001).
 *
 * @param cmd - Command executable
 * @param args - Command arguments
 * @param opts - Options { cwd, env }
 */
export function spawnCommand(
  cmd: string,
  args: string[],
  opts: { cwd: string; env?: NodeJS.ProcessEnv },
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const env = opts.env ?? process.env
    const proc = spawn(cmd, args, { cwd: opts.cwd, env })
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

/**
 * Writes generated code-gen output to the file_path from a ChangeSpec.
 * Only applies to file_change variant (create/modify). Delete variant
 * removes the file. Non-file_change specs are no-ops for file writes.
 */
async function applyCodeGenOutput(
  spec: ChangeSpec,
  codeOutput: string,
  worktreePath: string,
): Promise<void> {
  if (spec.change_type !== 'file_change') {
    return
  }
  const targetPath = path.join(worktreePath, spec.file_path)
  const dir = path.dirname(targetPath)

  if (spec.file_action === 'delete') {
    try {
      await fs.unlink(targetPath)
    } catch {
      // Ignore if file does not exist
    }
    return
  }

  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(targetPath, codeOutput, 'utf-8')
}

/**
 * Runs micro-verify for a ChangeSpec on the worktree.
 * Executes pnpm check-types --filter <pkg> and pnpm test --filter <pkg>.
 * Both must exit 0 for pass. stdout/stderr returned for state recording.
 *
 * NOTE: Timeout deferred to follow-up story (ARCH-002). Integration tests
 * use 180_000ms Vitest timeout as mitigation.
 */
export async function runMicroVerify(
  spec: ChangeSpec,
  worktreePath: string,
): Promise<{
  passed: boolean
  commands: Array<{ command: string; exitCode: number; stdout: string; stderr: string }>
}> {
  const filePath = 'file_path' in spec ? spec.file_path : ''
  const pkgFilter = derivePackageFilter(filePath)

  const checkTypesArgs = pkgFilter ? ['check-types', '--filter', pkgFilter] : ['check-types']

  const testArgs = pkgFilter ? ['test', '--filter', pkgFilter] : ['test']

  const checkTypesResult = await spawnCommand('pnpm', checkTypesArgs, { cwd: worktreePath })
  const testResult = await spawnCommand('pnpm', testArgs, { cwd: worktreePath })

  const commands = [
    {
      command: `pnpm ${checkTypesArgs.join(' ')}`,
      exitCode: checkTypesResult.exitCode,
      stdout: checkTypesResult.stdout,
      stderr: checkTypesResult.stderr,
    },
    {
      command: `pnpm ${testArgs.join(' ')}`,
      exitCode: testResult.exitCode,
      stdout: testResult.stdout,
      stderr: testResult.stderr,
    },
  ]

  const passed = checkTypesResult.exitCode === 0 && testResult.exitCode === 0

  return { passed, commands }
}

/**
 * Runs git commit -m <message> --allow-empty in the worktree.
 * Returns the commit SHA on success.
 */
async function gitCommit(
  worktreePath: string,
  message: string,
): Promise<{ sha: string; error?: string }> {
  // Stage all changes
  const addResult = await spawnCommand('git', ['add', '-A'], { cwd: worktreePath })
  if (addResult.exitCode !== 0) {
    return { sha: '', error: `git add failed: ${addResult.stderr}` }
  }

  // Commit (allow-empty for safety with idempotent resume)
  const commitResult = await spawnCommand('git', ['commit', '-m', message, '--allow-empty'], {
    cwd: worktreePath,
  })
  if (commitResult.exitCode !== 0) {
    return { sha: '', error: `git commit failed: ${commitResult.stderr}` }
  }

  // Get the commit SHA
  const revResult = await spawnCommand('git', ['rev-parse', 'HEAD'], { cwd: worktreePath })
  const sha = revResult.stdout.trim()

  return { sha }
}

// ============================================================================
// ChangeLoopNode factory
// ============================================================================

/**
 * Options for creating the change-loop node.
 * Enables IModelDispatch injection for testing (ARCH-004).
 */
export const ChangeLoopNodeOptsSchema = z.object({
  /** Injectable model dispatch (required for real execution; mock in tests) */
  modelDispatch: z.custom<IModelDispatch>().optional(),
  /** Maximum retries per ChangeSpec (defaults to MAX_CHANGE_RETRIES) */
  maxRetries: z.number().int().positive().default(MAX_CHANGE_RETRIES),
})

export type ChangeLoopNodeOpts = z.infer<typeof ChangeLoopNodeOptsSchema>

/**
 * Creates the change-loop node with injectable model dispatch.
 *
 * The node processes the ChangeSpec at state.currentChangeIndex.
 * Returns a partial state update with changeLoopStatus routing signal.
 *
 * @param opts - Injectable options (modelDispatch, maxRetries)
 */
export function createChangeLoopNode(
  opts: Partial<ChangeLoopNodeOpts> = {},
): (state: ImplementationGraphState) => Promise<Partial<ImplementationGraphState>> {
  const maxRetries = opts.maxRetries ?? MAX_CHANGE_RETRIES
  const modelDispatch = opts.modelDispatch

  return async (state: ImplementationGraphState): Promise<Partial<ImplementationGraphState>> => {
    const startTime = Date.now()
    const {
      storyId,
      attemptNumber,
      changeSpecs,
      currentChangeIndex,
      completedChanges,
      worktreePath,
    } = state

    // ---- Guard: no specs to process → complete ----
    if (!changeSpecs || changeSpecs.length === 0) {
      logger.info('change_loop_complete', {
        storyId,
        stage: 'implementation',
        durationMs: 0,
        attemptNumber,
        reason: 'no_change_specs',
      })
      return toStateUpdate({
        changeLoopComplete: true,
        changeLoopStatus: 'complete' as ChangeLoopStatus,
      })
    }

    // ---- Guard: all specs processed → complete ----
    if (currentChangeIndex >= changeSpecs.length) {
      logger.info('change_loop_complete', {
        storyId,
        stage: 'implementation',
        durationMs: 0,
        attemptNumber,
        reason: 'all_specs_processed',
        totalSpecs: changeSpecs.length,
      })
      return toStateUpdate({
        changeLoopComplete: true,
        changeLoopStatus: 'complete' as ChangeLoopStatus,
      })
    }

    const spec = changeSpecs[currentChangeIndex]

    // ---- Idempotency: skip already-committed specs (resume after checkpoint) ----
    // OPP-4: Idempotency contract — check completedChanges by spec id before processing.
    // This allows safe re-entry after a partial failure: already-committed specs
    // are skipped and the loop advances to the next uncommitted spec.
    const alreadyCommitted = (completedChanges ?? []).some(r => r.changeSpecId === spec.id)
    if (alreadyCommitted) {
      logger.info('change_spec_skipped_idempotent', {
        storyId,
        stage: 'implementation',
        durationMs: 0,
        attemptNumber,
        changeSpecId: spec.id,
        currentChangeIndex,
      })
      const nextIndex = currentChangeIndex + 1
      const isComplete = nextIndex >= changeSpecs.length
      return toStateUpdate({
        currentChangeIndex: nextIndex,
        changeLoopComplete: isComplete,
        changeLoopStatus: isComplete
          ? ('complete' as ChangeLoopStatus)
          : ('pass' as ChangeLoopStatus),
      })
    }

    // ---- Guard: no model dispatch configured → abort ----
    if (!modelDispatch) {
      logger.warn('change_loop_no_dispatch', {
        storyId,
        stage: 'implementation',
        durationMs: Date.now() - startTime,
        attemptNumber,
        changeSpecId: spec.id,
      })
      return toStateUpdate({
        abortReason: 'No model dispatch configured for change loop',
        changeLoopStatus: 'abort' as ChangeLoopStatus,
        errors: ['No model dispatch configured for change loop'],
      })
    }

    // ---- Guard: worktree must exist ----
    if (!worktreePath) {
      return toStateUpdate({
        abortReason: 'No worktree path in state — cannot run change loop',
        changeLoopStatus: 'abort' as ChangeLoopStatus,
        errors: ['No worktree path in state'],
      })
    }

    // ---- Retry loop ----
    let lastError: string | null = null
    let retryCount = 0

    while (retryCount < maxRetries) {
      const attemptStart = Date.now()

      try {
        // Step 1: Dispatch to model for code-gen
        const prompt = [
          `Implement the following change for story ${storyId}:`,
          `Change ID: ${spec.id}`,
          `Description: ${spec.description}`,
          `Change type: ${spec.change_type}`,
          'file_path' in spec ? `File path: ${spec.file_path}` : '',
          '',
          JSON.stringify(spec, null, 2),
        ]
          .filter(Boolean)
          .join('\n')

        let dispatchResponse
        try {
          dispatchResponse = await modelDispatch.dispatch({
            storyId,
            attemptNumber,
            prompt,
          })
        } catch (dispatchError) {
          // BudgetExhaustedError must propagate immediately (AC-6)
          if (dispatchError instanceof BudgetExhaustedError) {
            const reason = `BudgetExhaustedError: ${dispatchError.message}`
            logger.warn('change_loop_budget_exhausted', {
              storyId,
              stage: 'implementation',
              durationMs: Date.now() - startTime,
              attemptNumber,
              changeSpecId: spec.id,
              tokensUsed: dispatchError.tokensUsed,
              budgetCap: dispatchError.budgetCap,
            })
            return toStateUpdate({
              abortReason: reason,
              changeLoopStatus: 'abort' as ChangeLoopStatus,
              errors: [reason],
            })
          }
          throw dispatchError
        }

        if (!dispatchResponse.success) {
          lastError = dispatchResponse.error ?? 'Model dispatch returned failure'
          retryCount++
          logger.warn('change_loop_dispatch_failed', {
            storyId,
            stage: 'implementation',
            durationMs: Date.now() - attemptStart,
            attemptNumber,
            changeSpecId: spec.id,
            retryCount,
            error: lastError,
          })
          continue
        }

        const codeOutput = dispatchResponse.output ?? ''

        // Step 2: Apply code-gen output to worktree
        await applyCodeGenOutput(spec, codeOutput, worktreePath)

        // Step 3: Micro-verify (pnpm check-types + pnpm test)
        const verifyResult = await runMicroVerify(spec, worktreePath)

        if (!verifyResult.passed) {
          lastError = `micro-verify failed for ${spec.id}`
          retryCount++
          logger.warn('change_loop_verify_failed', {
            storyId,
            stage: 'implementation',
            durationMs: Date.now() - attemptStart,
            attemptNumber,
            changeSpecId: spec.id,
            retryCount,
            verifyCommands: verifyResult.commands.map(c => ({
              command: c.command,
              exitCode: c.exitCode,
            })),
          })
          continue
        }

        // Step 4: Atomic git commit
        const commitMessage = `feat(${spec.id}): ${spec.description}`
        const commitResult = await gitCommit(worktreePath, commitMessage)

        if (!commitResult.sha || commitResult.error) {
          lastError = commitResult.error ?? 'git commit returned empty SHA'
          retryCount++
          logger.warn('change_loop_commit_failed', {
            storyId,
            stage: 'implementation',
            durationMs: Date.now() - attemptStart,
            attemptNumber,
            changeSpecId: spec.id,
            retryCount,
            error: lastError,
          })
          continue
        }

        // Step 5: Build commit record and advance state
        const touchedFiles: string[] = 'file_path' in spec ? [spec.file_path] : []
        const commitRecord = CommitRecordSchema.parse({
          changeSpecId: spec.id,
          commitSha: commitResult.sha,
          commitMessage,
          touchedFiles,
          committedAt: new Date().toISOString(),
          durationMs: Date.now() - attemptStart,
        })

        const nextIndex = currentChangeIndex + 1
        const isComplete = nextIndex >= changeSpecs.length

        const durationMs = Date.now() - startTime
        logger.info('change_spec_committed', {
          storyId,
          stage: 'implementation',
          durationMs,
          attemptNumber,
          changeSpecId: spec.id,
          commitSha: commitResult.sha,
          retryCount,
          nextIndex,
          isComplete,
        })

        return toStateUpdate({
          completedChanges: [commitRecord],
          currentChangeIndex: nextIndex,
          changeLoopComplete: isComplete,
          changeLoopStatus: isComplete
            ? ('complete' as ChangeLoopStatus)
            : ('pass' as ChangeLoopStatus),
        })
      } catch (error) {
        // BudgetExhaustedError: permanent abort, store reason, DO NOT retry
        if (error instanceof BudgetExhaustedError) {
          const reason = `BudgetExhaustedError: ${error.message}`
          logger.warn('change_loop_budget_exhausted', {
            storyId,
            stage: 'implementation',
            durationMs: Date.now() - startTime,
            attemptNumber,
            changeSpecId: spec.id,
            tokensUsed: error.tokensUsed,
            budgetCap: error.budgetCap,
          })
          return toStateUpdate({
            abortReason: reason,
            changeLoopStatus: 'abort' as ChangeLoopStatus,
            errors: [reason],
          })
        }

        lastError = error instanceof Error ? error.message : String(error)
        retryCount++
        logger.warn('change_loop_attempt_failed', {
          storyId,
          stage: 'implementation',
          durationMs: Date.now() - startTime,
          attemptNumber,
          changeSpecId: spec.id,
          retryCount,
          error: lastError,
        })
      }
    }

    // ---- Exhausted retries → abort ----
    const abortReason = `Change spec ${spec.id} failed after ${maxRetries} attempts. Last error: ${lastError ?? 'unknown'}`
    logger.warn('change_loop_retries_exhausted', {
      storyId,
      stage: 'implementation',
      durationMs: Date.now() - startTime,
      attemptNumber,
      changeSpecId: spec.id,
      maxRetries,
      lastError,
    })

    return toStateUpdate({
      abortReason,
      changeLoopStatus: 'abort' as ChangeLoopStatus,
      errors: [abortReason],
    })
  }
}

// ============================================================================
// Default exported node (plain async function for StateGraph.addNode)
// ============================================================================

/**
 * Default change-loop node for StateGraph.addNode().
 * Plain async function — NOT wrapped in createToolNode (GAP-3 resolution).
 *
 * In production, createImplementationGraph injects IModelDispatch via config.
 * This default export uses no dispatch (returns abort if no model configured).
 */
export async function changeLoopNode(
  state: ImplementationGraphState,
): Promise<Partial<ImplementationGraphState>> {
  const node = createChangeLoopNode()
  return node(state)
}

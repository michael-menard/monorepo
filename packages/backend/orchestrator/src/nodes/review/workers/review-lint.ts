/**
 * Review Lint Worker
 *
 * Runs ESLint on the changed files.
 * Uses injectable toolRunner for testability.
 *
 * APIP-1050: AC-2, AC-3, AC-8, AC-15
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { WorkerResult } from '../../../artifacts/review.js'

// ============================================================================
// Config Schema
// ============================================================================

export const ReviewLintConfigSchema = z.object({
  /** Timeout in ms for the lint check */
  timeoutMs: z.number().int().positive().default(30000),
  /** Whether this worker is enabled */
  enabled: z.boolean().default(true),
  /** ESLint binary path override */
  eslintBin: z.string().default('pnpm lint'),
})

export type ReviewLintConfig = z.infer<typeof ReviewLintConfigSchema>

// ============================================================================
// Tool Runner Type (injectable for testing)
// ============================================================================

export type LintToolRunner = (
  command: string,
  worktreePath: string,
  timeoutMs: number,
) => Promise<{ stdout: string; stderr: string; exitCode: number }>

// ============================================================================
// Default Tool Runner
// ============================================================================

const defaultToolRunner: LintToolRunner = async (command, worktreePath, timeoutMs) => {
  const { exec } = await import('child_process')
  const { promisify } = await import('util')
  const execAsync = promisify(exec)

  try {
    const { stdout, stderr } = await Promise.race([
      execAsync(command, { cwd: worktreePath, maxBuffer: 10 * 1024 * 1024 }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Lint worker timed out after ${timeoutMs}ms`)),
          timeoutMs,
        ),
      ),
    ])
    return { stdout, stderr, exitCode: 0 }
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('timed out')) {
      throw error
    }
    // exec rejects with error that has stdout/stderr/code
    const execError = error as { stdout?: string; stderr?: string; code?: number }
    return {
      stdout: execError.stdout ?? '',
      stderr: execError.stderr ?? '',
      exitCode: execError.code ?? 1,
    }
  }
}

// ============================================================================
// Worker Factory
// ============================================================================

/**
 * Creates a lint review worker node.
 *
 * AC-2: Worker has ConfigSchema, factory function, WorkerResult return.
 * AC-3: Unit-testable via injectable toolRunner.
 * AC-8: Timeout returns FAIL finding with timeout message.
 */
export function createReviewLintNode(
  config: Partial<ReviewLintConfig> = {},
  toolRunner: LintToolRunner = defaultToolRunner,
) {
  const fullConfig = ReviewLintConfigSchema.parse(config)

  return async (state: { storyId: string; worktreePath: string }): Promise<WorkerResult> => {
    const startTime = Date.now()

    // AC-15: Disabled worker returns skipped
    if (!fullConfig.enabled) {
      logger.info('Lint worker disabled', { storyId: state.storyId })
      return {
        verdict: 'PASS',
        skipped: true,
        errors: 0,
        warnings: 0,
        findings: [],
        duration_ms: 0,
      }
    }

    try {
      const { stdout, stderr, exitCode } = await toolRunner(
        fullConfig.eslintBin,
        state.worktreePath,
        fullConfig.timeoutMs,
      )

      const duration_ms = Date.now() - startTime
      const output = stdout + stderr

      if (exitCode === 0) {
        logger.info('Lint worker passed', { storyId: state.storyId, duration_ms })
        return {
          verdict: 'PASS',
          skipped: false,
          errors: 0,
          warnings: 0,
          findings: [],
          duration_ms,
        }
      }

      // Parse ESLint output for findings
      const findings = parseLintOutput(output)
      const errors = findings.filter(f => f.severity === 'error').length
      const warnings = findings.filter(f => f.severity === 'warning').length

      logger.warn('Lint worker failed', { storyId: state.storyId, errors, warnings })

      return {
        verdict: 'FAIL',
        skipped: false,
        errors,
        warnings,
        findings,
        duration_ms,
      }
    } catch (error) {
      const duration_ms = Date.now() - startTime
      const msg = error instanceof Error ? error.message : String(error)
      const isTimeout = msg.toLowerCase().includes('timed out')

      logger.error('Lint worker error', { storyId: state.storyId, error: msg })

      // AC-8: Timeout returns FAIL finding with timeout message
      return {
        verdict: 'FAIL',
        skipped: false,
        errors: 1,
        warnings: 0,
        findings: [
          {
            file: 'unknown',
            message: isTimeout ? `Lint worker timed out after ${fullConfig.timeoutMs}ms` : msg,
            severity: 'error',
            auto_fixable: false,
          },
        ],
        duration_ms,
      }
    }
  }
}

// ============================================================================
// Output Parsing
// ============================================================================

function parseLintOutput(output: string): WorkerResult['findings'] {
  const findings: WorkerResult['findings'] = []
  const lines = output.split('\n')

  for (const line of lines) {
    // Simple ESLint format: file:line:col: severity message (rule)
    const match = line.match(/^(.+):(\d+):(\d+):\s+(error|warning)\s+(.+?)(?:\s+(\S+))?$/)
    if (match) {
      findings.push({
        file: match[1]!,
        line: parseInt(match[2]!, 10),
        column: parseInt(match[3]!, 10),
        severity: match[4] as 'error' | 'warning',
        message: match[5]!,
        rule: match[6],
        auto_fixable: false,
      })
    }
  }

  // If no structured output but exit code was non-zero, add generic finding
  if (findings.length === 0 && output.trim()) {
    findings.push({
      file: 'unknown',
      message: output.trim().substring(0, 200),
      severity: 'error',
      auto_fixable: false,
    })
  }

  return findings
}

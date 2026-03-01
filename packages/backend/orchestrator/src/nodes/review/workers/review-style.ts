/**
 * Review Style Worker
 *
 * Runs Prettier check on the changed files.
 * Uses injectable toolRunner for testability.
 *
 * APIP-1050: AC-2, AC-3, AC-8, AC-15
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { WorkerResult } from '../../../artifacts/review.js'

export const ReviewStyleConfigSchema = z.object({
  timeoutMs: z.number().int().positive().default(30000),
  enabled: z.boolean().default(true),
  prettierBin: z.string().default('pnpm prettier --check .'),
})

export type ReviewStyleConfig = z.infer<typeof ReviewStyleConfigSchema>

export type StyleToolRunner = (
  command: string,
  worktreePath: string,
  timeoutMs: number,
) => Promise<{ stdout: string; stderr: string; exitCode: number }>

const defaultToolRunner: StyleToolRunner = async (command, worktreePath, timeoutMs) => {
  const { exec } = await import('child_process')
  const { promisify } = await import('util')
  const execAsync = promisify(exec)

  try {
    const { stdout, stderr } = await Promise.race([
      execAsync(command, { cwd: worktreePath, maxBuffer: 10 * 1024 * 1024 }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Style worker timed out after ${timeoutMs}ms`)),
          timeoutMs,
        ),
      ),
    ])
    return { stdout, stderr, exitCode: 0 }
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('timed out')) {
      throw error
    }
    const execError = error as { stdout?: string; stderr?: string; code?: number }
    return {
      stdout: execError.stdout ?? '',
      stderr: execError.stderr ?? '',
      exitCode: execError.code ?? 1,
    }
  }
}

export function createReviewStyleNode(
  config: Partial<ReviewStyleConfig> = {},
  toolRunner: StyleToolRunner = defaultToolRunner,
) {
  const fullConfig = ReviewStyleConfigSchema.parse(config)

  return async (state: { storyId: string; worktreePath: string }): Promise<WorkerResult> => {
    const startTime = Date.now()

    if (!fullConfig.enabled) {
      logger.info('Style worker disabled', { storyId: state.storyId })
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
        fullConfig.prettierBin,
        state.worktreePath,
        fullConfig.timeoutMs,
      )

      const duration_ms = Date.now() - startTime

      if (exitCode === 0) {
        return {
          verdict: 'PASS',
          skipped: false,
          errors: 0,
          warnings: 0,
          findings: [],
          duration_ms,
        }
      }

      const output = stdout + stderr
      const findings = parseStyleOutput(output)
      const errors = findings.filter(f => f.severity === 'error').length
      const warnings = findings.filter(f => f.severity === 'warning').length

      return { verdict: 'FAIL', skipped: false, errors, warnings, findings, duration_ms }
    } catch (error) {
      const duration_ms = Date.now() - startTime
      const msg = error instanceof Error ? error.message : String(error)
      const isTimeout = msg.toLowerCase().includes('timed out')

      return {
        verdict: 'FAIL',
        skipped: false,
        errors: 1,
        warnings: 0,
        findings: [
          {
            file: 'unknown',
            message: isTimeout ? `Style worker timed out after ${fullConfig.timeoutMs}ms` : msg,
            severity: 'error',
            auto_fixable: true,
          },
        ],
        duration_ms,
      }
    }
  }
}

function parseStyleOutput(output: string): WorkerResult['findings'] {
  const findings: WorkerResult['findings'] = []
  const lines = output.split('\n').filter(l => l.trim())

  for (const line of lines) {
    // Prettier format: [warn] file.ts
    if (line.startsWith('[warn]')) {
      findings.push({
        file: line.replace('[warn]', '').trim(),
        message: 'File is not formatted according to Prettier rules',
        severity: 'warning',
        auto_fixable: true,
      })
    } else if (line.trim() && !line.includes('Checking formatting')) {
      findings.push({
        file: line.trim(),
        message: 'File is not formatted according to Prettier rules',
        severity: 'error',
        auto_fixable: true,
      })
    }
  }

  return findings
}

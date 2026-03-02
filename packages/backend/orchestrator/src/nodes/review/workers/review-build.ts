/**
 * Review Build Worker
 *
 * Runs pnpm build to verify the build succeeds.
 * Uses injectable toolRunner for testability.
 *
 * APIP-1050: AC-2, AC-3, AC-8, AC-15
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { WorkerResult } from '../../../artifacts/review.js'

export const ReviewBuildConfigSchema = z.object({
  timeoutMs: z.number().int().positive().default(300000),
  enabled: z.boolean().default(true),
  buildBin: z.string().default('pnpm build'),
})

export type ReviewBuildConfig = z.infer<typeof ReviewBuildConfigSchema>

export type BuildToolRunner = (
  command: string,
  worktreePath: string,
  timeoutMs: number,
) => Promise<{ stdout: string; stderr: string; exitCode: number }>

const defaultToolRunner: BuildToolRunner = async (command, worktreePath, timeoutMs) => {
  const { exec } = await import('child_process')
  const { promisify } = await import('util')
  const execAsync = promisify(exec)

  try {
    const { stdout, stderr } = await Promise.race([
      execAsync(command, { cwd: worktreePath, maxBuffer: 10 * 1024 * 1024 }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Build worker timed out after ${timeoutMs}ms`)),
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

export function createReviewBuildNode(
  config: Partial<ReviewBuildConfig> = {},
  toolRunner: BuildToolRunner = defaultToolRunner,
) {
  const fullConfig = ReviewBuildConfigSchema.parse(config)

  return async (state: { storyId: string; worktreePath: string }): Promise<WorkerResult> => {
    const startTime = Date.now()

    if (!fullConfig.enabled) {
      logger.info('Build worker disabled', { storyId: state.storyId })
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
        fullConfig.buildBin,
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
      const findings = parseBuildOutput(output)
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
            message: isTimeout ? `Build worker timed out after ${fullConfig.timeoutMs}ms` : msg,
            severity: 'error',
            auto_fixable: false,
          },
        ],
        duration_ms,
      }
    }
  }
}

function parseBuildOutput(output: string): WorkerResult['findings'] {
  const findings: WorkerResult['findings'] = []
  const lines = output.split('\n')

  for (const line of lines) {
    // TypeScript/build error format
    const tscMatch = line.match(/^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+TS\d+:\s+(.+)$/)
    if (tscMatch) {
      findings.push({
        file: tscMatch[1]!,
        line: parseInt(tscMatch[2]!, 10),
        column: parseInt(tscMatch[3]!, 10),
        severity: tscMatch[4] as 'error' | 'warning',
        message: tscMatch[5]!,
        auto_fixable: false,
      })
    }
  }

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

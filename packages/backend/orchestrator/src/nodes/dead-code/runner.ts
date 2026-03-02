/**
 * Dead Code Reaper — Runner
 *
 * Orchestrates the full Dead Code Reaper run:
 * 1. Runs all three scanners concurrently via Promise.all
 * 2. Micro-verifies each safe candidate sequentially
 * 3. Filters false-positives
 * 4. Returns DeadCodeReaperResult
 *
 * Wraps the full operation with withTimeout from runner/timeout.ts.
 * Catches NodeTimeoutError and converts to status:'partial'.
 *
 * Advisory lock is handled by the cron job (dead-code-reaper.job.ts),
 * not here — matching the pattern-miner.job.ts pattern.
 *
 * APIP-4050: Dead Code Reaper — Monthly Cron Analysis and CLEANUP Story Generation
 */

import { logger } from '@repo/logger'
import { withTimeout } from '../../runner/timeout.js'
import { NodeTimeoutError } from '../../runner/errors.js'
import type { ExecFn } from './scanners.js'
import { scanDeadExports, scanUnusedFiles, scanUnusedDeps } from './scanners.js'
import { microVerify } from './micro-verify.js'
import {
  type DeadCodeReaperConfig,
  type DeadCodeReaperResult,
  type DeadExportFinding,
  type UnusedFileFinding,
  DeadCodeReaperConfigSchema,
  DeadCodeReaperResultSchema,
} from './schemas.js'

/**
 * Create an empty DeadCodeReaperResult for error/skipped/partial cases.
 */
function emptyResult(
  status: DeadCodeReaperResult['status'],
  error: string | null = null,
  verifiedDeletions: number = 0,
  partialDeadExports: DeadExportFinding[] = [],
  partialUnusedFiles: UnusedFileFinding[] = [],
): DeadCodeReaperResult {
  return DeadCodeReaperResultSchema.parse({
    status,
    summary: {
      findingsTotal: 0,
      verifiedDeletions,
      falsePositives: 0,
      cleanupStoriesGenerated: 0,
    },
    deadExports: partialDeadExports,
    unusedFiles: partialUnusedFiles,
    unusedDeps: [],
    microVerifyResults: [],
    cleanupStoryPath: null,
    error,
  })
}

/**
 * Run the Dead Code Reaper scan.
 *
 * @param config - Configuration (defaults applied via Zod)
 * @param execFn - Injectable exec function (defaults to actual exec)
 * @returns DeadCodeReaperResult
 */
export async function runDeadCodeReaper(
  config: Partial<DeadCodeReaperConfig> = {},
  execFn?: ExecFn,
): Promise<DeadCodeReaperResult> {
  const fullConfig = DeadCodeReaperConfigSchema.parse(config)
  const startedAt = new Date().toISOString()
  const startMs = Date.now()

  // Default execFn uses Node.js child_process
  const defaultExecFn: ExecFn = async (cmd: string) => {
    const { execSync } = await import('child_process')
    return execSync(cmd, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
  }

  const exec = execFn ?? defaultExecFn

  // Accumulated results for partial timeout recovery
  const accumulatedDeadExports: DeadExportFinding[] = []
  const accumulatedUnusedFiles: UnusedFileFinding[] = []
  let accumulatedVerifiedDeletions = 0
  let accumulatedFalsePositives = 0

  try {
    const result = await withTimeout(
      async () => {
        // Run all three scanners concurrently
        const [deadExports, unusedFiles, unusedDeps] = await Promise.all([
          scanDeadExports(fullConfig, exec),
          scanUnusedFiles(fullConfig, exec),
          scanUnusedDeps(fullConfig, exec),
        ])

        accumulatedDeadExports.push(...deadExports)
        accumulatedUnusedFiles.push(...unusedFiles)

        const findingsTotal = deadExports.length + unusedFiles.length + unusedDeps.length

        // Micro-verify dead exports and unused files sequentially
        const microVerifyResults = []
        const verifiedDeadExports: DeadExportFinding[] = []
        const verifiedUnusedFiles: UnusedFileFinding[] = []
        let falsePositives = 0

        for (const finding of [...deadExports, ...unusedFiles]) {
          const verifyResult = await microVerify(finding, exec, fullConfig.dryRun)
          microVerifyResults.push(verifyResult)

          if (verifyResult.status === 'safe') {
            accumulatedVerifiedDeletions++
            if ('exportName' in finding) {
              verifiedDeadExports.push(finding as DeadExportFinding)
            } else {
              verifiedUnusedFiles.push(finding as UnusedFileFinding)
            }
          } else if (verifyResult.status === 'false-positive') {
            falsePositives++
            accumulatedFalsePositives++
          }
        }

        return DeadCodeReaperResultSchema.parse({
          status: 'success',
          summary: {
            findingsTotal,
            verifiedDeletions: accumulatedVerifiedDeletions,
            falsePositives,
            cleanupStoriesGenerated: 0,
          },
          deadExports: verifiedDeadExports,
          unusedFiles: verifiedUnusedFiles,
          unusedDeps,
          microVerifyResults,
          cleanupStoryPath: null,
          error: null,
        })
      },
      {
        timeoutMs: fullConfig.timeoutMs,
        nodeName: 'dead-code-reaper',
      },
    )

    const completedAt = new Date().toISOString()
    const durationMs = Date.now() - startMs

    logger.info('cron.dead-code-reaper.completed', {
      jobName: 'dead-code-reaper',
      startedAt,
      completedAt,
      durationMs,
      status: 'success',
      findingsTotal: result.summary.findingsTotal,
      verifiedDeletions: result.summary.verifiedDeletions,
      falsePositives: result.summary.falsePositives,
      cleanupStoriesGenerated: result.summary.cleanupStoriesGenerated,
    })

    return result
  } catch (err) {
    const completedAt = new Date().toISOString()
    const durationMs = Date.now() - startMs

    if (err instanceof NodeTimeoutError) {
      // Convert timeout to partial result with accumulated data
      const partialResult = DeadCodeReaperResultSchema.parse({
        status: 'partial',
        summary: {
          findingsTotal: accumulatedDeadExports.length + accumulatedUnusedFiles.length,
          verifiedDeletions: accumulatedVerifiedDeletions,
          falsePositives: accumulatedFalsePositives,
          cleanupStoriesGenerated: 0,
        },
        deadExports: accumulatedDeadExports,
        unusedFiles: accumulatedUnusedFiles,
        unusedDeps: [],
        microVerifyResults: [],
        cleanupStoryPath: null,
        error: `Timed out after ${fullConfig.timeoutMs}ms`,
      })

      logger.info('cron.dead-code-reaper.completed', {
        jobName: 'dead-code-reaper',
        startedAt,
        completedAt,
        durationMs,
        status: 'partial',
        findingsTotal: partialResult.summary.findingsTotal,
        verifiedDeletions: accumulatedVerifiedDeletions,
        falsePositives: accumulatedFalsePositives,
        cleanupStoriesGenerated: 0,
      })

      return partialResult
    }

    // Other errors
    const errorMessage = err instanceof Error ? err.message : String(err)

    logger.info('cron.dead-code-reaper.completed', {
      jobName: 'dead-code-reaper',
      startedAt,
      completedAt,
      durationMs,
      status: 'error',
      findingsTotal: 0,
      verifiedDeletions: 0,
      falsePositives: 0,
      cleanupStoriesGenerated: 0,
    })

    return emptyResult('error', errorMessage)
  }
}

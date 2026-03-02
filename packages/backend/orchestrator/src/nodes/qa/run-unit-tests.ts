/**
 * QA run-unit-tests node
 *
 * Runs unit tests via child_process.spawn wrapped in Promise.race with wall-clock timeout.
 * Retries up to testTimeoutRetries on timeout. Records CommandRun.
 * Uses createNode (not createToolNode) with overridden timeoutMs to accommodate 5-minute
 * subprocess timeout (ARCH-001).
 *
 * AC-4: timeout path, retry path, success path with stdout capture, FAIL on non-zero exit
 * AC-16: Lifecycle logging
 */

import { spawn } from 'child_process'
import { logger } from '@repo/logger'
import { createNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import type { QAGraphConfig, QAGraphState, CommandRunResult } from '../../graphs/qa.js'

/**
 * Runs a command via child_process.spawn, returning stdout/stderr/exit code.
 * Races against a wall-clock timeout.
 */
async function runCommand(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
): Promise<CommandRunResult> {
  const startTime = Date.now()

  return new Promise<CommandRunResult>(resolve => {
    let stdout = ''
    let stderr = ''
    let timedOut = false

    const child = spawn(command, args, {
      cwd,
      shell: false,
      env: { ...process.env },
    })

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    const timeoutHandle = setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')
      setTimeout(() => {
        if (!child.killed) child.kill('SIGKILL')
      }, 5000)
    }, timeoutMs)

    child.on('close', exitCode => {
      clearTimeout(timeoutHandle)
      const durationMs = Date.now() - startTime
      resolve({
        exitCode: timedOut ? -1 : (exitCode ?? -1),
        stdout,
        stderr,
        durationMs,
        timedOut,
      })
    })

    child.on('error', err => {
      clearTimeout(timeoutHandle)
      const durationMs = Date.now() - startTime
      resolve({
        exitCode: -1,
        stdout,
        stderr: stderr + '\n' + err.message,
        durationMs,
        timedOut: false,
      })
    })
  })
}

/**
 * Creates the run-unit-tests node.
 *
 * Uses createNode directly (not createToolNode) to set timeoutMs beyond the 10s
 * createToolNode default. The application-layer timeout handles subprocess timeouts;
 * the node-factory timeout is a safety wrapper.
 *
 * @param config - QA graph configuration
 */
export function createRunUnitTestsNode(config: QAGraphConfig) {
  // Node timeout = testTimeoutMs per attempt * (retries + 1) + buffer
  const nodeTimeoutMs = config.testTimeoutMs * (config.testTimeoutRetries + 1) + 30000

  return createNode(
    {
      name: 'qa_run_unit_tests',
      retry: {
        maxAttempts: 1, // Application-layer retry logic below
        timeoutMs: nodeTimeoutMs,
      },
    },
    async (state: GraphState): Promise<any> => {
      const _qaState = state as unknown as QAGraphState
      const storyId = config.storyId
      const startTime = Date.now()

      logger.info('qa_unit_tests_started', {
        storyId,
        stage: 'qa',
        event: 'unit_tests_started',
        testFilter: config.testFilter,
      })

      let lastResult: CommandRunResult | null = null
      let attemptCount = 0
      const maxAttempts = config.testTimeoutRetries + 1 // 1 initial + retries

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        attemptCount = attempt

        const result = await runCommand(
          'pnpm',
          ['test', '--filter', config.testFilter],
          config.worktreeDir,
          config.testTimeoutMs,
        )

        lastResult = result

        if (!result.timedOut) {
          // Non-timeout result - stop retrying
          break
        }

        // Timed out - retry if we have retries remaining
        if (attempt < maxAttempts) {
          logger.warn('qa_unit_tests_timeout_retry', {
            storyId,
            stage: 'qa',
            event: 'unit_tests_timeout_retry',
            attempt,
            maxAttempts,
            durationMs: result.durationMs,
          })
        }
      }

      const durationMs = Date.now() - startTime
      const result = lastResult!

      if (result.timedOut) {
        // All attempts timed out
        logger.warn('qa_unit_tests_complete', {
          storyId,
          stage: 'qa',
          event: 'unit_tests_complete',
          verdict: 'FAIL',
          reason: 'timeout',
          attempts: attemptCount,
          durationMs,
        })
        return {
          unitTestResult: result,
          unitTestVerdict: 'FAIL',
          warnings: [
            `Unit tests timed out after ${attemptCount} attempt(s) (${config.testTimeoutMs}ms each)`,
          ],
        }
      }

      const verdict = result.exitCode === 0 ? 'PASS' : 'FAIL'

      logger.info('qa_unit_tests_complete', {
        storyId,
        stage: 'qa',
        event: 'unit_tests_complete',
        verdict,
        exitCode: result.exitCode,
        durationMs,
      })

      return {
        unitTestResult: result,
        unitTestVerdict: verdict,
      }
    },
  )
}

/**
 * QA run-e2e-tests node
 *
 * Runs E2E tests via child_process.spawn. Retries up to playwrightMaxRetries.
 * Only FAILs if all attempts fail. Records per-attempt playwrightAttempts.
 * Uses createNode (not createToolNode) with overridden timeoutMs (ARCH-001).
 *
 * AC-5: attempt 1 fail + attempt 2 succeed = PASS; all attempts fail = FAIL;
 *       enableE2e:false skips node (routing in graph)
 * AC-16: Lifecycle logging with qa_e2e_started, qa_e2e_attempt, qa_e2e_complete
 */

import { spawn } from 'child_process'
import { logger } from '@repo/logger'
import { createNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import type { QAGraphConfig, QAGraphState, CommandRunResult } from '../../graphs/qa.js'

/**
 * Runs a command via child_process.spawn, returning stdout/stderr/exit code.
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
 * Creates the run-e2e-tests node.
 *
 * Uses createNode directly (not createToolNode) to accommodate 5-minute test timeout (ARCH-001).
 *
 * @param config - QA graph configuration
 */
export function createRunE2ETestsNode(config: QAGraphConfig) {
  // Node timeout: (retries + 1) * testTimeoutMs + buffer
  const nodeTimeoutMs = (config.playwrightMaxRetries + 1) * config.testTimeoutMs + 30000

  return createNode(
    {
      name: 'qa_run_e2e_tests',
      retry: {
        maxAttempts: 1, // Application-layer retry below
        timeoutMs: nodeTimeoutMs,
      },
    },
    async (state: GraphState): Promise<any> => {
      const _state = state as unknown as QAGraphState
      const storyId = config.storyId
      const startTime = Date.now()

      logger.info('qa_e2e_started', {
        storyId,
        stage: 'qa',
        event: 'e2e_started',
        playwrightConfig: config.playwrightConfig,
        playwrightProject: config.playwrightProject,
        maxRetries: config.playwrightMaxRetries,
      })

      const maxAttempts = config.playwrightMaxRetries + 1
      const attempts: CommandRunResult[] = []
      let anySuccess = false

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        logger.info('qa_e2e_attempt', {
          storyId,
          stage: 'qa',
          event: 'e2e_attempt',
          attempt,
          maxAttempts,
        })

        const result = await runCommand(
          'pnpm',
          [
            'playwright',
            'test',
            '--config',
            config.playwrightConfig,
            '--project',
            config.playwrightProject,
          ],
          config.worktreeDir,
          config.testTimeoutMs,
        )

        attempts.push(result)

        if (result.exitCode === 0 && !result.timedOut) {
          anySuccess = true
          logger.info('qa_e2e_attempt_success', {
            storyId,
            stage: 'qa',
            event: 'e2e_attempt_success',
            attempt,
            durationMs: result.durationMs,
          })
          break
        }

        logger.warn('qa_e2e_attempt_fail', {
          storyId,
          stage: 'qa',
          event: 'e2e_attempt_fail',
          attempt,
          exitCode: result.exitCode,
          timedOut: result.timedOut,
          durationMs: result.durationMs,
        })
      }

      const durationMs = Date.now() - startTime
      const verdict = anySuccess ? 'PASS' : 'FAIL'

      logger.info('qa_e2e_complete', {
        storyId,
        stage: 'qa',
        event: 'e2e_complete',
        verdict,
        attempts: attempts.length,
        anySuccess,
        durationMs,
      })

      return {
        playwrightAttempts: attempts,
        e2eVerdict: verdict,
      }
    },
  )
}

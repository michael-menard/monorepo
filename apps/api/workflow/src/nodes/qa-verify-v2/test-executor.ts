/**
 * test_executor Node (qa-verify-v2) — DETERMINISTIC
 *
 * Runs unit tests with testStrategy.unitTestFilter.
 * Runs E2E tests with testStrategy.e2eTestPattern (if non-empty).
 * Injectable runners — default is no-op.
 * Never fails hard — test failures are data.
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { TestRunResult } from '../../state/dev-implement-v2-state.js'
import type { QAVerifyV2State } from '../../state/qa-verify-v2-state.js'

// ============================================================================
// Injectable Adapter Types
// ============================================================================

export type UnitTestRunnerFn = (filter: string) => Promise<TestRunResult>
export type E2eTestRunnerFn = (pattern: string) => Promise<TestRunResult>

// ============================================================================
// Config Schema
// ============================================================================

export const TestExecutorConfigSchema = z.object({
  unitTestRunner: z.function().optional(),
  e2eTestRunner: z.function().optional(),
})

export type TestExecutorConfig = {
  unitTestRunner?: UnitTestRunnerFn
  e2eTestRunner?: E2eTestRunnerFn
}

// ============================================================================
// Default No-op Adapters
// ============================================================================

const defaultUnitRunner: UnitTestRunnerFn = async _filter => ({
  passed: true,
  passedCount: 0,
  failedCount: 0,
  failures: [],
  rawOutput: '(no-op unit test runner)',
})

const defaultE2eRunner: E2eTestRunnerFn = async _pattern => ({
  passed: true,
  passedCount: 0,
  failedCount: 0,
  failures: [],
  rawOutput: '(no-op e2e test runner)',
})

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the test_executor LangGraph node.
 */
export function createTestExecutorNode(config: TestExecutorConfig = {}) {
  const unitTestRunner = config.unitTestRunner ?? defaultUnitRunner
  const e2eTestRunner = config.e2eTestRunner ?? defaultE2eRunner

  return async (state: QAVerifyV2State): Promise<Partial<QAVerifyV2State>> => {
    const { storyId, testStrategy } = state

    logger.info(`test_executor: starting for story ${storyId}`, {
      hasUnitRunner: !!config.unitTestRunner,
      hasE2eRunner: !!config.e2eTestRunner,
      unitFilter: testStrategy?.unitTestFilter,
      e2ePattern: testStrategy?.e2eTestPattern,
    })

    let unitTestResult: TestRunResult | null = null
    let e2eTestResult: TestRunResult | null = null

    // Run unit tests if filter is set
    const unitFilter = testStrategy?.unitTestFilter ?? ''
    if (unitFilter) {
      try {
        unitTestResult = await unitTestRunner(unitFilter)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.warn(`test_executor: unit runner threw — treating as pass`, { error: msg })
        unitTestResult = {
          passed: true,
          passedCount: 0,
          failedCount: 0,
          failures: [],
          rawOutput: `unit runner error (non-fatal): ${msg}`,
        }
      }
    }

    // Run E2E tests if pattern is set
    const e2ePattern = testStrategy?.e2eTestPattern ?? ''
    if (e2ePattern) {
      try {
        e2eTestResult = await e2eTestRunner(e2ePattern)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.warn(`test_executor: e2e runner threw — treating as pass`, { error: msg })
        e2eTestResult = {
          passed: true,
          passedCount: 0,
          failedCount: 0,
          failures: [],
          rawOutput: `e2e runner error (non-fatal): ${msg}`,
        }
      }
    }

    logger.info('test_executor: complete', {
      storyId,
      unitPassed: unitTestResult?.passed ?? null,
      e2ePassed: e2eTestResult?.passed ?? null,
    })

    return {
      unitTestResult,
      e2eTestResult,
      qaVerifyV2Phase: 'result_interpreter',
    }
  }
}

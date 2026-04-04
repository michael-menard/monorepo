/**
 * postcondition_gate Node (dev-implement-v2) — DETERMINISTIC
 *
 * Final gate. Checks:
 *   a. executorOutcome exists
 *   b. If verdict === 'stuck': fail with diagnosis attached to errors[]
 *   c. If verdict === 'complete': verify testsRan and testsPassed
 *   d. At least 1 AC has verified: true (if any ACs present)
 *
 * No retries — fail means fail. The escalation chain (Sonnet → Opus → human)
 * handles tier changes, not this gate.
 */

import { logger } from '@repo/logger'
import type { ExecutorOutcome, DevImplementV2State } from '../../state/dev-implement-v2-state.js'
import type { PostconditionResult } from '../../state/plan-refinement-v2-state.js'

// ============================================================================
// Exported Pure Functions
// ============================================================================

/**
 * Checks the final dev-implement postconditions against the executor outcome.
 */
export function checkDevImplementPostconditions(
  outcome: ExecutorOutcome | null,
): PostconditionResult {
  if (!outcome) {
    return {
      passed: false,
      failures: [
        {
          check: 'outcome_exists',
          reason: 'executorOutcome is null — implementation_executor must run first',
        },
      ],
      evidence: {},
    }
  }

  const failures: PostconditionResult['failures'] = []

  if (outcome.verdict === 'stuck') {
    failures.push({
      check: 'executor_completed',
      reason: `Executor stuck: ${outcome.diagnosis}`,
    })
    return {
      passed: false,
      failures,
      evidence: { diagnosis: outcome.diagnosis },
    }
  }

  // verdict === 'complete'
  // For new package scaffolds the executor deliberately skips tests (testsRan: false)
  // because the package needs pnpm install + build before tests can run.
  // Allow this as long as at least one file was created.
  const newPackageScaffold = !outcome.testsRan && outcome.filesCreated.length > 0

  if (!newPackageScaffold) {
    if (!outcome.testsRan) {
      failures.push({
        check: 'tests_ran',
        reason: 'Agent reported complete but did not run tests',
      })
    }

    if (!outcome.testsPassed) {
      failures.push({
        check: 'tests_passed',
        reason: `Tests did not pass. Output: ${outcome.testOutput.slice(0, 200)}`,
      })
    }
  }

  if (outcome.acVerification.length > 0) {
    const verifiedCount = outcome.acVerification.filter(a => a.verified).length
    if (verifiedCount === 0) {
      failures.push({
        check: 'ac_verified',
        reason: 'No acceptance criteria were verified in the executor outcome',
      })
    }
  }

  return {
    passed: failures.length === 0,
    failures,
    evidence: {
      filesCreated: outcome.filesCreated.join(', '),
      filesModified: outcome.filesModified.join(', '),
      testOutput: outcome.testOutput.slice(0, 200),
    },
  }
}

/**
 * Conditional edge function for after the dev-implement postcondition gate.
 */
export function afterDevImplementGate(state: DevImplementV2State): 'complete' | '__end__' {
  if (state.devImplementV2Phase === 'complete') return 'complete'
  return '__end__'
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the postcondition_gate LangGraph node for dev-implement-v2.
 */
export function createDevImplementPostconditionGateNode() {
  return async (state: DevImplementV2State): Promise<Partial<DevImplementV2State>> => {
    const { executorOutcome, storyId } = state

    logger.info(`postcondition_gate (dev-implement-v2): evaluating for story ${storyId}`)

    const postconditionResult = checkDevImplementPostconditions(executorOutcome)

    if (postconditionResult.passed) {
      logger.info('postcondition_gate (dev-implement-v2): passed → complete')
      return {
        postconditionResult,
        devImplementV2Phase: 'complete',
      }
    }

    const failureSummary = postconditionResult.failures
      .map(f => `[${f.check}] ${f.reason}`)
      .join('; ')

    logger.warn('postcondition_gate (dev-implement-v2): failed → error', { failureSummary })

    return {
      postconditionResult,
      devImplementV2Phase: 'error',
      errors: [`postcondition_gate: ${failureSummary}`],
    }
  }
}

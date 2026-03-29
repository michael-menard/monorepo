/**
 * postcondition_gate Node (qa-verify-v2) — DETERMINISTIC
 *
 * Final gate postconditions:
 *   a. Every AC has a verdict
 *   b. qaVerdict is set
 *   c. Evidence field is non-empty for all pass/fail verdicts
 *
 * Routes:
 *   pass → complete
 *   fail+retries → result_interpreter with feedback
 *   exhausted → complete (verdict stands)
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type {
  ACVerificationResult,
  ParsedAC,
  QAVerifyV2State,
} from '../../state/qa-verify-v2-state.js'
import type { PostconditionResult } from '../../state/plan-refinement-v2-state.js'

// ============================================================================
// Config Schema
// ============================================================================

export const PostconditionGateConfigSchema = z.object({})

export type PostconditionGateConfig = Record<string, never>

// ============================================================================
// Exported Pure Functions
// ============================================================================

/**
 * Checks QA postconditions.
 */
export function checkQaPostconditions(
  results: ACVerificationResult[],
  parsedACs: ParsedAC[],
  qaVerdict: string | null,
): PostconditionResult {
  const failures: PostconditionResult['failures'] = []

  // a. Every AC has a verdict
  const coveredIndices = new Set(results.map(r => r.acIndex))
  const uncoveredACs = parsedACs.filter(ac => !coveredIndices.has(ac.index))
  if (uncoveredACs.length > 0) {
    failures.push({
      check: 'all_acs_have_verdict',
      reason: `${uncoveredACs.length} AC(s) have no verdict: indices ${uncoveredACs.map(a => a.index).join(', ')}`,
    })
  }

  // b. qaVerdict is set
  if (!qaVerdict) {
    failures.push({
      check: 'verdict_set',
      reason: 'qaVerdict is null — evidence_assembler must run first',
    })
  }

  // c. Evidence non-empty for pass/fail
  const missingEvidence = results.filter(
    r =>
      (r.verdict === 'pass' || r.verdict === 'fail') && (!r.evidence || r.evidence.trim() === ''),
  )
  if (missingEvidence.length > 0) {
    failures.push({
      check: 'evidence_non_empty',
      reason: `${missingEvidence.length} pass/fail result(s) have empty evidence`,
    })
  }

  return {
    passed: failures.length === 0,
    failures,
    evidence: {
      totalResults: String(results.length),
      verdict: qaVerdict ?? 'null',
    },
  }
}

/**
 * Conditional edge function for after QA postcondition gate.
 */
export function afterQaGate(state: QAVerifyV2State): 'result_interpreter' | 'complete' | '__end__' {
  const { qaVerifyV2Phase } = state
  if (qaVerifyV2Phase === 'complete') return 'complete'
  if (qaVerifyV2Phase === 'result_interpreter') return 'result_interpreter'
  return '__end__'
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the qa-verify-v2 postcondition_gate LangGraph node.
 */
export function createQaPostconditionGateNode(
  _config: PostconditionGateConfig = {} as PostconditionGateConfig,
) {
  return async (state: QAVerifyV2State): Promise<Partial<QAVerifyV2State>> => {
    const { storyId, acVerificationResults, parsedACs, qaVerdict, retryCount, maxRetries } = state

    logger.info(`postcondition_gate (qa-verify-v2): evaluating for story ${storyId}`, {
      resultsCount: acVerificationResults.length,
      qaVerdict,
      retryCount,
      maxRetries,
    })

    const postconditionResult = checkQaPostconditions(acVerificationResults, parsedACs, qaVerdict)

    if (postconditionResult.passed) {
      logger.info('postcondition_gate (qa-verify-v2): passed → complete')
      return {
        postconditionResult,
        qaVerifyV2Phase: 'complete',
      }
    }

    if (retryCount < maxRetries) {
      logger.warn('postcondition_gate (qa-verify-v2): failed → retrying result_interpreter', {
        retryCount: retryCount + 1,
        failures: postconditionResult.failures.map(f => f.check),
      })
      return {
        postconditionResult,
        retryCount: retryCount + 1,
        qaVerifyV2Phase: 'result_interpreter',
      }
    }

    // Max retries exhausted — complete with verdict as-is
    logger.warn(
      `postcondition_gate (qa-verify-v2): max retries (${maxRetries}) exhausted → complete`,
    )
    return {
      postconditionResult,
      qaVerifyV2Phase: 'complete',
    }
  }
}

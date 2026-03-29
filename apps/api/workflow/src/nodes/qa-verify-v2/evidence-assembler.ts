/**
 * evidence_assembler Node (qa-verify-v2) — DETERMINISTIC
 *
 * Assembles final evidence document from acVerificationResults.
 * Assigns qaVerdict:
 *   pass: all non-manual ACs pass
 *   conditional_pass: all critical ACs pass, some non-critical fail/skip
 *   fail: any critical AC (minimum_path: true) fails
 *
 * Never fails hard.
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type {
  ACVerificationResult,
  ParsedAC,
  QAVerifyV2State,
} from '../../state/qa-verify-v2-state.js'

// ============================================================================
// Config Schema
// ============================================================================

export const EvidenceAssemblerConfigSchema = z.object({})

export type EvidenceAssemblerConfig = Record<string, never>

// ============================================================================
// Exported Pure Functions
// ============================================================================

type QAVerdict = 'pass' | 'fail' | 'conditional_pass'

/**
 * Assigns QA verdict from AC verification results.
 *
 * Logic:
 * - Any fail verdict → check if that AC is "critical" (first AC = critical by default)
 * - If critical AC fails → fail
 * - If all automated ACs pass → pass
 * - If some skip/fail but no critical failure → conditional_pass
 */
export function assignQaVerdict(results: ACVerificationResult[], parsedACs: ParsedAC[]): QAVerdict {
  if (results.length === 0) return 'conditional_pass'

  const nonManualResults = results.filter(r => r.verdict !== 'manual')
  if (nonManualResults.length === 0) return 'conditional_pass'

  // Critical ACs = first AC or those with index 0 (heuristic: AC 0 is always critical)
  const criticalIndices = new Set([0])

  const criticalFailed = results.some(r => criticalIndices.has(r.acIndex) && r.verdict === 'fail')

  if (criticalFailed) return 'fail'

  const allAutomatedPass = nonManualResults.every(
    r => r.verdict === 'pass' || r.verdict === 'manual',
  )

  if (allAutomatedPass) return 'pass'

  return 'conditional_pass'
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the evidence_assembler LangGraph node.
 */
export function createEvidenceAssemblerNode(
  _config: EvidenceAssemblerConfig = {} as EvidenceAssemblerConfig,
) {
  return async (state: QAVerifyV2State): Promise<Partial<QAVerifyV2State>> => {
    const { storyId, acVerificationResults, parsedACs } = state

    logger.info(`evidence_assembler: starting for story ${storyId}`, {
      resultsCount: acVerificationResults.length,
    })

    const qaVerdict = assignQaVerdict(acVerificationResults, parsedACs)

    const passingCount = acVerificationResults.filter(r => r.verdict === 'pass').length
    const failingCount = acVerificationResults.filter(r => r.verdict === 'fail').length
    const manualCount = acVerificationResults.filter(r => r.verdict === 'manual').length
    const skipCount = acVerificationResults.filter(r => r.verdict === 'skip').length

    logger.info('evidence_assembler: complete', {
      storyId,
      qaVerdict,
      passing: passingCount,
      failing: failingCount,
      manual: manualCount,
      skip: skipCount,
    })

    return {
      qaVerdict,
      qaVerifyV2Phase: 'postcondition_gate',
    }
  }
}

/**
 * story_readiness_check Node
 *
 * Computes readiness score via injectable ReadinessScoreFn.
 * Default formula (DEC-4):
 *   flows_confirmed_ratio * 40 + warnings_cleared_ratio * 30 + no_errors * 30
 * Pass threshold: 70
 *
 * APRS-2030: ST-4, AC-5
 */

import { logger } from '@repo/logger'
import { type PlanRefinementState, type StoryReadiness } from '../../state/plan-refinement-state.js'

// ============================================================================
// Injectable Scorer
// ============================================================================

export type ReadinessScoreInput = {
  totalFlows: number
  confirmedFlows: number
  totalWarnings: number
  criticalWarnings: number
  totalErrors: number
}

/**
 * Injectable readiness score function.
 * Returns a score 0-100.
 */
export type ReadinessScoreFn = (input: ReadinessScoreInput) => number

/**
 * Default readiness score computation (DEC-4).
 * flows_confirmed_ratio * 40 + warnings_cleared_ratio * 30 + no_errors * 30
 */
export const defaultReadinessScoreFn: ReadinessScoreFn = (input: ReadinessScoreInput): number => {
  const flowsRatio = input.totalFlows > 0 ? input.confirmedFlows / input.totalFlows : 1
  const warningsCleared =
    input.totalWarnings > 0
      ? (input.totalWarnings - input.criticalWarnings) / input.totalWarnings
      : 1
  const noErrors = input.totalErrors === 0 ? 1 : 0

  return Math.round(flowsRatio * 40 + warningsCleared * 30 + noErrors * 30)
}

const PASS_THRESHOLD = 70

// ============================================================================
// Phase Functions (exported for unit testability — AC-7)
// ============================================================================

/**
 * Compute readiness score and assessment.
 */
export function computeReadinessScore(
  state: PlanRefinementState,
  scoreFn: ReadinessScoreFn = defaultReadinessScoreFn,
): StoryReadiness {
  const confirmedFlowIds = state.humanReviewResult?.confirmedFlowIds ?? []
  const totalFlows = state.flows.length
  const confirmedFlows = confirmedFlowIds.length

  const criticalWarnings = state.warnings.filter(
    w => w.toLowerCase().includes('critical') || w.toLowerCase().includes('blocker'),
  ).length

  const input: ReadinessScoreInput = {
    totalFlows,
    confirmedFlows,
    totalWarnings: state.warnings.length,
    criticalWarnings,
    totalErrors: state.errors.length,
  }

  const score = scoreFn(input)
  const passed = score >= PASS_THRESHOLD
  const reasons: string[] = []

  if (totalFlows > 0 && confirmedFlows < totalFlows) {
    reasons.push(`${totalFlows - confirmedFlows} of ${totalFlows} flows not yet confirmed`)
  }
  if (criticalWarnings > 0) {
    reasons.push(`${criticalWarnings} critical warning(s) remain`)
  }
  if (state.errors.length > 0) {
    reasons.push(`${state.errors.length} error(s) present`)
  }
  if (passed && reasons.length === 0) {
    reasons.push('All checks passed')
  }

  return { score, passed, reasons }
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the story_readiness_check LangGraph node.
 *
 * AC-5: Computes readinessScore, storyReadiness.passed (threshold>=70),
 *       storyReadiness.reasons[]. Sets refinementPhase=complete on pass.
 *
 * @param config - Optional config with injectable ReadinessScoreFn
 */
export function createStoryReadinessCheckNode(config: { scoreFn?: ReadinessScoreFn } = {}) {
  const scoreFn = config.scoreFn ?? defaultReadinessScoreFn

  return async (state: PlanRefinementState): Promise<Partial<PlanRefinementState>> => {
    try {
      logger.info('story_readiness_check: starting', { planSlug: state.planSlug })

      const readiness = computeReadinessScore(state, scoreFn)

      logger.info('story_readiness_check: complete', {
        planSlug: state.planSlug,
        score: readiness.score,
        passed: readiness.passed,
      })

      return {
        readinessScore: readiness.score,
        storyReadiness: readiness,
        refinementPhase: 'complete',
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logger.error('story_readiness_check: unexpected error', {
        err,
        planSlug: state.planSlug,
      })
      return {
        refinementPhase: 'error',
        errors: [`story_readiness_check failed: ${message}`],
      }
    }
  }
}

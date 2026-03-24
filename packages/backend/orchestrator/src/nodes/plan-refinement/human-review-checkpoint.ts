/**
 * human_review_checkpoint Node
 *
 * Handles HiTL (Human-in-the-Loop) decision routing:
 *   approve → final_validation
 *   edit → gap_coverage (re-run gap analysis)
 *   reject → END with error
 *   defer → END with deferred flag
 *
 * Uses injectable DecisionCallback adapter (DEC-1).
 * Defaults to AutoDecisionCallback for non-interactive runs.
 *
 * APRS-2030: ST-2, AC-2, AC-3
 */

import { logger } from '@repo/logger'
import {
  type HiTLDecision,
  type HumanReviewResult,
  type PlanRefinementState,
  type Flow,
} from '../../state/plan-refinement-state.js'

// ============================================================================
// DecisionCallback Adapter Types
// ============================================================================

/**
 * Decision context passed to the callback.
 */
export type DecisionContext = {
  planSlug: string
  flows: Flow[]
  warnings: string[]
  errors: string[]
}

/**
 * Injectable callback for obtaining HiTL decisions.
 * AC-3: Core routing has no transport dependency.
 */
export type DecisionCallback = {
  ask: (context: DecisionContext) => Promise<{
    decision: HiTLDecision
    confirmedFlowIds?: string[]
    rejectedFlowIds?: string[]
    reason?: string
  }>
}

/**
 * AutoDecisionCallback — auto-approves if no critical warnings.
 * Default for non-interactive runs.
 */
export const AutoDecisionCallback: DecisionCallback = {
  ask: async (context: DecisionContext) => {
    const hasCriticalWarnings = context.warnings.some(
      w => w.toLowerCase().includes('critical') || w.toLowerCase().includes('blocker'),
    )

    if (hasCriticalWarnings) {
      return {
        decision: 'defer' as const,
        reason: 'Auto-deferred: critical warnings present',
      }
    }

    const allFlowIds = context.flows.map(f => f.id)
    return {
      decision: 'approve' as const,
      confirmedFlowIds: allFlowIds,
      rejectedFlowIds: [],
    }
  },
}

// ============================================================================
// Phase Functions (exported for unit testability — AC-7)
// ============================================================================

/**
 * Route HiTL decision to the appropriate next state.
 * AC-2: Handles all four flows.
 */
export function routeHiTLDecision(
  decision: HiTLDecision,
  options: {
    confirmedFlowIds?: string[]
    rejectedFlowIds?: string[]
    reason?: string
  } = {},
): Partial<PlanRefinementState> {
  switch (decision) {
    case 'approve':
      return {
        hitlDecision: 'approve',
        humanReviewResult: {
          confirmedFlowIds: options.confirmedFlowIds ?? [],
          rejectedFlowIds: options.rejectedFlowIds ?? [],
        },
        refinementPhase: 'final_validation',
      }
    case 'edit':
      return {
        hitlDecision: 'edit',
        humanReviewResult: {
          confirmedFlowIds: options.confirmedFlowIds ?? [],
          rejectedFlowIds: options.rejectedFlowIds ?? [],
        },
        refinementPhase: 'gap_coverage',
      }
    case 'reject':
      return {
        hitlDecision: 'reject',
        refinementPhase: 'error',
        errors: [`Human review rejected: ${options.reason ?? 'No reason provided'}`],
      }
    case 'defer':
      return {
        hitlDecision: 'defer',
        refinementPhase: 'complete',
        warnings: [`Human review deferred: ${options.reason ?? 'No reason provided'}`],
      }
  }
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the human_review_checkpoint LangGraph node.
 *
 * AC-2: Handles approve/edit/reject/defer flows.
 * AC-3: Injectable DecisionCallback, defaults to AutoDecisionCallback.
 *
 * @param config - Optional config with injectable DecisionCallback
 */
export function createHumanReviewCheckpointNode(
  config: { decisionCallback?: DecisionCallback } = {},
) {
  const callback = config.decisionCallback ?? AutoDecisionCallback

  return async (state: PlanRefinementState): Promise<Partial<PlanRefinementState>> => {
    try {
      logger.info('human_review_checkpoint: starting', { planSlug: state.planSlug })

      // If hitlDecision is already set AND we're entering this node for soft HiTL resume
      // (refinementPhase === 'human_review'), use the existing decision.
      // After an edit loop, the phase will be 'gap_coverage' so we re-invoke the callback.
      if (state.hitlDecision && state.refinementPhase === 'human_review') {
        logger.info('human_review_checkpoint: using existing hitlDecision from state', {
          decision: state.hitlDecision,
        })
        return routeHiTLDecision(state.hitlDecision, {
          confirmedFlowIds: state.humanReviewResult?.confirmedFlowIds,
          rejectedFlowIds: state.humanReviewResult?.rejectedFlowIds,
        })
      }

      // Invoke the decision callback
      const context: DecisionContext = {
        planSlug: state.planSlug,
        flows: state.flows,
        warnings: state.warnings,
        errors: state.errors,
      }

      const result = await callback.ask(context)

      logger.info('human_review_checkpoint: decision received', {
        planSlug: state.planSlug,
        decision: result.decision,
      })

      return routeHiTLDecision(result.decision, {
        confirmedFlowIds: result.confirmedFlowIds,
        rejectedFlowIds: result.rejectedFlowIds,
        reason: result.reason,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logger.error('human_review_checkpoint: unexpected error', {
        err,
        planSlug: state.planSlug,
      })
      return {
        refinementPhase: 'error',
        errors: [`human_review_checkpoint failed: ${message}`],
      }
    }
  }
}

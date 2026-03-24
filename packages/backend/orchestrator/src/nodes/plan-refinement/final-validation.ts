/**
 * final_validation Node
 *
 * Validate-only node (no mutations, no LLM):
 *   1. NormalizedPlanSchema.safeParse
 *   2. Check all confirmed flows have non-empty steps
 *   3. Check no critical warnings remain
 *
 * Returns validationResult with passed bool, errors[], warnings[].
 *
 * APRS-2030: ST-3, AC-4, DEC-5
 */

import { logger } from '@repo/logger'
import {
  NormalizedPlanSchema,
  type PlanRefinementState,
  type ValidationResult,
} from '../../state/plan-refinement-state.js'

// ============================================================================
// Phase Functions (exported for unit testability — AC-7)
// ============================================================================

/**
 * Validate the plan and return a ValidationResult.
 * AC-4 / DEC-5: No mutations, no LLM.
 */
export function validatePlan(state: PlanRefinementState): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // 1. NormalizedPlanSchema.safeParse
  if (state.normalizedPlan) {
    const parseResult = NormalizedPlanSchema.safeParse(state.normalizedPlan)
    if (!parseResult.success) {
      for (const issue of parseResult.error.issues) {
        errors.push(`Schema validation: ${issue.path.join('.')} — ${issue.message}`)
      }
    }
  } else {
    errors.push('normalizedPlan is null — cannot validate')
  }

  // 2. Check all confirmed flows have non-empty steps
  const confirmedFlowIds = state.humanReviewResult?.confirmedFlowIds ?? []
  if (confirmedFlowIds.length > 0 && state.flows.length > 0) {
    for (const flowId of confirmedFlowIds) {
      const flow = state.flows.find(f => f.id === flowId)
      if (flow && flow.steps.length === 0) {
        errors.push(`Confirmed flow "${flow.name}" (${flowId}) has no steps`)
      }
    }
  }

  // 3. Check no critical warnings remain
  const criticalWarnings = state.warnings.filter(
    w => w.toLowerCase().includes('critical') || w.toLowerCase().includes('blocker'),
  )
  if (criticalWarnings.length > 0) {
    for (const cw of criticalWarnings) {
      warnings.push(`Critical warning still present: ${cw}`)
    }
  }

  const passed = errors.length === 0
  return { errors, warnings, passed }
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the final_validation LangGraph node.
 *
 * AC-4: Validate-only — NormalizedPlanSchema.safeParse, confirmed flows have steps,
 *       no critical warnings. No mutations, no LLM.
 * Sets refinementPhase=story_readiness on pass, error on fail.
 */
export function createFinalValidationNode() {
  return async (state: PlanRefinementState): Promise<Partial<PlanRefinementState>> => {
    try {
      logger.info('final_validation: starting', { planSlug: state.planSlug })

      const result = validatePlan(state)

      logger.info('final_validation: complete', {
        planSlug: state.planSlug,
        passed: result.passed,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
      })

      return {
        validationResult: result,
        refinementPhase: result.passed ? 'story_readiness' : 'error',
        errors: result.passed ? [] : result.errors,
        warnings: result.warnings,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logger.error('final_validation: unexpected error', { err, planSlug: state.planSlug })
      return {
        refinementPhase: 'error',
        errors: [`final_validation failed: ${message}`],
      }
    }
  }
}

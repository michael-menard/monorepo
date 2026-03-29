/**
 * feasibility_scan Node (v2 agentic pipeline)
 *
 * Deterministic node — no LLM calls. Checks the plan's claims against the
 * grounding context to populate feasibilityFlags before the refinement_agent runs.
 *
 * Checks performed:
 * 1. For each flow in normalizedPlan.flows: if existingStories has stories with
 *    matching parentFlowId → flag as 'already_implemented'
 * 2. For each dependency in normalizedPlan.dependencies: if dependency does not
 *    appear in relatedPlans.planSlug → flag as 'missing_dependency'
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { Flow, NormalizedPlan } from '../../state/plan-refinement-state.js'
import type {
  GroundingContext,
  PlanRefinementV2State,
} from '../../state/plan-refinement-v2-state.js'

// ============================================================================
// Config Schema
// ============================================================================

export const FeasibilityScanConfigSchema = z.object({})

export type FeasibilityScanConfig = Record<string, never>

// ============================================================================
// Exported Pure Functions (for unit testability)
// ============================================================================

/**
 * Checks whether existing stories already implement a given flow.
 *
 * @param flow - The flow to check
 * @param existingStories - Stories fetched from KB by grounding_scout
 * @returns FeasibilityFlag entry or null if no match
 */
export function checkFlowImplemented(
  flow: Flow,
  existingStories: GroundingContext['existingStories'],
): GroundingContext['feasibilityFlags'][number] | null {
  const matching = existingStories.filter(s => s.parentFlowId === flow.id)
  if (matching.length === 0) return null
  return {
    claim: `Flow "${flow.name}" (id: ${flow.id})`,
    flag: 'already_implemented',
    evidence: `${matching.length} existing story(s): ${matching.map(s => s.storyId).join(', ')}`,
  }
}

/**
 * Checks whether a dependency is present in the known related plans.
 *
 * @param dependency - Dependency string from the plan
 * @param relatedPlans - Related plans fetched from KB by grounding_scout
 * @returns FeasibilityFlag entry or null if dependency is found
 */
export function checkDependencyPresent(
  dependency: string,
  relatedPlans: GroundingContext['relatedPlans'],
): GroundingContext['feasibilityFlags'][number] | null {
  const found = relatedPlans.some(
    p => p.planSlug === dependency || p.title.toLowerCase().includes(dependency.toLowerCase()),
  )
  if (found) return null
  return {
    claim: `Dependency "${dependency}"`,
    flag: 'missing_dependency',
    evidence: `No matching plan found in relatedPlans (searched ${relatedPlans.length} plan(s))`,
  }
}

/**
 * Runs all feasibility checks against the plan and grounding context.
 * Pure function — suitable for direct unit testing.
 *
 * @param normalizedPlan - The normalized plan to check
 * @param groundingContext - Grounding context from grounding_scout
 * @returns Array of feasibility flag entries
 */
export function checkFeasibility(
  normalizedPlan: NormalizedPlan,
  groundingContext: GroundingContext,
): GroundingContext['feasibilityFlags'] {
  const flags: GroundingContext['feasibilityFlags'] = []

  // Check flows against existing stories
  for (const flow of normalizedPlan.flows ?? []) {
    const flag = checkFlowImplemented(flow, groundingContext.existingStories)
    if (flag) flags.push(flag)
  }

  // Check dependencies against related plans
  for (const dep of normalizedPlan.dependencies ?? []) {
    const flag = checkDependencyPresent(dep, groundingContext.relatedPlans)
    if (flag) flags.push(flag)
  }

  return flags
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the feasibility_scan LangGraph node.
 *
 * Behavior:
 * - Requires groundingContext to already be populated (from grounding_scout)
 * - If normalizedPlan or groundingContext is null: logs warning and skips checks
 * - Updates groundingContext.feasibilityFlags in place (returns updated context)
 * - Sets refinementV2Phase to 'refinement_agent' on completion
 * - Never throws — logs warnings and degrades gracefully
 *
 * @param _config - Config (reserved for future use, currently empty)
 * @returns LangGraph-compatible async node function
 */
export function createFeasibilityScanNode(
  _config: FeasibilityScanConfig = {} as FeasibilityScanConfig,
) {
  return async (state: PlanRefinementV2State): Promise<Partial<PlanRefinementV2State>> => {
    const { normalizedPlan, groundingContext, planSlug } = state

    logger.info(`feasibility_scan: starting for plan ${planSlug}`)

    if (!normalizedPlan) {
      logger.warn('feasibility_scan: normalizedPlan is null — skipping feasibility checks')
      return {
        refinementV2Phase: 'refinement_agent',
      }
    }

    if (!groundingContext) {
      logger.warn('feasibility_scan: groundingContext is null — skipping feasibility checks')
      return {
        refinementV2Phase: 'refinement_agent',
      }
    }

    const feasibilityFlags = checkFeasibility(normalizedPlan, groundingContext)

    logger.info(`feasibility_scan: complete`, {
      flagCount: feasibilityFlags.length,
      flags: feasibilityFlags.map(f => `${f.flag}: ${f.claim}`),
    })

    const updatedGroundingContext: GroundingContext = {
      ...groundingContext,
      feasibilityFlags,
    }

    return {
      groundingContext: updatedGroundingContext,
      refinementV2Phase: 'refinement_agent',
    }
  }
}

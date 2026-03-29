/**
 * load_plan Node (v2)
 *
 * Loads a refined/normalized plan from KB and extracts confirmed flows.
 * Sets generationV2Phase to 'flow_codebase_scout' on success, 'error' on failure.
 *
 * Simpler than v1 load-refined-plan — no separate validate step, just load + extract.
 * Injectable PlanLoaderFn adapter (default: returns null).
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import {
  NormalizedPlanSchema,
  type NormalizedPlan,
  type Flow,
} from '../../state/plan-refinement-state.js'
import type { StoryGenerationV2State } from '../../state/story-generation-v2-state.js'

// ============================================================================
// Injectable Adapter Types
// ============================================================================

/**
 * Injectable plan-loader adapter.
 * Loads a refined/normalized plan from KB by planSlug.
 */
export type PlanLoaderFn = (planSlug: string) => Promise<NormalizedPlan | null>

/**
 * Default no-op plan loader (always returns null).
 */
const defaultPlanLoader: PlanLoaderFn = async (_planSlug: string) => null

// ============================================================================
// Config Schema
// ============================================================================

export const LoadPlanConfigSchema = z.object({
  planLoader: z.function().optional(),
})

export type LoadPlanConfig = z.infer<typeof LoadPlanConfigSchema>

// ============================================================================
// Phase Functions (exported for unit testability)
// ============================================================================

/**
 * Load a normalized plan via the injectable adapter.
 * Returns null on failure or missing adapter.
 */
export async function loadPlan(
  planSlug: string,
  planLoader: PlanLoaderFn,
): Promise<NormalizedPlan | null> {
  if (!planSlug) {
    return null
  }

  try {
    const raw = await planLoader(planSlug)
    if (!raw) {
      return null
    }

    // Validate if a plain object was returned (adapter may return pre-parsed or raw)
    const result = NormalizedPlanSchema.safeParse(raw)
    if (!result.success) {
      logger.warn('load_plan_v2: plan validation failed', {
        planSlug,
        errors: result.error.flatten(),
      })
      return null
    }

    return result.data
  } catch (err) {
    logger.warn('load_plan_v2: plan loader failed', { err, planSlug })
    return null
  }
}

/**
 * Extract confirmed flows from a normalized plan.
 * Only returns flows with status='confirmed'.
 */
export function extractConfirmedFlows(plan: NormalizedPlan): Flow[] {
  return plan.flows.filter(f => f.status === 'confirmed')
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the load_plan LangGraph node (v2).
 *
 * On success: sets refinedPlan, flows, generationV2Phase='flow_codebase_scout'
 * On failure: sets generationV2Phase='error', pushes to errors[]
 *
 * @param config - Optional config with injectable plan-loader adapter
 */
export function createLoadPlanNode(config: { planLoader?: PlanLoaderFn } = {}) {
  const planLoader = config.planLoader ?? defaultPlanLoader

  return async (state: StoryGenerationV2State): Promise<Partial<StoryGenerationV2State>> => {
    try {
      logger.info('load_plan_v2: starting', { planSlug: state.planSlug })

      const refinedPlan = await loadPlan(state.planSlug, planLoader)

      if (!refinedPlan) {
        logger.warn('load_plan_v2: no plan loaded', { planSlug: state.planSlug })
        return {
          generationV2Phase: 'error',
          errors: [`load_plan_v2: could not load plan for slug '${state.planSlug}'`],
        }
      }

      const flows = extractConfirmedFlows(refinedPlan)

      logger.info('load_plan_v2: complete', {
        planSlug: state.planSlug,
        confirmedFlowCount: flows.length,
        totalFlowCount: refinedPlan.flows.length,
      })

      return {
        refinedPlan,
        flows,
        generationV2Phase: 'flow_codebase_scout',
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logger.error('load_plan_v2: unexpected error', { err, planSlug: state.planSlug })
      return {
        generationV2Phase: 'error',
        errors: [`load_plan_v2 failed: ${message}`],
      }
    }
  }
}

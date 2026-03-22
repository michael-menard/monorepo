/**
 * load_refined_plan Node
 *
 * Reads a refined/normalized plan from KB, validates against NormalizedPlanSchema,
 * and extracts confirmed flows into state.
 *
 * Injectable PlanLoaderFn adapter (default: returns null).
 * Sets generationPhase='slice_flows' on success, 'error' on failure.
 *
 * APRS-4010: ST-2
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import {
  NormalizedPlanSchema,
  type NormalizedPlan,
  type Flow,
} from '../../state/plan-refinement-state.js'
import type { StoryGenerationState } from '../../state/story-generation-state.js'

// ============================================================================
// Injectable Adapter Types
// ============================================================================

/**
 * Injectable plan-loader adapter.
 * Loads a refined/normalized plan from KB by planSlug.
 * Default returns null — callers must inject a real loader.
 */
export type PlanLoaderFn = (planSlug: string) => Promise<Record<string, unknown> | null>

/**
 * Default no-op plan loader (returns null).
 */
const defaultPlanLoader: PlanLoaderFn = async (_planSlug: string) => null

// ============================================================================
// Config Schema
// ============================================================================

export const LoadRefinedPlanConfigSchema = z.object({
  /** Injectable plan-loader adapter */
  planLoader: z.function().optional(),
})

export type LoadRefinedPlanConfig = z.infer<typeof LoadRefinedPlanConfigSchema>

// ============================================================================
// Phase Functions (exported for unit testability)
// ============================================================================

/**
 * Load plan from adapter by planSlug.
 * Returns raw plan object or null on failure.
 */
export async function loadPlanFromKb(
  planSlug: string,
  planLoader: PlanLoaderFn,
): Promise<Record<string, unknown> | null> {
  if (!planSlug) {
    return null
  }

  try {
    return await planLoader(planSlug)
  } catch (err) {
    logger.warn('load_refined_plan: plan loader failed', { err, planSlug })
    return null
  }
}

/**
 * Validate raw plan data against NormalizedPlanSchema.
 * Returns validated NormalizedPlan or null if validation fails.
 */
export function validateAndParseRefinedPlan(
  raw: Record<string, unknown> | null,
  planSlug: string,
): NormalizedPlan | null {
  if (!raw) {
    return null
  }

  const result = NormalizedPlanSchema.safeParse({ planSlug, ...raw })
  if (!result.success) {
    logger.warn('load_refined_plan: plan validation failed', {
      planSlug,
      errors: result.error.flatten(),
    })
    return null
  }

  return result.data
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
 * Creates the load_refined_plan LangGraph node.
 *
 * AC-3: Reads plan from KB, validates against NormalizedPlanSchema,
 *       extracts confirmed flows, sets generationPhase.
 *
 * @param config - Optional config with injectable plan-loader adapter
 */
export function createLoadRefinedPlanNode(config: { planLoader?: PlanLoaderFn } = {}) {
  const planLoader = config.planLoader ?? defaultPlanLoader

  return async (state: StoryGenerationState): Promise<Partial<StoryGenerationState>> => {
    try {
      logger.info('load_refined_plan: starting', { planSlug: state.planSlug })

      // Load raw plan from KB
      const rawPlan = await loadPlanFromKb(state.planSlug, planLoader)

      if (!rawPlan) {
        logger.warn('load_refined_plan: no plan loaded', { planSlug: state.planSlug })
        return {
          generationPhase: 'error',
          errors: [`load_refined_plan: could not load plan for slug '${state.planSlug}'`],
        }
      }

      // Validate against NormalizedPlanSchema
      const refinedPlan = validateAndParseRefinedPlan(rawPlan, state.planSlug)

      if (!refinedPlan) {
        return {
          generationPhase: 'error',
          errors: [`load_refined_plan: plan validation failed for slug '${state.planSlug}'`],
        }
      }

      // Extract confirmed flows
      const confirmedFlows = extractConfirmedFlows(refinedPlan)

      logger.info('load_refined_plan: complete', {
        planSlug: state.planSlug,
        confirmedFlowCount: confirmedFlows.length,
        totalFlowCount: refinedPlan.flows.length,
      })

      return {
        refinedPlan,
        flows: confirmedFlows,
        generationPhase: 'slice_flows',
        errors: [],
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logger.error('load_refined_plan: unexpected error', { err, planSlug: state.planSlug })
      return {
        generationPhase: 'error',
        errors: [`load_refined_plan failed: ${message}`],
      }
    }
  }
}

/**
 * load_refined_plan Node
 *
 * Loads a refined plan from KB via injectable PlanLoaderFn adapter,
 * validates against NormalizedPlanSchema, and extracts confirmed flows.
 *
 * AC-3: Sets generationPhase='slice_flows' on success, 'error' on failure.
 *
 * APRS-4010: ST-2
 */

import { logger } from '@repo/logger'
import { NormalizedPlanSchema, type NormalizedPlan } from '../../state/plan-refinement-state.js'
import type { StoryGenerationState } from '../../state/story-generation-state.js'

// ============================================================================
// Injectable Adapter Types
// ============================================================================

/**
 * Injectable plan-loader adapter.
 * Loads a refined plan from KB or other source by planSlug.
 * Default: returns null (expects refinedPlan in state).
 */
export type PlanLoaderFn = (planSlug: string) => Promise<NormalizedPlan | null>

const defaultPlanLoader: PlanLoaderFn = async () => null

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the load_refined_plan LangGraph node.
 *
 * AC-3: Reads plan via injectable PlanLoaderFn, validates against
 * NormalizedPlanSchema, extracts confirmed flows. Sets generationPhase
 * to 'slice_flows' on success, 'error' on failure.
 */
export function createLoadRefinedPlanNode(config: { planLoader?: PlanLoaderFn } = {}) {
  const planLoader = config.planLoader ?? defaultPlanLoader

  return async (state: StoryGenerationState): Promise<Partial<StoryGenerationState>> => {
    try {
      logger.info('load_refined_plan: starting', { planSlug: state.planSlug })

      // Try to load from adapter if not already in state
      let plan = state.refinedPlan
      if (!plan) {
        const loaded = await planLoader(state.planSlug)
        if (!loaded) {
          logger.error('load_refined_plan: no plan found', { planSlug: state.planSlug })
          return {
            generationPhase: 'error',
            errors: [`load_refined_plan: no plan found for slug "${state.planSlug}"`],
          }
        }
        plan = loaded
      }

      // Validate against NormalizedPlanSchema
      const parseResult = NormalizedPlanSchema.safeParse(plan)
      if (!parseResult.success) {
        const issues = parseResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
        logger.error('load_refined_plan: validation failed', { planSlug: state.planSlug, issues })
        return {
          generationPhase: 'error',
          errors: [`load_refined_plan: validation failed — ${issues.join('; ')}`],
        }
      }

      const validPlan = parseResult.data

      // Extract confirmed flows only
      const confirmedFlows = validPlan.flows.filter(f => f.status === 'confirmed')

      if (confirmedFlows.length === 0) {
        logger.warn('load_refined_plan: no confirmed flows found', {
          planSlug: state.planSlug,
          totalFlows: validPlan.flows.length,
        })
        return {
          refinedPlan: validPlan,
          flows: [],
          generationPhase: 'error',
          errors: ['load_refined_plan: no confirmed flows found in plan'],
          warnings: [
            `Plan has ${validPlan.flows.length} flow(s) but none are confirmed. ` +
              'Run plan refinement with human review to confirm flows before story generation.',
          ],
        }
      }

      logger.info('load_refined_plan: complete', {
        planSlug: state.planSlug,
        confirmedFlows: confirmedFlows.length,
        totalFlows: validPlan.flows.length,
      })

      return {
        refinedPlan: validPlan,
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

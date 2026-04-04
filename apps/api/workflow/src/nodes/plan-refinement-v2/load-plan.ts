/**
 * load_plan Node (plan-refinement-v2)
 *
 * Loads a plan from the KB by planSlug and normalizes it into a NormalizedPlan.
 * This is the first node in the plan-refinement-v2 graph — it must run before
 * grounding_scout so that normalizedPlan is populated for all downstream nodes.
 *
 * On success: sets rawPlan, normalizedPlan, refinementV2Phase='grounding_scout'
 * On failure: sets refinementV2Phase='error', pushes to errors[]
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import { NormalizedPlanSchema, type NormalizedPlan } from '../../state/plan-refinement-state.js'
import type { PlanRefinementV2State } from '../../state/plan-refinement-v2-state.js'

// ============================================================================
// Injectable Adapter Types
// ============================================================================

/**
 * Injectable plan-loader adapter.
 * Loads a plan from KB by planSlug and returns it as a NormalizedPlan.
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

const FLOWS_BLOCK_START = '<!-- flows-json-start -->'
const FLOWS_BLOCK_END = '<!-- flows-json-end -->'

/**
 * Extracts serialized flows from rawContent if a flows block is present.
 * Returns empty array if no block found or parsing fails.
 */
export function extractFlowsFromContent(
  rawContent: string,
): import('../../state/plan-refinement-state.js').Flow[] {
  const start = rawContent.indexOf(FLOWS_BLOCK_START)
  const end = rawContent.indexOf(FLOWS_BLOCK_END)
  if (start === -1 || end === -1) return []
  try {
    const json = rawContent.slice(start + FLOWS_BLOCK_START.length, end).trim()
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Appends (or replaces) a serialized flows block in rawContent.
 * Used after plan refinement to persist refined flows back to the KB.
 */
export function serializeFlowsToContent(
  rawContent: string,
  flows: import('../../state/plan-refinement-state.js').Flow[],
): string {
  // Strip any existing block
  const start = rawContent.indexOf(FLOWS_BLOCK_START)
  const end = rawContent.indexOf(FLOWS_BLOCK_END)
  const stripped =
    start !== -1 && end !== -1
      ? rawContent.slice(0, start).trimEnd() + rawContent.slice(end + FLOWS_BLOCK_END.length)
      : rawContent

  if (flows.length === 0) return stripped.trimEnd()

  const block = `\n\n${FLOWS_BLOCK_START}\n${JSON.stringify(flows, null, 2)}\n${FLOWS_BLOCK_END}`
  return stripped.trimEnd() + block
}

/**
 * Converts a raw KB plan record into a NormalizedPlan.
 * Maps KB plan fields to NormalizedPlan schema fields.
 * If rawContent contains a serialized flows block, those flows are used.
 */
export function normalizeKbPlan(
  planSlug: string,
  raw: Record<string, unknown>,
): NormalizedPlan | null {
  const rawContent = String(raw['rawContent'] ?? raw['raw_content'] ?? '')
  const flows = extractFlowsFromContent(rawContent)

  const result = NormalizedPlanSchema.safeParse({
    planSlug,
    title: raw['title'] ?? planSlug,
    summary: raw['summary'] ?? '',
    problemStatement: raw['summary'] ?? '',
    proposedSolution: rawContent,
    goals: [],
    nonGoals: [],
    flows,
    openQuestions: [],
    warnings: [],
    constraints: [],
    dependencies: Array.isArray(raw['dependencies']) ? raw['dependencies'] : [],
    status: raw['status'] ?? 'draft',
    priority: raw['priority'] ?? 'P3',
    tags: Array.isArray(raw['tags']) ? raw['tags'] : [],
  })

  if (!result.success) {
    logger.warn('load_plan_refinement_v2: plan normalization failed', {
      planSlug,
      errors: result.error.flatten(),
    })
    return null
  }

  return result.data
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the load_plan LangGraph node for plan-refinement-v2.
 *
 * On success: sets rawPlan, normalizedPlan, refinementV2Phase='grounding_scout'
 * On failure: sets refinementV2Phase='error', pushes to errors[]
 *
 * @param config - Optional config with injectable plan-loader adapter
 */
export function createLoadPlanRefinementNode(config: { planLoader?: PlanLoaderFn } = {}) {
  const planLoader = config.planLoader ?? defaultPlanLoader

  return async (state: PlanRefinementV2State): Promise<Partial<PlanRefinementV2State>> => {
    const { planSlug } = state

    logger.info('load_plan_refinement_v2: starting', { planSlug })

    if (!planSlug) {
      return {
        refinementV2Phase: 'error',
        errors: ['load_plan_refinement_v2: planSlug is empty'],
      }
    }

    try {
      const normalizedPlan = await planLoader(planSlug)

      if (!normalizedPlan) {
        logger.warn('load_plan_refinement_v2: no plan loaded', { planSlug })
        return {
          refinementV2Phase: 'error',
          errors: [`load_plan_refinement_v2: could not load plan for slug '${planSlug}'`],
        }
      }

      logger.info('load_plan_refinement_v2: complete', {
        planSlug,
        title: normalizedPlan.title,
        flowCount: normalizedPlan.flows.length,
        tagCount: normalizedPlan.tags.length,
      })

      return {
        rawPlan: { planSlug, title: normalizedPlan.title },
        normalizedPlan,
        refinementV2Phase: 'grounding_scout',
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logger.error('load_plan_refinement_v2: unexpected error', { err, planSlug })
      return {
        refinementV2Phase: 'error',
        errors: [`load_plan_refinement_v2 failed: ${message}`],
      }
    }
  }
}

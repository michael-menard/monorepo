/**
 * grounding_scout Node (v2 agentic pipeline)
 *
 * Deterministic node — no LLM calls. Scans KB and plan metadata to build
 * a GroundingContext before any LLM reasoning begins.
 *
 * Runs first in the pipeline:
 *   START → grounding_scout → feasibility_scan → refinement_agent → postcondition_gate
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import { GroundingContextSchema } from '../../state/plan-refinement-v2-state.js'
import type {
  GroundingContext,
  PlanRefinementV2State,
} from '../../state/plan-refinement-v2-state.js'

// ============================================================================
// Adapter Types
// ============================================================================

/**
 * Adapter for fetching existing stories associated with a plan from the KB.
 */
export type KbStoriesAdapterFn = (planSlug: string) => Promise<
  Array<{
    storyId: string
    title: string
    state: string
    parentFlowId?: string
  }>
>

/**
 * Adapter for fetching related plans by tag from the KB.
 */
export type KbRelatedPlansAdapterFn = (tags: string[]) => Promise<
  Array<{
    planSlug: string
    title: string
    status: string
  }>
>

// ============================================================================
// Config Schema
// ============================================================================

export const GroundingScoutConfigSchema = z.object({
  kbStoriesAdapter: z.function().optional(),
  kbRelatedPlansAdapter: z.function().optional(),
})

export type GroundingScoutConfig = {
  kbStoriesAdapter?: KbStoriesAdapterFn
  kbRelatedPlansAdapter?: KbRelatedPlansAdapterFn
}

// ============================================================================
// Exported Pure Functions (for unit testability)
// ============================================================================

/**
 * Fetches existing stories for the given planSlug.
 * Returns empty array if adapter is absent or throws.
 */
export async function fetchExistingStories(
  planSlug: string,
  adapter: KbStoriesAdapterFn | undefined,
): Promise<GroundingContext['existingStories']> {
  if (!adapter) {
    logger.info('grounding_scout: no kbStoriesAdapter provided — returning empty existingStories')
    return []
  }
  try {
    const stories = await adapter(planSlug)
    logger.info(`grounding_scout: fetched ${stories.length} existing story(s) for plan ${planSlug}`)
    return stories
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.warn(`grounding_scout: kbStoriesAdapter threw — skipping existingStories`, {
      error: msg,
    })
    return []
  }
}

/**
 * Fetches related plans by plan tags.
 * Returns empty array if adapter is absent or throws.
 */
export async function fetchRelatedPlans(
  tags: string[],
  adapter: KbRelatedPlansAdapterFn | undefined,
): Promise<GroundingContext['relatedPlans']> {
  if (!adapter) {
    logger.info('grounding_scout: no kbRelatedPlansAdapter provided — returning empty relatedPlans')
    return []
  }
  if (tags.length === 0) {
    logger.info('grounding_scout: no tags on plan — skipping relatedPlans fetch')
    return []
  }
  try {
    const plans = await adapter(tags)
    logger.info(`grounding_scout: fetched ${plans.length} related plan(s)`)
    return plans
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.warn(`grounding_scout: kbRelatedPlansAdapter threw — skipping relatedPlans`, {
      error: msg,
    })
    return []
  }
}

/**
 * Extracts existing architectural patterns from the normalized plan's constraints
 * and other structural fields. Pure/deterministic — no network calls.
 */
export function extractExistingPatterns(state: PlanRefinementV2State): string[] {
  const { normalizedPlan } = state
  if (!normalizedPlan) return []
  const patterns: string[] = []
  for (const constraint of normalizedPlan.constraints ?? []) {
    patterns.push(`constraint: ${constraint}`)
  }
  for (const dep of normalizedPlan.dependencies ?? []) {
    patterns.push(`dependency: ${dep}`)
  }
  return patterns
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the grounding_scout LangGraph node.
 *
 * Behavior:
 * - Always returns a populated groundingContext (never null), even if adapters fail
 * - Never throws — all errors are logged as warnings and degrade gracefully
 * - Sets refinementV2Phase to 'feasibility_scan' on completion
 *
 * @param config - Optional injectable adapters for KB access
 * @returns LangGraph-compatible async node function
 */
export function createGroundingScoutNode(config: GroundingScoutConfig = {}) {
  return async (state: PlanRefinementV2State): Promise<Partial<PlanRefinementV2State>> => {
    const { planSlug, normalizedPlan } = state
    const tags = normalizedPlan?.tags ?? []

    logger.info(`grounding_scout: starting for plan ${planSlug}`)

    const [existingStories, relatedPlans] = await Promise.all([
      fetchExistingStories(planSlug, config.kbStoriesAdapter),
      fetchRelatedPlans(tags, config.kbRelatedPlansAdapter),
    ])

    const existingPatterns = extractExistingPatterns(state)

    const groundingContext = GroundingContextSchema.parse({
      existingStories,
      relatedPlans,
      existingPatterns,
      feasibilityFlags: [], // populated downstream by feasibility_scan
    })

    logger.info(`grounding_scout: complete`, {
      existingStories: existingStories.length,
      relatedPlans: relatedPlans.length,
      existingPatterns: existingPatterns.length,
    })

    return {
      groundingContext,
      refinementV2Phase: 'feasibility_scan',
    }
  }
}

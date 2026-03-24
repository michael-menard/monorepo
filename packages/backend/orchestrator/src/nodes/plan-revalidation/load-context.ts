/**
 * Load Context Node — Plan Revalidation Graph
 *
 * Loads all context needed to revalidate a plan:
 * - Plan content from KB
 * - Related stories from KB
 * - Current codebase state
 * Assembles a ContextSnapshot and transitions to check_already_implemented.
 *
 * APRS-3010: Plan Revalidation Graph - Context Load and Drift Detection Nodes
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type {
  PlanRevalidationState,
  ContextSnapshot,
  StoryRef,
} from '../../state/plan-revalidation-state.js'
import { ContextSnapshotSchema } from '../../state/plan-revalidation-state.js'

// ============================================================================
// Adapter Types
// ============================================================================

/**
 * Adapter that fetches raw plan content from the KB.
 * Default: returns null (no KB available).
 */
export type KBPlanAdapterFn = (planSlug: string) => Promise<Record<string, unknown> | null>

/**
 * Adapter that fetches related stories for a plan from the KB.
 * Default: returns empty array.
 */
export type KBStoryAdapterFn = (planSlug: string) => Promise<StoryRef[]>

/**
 * Adapter that fetches the current codebase state.
 * Default: returns null.
 */
export type CodebaseStateAdapterFn = (planSlug: string) => Promise<Record<string, unknown> | null>

// ============================================================================
// Config Schema
// ============================================================================

export const LoadContextNodeConfigSchema = z.object({
  /** Whether to load plan content from KB */
  loadPlan: z.boolean().default(true),
  /** Whether to load related stories from KB */
  loadStories: z.boolean().default(true),
  /** Whether to load codebase state */
  loadCodebaseState: z.boolean().default(false),
})

export type LoadContextNodeConfig = z.infer<typeof LoadContextNodeConfigSchema>

// ============================================================================
// Phase Functions (exported for unit testability)
// ============================================================================

/**
 * Loads plan content using the given adapter.
 *
 * @param state - Current revalidation state (provides planSlug)
 * @param kbPlanAdapter - Adapter to fetch plan from KB
 * @returns Plan content record or null if unavailable
 */
export async function loadPlanContent(
  state: PlanRevalidationState,
  kbPlanAdapter: KBPlanAdapterFn = async () => null,
): Promise<Record<string, unknown> | null> {
  try {
    const result = await kbPlanAdapter(state.planSlug)
    return result
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.warn('load-context: failed to load plan content', {
      planSlug: state.planSlug,
      error: msg,
    })
    return null
  }
}

/**
 * Loads related stories for a plan using the given adapter.
 *
 * @param planSlug - The plan to fetch stories for
 * @param kbStoryAdapter - Adapter to fetch stories from KB
 * @returns Array of story references
 */
export async function loadRelatedStories(
  planSlug: string,
  kbStoryAdapter: KBStoryAdapterFn = async () => [],
): Promise<StoryRef[]> {
  try {
    const result = await kbStoryAdapter(planSlug)
    return result
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.warn('load-context: failed to load related stories', { planSlug, error: msg })
    return []
  }
}

/**
 * Loads the current codebase state using the given adapter.
 *
 * @param planSlug - The plan to fetch codebase state for
 * @param codebaseStateAdapter - Adapter to fetch codebase state
 * @returns Codebase state record or null if unavailable
 */
export async function loadCodebaseState(
  planSlug: string,
  codebaseStateAdapter: CodebaseStateAdapterFn = async () => null,
): Promise<Record<string, unknown> | null> {
  try {
    const result = await codebaseStateAdapter(planSlug)
    return result
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.warn('load-context: failed to load codebase state', { planSlug, error: msg })
    return null
  }
}

/**
 * Builds a ContextSnapshot from the loaded data.
 *
 * @param planSlug - Plan slug
 * @param planContent - Loaded plan content (or null)
 * @param relatedStories - Loaded story references
 * @param codebaseState - Loaded codebase state (or null)
 * @returns Validated ContextSnapshot
 */
export function buildContextSnapshot(
  planSlug: string,
  planContent: Record<string, unknown> | null,
  relatedStories: StoryRef[],
  codebaseState: Record<string, unknown> | null,
): ContextSnapshot {
  return ContextSnapshotSchema.parse({
    planSlug,
    planContent,
    relatedStories,
    codebaseState,
    loadedAt: new Date().toISOString(),
  })
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Config for createLoadContextNode — injectable adapters + feature flags.
 */
export const LoadContextNodeAdapterConfigSchema = LoadContextNodeConfigSchema.extend({
  kbPlanAdapter: z.custom<KBPlanAdapterFn>().optional(),
  kbStoryAdapter: z.custom<KBStoryAdapterFn>().optional(),
  codebaseStateAdapter: z.custom<CodebaseStateAdapterFn>().optional(),
})

export type LoadContextNodeAdapterConfig = z.infer<typeof LoadContextNodeAdapterConfigSchema>

/**
 * Creates the load-context node for the Plan Revalidation Graph.
 *
 * @param config - Optional configuration with adapter overrides
 * @returns LangGraph-compatible node function
 */
export function createLoadContextNode(config: Partial<LoadContextNodeAdapterConfig> = {}) {
  const fullConfig = LoadContextNodeConfigSchema.parse(config)
  const kbPlanAdapter: KBPlanAdapterFn = config.kbPlanAdapter ?? (async () => null)
  const kbStoryAdapter: KBStoryAdapterFn = config.kbStoryAdapter ?? (async () => [])
  const codebaseStateAdapter: CodebaseStateAdapterFn =
    config.codebaseStateAdapter ?? (async () => null)

  return async (state: PlanRevalidationState): Promise<Partial<PlanRevalidationState>> => {
    logger.info('load-context: starting', { planSlug: state.planSlug })

    try {
      const [planContent, relatedStories, codebaseState] = await Promise.all([
        fullConfig.loadPlan ? loadPlanContent(state, kbPlanAdapter) : Promise.resolve(null),
        fullConfig.loadStories
          ? loadRelatedStories(state.planSlug, kbStoryAdapter)
          : Promise.resolve([]),
        fullConfig.loadCodebaseState
          ? loadCodebaseState(state.planSlug, codebaseStateAdapter)
          : Promise.resolve(null),
      ])

      const contextSnapshot = buildContextSnapshot(
        state.planSlug,
        planContent,
        relatedStories,
        codebaseState,
      )

      logger.info('load-context: complete', {
        planSlug: state.planSlug,
        hasPlanContent: planContent !== null,
        storyCount: relatedStories.length,
        hasCodebaseState: codebaseState !== null,
      })

      return {
        contextSnapshot,
        rawPlan: planContent,
        revalidationPhase: 'check_already_implemented',
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      logger.error('load-context: unexpected error', { planSlug: state.planSlug, error: msg })
      return {
        revalidationPhase: 'error',
        errors: [`load-context: ${msg}`],
      }
    }
  }
}

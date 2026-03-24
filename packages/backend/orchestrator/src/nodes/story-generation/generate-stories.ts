/**
 * generate_stories Node
 *
 * Generates stories from sliced flows using:
 * - Template-derived title/tags from flow name + actor + plan tags
 * - LLM-generated description, acceptance_criteria, subtasks, risk
 *
 * Injectable LlmAdapterFn following extract-flows.ts pattern.
 * Each story is independently testable.
 *
 * APRS-4010: ST-4
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { NormalizedPlan, Flow } from '../../state/plan-refinement-state.js'
import {
  GeneratedStorySchema,
  type GeneratedStory,
  type SlicedFlow,
  type StoryGenerationState,
} from '../../state/story-generation-state.js'

// ============================================================================
// Injectable Adapter Types
// ============================================================================

/**
 * Prompt payload passed to the LLM adapter for story generation.
 */
export const LlmStoryGenerationPromptSchema = z.object({
  planTitle: z.string(),
  planSummary: z.string(),
  planTags: z.array(z.string()),
  flowName: z.string(),
  flowActor: z.string(),
  flowTrigger: z.string(),
  flowSuccessOutcome: z.string(),
  stepDescriptions: z.array(z.string()),
  scopeDescription: z.string(),
})

export type LlmStoryGenerationPrompt = z.infer<typeof LlmStoryGenerationPromptSchema>

/**
 * Raw story shape returned by LLM (before validation/typing).
 */
export const LlmRawStorySchema = z.object({
  description: z.string(),
  acceptance_criteria: z.array(z.string()),
  subtasks: z.array(z.string()),
  risk: z.enum(['low', 'medium', 'high']).optional(),
})

export type LlmRawStory = z.infer<typeof LlmRawStorySchema>

/**
 * Injectable LLM adapter function type.
 * Receives story generation prompt, returns raw story content.
 */
export type LlmAdapterFn = (prompt: LlmStoryGenerationPrompt) => Promise<LlmRawStory>

// ============================================================================
// Config Schema
// ============================================================================

export const GenerateStoriesConfigSchema = z.object({
  /** Injectable LLM adapter for story generation */
  llmAdapter: z.function().optional(),
})

export type GenerateStoriesConfig = z.infer<typeof GenerateStoriesConfigSchema>

// ============================================================================
// Template Functions (exported for unit testability)
// ============================================================================

/**
 * Derive story title from flow name, actor, and scope description.
 * Template: "{actor}: {scopeDescription}" or "{flowName}" if scope matches flow
 */
export function deriveStoryTitle(
  flowName: string,
  actor: string,
  scopeDescription: string,
): string {
  // If scope description is basically the flow name, just use actor + flow name
  if (scopeDescription.toLowerCase().includes(flowName.toLowerCase())) {
    return `${actor}: ${flowName}`
  }
  return `${actor}: ${scopeDescription}`
}

/**
 * Derive story tags from plan tags + actor + flow name.
 */
export function deriveStoryTags(planTags: string[], actor: string, flowName: string): string[] {
  const actorTag = actor.toLowerCase().replace(/\s+/g, '-')
  const flowTag = flowName.toLowerCase().replace(/\s+/g, '-')
  const unique = new Set([...planTags, actorTag, flowTag])
  return Array.from(unique)
}

/**
 * Build a step reference string from step indices.
 */
export function buildFlowStepReference(flowId: string, stepIndices: number[]): string {
  if (stepIndices.length === 0) return `${flowId}/all`
  if (stepIndices.length === 1) return `${flowId}/step-${stepIndices[0]}`
  return `${flowId}/steps-${stepIndices[0]}-${stepIndices[stepIndices.length - 1]}`
}

/**
 * Build the LLM prompt for a single story.
 */
export function buildStoryPrompt(
  plan: NormalizedPlan,
  flow: Flow,
  slice: SlicedFlow,
): LlmStoryGenerationPrompt {
  const stepDescriptions = flow.steps
    .filter(s => slice.step_indices.includes(s.index))
    .map(s => s.description)

  return {
    planTitle: plan.title,
    planSummary: plan.summary,
    planTags: plan.tags,
    flowName: flow.name,
    flowActor: flow.actor,
    flowTrigger: flow.trigger,
    flowSuccessOutcome: flow.successOutcome,
    stepDescriptions,
    scopeDescription: slice.scope_description,
  }
}

/**
 * Generate a fallback story when no LLM adapter is available.
 * Uses template-only generation (no LLM content).
 */
export function generateFallbackStory(
  plan: NormalizedPlan,
  flow: Flow,
  slice: SlicedFlow,
): GeneratedStory {
  const title = deriveStoryTitle(flow.name, flow.actor, slice.scope_description)
  const tags = deriveStoryTags(plan.tags, flow.actor, flow.name)
  const flowStepReference = buildFlowStepReference(flow.id, slice.step_indices)

  return GeneratedStorySchema.parse({
    title,
    description: `Implement: ${slice.scope_description}`,
    acceptance_criteria: [`${slice.scope_description} works as expected`],
    subtasks: [],
    tags,
    risk: 'medium',
    minimum_path: false,
    parent_plan_slug: plan.planSlug,
    parent_flow_id: flow.id,
    flow_step_reference: flowStepReference,
  })
}

/**
 * Generate a story from a sliced flow using LLM adapter.
 * Falls back to template-only if LLM adapter is absent or fails.
 */
export async function generateStoryForSlice(
  plan: NormalizedPlan,
  flow: Flow,
  slice: SlicedFlow,
  llmAdapter: LlmAdapterFn | undefined,
): Promise<GeneratedStory> {
  const title = deriveStoryTitle(flow.name, flow.actor, slice.scope_description)
  const tags = deriveStoryTags(plan.tags, flow.actor, flow.name)
  const flowStepReference = buildFlowStepReference(flow.id, slice.step_indices)

  if (!llmAdapter) {
    logger.info('generate_stories: no LLM adapter, using fallback template', {
      flowId: flow.id,
      sliceSteps: slice.step_indices,
    })
    return generateFallbackStory(plan, flow, slice)
  }

  const prompt = buildStoryPrompt(plan, flow, slice)

  try {
    const raw = await llmAdapter(prompt)
    return GeneratedStorySchema.parse({
      title,
      description: raw.description,
      acceptance_criteria: raw.acceptance_criteria,
      subtasks: raw.subtasks,
      tags,
      risk: raw.risk ?? 'medium',
      minimum_path: false,
      parent_plan_slug: plan.planSlug,
      parent_flow_id: flow.id,
      flow_step_reference: flowStepReference,
    })
  } catch (err) {
    logger.warn('generate_stories: LLM adapter failed, using fallback', {
      err,
      flowId: flow.id,
    })
    return generateFallbackStory(plan, flow, slice)
  }
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the generate_stories LangGraph node.
 *
 * AC-5: Injectable LlmAdapterFn, title/tags template-derived, description/AC/subtasks/risk LLM-generated.
 * Each story independently testable.
 *
 * @param config - Optional config with injectable LLM adapter
 */
export function createGenerateStoriesNode(config: { llmAdapter?: LlmAdapterFn } = {}) {
  return async (state: StoryGenerationState): Promise<Partial<StoryGenerationState>> => {
    try {
      logger.info('generate_stories: starting', {
        planSlug: state.planSlug,
        sliceCount: state.slicedFlows.length,
      })

      if (!state.refinedPlan) {
        logger.warn('generate_stories: refinedPlan is null', { planSlug: state.planSlug })
        return {
          generatedStories: [],
          generationPhase: 'error',
          errors: ['generate_stories: refinedPlan is null — cannot generate stories'],
        }
      }

      if (state.slicedFlows.length === 0) {
        logger.warn('generate_stories: no sliced flows to generate stories from', {
          planSlug: state.planSlug,
        })
        return {
          generatedStories: [],
          generationPhase: 'complete',
          warnings: ['generate_stories: no sliced flows found — no stories generated'],
        }
      }

      // Build a flow lookup map for efficient access
      const flowMap = new Map<string, Flow>(state.flows.map(f => [f.id, f]))

      const stories: GeneratedStory[] = []
      const warnings: string[] = []

      for (const slice of state.slicedFlows) {
        const flow = flowMap.get(slice.flow_id)
        if (!flow) {
          const warning = `generate_stories: flow '${slice.flow_id}' not found in state.flows — skipping`
          logger.warn(warning, { planSlug: state.planSlug })
          warnings.push(warning)
          continue
        }

        const story = await generateStoryForSlice(state.refinedPlan, flow, slice, config.llmAdapter)
        stories.push(story)
      }

      logger.info('generate_stories: complete', {
        planSlug: state.planSlug,
        storyCount: stories.length,
      })

      return {
        generatedStories: stories,
        generationPhase: 'wire_dependencies',
        errors: [],
        warnings,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logger.error('generate_stories: unexpected error', { err, planSlug: state.planSlug })
      return {
        generationPhase: 'error',
        errors: [`generate_stories failed: ${message}`],
      }
    }
  }
}

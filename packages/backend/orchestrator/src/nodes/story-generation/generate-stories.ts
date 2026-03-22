/**
 * generate_stories Node
 *
 * Produces GeneratedStory[] from slicedFlows[] using injectable LlmAdapterFn.
 * Title/tags are template-derived. Description, AC, subtasks, risk are
 * LLM-generated from flow step context + plan context.
 *
 * AC-5: Each story independently testable.
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
export const StoryGenerationPromptSchema = z.object({
  planTitle: z.string(),
  planSummary: z.string(),
  planSlug: z.string(),
  flowName: z.string(),
  flowActor: z.string(),
  flowTrigger: z.string(),
  sliceDescription: z.string(),
  stepDescriptions: z.array(z.string()),
})

export type StoryGenerationPrompt = z.infer<typeof StoryGenerationPromptSchema>

/**
 * Raw LLM response shape for a generated story.
 */
export const LlmStoryResponseSchema = z.object({
  description: z.string(),
  acceptance_criteria: z.array(z.string()),
  subtasks: z
    .array(
      z.object({
        id: z.string(),
        description: z.string(),
        files: z.array(z.string()).default([]),
        verification: z.string().default(''),
      }),
    )
    .default([]),
  risk: z.string().default('low'),
})

export type LlmStoryResponse = z.infer<typeof LlmStoryResponseSchema>

/**
 * Injectable LLM adapter for story content generation.
 * Takes a prompt and returns structured story content.
 */
export type LlmAdapterFn = (prompt: StoryGenerationPrompt) => Promise<LlmStoryResponse>

/**
 * Default no-op LLM adapter (returns minimal content).
 */
const defaultLlmAdapter: LlmAdapterFn = async (prompt: StoryGenerationPrompt) => ({
  description: `Implement ${prompt.sliceDescription} for ${prompt.flowName}`,
  acceptance_criteria: [`${prompt.sliceDescription} is implemented and tested`],
  subtasks: [],
  risk: 'low',
})

// ============================================================================
// Template Helpers
// ============================================================================

/**
 * Generates a story title from flow name and slice description.
 * DEC-3: Title is template-derived (no LLM needed).
 */
export function generateTitle(flowName: string, sliceDescription: string): string {
  // Truncate long descriptions for title
  const shortDesc =
    sliceDescription.length > 60 ? sliceDescription.substring(0, 57) + '...' : sliceDescription
  return `${flowName}: ${shortDesc}`
}

/**
 * Generates tags from plan tags, flow actor, and flow name.
 * DEC-3: Tags are template-derived (no LLM needed).
 */
export function generateTags(planTags: string[], flowActor: string, flowName: string): string[] {
  const tags = new Set<string>([...planTags])
  tags.add(`actor:${flowActor.toLowerCase().replace(/\s+/g, '-')}`)
  tags.add(`flow:${flowName.toLowerCase().replace(/\s+/g, '-')}`)
  return Array.from(tags)
}

/**
 * Generates flow_step_reference string from slice indices.
 */
export function generateStepReference(flowId: string, stepIndices: number[]): string {
  if (stepIndices.length === 0) return `${flowId}:none`
  if (stepIndices.length === 1) return `${flowId}:step-${stepIndices[0]}`
  return `${flowId}:steps-${stepIndices[0]}-${stepIndices[stepIndices.length - 1]}`
}

// ============================================================================
// Core Generation
// ============================================================================

/**
 * Generates a single story from a sliced flow.
 */
export async function generateSingleStory(
  slice: SlicedFlow,
  flow: Flow,
  plan: NormalizedPlan,
  llmAdapter: LlmAdapterFn,
): Promise<GeneratedStory> {
  const stepDescriptions = slice.step_indices.map(
    idx => flow.steps.find(s => s.index === idx)?.description ?? `Step ${idx}`,
  )

  const prompt: StoryGenerationPrompt = {
    planTitle: plan.title,
    planSummary: plan.summary,
    planSlug: plan.planSlug,
    flowName: flow.name,
    flowActor: flow.actor,
    flowTrigger: flow.trigger,
    sliceDescription: slice.scope_description,
    stepDescriptions,
  }

  const llmResponse = await llmAdapter(prompt)

  return GeneratedStorySchema.parse({
    title: generateTitle(flow.name, slice.scope_description),
    description: llmResponse.description,
    acceptance_criteria: llmResponse.acceptance_criteria,
    subtasks: llmResponse.subtasks,
    tags: generateTags(plan.tags, flow.actor, flow.name),
    risk: llmResponse.risk,
    minimum_path: false, // DEC-4: default false, set by APRS-4020
    parent_plan_slug: plan.planSlug,
    parent_flow_id: flow.id,
    flow_step_reference: generateStepReference(flow.id, slice.step_indices),
  })
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the generate_stories LangGraph node.
 *
 * AC-5: Produces GeneratedStory[] from slicedFlows[] using injectable LlmAdapterFn.
 */
export function createGenerateStoriesNode(config: { llmAdapter?: LlmAdapterFn } = {}) {
  const llmAdapter = config.llmAdapter ?? defaultLlmAdapter

  return async (state: StoryGenerationState): Promise<Partial<StoryGenerationState>> => {
    try {
      logger.info('generate_stories: starting', {
        planSlug: state.planSlug,
        sliceCount: state.slicedFlows.length,
      })

      if (state.slicedFlows.length === 0) {
        return {
          generationPhase: 'error',
          errors: ['generate_stories: no sliced flows provided'],
        }
      }

      if (!state.refinedPlan) {
        return {
          generationPhase: 'error',
          errors: ['generate_stories: refinedPlan is null'],
        }
      }

      // Build flow lookup map
      const flowMap = new Map(state.flows.map(f => [f.id, f]))

      const stories: GeneratedStory[] = []
      const warnings: string[] = []

      for (const slice of state.slicedFlows) {
        const flow = flowMap.get(slice.flow_id)
        if (!flow) {
          warnings.push(`generate_stories: flow ${slice.flow_id} not found, skipping slice`)
          continue
        }

        try {
          const story = await generateSingleStory(slice, flow, state.refinedPlan, llmAdapter)
          stories.push(story)
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          warnings.push(
            `generate_stories: failed to generate story for ${slice.flow_id} ` +
              `steps ${slice.step_indices.join(',')}: ${message}`,
          )
        }
      }

      if (stories.length === 0) {
        return {
          generationPhase: 'error',
          errors: ['generate_stories: no stories could be generated'],
          warnings,
        }
      }

      logger.info('generate_stories: complete', {
        planSlug: state.planSlug,
        storiesGenerated: stories.length,
        warnings: warnings.length,
      })

      return {
        generatedStories: stories,
        generationPhase: 'complete',
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

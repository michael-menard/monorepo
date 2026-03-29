/**
 * story_slicer_agent Node (v2) — AGENTIC
 *
 * Uses LLM to decide story slice boundaries based on flow complexity AND
 * codebase scout results. Unlike v1 (fixed 1-per-step heuristic), this agent
 * decides the optimal decomposition.
 *
 * Fallback: v1-style heuristic if no LLM adapter provided.
 * Token usage tracked and appended to state.tokenUsage.
 *
 * Returns: { storyOutlines, tokenUsage, generationV2Phase: 'story_enricher' }
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { Flow } from '../../state/plan-refinement-state.js'
import type {
  FlowScoutResult,
  TokenUsage,
  StoryGenerationV2State,
} from '../../state/story-generation-v2-state.js'
import type { GeneratedStory } from '../../state/story-generation-state.js'

// ============================================================================
// Injectable Adapter Types
// ============================================================================

export type SlicerLlmAdapterFn = (prompt: string) => Promise<{
  slices: Array<{
    flowId: string
    stepIndices: number[]
    scopeDescription: string
    rationale: string
  }>
  inputTokens: number
  outputTokens: number
}>

// ============================================================================
// Config Schema
// ============================================================================

export const StorySlicerConfigSchema = z.object({
  llmAdapter: z.function().optional(),
  maxStoriesPerFlow: z.number().int().positive().default(5),
})

export type StorySlicerConfig = z.infer<typeof StorySlicerConfigSchema>

// ============================================================================
// Pure Functions (exported for unit testability)
// ============================================================================

/**
 * Build the prompt for the slicer LLM.
 * Includes each flow with its steps and the codebase scout result.
 */
export function buildSlicerPrompt(flows: Flow[], scoutResults: FlowScoutResult[]): string {
  const scoutMap = new Map(scoutResults.map(r => [r.flowId, r]))

  const flowSections = flows
    .map(flow => {
      const scout = scoutMap.get(flow.id)
      const steps = flow.steps
        .map(s => `  Step ${s.index}: ${s.description}${s.actor ? ` (${s.actor})` : ''}`)
        .join('\n')
      const filesSection = scout?.relevantFiles.length
        ? `  Relevant files: ${scout.relevantFiles.join(', ')}`
        : '  Relevant files: none found'
      const existsSection = scout?.alreadyExists.length
        ? `  Already exists: ${scout.alreadyExists.join('; ')}`
        : ''
      const needsSection = scout?.needsCreation.length
        ? `  Needs creation: ${scout.needsCreation.join('; ')}`
        : ''

      return [
        `Flow: ${flow.name} (id: ${flow.id})`,
        `Actor: ${flow.actor}`,
        `Trigger: ${flow.trigger}`,
        `Steps:\n${steps}`,
        `Success outcome: ${flow.successOutcome}`,
        filesSection,
        existsSection,
        needsSection,
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n\n---\n\n')

  return `You are a software architect deciding how to slice user flows into independently deployable stories.

FLOWS TO SLICE:
${flowSections}

SLICING PRINCIPLES:
- Each story must be independently deployable and testable
- Each story must deliver user-visible value (not just "add column to DB")
- Prefer fewer, larger stories over many tiny ones
- Do NOT create more stories than necessary

OUTPUT FORMAT (JSON):
{
  "slices": [
    {
      "flowId": "<flow id>",
      "stepIndices": [<1-based step indices covered>],
      "scopeDescription": "<what this story covers>",
      "rationale": "<why these steps form a natural boundary>"
    }
  ]
}

Return ONLY valid JSON. No explanation outside JSON.`
}

/**
 * Fallback v1-style heuristic slicer.
 * Creates one story per step that has a distinct actor or significant side-effect.
 */
export function fallbackSlice(flow: Flow): Array<{
  flowId: string
  stepIndices: number[]
  scopeDescription: string
  rationale: string
}> {
  if (flow.steps.length === 0) {
    return [
      {
        flowId: flow.id,
        stepIndices: [],
        scopeDescription: `Implement ${flow.name}`,
        rationale: 'Single-step fallback',
      },
    ]
  }

  // Group steps by actor changes or every 2-3 steps
  const slices: Array<{
    flowId: string
    stepIndices: number[]
    scopeDescription: string
    rationale: string
  }> = []

  let currentGroup: number[] = []
  let currentActor = flow.actor

  flow.steps.forEach((step, i) => {
    const stepActor = step.actor ?? flow.actor
    const actorChanged = stepActor !== currentActor
    const groupTooLarge = currentGroup.length >= 3

    if ((actorChanged || groupTooLarge) && currentGroup.length > 0) {
      slices.push({
        flowId: flow.id,
        stepIndices: [...currentGroup],
        scopeDescription: `${flow.name}: steps ${currentGroup.join(', ')}`,
        rationale: actorChanged ? 'Actor boundary' : 'Group size limit',
      })
      currentGroup = []
      currentActor = stepActor
    }

    currentGroup.push(step.index)

    // Last step — flush remaining
    if (i === flow.steps.length - 1 && currentGroup.length > 0) {
      slices.push({
        flowId: flow.id,
        stepIndices: [...currentGroup],
        scopeDescription: `${flow.name}: steps ${currentGroup.join(', ')}`,
        rationale: 'Final group',
      })
    }
  })

  return slices.length > 0
    ? slices
    : [
        {
          flowId: flow.id,
          stepIndices: flow.steps.map(s => s.index),
          scopeDescription: `Implement ${flow.name}`,
          rationale: 'Single slice fallback',
        },
      ]
}

/**
 * Convert a raw slice into a GeneratedStory.
 */
function sliceToStory(
  slice: {
    flowId: string
    stepIndices: number[]
    scopeDescription: string
    rationale: string
  },
  flow: Flow,
  planSlug: string,
  index: number,
): GeneratedStory {
  const stepsLabel = slice.stepIndices.length > 0 ? `steps-${slice.stepIndices.join('-')}` : 'full'

  return {
    title: `${flow.name}: ${slice.scopeDescription}`.slice(0, 120),
    description: `${slice.scopeDescription}\n\nRationale: ${slice.rationale}`,
    acceptance_criteria: [
      `Given the ${flow.actor} triggers ${flow.trigger}, when ${slice.scopeDescription}, then the expected outcome is achieved`,
      `All steps covered: ${slice.stepIndices.join(', ')}`,
    ],
    subtasks: [`Implement ${slice.scopeDescription}`],
    tags: [flow.actor.toLowerCase().replace(/\s+/g, '-'), flow.id],
    risk: 'medium',
    minimum_path: index === 0,
    parent_plan_slug: planSlug,
    parent_flow_id: flow.id,
    flow_step_reference: `${flow.id}/${stepsLabel}`,
  }
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the story_slicer_agent LangGraph node (v2).
 *
 * Agentic: calls LLM to decide slice boundaries using flow + scout context.
 * Falls back to v1 heuristic if no adapter provided.
 *
 * Returns: { storyOutlines, tokenUsage, generationV2Phase: 'story_enricher' }
 */
export function createStorySlicerAgentNode(
  config: {
    llmAdapter?: SlicerLlmAdapterFn
    maxStoriesPerFlow?: number
  } = {},
) {
  const maxStoriesPerFlow = config.maxStoriesPerFlow ?? 5

  return async (state: StoryGenerationV2State): Promise<Partial<StoryGenerationV2State>> => {
    try {
      logger.info('story_slicer_agent: starting', {
        planSlug: state.planSlug,
        flowCount: state.flows.length,
        hasLlmAdapter: !!config.llmAdapter,
      })

      const storyOutlines: GeneratedStory[] = []
      const newTokenUsage: TokenUsage[] = []

      if (config.llmAdapter && state.flows.length > 0) {
        // Agentic path: ask LLM for slice boundaries
        const prompt = buildSlicerPrompt(state.flows, state.flowScoutResults)

        const response = await config.llmAdapter(prompt)

        newTokenUsage.push({
          nodeId: 'story_slicer_agent',
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
        })

        // Build a flow map for quick lookup
        const flowMap = new Map(state.flows.map(f => [f.id, f]))

        // Convert slices to stories, enforcing maxStoriesPerFlow
        const flowSliceCounts = new Map<string, number>()

        for (const slice of response.slices) {
          const flow = flowMap.get(slice.flowId)
          if (!flow) {
            logger.warn('story_slicer_agent: unknown flowId in slice', { flowId: slice.flowId })
            continue
          }

          const count = flowSliceCounts.get(slice.flowId) ?? 0
          if (count >= maxStoriesPerFlow) {
            logger.warn('story_slicer_agent: maxStoriesPerFlow reached, skipping slice', {
              flowId: slice.flowId,
              maxStoriesPerFlow,
            })
            continue
          }

          const story = sliceToStory(slice, flow, state.planSlug, count)
          storyOutlines.push(story)
          flowSliceCounts.set(slice.flowId, count + 1)
        }
      } else {
        // Fallback: v1-style heuristic per flow
        for (const flow of state.flows) {
          const slices = fallbackSlice(flow)
          const capped = slices.slice(0, maxStoriesPerFlow)
          capped.forEach((slice, i) => {
            storyOutlines.push(sliceToStory(slice, flow, state.planSlug, i))
          })
        }
      }

      logger.info('story_slicer_agent: complete', {
        planSlug: state.planSlug,
        storyCount: storyOutlines.length,
      })

      return {
        storyOutlines,
        tokenUsage: newTokenUsage,
        generationV2Phase: 'story_enricher',
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logger.error('story_slicer_agent: unexpected error', { err, planSlug: state.planSlug })
      return {
        generationV2Phase: 'error',
        errors: [`story_slicer_agent failed: ${message}`],
      }
    }
  }
}

/**
 * write_to_kb Node
 *
 * Atomically writes generated stories, dependencies, and plan_story_links to KB.
 * Uses injectable KbWriterFn adapter (default: no-op stub).
 *
 * Story ID generation: {storyPrefix}-{sequenceNumber} with step=10.
 * Plan status updated to 'stories-created' on full success.
 *
 * APRS-4030: ST-2 (AC-2/3/4/5)
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type {
  GeneratedStory,
  DependencyEdge,
  WriteResult,
  StoryGenerationState,
} from '../../state/story-generation-state.js'

// ============================================================================
// Injectable Adapter Types
// ============================================================================

/**
 * Payload for a single story write to KB.
 */
export const KbStoryPayloadSchema = z.object({
  story_id: z.string(),
  title: z.string(),
  description: z.string(),
  feature: z.string(),
  tags: z.array(z.string()),
  acceptance_criteria: z.array(z.string()),
  subtasks: z.array(z.string()),
  risk: z.enum(['low', 'medium', 'high']),
  minimum_path: z.boolean(),
  parent_plan_slug: z.string(),
  parent_flow_id: z.string(),
  flow_step_reference: z.string(),
  dependencies: z.array(
    z.object({
      depends_on: z.string(),
      type: z.string(),
    }),
  ),
})

export type KbStoryPayload = z.infer<typeof KbStoryPayloadSchema>

/**
 * Result from writing a single story to KB.
 */
export const KbWriteResultSchema = z.object({
  success: z.boolean(),
  story_id: z.string(),
  error: z.string().optional(),
})

export type KbWriteResult = z.infer<typeof KbWriteResultSchema>

/**
 * Injectable KB writer function.
 * Default: no-op returning success for all stories.
 *
 * Real adapter calls kb_ingest_story_from_yaml + kb_update_plan.
 */
export type KbWriterFn = (
  stories: KbStoryPayload[],
  planSlug: string,
  updatePlanStatus: boolean,
) => Promise<{ results: KbWriteResult[]; planUpdated: boolean }>

/**
 * Injectable story ID generator function.
 * Default: sequential generation with prefix + step=10.
 */
export type StoryIdGeneratorFn = (
  prefix: string,
  count: number,
) => Promise<string[]>

// ============================================================================
// Config Schema
// ============================================================================

export const WriteToKbConfigSchema = z.object({
  kbWriter: z.function().optional(),
  storyIdGenerator: z.function().optional(),
})

export type WriteToKbConfig = z.infer<typeof WriteToKbConfigSchema>

// ============================================================================
// Default No-Op Implementations
// ============================================================================

/**
 * Default no-op KB writer. Returns success for all stories, planUpdated=true.
 */
export async function defaultKbWriterFn(
  stories: KbStoryPayload[],
  _planSlug: string,
  updatePlanStatus: boolean,
): Promise<{ results: KbWriteResult[]; planUpdated: boolean }> {
  return {
    results: stories.map(s => ({
      success: true,
      story_id: s.story_id,
    })),
    planUpdated: updatePlanStatus,
  }
}

/**
 * Default story ID generator. Generates IDs with prefix and step=10.
 * Starts at 1010 (first story in a new prefix).
 */
export async function defaultStoryIdGeneratorFn(
  prefix: string,
  count: number,
): Promise<string[]> {
  const startSequence = 1010
  const step = 10
  return Array.from({ length: count }, (_, i) => `${prefix}-${startSequence + i * step}`)
}

// ============================================================================
// Helper: Map stories to KB payloads
// ============================================================================

/**
 * Builds a composite key → story ID mapping for dependency resolution.
 */
function buildCompositeKeyMap(
  stories: GeneratedStory[],
  storyIds: string[],
): Map<string, string> {
  const map = new Map<string, string>()
  stories.forEach((story, i) => {
    const key = `${story.title}|${story.parent_flow_id}`
    map.set(key, storyIds[i])
  })
  return map
}

/**
 * Maps GeneratedStory + edges into KbStoryPayload[].
 */
function mapToPayloads(
  stories: GeneratedStory[],
  storyIds: string[],
  edges: DependencyEdge[],
  keyMap: Map<string, string>,
): KbStoryPayload[] {
  return stories.map((story, i) => {
    const storyId = storyIds[i]
    const compositeKey = `${story.title}|${story.parent_flow_id}`

    // Find edges where this story is the target (depends ON something)
    const deps = edges
      .filter(e => e.to === compositeKey)
      .map(e => ({
        depends_on: keyMap.get(e.from) ?? e.from,
        type: e.type,
      }))

    return {
      story_id: storyId,
      title: story.title,
      description: story.description,
      feature: story.parent_plan_slug,
      tags: story.tags,
      acceptance_criteria: story.acceptance_criteria,
      subtasks: story.subtasks,
      risk: story.risk,
      minimum_path: story.minimum_path,
      parent_plan_slug: story.parent_plan_slug,
      parent_flow_id: story.parent_flow_id,
      flow_step_reference: story.flow_step_reference,
      dependencies: deps,
    }
  })
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the write_to_kb LangGraph node.
 *
 * AC-2: Generates story IDs, maps stories to KB payload.
 * AC-3: Maps dependency edges using composite key → story ID mapping.
 * AC-4: Updates plan status on full success, sets error on failure.
 * AC-5: Injectable KbWriterFn (default: no-op stub).
 */
export function createWriteToKbNode(config: {
  kbWriter?: KbWriterFn
  storyIdGenerator?: StoryIdGeneratorFn
} = {}) {
  return async (state: StoryGenerationState): Promise<Partial<StoryGenerationState>> => {
    try {
      const stories = state.orderedStories
      const edges = state.dependencyEdges

      logger.info('write_to_kb: starting', {
        planSlug: state.planSlug,
        storyCount: stories.length,
        edgeCount: edges.length,
      })

      // Empty stories → no-op success
      if (stories.length === 0) {
        logger.info('write_to_kb: no stories to write', { planSlug: state.planSlug })
        return {
          writeResult: {
            storiesWritten: 0,
            storiesFailed: 0,
            planStatusUpdated: false,
            errors: [],
          },
          generationPhase: 'complete',
        }
      }

      // Generate story IDs
      const idGeneratorFn = config.storyIdGenerator ?? defaultStoryIdGeneratorFn
      const prefix = state.planSlug.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 10)
      const storyIds = await idGeneratorFn(prefix, stories.length)

      // Build composite key → story ID mapping for dependency resolution
      const keyMap = buildCompositeKeyMap(stories, storyIds)

      // Map to KB payloads
      const payloads = mapToPayloads(stories, storyIds, edges, keyMap)

      // Write to KB (request plan status update; actual update gated on failed === 0 below)
      const writerFn = config.kbWriter ?? defaultKbWriterFn
      const { results, planUpdated } = await writerFn(payloads, state.planSlug, true)

      const succeeded = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length
      const writeErrors = results
        .filter(r => !r.success && r.error)
        .map(r => `Story ${r.story_id}: ${r.error}`)

      logger.info('write_to_kb: complete', {
        planSlug: state.planSlug,
        storiesWritten: succeeded,
        storiesFailed: failed,
        planStatusUpdated: planUpdated,
      })

      const writeResult: WriteResult = {
        storiesWritten: succeeded,
        storiesFailed: failed,
        planStatusUpdated: planUpdated && failed === 0,
        errors: writeErrors,
      }

      // Any failures → error phase
      if (failed > 0) {
        logger.error('write_to_kb: partial failure', {
          planSlug: state.planSlug,
          failed,
          errors: writeErrors,
        })
        return {
          writeResult,
          generationPhase: 'error',
          errors: writeErrors,
        }
      }

      return {
        writeResult,
        generationPhase: 'complete',
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logger.error('write_to_kb: unexpected error', { err, planSlug: state.planSlug })
      return {
        writeResult: {
          storiesWritten: 0,
          storiesFailed: 0,
          planStatusUpdated: false,
          errors: [message],
        },
        generationPhase: 'error',
        errors: [`write_to_kb failed: ${message}`],
      }
    }
  }
}

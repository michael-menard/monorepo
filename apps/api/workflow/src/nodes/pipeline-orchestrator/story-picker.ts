/**
 * story_picker Node (pipeline-orchestrator) — DETERMINISTIC
 *
 * Selects the next story to process from the available story list.
 * Emits a signal indicating whether a story is ready, the pipeline
 * is complete, or the pipeline is stalled.
 *
 * For MVP: simple sequential pick from storyIds, skipping already
 * completed or blocked stories.
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { PipelineOrchestratorV2State } from '../../state/pipeline-orchestrator-v2-state.js'
import {
  StoryPickerResultSchema,
  type StoryPickerResult,
  type StoryPickerSignal,
} from '../../state/pipeline-orchestrator-v2-state.js'

// ============================================================================
// Config Schema
// ============================================================================

export const StoryPickerConfigSchema = z.object({
  /** Max stories to process before stopping (0 = unlimited) */
  maxStories: z.number().int().min(0).default(0),
})

export type StoryPickerConfig = z.infer<typeof StoryPickerConfigSchema>

// ============================================================================
// Injectable Adapter Types
// ============================================================================

/**
 * Fetches stories available for processing from the KB.
 * Returns story IDs in priority order.
 */
export type FetchReadyStoriesFn = () => Promise<string[]>

export type StoryPickerAdapters = {
  fetchReadyStories?: FetchReadyStoriesFn
}

// ============================================================================
// Pure Logic
// ============================================================================

/**
 * Determines the next story to pick from available IDs, excluding
 * already completed and blocked stories.
 */
export function pickNextStory(
  storyIds: string[],
  completedStories: string[],
  blockedStories: string[],
): { signal: StoryPickerSignal; storyId: string | null; reason: string } {
  const excluded = new Set([...completedStories, ...blockedStories])
  const remaining = storyIds.filter(id => !excluded.has(id))

  if (remaining.length === 0) {
    if (completedStories.length > 0) {
      return {
        signal: 'pipeline_complete',
        storyId: null,
        reason: `All ${completedStories.length} stories completed, ${blockedStories.length} blocked`,
      }
    }
    if (blockedStories.length > 0) {
      return {
        signal: 'pipeline_stalled',
        storyId: null,
        reason: `All remaining stories are blocked: ${blockedStories.join(', ')}`,
      }
    }
    return {
      signal: 'pipeline_complete',
      storyId: null,
      reason: 'No stories available to process',
    }
  }

  return {
    signal: 'story_ready',
    storyId: remaining[0],
    reason: `Picked story ${remaining[0]}, ${remaining.length - 1} remaining`,
  }
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the story_picker LangGraph node.
 *
 * DETERMINISTIC — no LLM calls. Picks the next story from
 * available IDs and returns a StoryPickerResult with signal.
 */
export function createStoryPickerNode(
  config: Partial<StoryPickerConfig> = {},
  _adapters: StoryPickerAdapters = {},
) {
  const _resolved = StoryPickerConfigSchema.parse(config)

  return async (
    state: PipelineOrchestratorV2State,
  ): Promise<Partial<PipelineOrchestratorV2State>> => {
    logger.info('story_picker: evaluating available stories', {
      totalStoryIds: state.storyIds.length,
      completedCount: state.completedStories.length,
      blockedCount: state.blockedStories.length,
    })

    const result = pickNextStory(state.storyIds, state.completedStories, state.blockedStories)

    const storyPickerResult: StoryPickerResult = StoryPickerResultSchema.parse(result)

    logger.info('story_picker: result', {
      signal: storyPickerResult.signal,
      storyId: storyPickerResult.storyId,
      reason: storyPickerResult.reason,
    })

    return {
      storyPickerResult,
      currentStoryId: storyPickerResult.storyId,
      pipelinePhase:
        storyPickerResult.signal === 'story_ready'
          ? 'story_picking'
          : storyPickerResult.signal === 'pipeline_complete'
            ? 'pipeline_complete'
            : 'pipeline_stalled',
      // Reset per-story state for fresh processing
      retryContext: {
        reviewAttempts: 0,
        qaAttempts: 0,
        maxReviewRetries: 2,
        maxQaRetries: 2,
        lastFailureReason: '',
      },
      devResult: null,
      reviewResult: null,
      qaResult: null,
      worktreePath: null,
      branch: null,
    }
  }
}

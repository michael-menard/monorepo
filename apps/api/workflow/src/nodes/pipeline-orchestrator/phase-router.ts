/**
 * phase_router Node (pipeline-orchestrator) — DETERMINISTIC
 *
 * Queries the story's current KB state and determines which pipeline
 * phase to resume from. This enables stories that already have code
 * written (e.g. needs_code_review) to skip dev and go straight to review.
 *
 * Routing logic:
 *   ready / in_progress / failed_code_review / failed_qa → dev_implement
 *   needs_code_review → review (skip dev)
 *   ready_for_qa → qa_verify (skip dev + review)
 *   completed → skip (add to completedStories, loop back)
 *   blocked → skip (add to blockedStories, loop back)
 *   unknown → dev_implement (safe default)
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type {
  PipelineOrchestratorV2State,
  ResumePhase,
} from '../../state/pipeline-orchestrator-v2-state.js'

// ============================================================================
// Injectable Adapter Types
// ============================================================================

export const PhaseRouterAdaptersSchema = z.object({
  getStoryState: z.function().optional(),
})

export type GetStoryStateFn = (storyId: string) => Promise<string | null>

export type PhaseRouterAdapters = {
  getStoryState?: GetStoryStateFn
}

// ============================================================================
// Pure Routing Logic
// ============================================================================

/** States that require starting from dev_implement */
const DEV_STATES = new Set(['ready', 'in_progress', 'failed_code_review', 'failed_qa'])

/** States that skip dev and go straight to review */
const REVIEW_STATES = new Set(['needs_code_review'])

/** States that skip dev+review and go straight to QA */
const QA_STATES = new Set(['ready_for_qa'])

/** Terminal states — story is already done */
const COMPLETED_STATES = new Set(['completed', 'cancelled'])

/** Blocked states — story cannot proceed */
const BLOCKED_STATES = new Set(['blocked'])

/**
 * Determines the resume phase based on the story's KB state.
 *
 * Returns an object with either:
 * - resumePhase set (story needs processing via create_worktree)
 * - completedStories or blockedStories set (story should be skipped)
 */
export function determineResumePhase(
  storyId: string,
  storyState: string | null,
): {
  resumePhase: ResumePhase | null
  completedStories: string[]
  blockedStories: string[]
} {
  if (!storyState || DEV_STATES.has(storyState)) {
    return { resumePhase: 'dev_implement', completedStories: [], blockedStories: [] }
  }

  if (REVIEW_STATES.has(storyState)) {
    return { resumePhase: 'review', completedStories: [], blockedStories: [] }
  }

  if (QA_STATES.has(storyState)) {
    return { resumePhase: 'qa_verify', completedStories: [], blockedStories: [] }
  }

  if (COMPLETED_STATES.has(storyState)) {
    return { resumePhase: null, completedStories: [storyId], blockedStories: [] }
  }

  if (BLOCKED_STATES.has(storyState)) {
    return { resumePhase: null, completedStories: [], blockedStories: [storyId] }
  }

  // Unknown state — default to dev_implement
  logger.warn('phase_router: unknown story state, defaulting to dev_implement', {
    storyId,
    storyState,
  })
  return { resumePhase: 'dev_implement', completedStories: [], blockedStories: [] }
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the phase_router LangGraph node.
 *
 * DETERMINISTIC — no LLM calls. Queries the story's KB state via
 * an injectable adapter and routes to the appropriate pipeline phase.
 */
export function createPhaseRouterNode(adapters: PhaseRouterAdapters = {}) {
  const getStoryState = adapters.getStoryState ?? (async () => null)

  return async (
    state: PipelineOrchestratorV2State,
  ): Promise<Partial<PipelineOrchestratorV2State>> => {
    const { currentStoryId } = state

    if (!currentStoryId) {
      logger.error('phase_router: no currentStoryId set')
      return {
        pipelinePhase: 'phase_routing',
        resumePhase: null,
        errors: ['phase_router: no currentStoryId set'],
      }
    }

    logger.info('phase_router: querying story state', { storyId: currentStoryId })

    const storyState = await getStoryState(currentStoryId)

    logger.info('phase_router: story state retrieved', {
      storyId: currentStoryId,
      storyState,
    })

    const routing = determineResumePhase(currentStoryId, storyState)

    logger.info('phase_router: routing decision', {
      storyId: currentStoryId,
      storyState,
      resumePhase: routing.resumePhase,
      skipped: routing.resumePhase === null,
    })

    return {
      resumePhase: routing.resumePhase,
      completedStories: routing.completedStories,
      blockedStories: routing.blockedStories,
      pipelinePhase: 'phase_routing',
    }
  }
}

/**
 * Story State Enum
 *
 * Single source of truth for story lifecycle states.
 * Aligns with Claude workflow's story state model for consistency
 * between LangGraph orchestrator and Claude agents.
 */

import { z } from 'zod'

/**
 * Story state enum representing the lifecycle of a story.
 *
 * State progression:
 * draft -> backlog -> ready-to-work -> in-progress -> ready-for-qa -> uat -> done
 *
 * Additional terminal state:
 * - cancelled: Story abandoned
 *
 * Blocked state can occur at any stage via blockedBy field.
 */
export const StoryStateSchema = z.enum([
  'draft', // In index only, not yet structured
  'backlog', // Directory generated, needs elaboration
  'ready-to-work', // Passed elaboration, ready for development
  'in-progress', // Currently in development
  'ready-for-qa', // Development complete, needs QA verification
  'uat', // Passed QA, needs User Acceptance Testing
  'done', // All steps complete, story closed
  'cancelled', // Story abandoned/cancelled
])

export type StoryState = z.infer<typeof StoryStateSchema>

/** Array of all story state values for iteration */
export const STORY_STATES = StoryStateSchema.options

/**
 * Check if a story state is a terminal state (done or cancelled)
 */
export function isTerminalState(state: StoryState): boolean {
  return state === 'done' || state === 'cancelled'
}

/**
 * Check if a story state is active (in-progress work)
 */
export function isActiveState(state: StoryState): boolean {
  return state === 'in-progress' || state === 'ready-for-qa' || state === 'uat'
}

/**
 * Check if a story state is workable (can be picked up for work)
 */
export function isWorkableState(state: StoryState): boolean {
  return state === 'ready-to-work'
}

/**
 * Get the next state in the standard progression
 * Returns null for terminal states
 */
export function getNextState(state: StoryState): StoryState | null {
  const progression: Record<StoryState, StoryState | null> = {
    draft: 'backlog',
    backlog: 'ready-to-work',
    'ready-to-work': 'in-progress',
    'in-progress': 'ready-for-qa',
    'ready-for-qa': 'uat',
    uat: 'done',
    done: null,
    cancelled: null,
  }
  return progression[state]
}

/**
 * Validate a state transition is allowed
 */
export function isValidTransition(from: StoryState, to: StoryState): boolean {
  // Can always cancel
  if (to === 'cancelled') return true

  // Can't transition from terminal states (except to cancelled)
  if (isTerminalState(from)) return false

  // Standard progression
  const nextState = getNextState(from)
  if (nextState === to) return true

  // Allow skipping to done from any active state (emergency close)
  if (to === 'done' && isActiveState(from)) return true

  // Allow going back to in-progress from ready-for-qa (QA rejection)
  if (from === 'ready-for-qa' && to === 'in-progress') return true

  // Allow going back to ready-for-qa from uat (UAT rejection)
  if (from === 'uat' && to === 'ready-for-qa') return true

  return false
}

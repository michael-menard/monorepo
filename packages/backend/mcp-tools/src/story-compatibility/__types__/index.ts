/**
 * Types and constants for Story Compatibility Shim Module
 * WINT-1011: DB-first story management
 *
 * CDBN-3010: Removed filesystem fallback - all operations are now DB-only.
 * Swim-lane constants are kept for backward compatibility but are no longer used.
 */

import { isValidStoryId } from '@repo/workflow-logic'

// Re-export isValidStoryId so callers that imported from this module still work
export { isValidStoryId }

/**
 * Swim-lane directory name → storyStateEnum mapping
 * DEPRECATED: No longer used. Kept for backward compatibility.
 */
export const SWIM_LANE_TO_STATE = {
  backlog: 'backlog',
  created: 'backlog',
  elaboration: 'in_progress',
  'ready-to-work': 'ready',
  'in-progress': 'in_progress',
  'needs-code-review': 'ready_for_review',
  'failed-code-review': 'failed_code_review',
  'ready-for-qa': 'ready_for_qa',
  'failed-qa': 'failed_qa',
  UAT: 'in_qa',
  done: 'completed',
} as const

export type SwimLaneDir = keyof typeof SWIM_LANE_TO_STATE
export type SwimLaneState = (typeof SWIM_LANE_TO_STATE)[SwimLaneDir]

/**
 * States that only exist in the database.
 * DEPRECATED: Kept for backward compatibility.
 */
export const KNOWN_DB_ONLY_STATES = ['blocked', 'cancelled'] as const

/**
 * All known swim-lane directory names.
 * DEPRECATED: Kept for backward compatibility.
 */
export const SWIM_LANE_DIRS = Object.keys(SWIM_LANE_TO_STATE) as SwimLaneDir[]

/**
 * Story ID regex for story ID validation.
 * DEPRECATED: Use isValidStoryId from @repo/workflow-logic instead.
 */
export const STORY_ID_REGEX = /^[A-Z]{2,10}-\d{3,4}$/

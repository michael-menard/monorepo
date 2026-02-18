/**
 * Story status transition logic.
 *
 * Provides getValidTransitions: returns the set of allowed next statuses
 * from a given current status, per the canonical validTransitions record
 * in story-state-machine.ts.
 *
 * @module transitions
 */

import { WorkflowStoryStatusSchema, type WorkflowStoryStatus } from '../__types__/index.js'

// ============================================================================
// Valid Transitions Record
// Source: packages/backend/orchestrator/src/state/story-state-machine.ts
// ============================================================================

/**
 * Valid state transitions map.
 * Key = from status, Value = array of valid to statuses.
 *
 * Must stay in sync with validTransitions in story-state-machine.ts.
 */
const VALID_TRANSITIONS: Record<WorkflowStoryStatus, WorkflowStoryStatus[]> = {
  // Backlog → Elaboration
  pending: ['generated'],
  generated: ['in-elaboration'],

  // Elaboration outcomes
  'in-elaboration': ['ready-to-work', 'needs-refinement', 'needs-split', 'blocked', 'cancelled'],
  'needs-refinement': ['generated', 'cancelled'],
  'needs-split': ['generated', 'superseded', 'cancelled'],

  // Development flow
  'ready-to-work': ['in-progress', 'blocked', 'cancelled'],
  'in-progress': ['ready-for-code-review', 'ready-for-qa', 'blocked', 'cancelled'],
  'ready-for-code-review': ['ready-for-qa', 'code-review-failed', 'blocked'],
  'code-review-failed': ['in-progress', 'blocked', 'cancelled'],

  // QA flow
  'ready-for-qa': ['in-qa', 'blocked'],
  'in-qa': ['uat', 'needs-work', 'blocked'],
  'needs-work': ['in-progress', 'blocked', 'cancelled'],
  uat: ['completed', 'in-progress', 'blocked'],

  // Terminal statuses (no transitions out, except for recovery)
  completed: [],
  blocked: ['in-progress', 'ready-to-work', 'in-elaboration', 'cancelled'],
  cancelled: [],
  superseded: [],
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Returns the valid next statuses from the given current status.
 *
 * Returns a defensive copy of the transitions array to prevent
 * callers from accidentally mutating the internal state.
 *
 * @param currentStatus - The current WorkflowStoryStatus (validated via Zod)
 * @returns Array of WorkflowStoryStatus values that are valid transitions
 * @throws ZodError if currentStatus is not a valid WorkflowStoryStatus
 */
export function getValidTransitions(currentStatus: string): WorkflowStoryStatus[] {
  const parsed = WorkflowStoryStatusSchema.parse(currentStatus)
  return [...VALID_TRANSITIONS[parsed]]
}

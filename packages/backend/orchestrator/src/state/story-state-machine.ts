/**
 * story-state-machine.ts
 *
 * Complete state machine for story lifecycle with all 17 statuses
 * and valid transitions. This is the single source of truth for
 * story status enum values.
 *
 * @module state/story-state-machine
 */

import { z } from 'zod'

// ============================================================================
// Story Status Enum
// ============================================================================

/**
 * All possible story statuses.
 * Maps to directories in plans/stories/ for physical organization.
 */
export const StoryStatusSchema = z.enum([
  // Backlog statuses
  'pending',              // Not yet generated, just an entry in index
  'generated',            // Story file created by PM

  // Elaboration statuses
  'in-elaboration',       // QA audit in progress
  'needs-refinement',     // Failed elab, needs PM fixes
  'needs-split',          // Too large, requires splitting

  // Ready for development
  'ready-to-work',        // Passed elab, awaiting development

  // Development statuses
  'in-progress',          // Dev actively implementing
  'ready-for-code-review', // Implementation done, awaiting review
  'code-review-failed',   // Code review failed, needs fixes

  // QA statuses
  'ready-for-qa',         // Dev complete, awaiting QA verification
  'in-qa',                // QA verification in progress
  'needs-work',           // QA failed, needs dev fixes
  'uat',                  // QA passed, awaiting gate

  // Terminal statuses
  'completed',            // QA gate passed, merged
  'blocked',              // Waiting on external dependency
  'cancelled',            // No longer needed
  'superseded',           // Replaced by split stories
])

export type StoryStatus = z.infer<typeof StoryStatusSchema>

// ============================================================================
// Status to Directory Mapping
// ============================================================================

/**
 * Maps story status to physical directory location.
 */
export const STATUS_DIRECTORY_MAP: Record<StoryStatus, string> = {
  'pending': 'backlog',
  'generated': 'backlog',
  'in-elaboration': 'elaboration',
  'needs-refinement': 'elaboration',
  'needs-split': 'elaboration',
  'ready-to-work': 'ready-to-work',
  'in-progress': 'in-progress',
  'ready-for-code-review': 'in-progress',
  'code-review-failed': 'in-progress',
  'ready-for-qa': 'ready-for-qa',
  'in-qa': 'UAT',
  'needs-work': 'in-progress',
  'uat': 'UAT',
  'completed': 'UAT',
  'blocked': 'blocked',
  'cancelled': 'cancelled',
  'superseded': 'cancelled',
}

// ============================================================================
// Valid Transitions
// ============================================================================

/**
 * Valid state transitions map.
 * Key = from status, Value = array of valid to statuses
 */
export const validTransitions: Record<StoryStatus, StoryStatus[]> = {
  // Backlog → Elaboration
  'pending': ['generated'],
  'generated': ['in-elaboration'],

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
  'uat': ['completed', 'in-progress', 'blocked'],

  // Terminal statuses (no transitions out, except for recovery)
  'completed': [],
  'blocked': ['in-progress', 'ready-to-work', 'in-elaboration', 'cancelled'],
  'cancelled': [],
  'superseded': [],
}

// ============================================================================
// Transition Triggers
// ============================================================================

/**
 * Commands/events that trigger each transition.
 */
export const TRANSITION_TRIGGERS: Record<string, string> = {
  'pending→generated': '/pm-story generate',
  'generated→in-elaboration': '/elab-story starts',
  'in-elaboration→ready-to-work': '/elab-story verdict: PASS',
  'in-elaboration→needs-refinement': '/elab-story verdict: NEEDS REFINEMENT or FAIL',
  'in-elaboration→needs-split': '/elab-story verdict: SPLIT REQUIRED',
  'needs-refinement→generated': '/pm-fix-story completes',
  'needs-split→generated': '/pm-story split creates splits',
  'needs-split→superseded': 'Original story superseded by splits',
  'ready-to-work→in-progress': '/dev-implement-story starts',
  'in-progress→ready-for-code-review': 'Implementation completes',
  'in-progress→ready-for-qa': 'Code review passes (integrated flow)',
  'ready-for-code-review→ready-for-qa': '/dev-code-review verdict: PASS',
  'ready-for-code-review→code-review-failed': '/dev-code-review verdict: FAIL',
  'code-review-failed→in-progress': '/dev-fix-story starts',
  'ready-for-qa→in-qa': '/qa-verify-story starts',
  'in-qa→uat': '/qa-verify-story verdict: PASS',
  'in-qa→needs-work': '/qa-verify-story verdict: FAIL',
  'needs-work→in-progress': 'Developer starts fixing',
  'uat→completed': '/qa-gate verdict: PASS + /wt-finish',
  'uat→in-progress': '/qa-gate verdict: FAIL (fix required)',
  'blocked→in-progress': 'Manual unblock',
  'blocked→cancelled': 'Manual cancellation',
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Checks if a transition is valid.
 *
 * @param from - Current status
 * @param to - Target status
 * @returns true if the transition is allowed
 */
export function canTransition(from: StoryStatus, to: StoryStatus): boolean {
  const allowedTransitions = validTransitions[from]
  return allowedTransitions?.includes(to) ?? false
}

/**
 * Gets the trigger for a transition.
 *
 * @param from - Current status
 * @param to - Target status
 * @returns Trigger description or undefined
 */
export function getTransitionTrigger(from: StoryStatus, to: StoryStatus): string | undefined {
  return TRANSITION_TRIGGERS[`${from}→${to}`]
}

/**
 * Validates and performs a status transition.
 *
 * @param from - Current status
 * @param to - Target status
 * @throws Error if transition is invalid
 */
export function assertValidTransition(from: StoryStatus, to: StoryStatus): void {
  if (!canTransition(from, to)) {
    const allowed = validTransitions[from]?.join(', ') || 'none'
    throw new Error(
      `Invalid transition: ${from} → ${to}. Allowed transitions from ${from}: ${allowed}`,
    )
  }
}

/**
 * Gets the directory for a given status.
 */
export function getStatusDirectory(status: StoryStatus): string {
  return STATUS_DIRECTORY_MAP[status]
}

/**
 * Checks if a status is terminal (no further transitions).
 */
export function isTerminalStatus(status: StoryStatus): boolean {
  return validTransitions[status]?.length === 0
}

/**
 * Checks if a status indicates the story is blocked.
 */
export function isBlockedStatus(status: StoryStatus): boolean {
  return status === 'blocked' || status === 'needs-work' || status === 'code-review-failed'
}

/**
 * Gets all statuses that can transition to a given status.
 */
export function getIncomingStatuses(status: StoryStatus): StoryStatus[] {
  return (Object.entries(validTransitions) as [StoryStatus, StoryStatus[]][])
    .filter(([_, targets]) => targets.includes(status))
    .map(([from]) => from)
}

// ============================================================================
// Status Groups
// ============================================================================

/**
 * Statuses grouped by workflow phase.
 */
export const STATUS_GROUPS = {
  backlog: ['pending', 'generated'] as const,
  elaboration: ['in-elaboration', 'needs-refinement', 'needs-split'] as const,
  ready: ['ready-to-work'] as const,
  development: ['in-progress', 'ready-for-code-review', 'code-review-failed'] as const,
  qa: ['ready-for-qa', 'in-qa', 'needs-work', 'uat'] as const,
  terminal: ['completed', 'blocked', 'cancelled', 'superseded'] as const,
}

/**
 * Gets the workflow phase for a status.
 */
export function getStatusPhase(status: StoryStatus): keyof typeof STATUS_GROUPS {
  for (const [phase, statuses] of Object.entries(STATUS_GROUPS)) {
    if ((statuses as readonly StoryStatus[]).includes(status)) {
      return phase as keyof typeof STATUS_GROUPS
    }
  }
  return 'terminal'
}

/**
 * story-state-machine.ts
 *
 * Canonical transition rules for the 13-state story lifecycle.
 * Mirrors the DB trigger in migration 1001_canonical_story_states.sql.
 *
 * States use underscores to match the DB column values exactly.
 */

import { type StoryState, STORY_STATES } from './enums/story-state.js'

// ── Valid Transitions ─────────────────────────────────────────────────────────

/**
 * All allowed from → to transitions.
 * Mirrors the DB trigger exactly — if you change one, change both.
 */
export const validTransitions: Record<StoryState, StoryState[]> = {
  // Pre-development
  backlog: ['created', 'cancelled'],
  created: ['elab', 'cancelled'],
  elab: ['ready', 'backlog', 'cancelled'], // backlog = elab failed/needs refinement
  ready: ['in_progress', 'blocked', 'cancelled'],

  // Development
  in_progress: ['needs_code_review', 'blocked', 'cancelled'],
  needs_code_review: ['ready_for_qa', 'failed_code_review', 'blocked'],

  // QA
  ready_for_qa: ['in_qa', 'blocked'],
  in_qa: ['completed', 'failed_qa', 'blocked'],

  // Recovery
  failed_code_review: ['in_progress', 'needs_code_review', 'blocked', 'cancelled'],
  failed_qa: ['in_progress', 'ready_for_qa', 'blocked', 'cancelled'],

  // Operational
  blocked: ['backlog', 'ready', 'in_progress', 'elab', 'cancelled'],
  completed: [],
  cancelled: [],
}

// ── Transition Triggers ───────────────────────────────────────────────────────

/**
 * The command or event that causes each transition.
 * Used for documentation and audit trail labels.
 */
export const TRANSITION_TRIGGERS: Partial<Record<string, string>> = {
  'backlog→created': '/pm-story generate',
  'created→elab': '/elab-story starts',
  'elab→ready': '/elab-story verdict: PASS',
  'elab→backlog': '/elab-story verdict: FAIL / NEEDS REFINEMENT',
  'ready→in_progress': '/dev-implement-story starts',
  'in_progress→needs_code_review': 'Implementation complete',
  'needs_code_review→ready_for_qa': '/dev-code-review verdict: PASS',
  'needs_code_review→failed_code_review': '/dev-code-review verdict: FAIL',
  'failed_code_review→in_progress': '/dev-fix-story starts',
  'ready_for_qa→in_qa': '/qa-verify-story starts',
  'in_qa→completed': '/qa-verify-story verdict: PASS',
  'in_qa→failed_qa': '/qa-verify-story verdict: FAIL',
  'failed_qa→in_progress': 'Developer starts fixing QA failures',
}

// ── Status Groups ─────────────────────────────────────────────────────────────

export const STATUS_GROUPS = {
  pre_dev: ['backlog', 'created', 'elab', 'ready'] as const,
  development: ['in_progress', 'needs_code_review'] as const,
  qa: ['ready_for_qa', 'in_qa'] as const,
  recovery: ['failed_code_review', 'failed_qa'] as const,
  operational: ['blocked', 'completed', 'cancelled'] as const,
}

export type StatusGroup = keyof typeof STATUS_GROUPS

// ── Validation Functions ──────────────────────────────────────────────────────

export function canTransition(from: StoryState, to: StoryState): boolean {
  // Can always cancel
  if (to === 'cancelled') return true
  // Can always block (except from terminal)
  if (to === 'blocked' && from !== 'completed' && from !== 'cancelled') return true
  return validTransitions[from]?.includes(to) ?? false
}

export function assertValidTransition(from: StoryState, to: StoryState): void {
  if (!canTransition(from, to)) {
    const allowed = validTransitions[from]?.join(', ') || 'none'
    throw new Error(`Invalid transition: ${from} → ${to}. Allowed from ${from}: ${allowed}`)
  }
}

export function getTransitionTrigger(from: StoryState, to: StoryState): string | undefined {
  return TRANSITION_TRIGGERS[`${from}→${to}`]
}

export function isTerminalStatus(state: StoryState): boolean {
  return validTransitions[state]?.length === 0
}

export function getIncomingStates(state: StoryState): StoryState[] {
  return (STORY_STATES as StoryState[]).filter(s => validTransitions[s]?.includes(state))
}

export function getStatusGroup(state: StoryState): StatusGroup {
  for (const [group, states] of Object.entries(STATUS_GROUPS)) {
    if ((states as readonly string[]).includes(state)) return group as StatusGroup
  }
  return 'operational'
}

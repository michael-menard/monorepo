/**
 * Stage Validator
 *
 * Validates stage transitions using the defined DAG (Directed Acyclic Graph).
 * Prevents invalid stage movements that violate workflow constraints.
 */

import type { Stage, StageTransition } from '../__types__/stage-types.js'

/**
 * Stage transition graph - defines all valid transitions
 *
 * Format: Map<fromStage, toStages[]>
 */
const STAGE_GRAPH = new Map<Stage, Stage[]>([
  // Forward transitions
  ['backlog', ['elaboration', 'ready-to-work']], // Can skip elaboration for simple stories
  ['elaboration', ['ready-to-work', 'backlog']], // Can return to backlog for refinement
  ['ready-to-work', ['in-progress', 'backlog']], // Can deprioritize back to backlog
  ['in-progress', ['ready-for-qa', 'backlog']], // Can deprioritize
  ['ready-for-qa', ['uat', 'backlog']], // Can deprioritize
  ['uat', ['in-progress', 'backlog']], // QA failure returns to in-progress, or deprioritize
])

/**
 * Check if a stage name is valid
 *
 * @param stage - Stage name to validate
 * @returns True if stage is valid
 *
 * @example
 * ```typescript
 * isValidStage('in-progress') // true
 * isValidStage('invalid') // false
 * ```
 */
export function isValidStage(stage: string): stage is Stage {
  return STAGE_GRAPH.has(stage as Stage)
}

/**
 * Validate a stage transition
 *
 * Checks if the transition from fromStage to toStage is allowed by the DAG.
 *
 * @param from - Current stage
 * @param to - Target stage
 * @returns Object with valid flag and optional reason for rejection
 *
 * @example
 * ```typescript
 * validateTransition('backlog', 'in-progress')
 * // { valid: false, reason: 'Cannot skip ready-to-work stage' }
 *
 * validateTransition('backlog', 'ready-to-work')
 * // { valid: true }
 * ```
 */
export function validateTransition(from: Stage, to: Stage): { valid: boolean; reason?: string } {
  // Same stage is idempotent (allowed but no-op)
  if (from === to) {
    return { valid: true }
  }

  // Check if transition exists in graph
  const allowedTransitions = STAGE_GRAPH.get(from)

  if (!allowedTransitions) {
    return { valid: false, reason: `Unknown source stage: ${from}` }
  }

  if (!allowedTransitions.includes(to)) {
    return {
      valid: false,
      reason: `Transition not allowed. From ${from}, you can move to: ${allowedTransitions.join(', ')}`,
    }
  }

  return { valid: true }
}

/**
 * Get the stage transition graph
 *
 * Returns the adjacency list representation of valid stage transitions.
 *
 * @returns Map of stage to allowed next stages
 *
 * @example
 * ```typescript
 * const graph = getStageGraph()
 * console.log(graph.get('backlog')) // ['elaboration', 'ready-to-work']
 * ```
 */
export function getStageGraph(): Map<Stage, Stage[]> {
  return new Map(STAGE_GRAPH)
}

/**
 * Get all valid stage transitions
 *
 * Returns a flat list of all allowed transitions.
 *
 * @returns Array of all valid stage transitions
 *
 * @example
 * ```typescript
 * const transitions = getAllValidTransitions()
 * // [
 * //   { from: 'backlog', to: 'elaboration' },
 * //   { from: 'backlog', to: 'ready-to-work' },
 * //   ...
 * // ]
 * ```
 */
export function getAllValidTransitions(): StageTransition[] {
  const transitions: StageTransition[] = []

  for (const [from, toStages] of STAGE_GRAPH.entries()) {
    for (const to of toStages) {
      transitions.push({ from, to })
    }
  }

  return transitions
}

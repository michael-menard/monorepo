/**
 * State enums - exports all enum schemas and their inferred types.
 */

export { ArtifactTypeSchema, type ArtifactType, ARTIFACT_TYPES } from './artifact-type.js'
export { RoutingFlagSchema, type RoutingFlag, ROUTING_FLAGS } from './routing-flag.js'
export { GateTypeSchema, type GateType, GATE_TYPES } from './gate-type.js'
export { GateDecisionSchema, type GateDecision, GATE_DECISIONS } from './gate-decision.js'
export {
  StoryStateSchema,
  type StoryState,
  STORY_STATES,
  isTerminalState,
  isActiveState,
  isWorkableState,
  isRecoveryState,
  getNextState,
  TERMINAL_STATES,
  ACTIVE_STATES,
  WORKABLE_STATES,
  PRE_DEV_STATES,
} from './story-state.js'

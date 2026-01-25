/**
 * State module - exports all GraphState schemas, types, and utilities.
 *
 * This module provides the core state management primitives for the
 * LangGraph orchestrator, including:
 * - Enum schemas for artifact types, routing flags, gate types, and decisions
 * - Reference schemas for evidence and node errors
 * - The main GraphState schema with cross-field validations
 * - Validation utilities for state creation and verification
 * - State utilities for diffing, serialization, and cloning
 */

// Enum schemas and types
export {
  ArtifactTypeSchema,
  type ArtifactType,
  ARTIFACT_TYPES,
  RoutingFlagSchema,
  type RoutingFlag,
  ROUTING_FLAGS,
  GateTypeSchema,
  type GateType,
  GATE_TYPES,
  GateDecisionSchema,
  type GateDecision,
  GATE_DECISIONS,
} from './enums/index.js'

// Reference schemas and types
export {
  EvidenceRefSchema,
  EvidenceTypeSchema,
  type EvidenceRef,
  type EvidenceType,
  NodeErrorSchema,
  type NodeError,
  type NodeErrorInput,
} from './refs/index.js'

// Main GraphState schema and types
export {
  GraphStateSchema,
  StateSnapshotSchema,
  StateSnapshotStateSchema,
  GRAPH_STATE_SCHEMA_VERSION,
  type GraphState,
  type GraphStateInput,
  type StateSnapshot,
  type StateSnapshotState,
} from './graph-state.js'

// Validation utilities
export {
  validateGraphState,
  safeValidateGraphState,
  createInitialState,
  isValidGraphState,
  type ValidationResult,
  type CreateInitialStateParams,
} from './validators.js'

// State utilities
export {
  diffGraphState,
  serializeState,
  deserializeState,
  safeDeserializeState,
  cloneState,
  type PropertyDiff,
  type StateDiff,
} from './utilities.js'

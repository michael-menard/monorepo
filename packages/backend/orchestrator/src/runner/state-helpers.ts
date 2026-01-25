/**
 * State mutation helpers for node execution.
 *
 * AC-7: updateState() produces LangGraph-compatible partial state updates.
 * AC-8: State helpers support all field types (artifactPaths, routingFlags, evidenceRefs, gateDecisions, errors).
 *
 * LangGraph nodes receive full state but return partial updates.
 * These helpers ensure immutable updates that can be merged by LangGraph reducers.
 */

import type {
  ArtifactType,
  EvidenceRef,
  GateDecision,
  GateType,
  GraphState,
  NodeError,
  RoutingFlag,
} from '../state/index.js'
import { NodeErrorSchema } from '../state/index.js'
import { normalizeError, sanitizeStackTrace } from './errors.js'

/**
 * Partial state update type.
 * This matches the return type expected by LangGraph nodes.
 */
export type StateUpdate = Partial<GraphState>

/**
 * Options for creating a node error entry.
 */
export interface CreateNodeErrorOptions {
  /** Node ID where the error occurred */
  nodeId: string
  /** The error to capture */
  error: unknown
  /** Optional error code override */
  code?: string
  /** Whether the error is recoverable */
  recoverable?: boolean
  /** Stack trace sanitization config */
  stackConfig?: {
    maxStackLength?: number
    filterNodeModules?: boolean
  }
}

/**
 * Creates an immutable partial state update.
 * AC-7: Produces LangGraph-compatible partial state updates.
 *
 * @param updates - The fields to update
 * @returns A partial state object for LangGraph reducer merging
 */
export function updateState(updates: StateUpdate): StateUpdate {
  // Return a shallow copy to ensure immutability
  return { ...updates }
}

/**
 * Updates artifact paths in state.
 * AC-8: Supports artifactPaths field type.
 *
 * @param currentPaths - Current artifact paths
 * @param newPaths - New paths to merge
 * @returns Updated artifact paths record
 */
export function updateArtifactPaths(
  currentPaths: Partial<Record<ArtifactType, string>>,
  newPaths: Partial<Record<ArtifactType, string>>,
): Partial<Record<ArtifactType, string>> {
  return { ...currentPaths, ...newPaths }
}

/**
 * Updates routing flags in state.
 * AC-8: Supports routingFlags field type.
 *
 * @param currentFlags - Current routing flags
 * @param newFlags - New flags to merge
 * @returns Updated routing flags record
 */
export function updateRoutingFlags(
  currentFlags: Partial<Record<RoutingFlag, boolean>>,
  newFlags: Partial<Record<RoutingFlag, boolean>>,
): Partial<Record<RoutingFlag, boolean>> {
  return { ...currentFlags, ...newFlags }
}

/**
 * Adds evidence refs to state.
 * AC-8: Supports evidenceRefs field type.
 *
 * @param currentRefs - Current evidence refs array
 * @param newRefs - New refs to append
 * @returns Updated evidence refs array
 */
export function addEvidenceRefs(
  currentRefs: readonly EvidenceRef[],
  newRefs: EvidenceRef | EvidenceRef[],
): EvidenceRef[] {
  const refsToAdd = Array.isArray(newRefs) ? newRefs : [newRefs]
  return [...currentRefs, ...refsToAdd]
}

/**
 * Updates gate decisions in state.
 * AC-8: Supports gateDecisions field type.
 *
 * @param currentDecisions - Current gate decisions
 * @param newDecisions - New decisions to merge
 * @returns Updated gate decisions record
 */
export function updateGateDecisions(
  currentDecisions: Partial<Record<GateType, GateDecision>>,
  newDecisions: Partial<Record<GateType, GateDecision>>,
): Partial<Record<GateType, GateDecision>> {
  return { ...currentDecisions, ...newDecisions }
}

/**
 * Adds errors to state.
 * AC-8: Supports errors field type.
 *
 * @param currentErrors - Current errors array
 * @param newErrors - New errors to append
 * @returns Updated errors array
 */
export function addErrors(
  currentErrors: readonly NodeError[],
  newErrors: NodeError | NodeError[],
): NodeError[] {
  const errorsToAdd = Array.isArray(newErrors) ? newErrors : [newErrors]
  return [...currentErrors, ...errorsToAdd]
}

/**
 * Creates a NodeError from any error value.
 * Normalizes the error and sanitizes the stack trace.
 *
 * @param options - Error creation options
 * @returns A validated NodeError object
 */
export function createNodeError(options: CreateNodeErrorOptions): NodeError {
  const { nodeId, error, code, recoverable = false, stackConfig = {} } = options

  const normalizedError = normalizeError(error)
  const sanitizedStack = sanitizeStackTrace(normalizedError.stack, stackConfig)

  const nodeError = {
    nodeId,
    message: normalizedError.message,
    code: code ?? normalizedError.name,
    timestamp: new Date().toISOString(),
    stack: sanitizedStack,
    recoverable,
  }

  // Validate against schema
  return NodeErrorSchema.parse(nodeError)
}

/**
 * Creates a state update that adds an error.
 * Convenience function for error capture in nodes.
 *
 * @param state - Current state
 * @param options - Error creation options
 * @returns Partial state update with new error
 */
export function createErrorUpdate(state: GraphState, options: CreateNodeErrorOptions): StateUpdate {
  const nodeError = createNodeError(options)
  return updateState({
    errors: addErrors(state.errors, nodeError),
  })
}

/**
 * Creates a state update that marks the node as blocked.
 * Used when retry attempts are exhausted.
 * AC-6: Sets routingFlags to indicate 'blocked'.
 *
 * @param state - Current state
 * @param options - Error creation options
 * @returns Partial state update with error and blocked flag
 */
export function createBlockedUpdate(
  state: GraphState,
  options: CreateNodeErrorOptions,
): StateUpdate {
  const nodeError = createNodeError({ ...options, recoverable: false })
  return updateState({
    errors: addErrors(state.errors, nodeError),
    routingFlags: updateRoutingFlags(state.routingFlags, { blocked: true }),
  })
}

/**
 * Creates a state update that marks the node as complete.
 *
 * @param state - Current state
 * @returns Partial state update with complete flag
 */
export function createCompleteUpdate(state: GraphState): StateUpdate {
  return updateState({
    routingFlags: updateRoutingFlags(state.routingFlags, { complete: true }),
  })
}

/**
 * Merges multiple state updates into one.
 * Later updates override earlier ones for conflicting keys.
 *
 * @param updates - Array of state updates to merge
 * @returns Combined state update
 */
export function mergeStateUpdates(...updates: StateUpdate[]): StateUpdate {
  const result: StateUpdate = {}

  for (const update of updates) {
    for (const [key, value] of Object.entries(update)) {
      if (value !== undefined) {
        // Special handling for arrays - concatenate rather than replace
        if (Array.isArray(value) && Array.isArray(result[key as keyof StateUpdate])) {
          ;(result as Record<string, unknown[]>)[key] = [
            ...(result[key as keyof StateUpdate] as unknown[]),
            ...value,
          ]
        } else if (
          typeof value === 'object' &&
          value !== null &&
          !Array.isArray(value) &&
          typeof result[key as keyof StateUpdate] === 'object'
        ) {
          // Merge objects
          ;(result as Record<string, object>)[key] = {
            ...(result[key as keyof StateUpdate] as object),
            ...value,
          }
        } else {
          ;(result as Record<string, unknown>)[key] = value
        }
      }
    }
  }

  return result
}

import { ZodError } from 'zod'
import {
  GraphStateSchema,
  GRAPH_STATE_SCHEMA_VERSION,
  type GraphState,
  type GraphStateInput,
} from './graph-state.js'

/**
 * Result type for validation operations.
 */
export type ValidationResult<T> = { success: true; data: T } | { success: false; error: ZodError }

/**
 * Validates a complete GraphState object.
 *
 * @param input - The state to validate (can be unknown/untrusted data)
 * @returns The validated GraphState
 * @throws ZodError if validation fails
 *
 * @example
 * ```typescript
 * const state = validateGraphState({
 *   epicPrefix: 'wrkf',
 *   storyId: 'wrkf-1010',
 * })
 * ```
 */
export function validateGraphState(input: unknown): GraphState {
  return GraphStateSchema.parse(input)
}

/**
 * Safely validates a GraphState object without throwing.
 *
 * @param input - The state to validate
 * @returns A result object with success/failure status
 *
 * @example
 * ```typescript
 * const result = safeValidateGraphState(data)
 * if (result.success) {
 *   console.log(result.data.storyId)
 * } else {
 *   console.error(result.error.issues)
 * }
 * ```
 */
export function safeValidateGraphState(input: unknown): ValidationResult<GraphState> {
  const result = GraphStateSchema.safeParse(input)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}

/**
 * Parameters required to create an initial GraphState.
 */
export interface CreateInitialStateParams {
  /** Epic prefix (e.g., "wrkf") */
  epicPrefix: string
  /** Story identifier (e.g., "wrkf-1010") */
  storyId: string
  /** Optional schema version override (defaults to current version) */
  schemaVersion?: string
}

/**
 * Creates a valid initial GraphState with all defaults applied.
 *
 * @param params - Required parameters: epicPrefix and storyId
 * @returns A complete GraphState with all defaults applied
 * @throws ZodError if the provided parameters are invalid
 *
 * @example
 * ```typescript
 * const state = createInitialState({
 *   epicPrefix: 'wrkf',
 *   storyId: 'wrkf-1010',
 * })
 * // state now has:
 * // - schemaVersion: "1.0.0"
 * // - artifactPaths: {}
 * // - routingFlags: {}
 * // - evidenceRefs: []
 * // - gateDecisions: {}
 * // - errors: []
 * // - stateHistory: []
 * ```
 */
export function createInitialState(params: CreateInitialStateParams): GraphState {
  const input: GraphStateInput = {
    epicPrefix: params.epicPrefix,
    storyId: params.storyId,
    schemaVersion: params.schemaVersion ?? GRAPH_STATE_SCHEMA_VERSION,
  }

  return GraphStateSchema.parse(input)
}

/**
 * Checks if a value is a valid GraphState.
 *
 * @param input - The value to check
 * @returns true if the value is a valid GraphState
 *
 * @example
 * ```typescript
 * if (isValidGraphState(data)) {
 *   // data is now typed as GraphState
 *   console.log(data.storyId)
 * }
 * ```
 */
export function isValidGraphState(input: unknown): input is GraphState {
  return GraphStateSchema.safeParse(input).success
}

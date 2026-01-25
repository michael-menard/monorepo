import { GraphStateSchema, type GraphState } from './graph-state.js'

/**
 * Represents a difference in a single property between two states.
 */
export interface PropertyDiff {
  /** Path to the property (e.g., "artifactPaths.storyDoc") */
  path: string
  /** Type of change */
  type: 'changed' | 'added' | 'removed'
  /** Old value (undefined if added) */
  oldValue?: unknown
  /** New value (undefined if removed) */
  newValue?: unknown
}

/**
 * Represents the full diff between two GraphState objects.
 */
export interface StateDiff {
  /** Whether any changes were detected */
  hasChanges: boolean
  /** Array of changed properties */
  changed: PropertyDiff[]
  /** Array of added properties */
  added: PropertyDiff[]
  /** Array of removed properties */
  removed: PropertyDiff[]
  /** Total count of all differences */
  totalDiffs: number
}

/**
 * Recursively collects differences between two objects.
 */
function collectDiffs(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  path: string,
  diffs: { changed: PropertyDiff[]; added: PropertyDiff[]; removed: PropertyDiff[] },
): void {
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)])

  for (const key of allKeys) {
    const fullPath = path ? `${path}.${key}` : key
    const oldValue = before[key]
    const newValue = after[key]

    const oldExists = key in before
    const newExists = key in after

    if (!oldExists && newExists) {
      diffs.added.push({ path: fullPath, type: 'added', newValue })
    } else if (oldExists && !newExists) {
      diffs.removed.push({ path: fullPath, type: 'removed', oldValue })
    } else if (oldExists && newExists) {
      // Both exist - check for changes
      if (isObject(oldValue) && isObject(newValue)) {
        // Recurse into nested objects
        collectDiffs(
          oldValue as Record<string, unknown>,
          newValue as Record<string, unknown>,
          fullPath,
          diffs,
        )
      } else if (Array.isArray(oldValue) && Array.isArray(newValue)) {
        // Compare arrays by JSON stringification
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          diffs.changed.push({ path: fullPath, type: 'changed', oldValue, newValue })
        }
      } else if (oldValue !== newValue) {
        diffs.changed.push({ path: fullPath, type: 'changed', oldValue, newValue })
      }
    }
  }
}

/**
 * Type guard to check if a value is a plain object.
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Computes the differences between two GraphState objects.
 *
 * @param before - The original state
 * @param after - The updated state
 * @returns A StateDiff object identifying changed, added, and removed properties
 *
 * @example
 * ```typescript
 * const diff = diffGraphState(oldState, newState)
 * if (diff.hasChanges) {
 *   console.log(`Found ${diff.totalDiffs} differences`)
 *   diff.changed.forEach(d => console.log(`Changed: ${d.path}`))
 * }
 * ```
 */
export function diffGraphState(before: GraphState, after: GraphState): StateDiff {
  const diffs: { changed: PropertyDiff[]; added: PropertyDiff[]; removed: PropertyDiff[] } = {
    changed: [],
    added: [],
    removed: [],
  }

  collectDiffs(before as Record<string, unknown>, after as Record<string, unknown>, '', diffs)

  const totalDiffs = diffs.changed.length + diffs.added.length + diffs.removed.length

  return {
    hasChanges: totalDiffs > 0,
    changed: diffs.changed,
    added: diffs.added,
    removed: diffs.removed,
    totalDiffs,
  }
}

/**
 * Serializes a GraphState object to a JSON string.
 *
 * @param state - The state to serialize
 * @returns A JSON string representation of the state
 *
 * @example
 * ```typescript
 * const json = serializeState(state)
 * localStorage.setItem('graphState', json)
 * ```
 */
export function serializeState(state: GraphState): string {
  return JSON.stringify(state)
}

/**
 * Deserializes a JSON string back to a validated GraphState.
 *
 * @param json - The JSON string to parse
 * @returns A validated GraphState object
 * @throws ZodError if the parsed data is not a valid GraphState
 * @throws SyntaxError if the JSON is malformed
 *
 * @example
 * ```typescript
 * const json = localStorage.getItem('graphState')
 * if (json) {
 *   const state = deserializeState(json)
 *   console.log(state.storyId)
 * }
 * ```
 */
export function deserializeState(json: string): GraphState {
  const parsed: unknown = JSON.parse(json)
  return GraphStateSchema.parse(parsed)
}

/**
 * Safely deserializes a JSON string without throwing.
 *
 * @param json - The JSON string to parse
 * @returns A result object with the parsed state or an error
 *
 * @example
 * ```typescript
 * const result = safeDeserializeState(json)
 * if (result.success) {
 *   console.log(result.data.storyId)
 * } else {
 *   console.error('Failed to deserialize:', result.error)
 * }
 * ```
 */
export function safeDeserializeState(
  json: string,
): { success: true; data: GraphState } | { success: false; error: Error } {
  try {
    const parsed: unknown = JSON.parse(json)
    const result = GraphStateSchema.safeParse(parsed)
    if (result.success) {
      return { success: true, data: result.data }
    }
    return { success: false, error: result.error }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error : new Error(String(error)) }
  }
}

/**
 * Creates a deep clone of a GraphState.
 *
 * @param state - The state to clone
 * @returns A new GraphState object with the same values
 *
 * @example
 * ```typescript
 * const clone = cloneState(state)
 * clone.routingFlags.proceed = true
 * // Original state is unchanged
 * ```
 */
export function cloneState(state: GraphState): GraphState {
  return deserializeState(serializeState(state))
}

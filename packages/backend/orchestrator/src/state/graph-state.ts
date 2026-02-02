import { z, ZodIssueCode, type RefinementCtx } from 'zod'
import { ArtifactTypeSchema, type ArtifactType } from './enums/artifact-type.js'
import { GateDecisionSchema, type GateDecision } from './enums/gate-decision.js'
import { GateTypeSchema, type GateType } from './enums/gate-type.js'
import { RoutingFlagSchema, type RoutingFlag } from './enums/routing-flag.js'
import { StoryStateSchema, type StoryState } from './enums/story-state.js'
import { EvidenceRefSchema, type EvidenceRef } from './refs/evidence-ref.js'
import { NodeErrorSchema, type NodeError } from './refs/node-error.js'

/** Current schema version for migration support */
export const GRAPH_STATE_SCHEMA_VERSION = '1.0.0'

/**
 * Pattern for story ID validation.
 * Format: prefix-number (e.g., "wrkf-1010", "WRKF-1010")
 * Case-insensitive matching.
 */
const STORY_ID_PATTERN = /^[a-z]+-\d+$/i

/**
 * StateSnapshotState schema - the state portion of a snapshot.
 * This is a simplified version of GraphState without stateHistory to avoid circular reference.
 */
export const StateSnapshotStateSchema = z.object({
  schemaVersion: z.string(),
  epicPrefix: z.string().min(1),
  storyId: z.string().regex(STORY_ID_PATTERN),
  storyState: StoryStateSchema.optional(),
  blockedBy: z.string().nullable().optional(),
  artifactPaths: z.record(ArtifactTypeSchema, z.string().min(1)),
  routingFlags: z.record(RoutingFlagSchema, z.boolean()),
  evidenceRefs: z.array(EvidenceRefSchema),
  gateDecisions: z.record(GateTypeSchema, GateDecisionSchema),
  errors: z.array(NodeErrorSchema),
  // No stateHistory here to avoid circular reference
})

/** TypeScript type for snapshot state */
export type StateSnapshotState = z.infer<typeof StateSnapshotStateSchema>

/**
 * StateSnapshot schema - a timestamped snapshot of GraphState for time-travel debugging.
 * Note: The state excludes stateHistory to avoid circular reference.
 */
export const StateSnapshotSchema = z.object({
  timestamp: z.string().datetime({ message: 'Snapshot timestamp must be a valid ISO datetime' }),
  state: StateSnapshotStateSchema,
})

/** TypeScript type inferred from StateSnapshotSchema */
export type StateSnapshot = z.infer<typeof StateSnapshotSchema>

/**
 * GraphState base shape without refinements.
 * Includes all fields with their defaults.
 */
const GraphStateBaseSchema = z.object({
  /**
   * Schema version for migration support.
   * Default: "1.0.0"
   */
  schemaVersion: z.string().default(GRAPH_STATE_SCHEMA_VERSION),

  /**
   * Epic prefix (required).
   * Example: "wrkf"
   */
  epicPrefix: z.string().min(1, 'Epic prefix must be non-empty'),

  /**
   * Story identifier (required).
   * Must match pattern: prefix-number (case-insensitive)
   * Example: "wrkf-1010" or "WRKF-1010"
   */
  storyId: z.string().regex(STORY_ID_PATTERN, {
    message: 'Story ID must match pattern: prefix-number (e.g., "wrkf-1010")',
  }),

  /**
   * Current story state in the workflow lifecycle.
   * Aligns with Claude workflow's story state model.
   * Optional, defaults to undefined (use checkpoint for phase tracking).
   */
  storyState: StoryStateSchema.optional(),

  /**
   * Story ID that is blocking this story.
   * Replaces boolean blocked flag with actionable reference.
   * Null means not blocked.
   */
  blockedBy: z.string().nullable().default(null),

  /**
   * Record of artifact paths, keyed by ArtifactType.
   * Optional, defaults to empty object.
   */
  artifactPaths: z
    .record(ArtifactTypeSchema, z.string().min(1, 'Artifact path must be non-empty'))
    .default({}),

  /**
   * Record of routing flags, keyed by RoutingFlag.
   * Values are booleans indicating whether the flag is set.
   * Optional, defaults to empty object.
   */
  routingFlags: z.record(RoutingFlagSchema, z.boolean()).default({}),

  /**
   * Array of evidence references captured during workflow execution.
   * Optional, defaults to empty array.
   */
  evidenceRefs: z.array(EvidenceRefSchema).default([]),

  /**
   * Record of gate decisions, keyed by GateType.
   * Optional, defaults to empty object.
   */
  gateDecisions: z.record(GateTypeSchema, GateDecisionSchema).default({}),

  /**
   * Array of errors captured during node execution.
   * Optional, defaults to empty array.
   */
  errors: z.array(NodeErrorSchema).default([]),

  /**
   * State history for time-travel debugging.
   * Optional, defaults to empty array.
   */
  stateHistory: z.array(StateSnapshotSchema).default([]),
})

/** Type alias for the base schema's inferred type */
type GraphStateBase = z.infer<typeof GraphStateBaseSchema>

/**
 * Cross-field refinement function for GraphState.
 */
function graphStateRefinements(state: GraphStateBase, ctx: RefinementCtx): void {
  // Refinement 1: Routing flag consistency
  const flags = state.routingFlags
  if (flags.complete === true) {
    if (flags.retry === true) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message: 'Routing flag "retry" cannot be set when "complete" is true',
        path: ['routingFlags', 'retry'],
      })
    }
    if (flags.blocked === true) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message: 'Routing flag "blocked" cannot be set when "complete" is true',
        path: ['routingFlags', 'blocked'],
      })
    }
  }

  // Refinement 2: Story ID prefix consistency
  const storyIdPrefix = state.storyId.toLowerCase().split('-')[0]
  const epicPrefixLower = state.epicPrefix.toLowerCase()
  if (storyIdPrefix !== epicPrefixLower) {
    ctx.addIssue({
      code: ZodIssueCode.custom,
      message: `Story ID prefix "${storyIdPrefix}" does not match epicPrefix "${state.epicPrefix}"`,
      path: ['storyId'],
    })
  }
}

/**
 * GraphState schema with cross-field refinements.
 *
 * Refinements:
 * 1. Routing flag consistency: if 'complete' is set, 'retry' and 'blocked' should not be set
 * 2. Artifact path format: paths should be non-empty strings (already enforced by schema)
 * 3. Story ID prefix consistency: storyId should start with epicPrefix (case-insensitive)
 */
export const GraphStateSchema = GraphStateBaseSchema.superRefine(graphStateRefinements)

/** TypeScript type inferred from GraphStateSchema */
export type GraphState = z.infer<typeof GraphStateSchema>

/**
 * Input type for GraphState (before defaults are applied).
 * Use this when creating new GraphState objects.
 */
export type GraphStateInput = z.input<typeof GraphStateSchema>

// Re-export types for convenience
export type {
  ArtifactType,
  EvidenceRef,
  GateDecision,
  GateType,
  NodeError,
  RoutingFlag,
  StoryState,
}

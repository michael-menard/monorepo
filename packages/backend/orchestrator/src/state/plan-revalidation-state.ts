/**
 * Plan Revalidation State Annotation
 *
 * Defines the LangGraph state annotation, Zod schemas, and TypeScript types
 * for the Plan Revalidation Graph.
 *
 * APRS-3010: Plan Revalidation Graph - Context Load and Drift Detection Nodes
 */

import { z } from 'zod'
import { Annotation } from '@langchain/langgraph'

// ============================================================================
// Zod Schemas
// ============================================================================

/**
 * A lightweight reference to a story for context snapshots.
 */
export const StoryRefSchema = z.object({
  id: z.string().min(1),
  title: z.string().default(''),
  status: z.string().default(''),
  phase: z.string().default(''),
})

export type StoryRef = z.infer<typeof StoryRefSchema>

/**
 * A snapshot of all context loaded for the plan being revalidated.
 */
export const ContextSnapshotSchema = z.object({
  planSlug: z.string().min(1),
  planContent: z.record(z.unknown()).nullable(),
  relatedStories: z.array(StoryRefSchema).default([]),
  codebaseState: z.record(z.unknown()).nullable().default(null),
  loadedAt: z.string().datetime(),
})

export type ContextSnapshot = z.infer<typeof ContextSnapshotSchema>

/**
 * A single drift finding produced by one of the revalidation check nodes.
 */
export const DriftFindingSchema = z.object({
  nodeId: z.string().min(1),
  category: z.enum([
    'already_implemented',
    'approach_invalid',
    'dependency_missing',
    'scope_drift',
    'other',
  ]),
  severity: z.enum(['info', 'warning', 'blocking']),
  summary: z.string().min(1),
  detail: z.string().default(''),
  confidence: z.number().min(0).max(1).default(1.0),
})

export type DriftFinding = z.infer<typeof DriftFindingSchema>

/**
 * The final revalidation verdict for this plan.
 */
export const RevalidationVerdictSchema = z.enum([
  'proceed',
  'needs_revision',
  'already_done',
  'blocked',
  'error',
])

export type RevalidationVerdict = z.infer<typeof RevalidationVerdictSchema>

/**
 * The current execution phase of the revalidation graph.
 */
export const RevalidationPhaseSchema = z.enum([
  'load_context',
  'check_already_implemented',
  'check_approach_valid',
  'check_dependencies',
  'check_scope_drift',
  'classify_drift',
  'complete',
  'error',
])

export type RevalidationPhase = z.infer<typeof RevalidationPhaseSchema>

// ============================================================================
// State Annotation Reducers
// ============================================================================

/** Simple overwrite reducer — last-write wins */
const overwrite = <T>(_: T, b: T): T => b

/** Append reducer — accumulates array entries across node updates */
const append = <T>(a: T[], b: T[]): T[] => [...a, ...b]

// ============================================================================
// State Annotation
// ============================================================================

/**
 * PlanRevalidationStateAnnotation — LangGraph state annotation for the
 * Plan Revalidation Graph.
 *
 * Fields:
 * - planSlug: the plan being revalidated (no reducer, set once at start)
 * - rawPlan: raw plan content loaded from KB
 * - contextSnapshot: full context snapshot built by load-context node
 * - driftFindings: APPEND — accumulated findings from all check nodes
 * - verdict: final classification verdict (overwrite)
 * - revalidationPhase: current execution phase (overwrite)
 * - warnings: APPEND — non-fatal warnings from all nodes
 * - errors: APPEND — error messages from all nodes
 */
export const PlanRevalidationStateAnnotation = Annotation.Root({
  /** The plan slug being revalidated */
  planSlug: Annotation<string>(),

  /** Raw plan content from KB */
  rawPlan: Annotation<Record<string, unknown> | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Full context snapshot built during load-context phase */
  contextSnapshot: Annotation<ContextSnapshot | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Accumulated drift findings from all check nodes */
  driftFindings: Annotation<DriftFinding[]>({
    reducer: append,
    default: () => [],
  }),

  /** Final revalidation verdict */
  verdict: Annotation<RevalidationVerdict | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Current execution phase */
  revalidationPhase: Annotation<RevalidationPhase>({
    reducer: overwrite,
    default: () => 'load_context',
  }),

  /** Non-fatal warnings accumulated across nodes */
  warnings: Annotation<string[]>({
    reducer: append,
    default: () => [],
  }),

  /** Error messages accumulated across nodes */
  errors: Annotation<string[]>({
    reducer: append,
    default: () => [],
  }),
})

/** TypeScript type for the full plan revalidation state */
export type PlanRevalidationState = typeof PlanRevalidationStateAnnotation.State

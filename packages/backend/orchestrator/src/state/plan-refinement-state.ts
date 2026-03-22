/**
 * Plan Refinement Graph State
 *
 * Standalone state annotation for the plan-refinement LangGraph.
 * Uses Annotation.Root (not extending GraphState) because plan-refinement
 * is plan-centric (planSlug), not story-centric (storyId).
 *
 * APRS-2010
 */

import { z } from 'zod'
import { Annotation } from '@langchain/langgraph'

// ============================================================================
// Flow Schemas
// ============================================================================

/**
 * A single step within a flow.
 */
export const FlowStepSchema = z.object({
  /** Step order index (1-based) */
  index: z.number().int().positive(),
  /** Description of what happens in this step */
  description: z.string().min(1),
  /** Actor performing this step (if different from flow actor) */
  actor: z.string().optional(),
})

export type FlowStep = z.infer<typeof FlowStepSchema>

/**
 * A user flow extracted from the plan.
 * AC-2: id, name, actor, trigger, steps[], success_outcome, source, confidence, status
 */
export const FlowSchema = z.object({
  /** Unique identifier for the flow */
  id: z.string().min(1),
  /** Human-readable name */
  name: z.string().min(1),
  /** Primary actor performing this flow */
  actor: z.string().min(1),
  /** What triggers this flow */
  trigger: z.string().min(1),
  /** Ordered steps in the flow */
  steps: z.array(FlowStepSchema),
  /** Expected outcome when flow completes successfully */
  successOutcome: z.string().min(1),
  /** Where the flow came from */
  source: z.enum(['user', 'inferred', 'merged']),
  /** Confidence score: 0.0-1.0 */
  confidence: z.number().min(0).max(1),
  /** Current review status */
  status: z.enum(['unconfirmed', 'confirmed', 'rejected']).default('unconfirmed'),
})

export type Flow = z.infer<typeof FlowSchema>

// ============================================================================
// Normalized Plan Schema
// ============================================================================

/**
 * A fully normalized plan with all structured fields populated.
 * AC-1: planSlug, title, summary, problemStatement, proposedSolution,
 *       goals, nonGoals, flows, openQuestions, warnings all present.
 */
export const NormalizedPlanSchema = z.object({
  /** Plan slug identifier */
  planSlug: z.string().min(1),
  /** Plan title */
  title: z.string().min(1),
  /** Short summary of the plan */
  summary: z.string().default(''),
  /** Problem statement extracted from rawPlan */
  problemStatement: z.string().default(''),
  /** Proposed solution extracted from rawPlan */
  proposedSolution: z.string().default(''),
  /** Goals (extracted from Goals section) */
  goals: z.array(z.string()).default([]),
  /** Non-goals (extracted from Non-Goals section) */
  nonGoals: z.array(z.string()).default([]),
  /** Flows — populated by extract_flows node */
  flows: z.array(FlowSchema).default([]),
  /** Open questions requiring stakeholder input */
  openQuestions: z.array(z.string()).default([]),
  /** Warnings about the plan */
  warnings: z.array(z.string()).default([]),
  /** Constraints on the plan */
  constraints: z.array(z.string()).default([]),
  /** Dependencies on other plans/stories */
  dependencies: z.array(z.string()).default([]),
  /** Plan status */
  status: z.string().default('draft'),
  /** Priority level */
  priority: z.string().default('medium'),
  /** Categorization tags */
  tags: z.array(z.string()).default([]),
})

export type NormalizedPlan = z.infer<typeof NormalizedPlanSchema>

// ============================================================================
// Refinement Phase Enum
// ============================================================================

export const RefinementPhaseSchema = z.enum([
  'normalize_plan',
  'extract_flows',
  'gap_coverage',
  'complete',
  'error',
])

export type RefinementPhase = z.infer<typeof RefinementPhaseSchema>

// ============================================================================
// State Annotation
// ============================================================================

/** Overwrite reducer for most fields */
const overwrite = <T>(_: T, b: T): T => b

/**
 * PlanRefinementStateAnnotation
 *
 * Standalone state for the plan-refinement LangGraph.
 * Separate from GraphState — plan-centric, not story-centric.
 */
export const PlanRefinementStateAnnotation = Annotation.Root({
  /** Plan slug (primary identifier) */
  planSlug: Annotation<string>(),

  /** Raw plan content from KB (markdown string or object) */
  rawPlan: Annotation<Record<string, unknown> | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Normalized plan output from normalize_plan node */
  normalizedPlan: Annotation<NormalizedPlan | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Extracted flows (from extract_flows node) — AC-5 */
  flows: Annotation<Flow[]>({
    reducer: overwrite,
    default: () => [],
  }),

  /** Current refinement phase */
  refinementPhase: Annotation<RefinementPhase>({
    reducer: overwrite,
    default: () => 'normalize_plan',
  }),

  /** Current iteration count */
  iterationCount: Annotation<number>({
    reducer: overwrite,
    default: () => 0,
  }),

  /** Maximum allowed iterations */
  maxIterations: Annotation<number>({
    reducer: overwrite,
    default: () => 3,
  }),

  /** Accumulated warnings (append reducer) */
  warnings: Annotation<string[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),

  /** Accumulated errors (append reducer) */
  errors: Annotation<string[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
})

/** TypeScript type for plan refinement state */
export type PlanRefinementState = typeof PlanRefinementStateAnnotation.State

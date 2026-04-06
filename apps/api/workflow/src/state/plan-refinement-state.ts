/**
 * Plan Refinement Graph State
 *
 * Standalone state annotation for the plan-refinement LangGraph.
 * Uses Annotation.Root (not extending GraphState) because plan-refinement
 * is plan-centric (planSlug), not story-centric (storyId).
 *
 * APRS-2010, APRS-2020, APRS-2030
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
  source: z.enum(['user', 'inferred', 'merged', 'designed']),
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
// Gap Coverage Schemas
// ============================================================================

/**
 * A gap identified by the coverage agent.
 */
export const GapFindingSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['ux', 'qa', 'security', 'coverage']),
  description: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  sourceFlowIds: z.array(z.string()).default([]),
  relatedAcIds: z.array(z.string()).default([]),
})

export type GapFinding = z.infer<typeof GapFindingSchema>

/**
 * A specialist's analysis of a gap.
 */
export const SpecialistFindingSchema = z.object({
  id: z.string().min(1),
  gapId: z.string().min(1),
  specialistType: z.enum(['ux', 'qa', 'security']),
  analysis: z.string().min(1),
  recommendation: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  confidence: z.number().min(0).max(1),
})

export type SpecialistFinding = z.infer<typeof SpecialistFindingSchema>

/**
 * Merged finding from reconciliation.
 */
export const ReconciledFindingSchema = z.object({
  id: z.string().min(1),
  gapId: z.string().min(1),
  type: z.enum(['ux', 'qa', 'security', 'coverage']),
  description: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  specialistAnalyses: z.array(SpecialistFindingSchema).default([]),
  recommendation: z.string().min(1),
  status: z.enum(['open', 'addressed', 'deferred']).default('open'),
})

export type ReconciledFinding = z.infer<typeof ReconciledFindingSchema>

/**
 * Final output of the gap coverage loop.
 */
export const CoverageResultSchema = z.object({
  coverageScore: z.number().min(0).max(1),
  totalGaps: z.number().int().min(0),
  addressedGaps: z.number().int().min(0),
  reconciledFindings: z.array(ReconciledFindingSchema),
  iterationsUsed: z.number().int().min(0),
  circuitBreakerTriggered: z.boolean(),
})

export type CoverageResult = z.infer<typeof CoverageResultSchema>

// ============================================================================
// Refinement Phase Enum
// ============================================================================

export const RefinementPhaseSchema = z.enum([
  'normalize_plan',
  'extract_flows',
  'gap_coverage',
  'human_review',
  'final_validation',
  'story_readiness',
  'complete',
  'error',
])

export type RefinementPhase = z.infer<typeof RefinementPhaseSchema>

// ============================================================================
// HiTL Decision Schema (APRS-2030 AC-1)
// ============================================================================

export const HiTLDecisionSchema = z.enum(['approve', 'edit', 'reject', 'defer'])
export type HiTLDecision = z.infer<typeof HiTLDecisionSchema>

export const HumanReviewResultSchema = z.object({
  confirmedFlowIds: z.array(z.string()),
  rejectedFlowIds: z.array(z.string()),
})
export type HumanReviewResult = z.infer<typeof HumanReviewResultSchema>

export const StoryReadinessSchema = z.object({
  score: z.number().int().min(0).max(100),
  passed: z.boolean(),
  reasons: z.array(z.string()),
})
export type StoryReadiness = z.infer<typeof StoryReadinessSchema>

export const ValidationResultSchema = z.object({
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  passed: z.boolean(),
})
export type ValidationResult = z.infer<typeof ValidationResultSchema>

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

  /** Gap findings from coverage agent (append reducer for iteration accumulation) */
  gapFindings: Annotation<GapFinding[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),

  /** Specialist findings from fan-out (append reducer for fan-in) */
  specialistFindings: Annotation<SpecialistFinding[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),

  /** Reconciled findings (overwrite per iteration) */
  reconciledFindings: Annotation<ReconciledFinding[]>({
    reducer: overwrite,
    default: () => [],
  }),

  /** Coverage score from reconciliation (0.0-1.0) */
  coverageScore: Annotation<number | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Circuit breaker state */
  circuitBreakerOpen: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  /** Previous iteration gap count for convergence detection */
  previousGapCount: Annotation<number>({
    reducer: overwrite,
    default: () => 0,
  }),

  /** Consecutive LLM failure count for circuit breaker */
  consecutiveLlmFailures: Annotation<number>({
    reducer: overwrite,
    default: () => 0,
  }),

  /** HiTL decision from human_review_checkpoint (APRS-2030 AC-1) */
  hitlDecision: Annotation<HiTLDecision | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Human review result — confirmed/rejected flow IDs (APRS-2030 AC-1) */
  humanReviewResult: Annotation<HumanReviewResult | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Readiness score 0-100 (APRS-2030 AC-1) */
  readinessScore: Annotation<number | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Story readiness assessment (APRS-2030 AC-1) */
  storyReadiness: Annotation<StoryReadiness | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Validation result from final_validation (APRS-2030 AC-1) */
  validationResult: Annotation<ValidationResult | null>({
    reducer: overwrite,
    default: () => null,
  }),
})

/** TypeScript type for plan refinement state */
export type PlanRefinementState = typeof PlanRefinementStateAnnotation.State

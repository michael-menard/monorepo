/**
 * Plan Refinement V2 Graph State
 *
 * Standalone state annotation for the plan-refinement-v2 agentic LangGraph.
 * Uses a single ReAct-loop refinement_agent node instead of the fixed
 * coverage_agent → gap_specialists → reconciliation sequence from v1.
 *
 * Designed for bake-off comparison against v1 (tag: 'v2-agentic').
 */

import { z } from 'zod'
import { Annotation } from '@langchain/langgraph'
import type { NormalizedPlan, Flow } from './plan-refinement-state.js'

// ============================================================================
// Grounding Context Schema
// ============================================================================

/**
 * Produced by the grounding_scout node. Captures existing KB knowledge
 * before any LLM reasoning begins.
 */
export const GroundingContextSchema = z.object({
  existingStories: z
    .array(
      z.object({
        storyId: z.string(),
        title: z.string(),
        state: z.string(),
        parentFlowId: z.string().optional(),
      }),
    )
    .default([]),
  relatedPlans: z
    .array(
      z.object({
        planSlug: z.string(),
        title: z.string(),
        status: z.string(),
      }),
    )
    .default([]),
  existingPatterns: z.array(z.string()).default([]),
  feasibilityFlags: z
    .array(
      z.object({
        claim: z.string(),
        flag: z.enum([
          'already_implemented',
          'contradicts_architecture',
          'missing_dependency',
          'valid',
        ]),
        evidence: z.string(),
      }),
    )
    .default([]),
})

export type GroundingContext = z.infer<typeof GroundingContextSchema>

// ============================================================================
// Postcondition Result Schema
// ============================================================================

/**
 * Output of the postcondition gate check. Reflects whether the
 * refinement_agent satisfied all required postconditions.
 */
export const PostconditionResultSchema = z.object({
  passed: z.boolean(),
  failures: z
    .array(
      z.object({
        check: z.string(),
        reason: z.string(),
      }),
    )
    .default([]),
  /** check name → evidence found */
  evidence: z.record(z.string(), z.string()).default({}),
})

export type PostconditionResult = z.infer<typeof PostconditionResultSchema>

// ============================================================================
// Refinement V2 Phase Enum
// ============================================================================

export const RefinementV2PhaseSchema = z.enum([
  'grounding_scout',
  'feasibility_scan',
  'refinement_agent',
  'postcondition_gate',
  'complete',
  'error',
])

export type RefinementV2Phase = z.infer<typeof RefinementV2PhaseSchema>

// ============================================================================
// Token Usage Schema
// ============================================================================

/**
 * Tracks token usage per node call for cost attribution and monitoring.
 */
export const TokenUsageSchema = z.object({
  inputTokens: z.number().int().min(0).default(0),
  outputTokens: z.number().int().min(0).default(0),
  nodeId: z.string(),
})

export type TokenUsage = z.infer<typeof TokenUsageSchema>

// ============================================================================
// State Annotation
// ============================================================================

/** Overwrite reducer for most fields */
const overwrite = <T>(_: T, b: T): T => b

/**
 * PlanRefinementV2StateAnnotation
 *
 * Standalone state for the plan-refinement-v2 agentic LangGraph.
 * Plan-centric (planSlug), not story-centric.
 */
export const PlanRefinementV2StateAnnotation = Annotation.Root({
  /** Plan slug (primary identifier) */
  planSlug: Annotation<string>(),

  /** Raw plan content from KB */
  rawPlan: Annotation<Record<string, unknown> | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Normalized plan (imported from v1 state — shared type) */
  normalizedPlan: Annotation<NormalizedPlan | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Extracted flows (imported from v1 state — shared type) */
  flows: Annotation<Flow[]>({
    reducer: overwrite,
    default: () => [],
  }),

  /** Grounding context produced by grounding_scout */
  groundingContext: Annotation<GroundingContext | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Postcondition check result from refinement_agent */
  postconditionResult: Annotation<PostconditionResult | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Current v2 refinement phase */
  refinementV2Phase: Annotation<RefinementV2Phase>({
    reducer: overwrite,
    default: () => 'grounding_scout',
  }),

  /** Number of outer retry attempts (postcondition_gate → refinement_agent loops) */
  retryCount: Annotation<number>({
    reducer: overwrite,
    default: () => 0,
  }),

  /** Maximum outer retry attempts before error */
  maxRetries: Annotation<number>({
    reducer: overwrite,
    default: () => 3,
  }),

  /** Tracks internal ReAct loop iterations inside refinement_agent */
  internalIterations: Annotation<number>({
    reducer: overwrite,
    default: () => 0,
  }),

  /** Token usage accumulated across nodes (append reducer) */
  tokenUsage: Annotation<TokenUsage[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),

  /** Bake-off version tag for comparison against v1 */
  bakeOffVersion: Annotation<string>({
    reducer: overwrite,
    default: () => 'v2-agentic',
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

/** TypeScript type for plan refinement v2 state */
export type PlanRefinementV2State = typeof PlanRefinementV2StateAnnotation.State

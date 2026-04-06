/**
 * Dev Implement V2 Graph State
 *
 * Standalone state annotation for the dev-implement-v2 agentic LangGraph.
 * Uses a scout → planner → executor sequence where the executor owns
 * test-running internally. Fails clean with diagnosis — no graph-level retries.
 *
 * Designed for bake-off comparison against v1 (tag: 'v2-agentic').
 */

import { z } from 'zod'
import { Annotation } from '@langchain/langgraph'
import { TokenUsageSchema } from './plan-refinement-v2-state.js'
import type { TokenUsage, PostconditionResult } from './plan-refinement-v2-state.js'

export type { TokenUsage, PostconditionResult }

// ============================================================================
// StoryGroundingContext Schema
// ============================================================================

export const StoryGroundingContextSchema = z.object({
  storyId: z.string(),
  storyTitle: z.string(),
  acceptanceCriteria: z.array(z.string()).default([]),
  subtasks: z.array(z.string()).default([]),
  /** Relevant files found by codebase scout */
  relevantFiles: z.array(z.string()).default([]),
  relevantFunctions: z
    .array(
      z.object({
        file: z.string(),
        name: z.string(),
        signature: z.string().optional(),
      }),
    )
    .default([]),
  existingPatterns: z.array(z.string()).default([]),
  relatedStories: z
    .array(
      z.object({
        storyId: z.string(),
        title: z.string(),
        state: z.string(),
      }),
    )
    .default([]),
})

export type StoryGroundingContext = z.infer<typeof StoryGroundingContextSchema>

// ============================================================================
// ImplementationPlan Schema
// ============================================================================

export const ImplementationPlanSchema = z.object({
  approach: z.string(),
  filesToCreate: z.array(z.string()).default([]),
  filesToModify: z.array(z.string()).default([]),
  testFilesToCreate: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
})

export type ImplementationPlan = z.infer<typeof ImplementationPlanSchema>

// ============================================================================
// TestRunResult Schema — kept for qa-verify-v2-state.ts import
// ============================================================================

export const TestRunResultSchema = z.object({
  passed: z.boolean(),
  passedCount: z.number().int().min(0).default(0),
  failedCount: z.number().int().min(0).default(0),
  failures: z
    .array(
      z.object({
        testName: z.string(),
        error: z.string(),
        file: z.string().optional(),
      }),
    )
    .default([]),
  rawOutput: z.string().default(''),
})

export type TestRunResult = z.infer<typeof TestRunResultSchema>

// ============================================================================
// ExecutorOutcome Schema — what the executor agent reports when it exits
// ============================================================================

export const ExecutorOutcomeSchema = z.object({
  /** 'complete' = tests passed; 'stuck' = cannot proceed */
  verdict: z.enum(['complete', 'stuck']),
  filesCreated: z.array(z.string()).default([]),
  filesModified: z.array(z.string()).default([]),
  /** Whether the agent called run_tests */
  testsRan: z.boolean().default(false),
  testsPassed: z.boolean().default(false),
  testOutput: z.string().default(''),
  /** Populated when verdict is 'stuck' — specific diagnosis */
  diagnosis: z.string().default(''),
  acVerification: z
    .array(
      z.object({
        acIndex: z.number().int().min(0),
        acText: z.string(),
        verified: z.boolean(),
        evidence: z.string(),
      }),
    )
    .default([]),
})

export type ExecutorOutcome = z.infer<typeof ExecutorOutcomeSchema>

// ============================================================================
// Retry Feedback Schema — carries review/QA findings into dev retry
// ============================================================================

export const RetryFeedbackFindingSchema = z.object({
  severity: z.string(),
  category: z.string().optional(),
  file: z.string(),
  line: z.number().optional(),
  description: z.string(),
  suggestion: z.string().optional(),
  evidence: z.string(),
})

export const RetryFeedbackFailedACSchema = z.object({
  acIndex: z.number(),
  acText: z.string(),
  verdict: z.string(),
  evidence: z.string(),
  testOutput: z.string().optional(),
})

export const RetryFeedbackSchema = z.object({
  /** Where the feedback came from */
  source: z.enum(['review', 'qa']),
  /** Which retry attempt this is (1-based) */
  attempt: z.number().int().min(1),
  /** Structured review findings (populated when source='review') */
  reviewFindings: z.array(RetryFeedbackFindingSchema).default([]),
  /** Failed acceptance criteria (populated when source='qa') */
  failedACs: z.array(RetryFeedbackFailedACSchema).default([]),
})

export type RetryFeedback = z.infer<typeof RetryFeedbackSchema>

// ============================================================================
// DevImplementV2Phase Enum
// ============================================================================

export const DevImplementV2PhaseSchema = z.enum([
  'story_scout',
  'implementation_planner',
  'implementation_executor',
  'evidence_collector',
  'postcondition_gate',
  'complete',
  'error',
])

export type DevImplementV2Phase = z.infer<typeof DevImplementV2PhaseSchema>

// Re-export TokenUsageSchema for use in nodes
export { TokenUsageSchema }

// ============================================================================
// State Annotation
// ============================================================================

/** Overwrite reducer for most fields */
const overwrite = <T>(_: T, b: T): T => b

/** Append reducer for arrays */
const append = <T>(current: T[], update: T[]): T[] => [...current, ...update]

/**
 * DevImplementV2StateAnnotation
 *
 * Standalone state for the dev-implement-v2 agentic LangGraph.
 * Story-centric (storyId).
 */
export const DevImplementV2StateAnnotation = Annotation.Root({
  /** Story ID (primary identifier) */
  storyId: Annotation<string>(),

  /** Grounding context produced by story_scout */
  storyGroundingContext: Annotation<StoryGroundingContext | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Implementation plan produced by implementation_planner */
  implementationPlan: Annotation<ImplementationPlan | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Outcome produced by implementation_executor (complete or stuck) */
  executorOutcome: Annotation<ExecutorOutcome | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Postcondition check result */
  postconditionResult: Annotation<PostconditionResult | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Current v2 phase */
  devImplementV2Phase: Annotation<DevImplementV2Phase>({
    reducer: overwrite,
    default: () => 'story_scout',
  }),

  /** Token usage accumulated across nodes (append reducer) */
  tokenUsage: Annotation<TokenUsage[]>({
    reducer: append,
    default: () => [],
  }),

  /** Bake-off version tag for comparison against v1 */
  bakeOffVersion: Annotation<string>({
    reducer: overwrite,
    default: () => 'v2-agentic',
  }),

  /** Accumulated warnings (append reducer) */
  warnings: Annotation<string[]>({
    reducer: append,
    default: () => [],
  }),

  /** Accumulated errors (append reducer) */
  errors: Annotation<string[]>({
    reducer: append,
    default: () => [],
  }),

  /** Feedback from review/QA on retry — null on first attempt */
  retryFeedback: Annotation<RetryFeedback | null>({
    reducer: overwrite,
    default: () => null,
  }),
})

/** TypeScript type for dev-implement v2 state */
export type DevImplementV2State = typeof DevImplementV2StateAnnotation.State

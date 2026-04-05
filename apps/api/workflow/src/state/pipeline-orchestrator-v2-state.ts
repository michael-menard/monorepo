/**
 * Pipeline Orchestrator V2 Graph State
 *
 * Top-level state annotation for the pipeline orchestrator graph.
 * Coordinates the full story lifecycle: pick story -> worktree -> dev ->
 * review -> QA -> merge -> cleanup, looping until all stories are done.
 *
 * Uses LangGraph Annotation.Root with append reducers for accumulating
 * results across the story loop.
 */

import { z } from 'zod'
import { Annotation } from '@langchain/langgraph'

// ============================================================================
// Pipeline Phase Enum
// ============================================================================

export const PipelinePhaseSchema = z.enum([
  'preflight',
  'routing',
  'plan_refinement',
  'story_generation',
  'story_picking',
  'phase_routing',
  'worktree_setup',
  'dev_implement',
  'commit_push',
  'review',
  'review_decision',
  'create_pr',
  'qa_verify',
  'qa_decision',
  'merge_cleanup',
  'post_completion',
  'block_story',
  'pipeline_complete',
  'pipeline_stalled',
])

export type PipelinePhase = z.infer<typeof PipelinePhaseSchema>

// ============================================================================
// Input Mode
// ============================================================================

export const InputModeSchema = z.enum(['plan', 'story'])

export type InputMode = z.infer<typeof InputModeSchema>

// ============================================================================
// Story Picker Result
// ============================================================================

export const StoryPickerSignalSchema = z.enum([
  'story_ready',
  'pipeline_complete',
  'pipeline_stalled',
])

export type StoryPickerSignal = z.infer<typeof StoryPickerSignalSchema>

export const StoryPickerResultSchema = z.object({
  signal: StoryPickerSignalSchema,
  storyId: z.string().nullable().default(null),
  reason: z.string().default(''),
})

export type StoryPickerResult = z.infer<typeof StoryPickerResultSchema>

// ============================================================================
// Dev / Review / QA Result Schemas
// ============================================================================

export const DevResultSchema = z.object({
  verdict: z.enum(['complete', 'stuck']),
  errors: z.array(z.string()).default([]),
})

export type DevResult = z.infer<typeof DevResultSchema>

export const ReviewResultSchema = z.object({
  verdict: z.enum(['pass', 'fail', 'block']),
  findings: z.array(z.any()).default([]),
})

export type ReviewResult = z.infer<typeof ReviewResultSchema>

export const QAResultSchema = z.object({
  verdict: z.enum(['pass', 'fail', 'block']),
  failures: z.array(z.any()).default([]),
})

export type QAResult = z.infer<typeof QAResultSchema>

// ============================================================================
// Retry Context
// ============================================================================

export const RetryContextSchema = z.object({
  reviewAttempts: z.number().int().min(0).default(0),
  qaAttempts: z.number().int().min(0).default(0),
  maxReviewRetries: z.number().int().min(0).default(2),
  maxQaRetries: z.number().int().min(0).default(2),
  lastFailureReason: z.string().default(''),
})

export type RetryContext = z.infer<typeof RetryContextSchema>

// ============================================================================
// Model Config
// ============================================================================

// Re-export from canonical config — single source of truth for model assignments
// To change models, edit: src/config/model-config.ts
export { ModelConfigSchema, type ModelConfig } from '../config/model-config.js'
import { ModelConfigSchema } from '../config/model-config.js'

// ============================================================================
// Resume Phase
// ============================================================================

export const ResumePhaseSchema = z.enum(['dev_implement', 'review', 'qa_verify'])

export type ResumePhase = z.infer<typeof ResumePhaseSchema>

// ============================================================================
// State Annotation
// ============================================================================

/** Overwrite reducer for most fields */
const overwrite = <T>(_: T, b: T): T => b

/** Append reducer for arrays */
const append = <T>(current: T[], update: T[]): T[] => [...current, ...update]

/**
 * PipelineOrchestratorV2StateAnnotation
 *
 * Top-level state for the pipeline orchestrator V2 graph.
 * Manages the full story lifecycle loop.
 */
export const PipelineOrchestratorV2StateAnnotation = Annotation.Root({
  /** Whether input starts from a plan or a story list */
  inputMode: Annotation<InputMode>({
    reducer: overwrite,
    default: () => 'story' as InputMode,
  }),

  /** Plan slug when inputMode is 'plan' */
  planSlug: Annotation<string | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Refined plan data from plan_refinement subgraph */
  refinedPlan: Annotation<Record<string, unknown> | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Plan flows extracted during refinement */
  planFlows: Annotation<Record<string, unknown>[]>({
    reducer: overwrite,
    default: () => [],
  }),

  /** Postcondition result from plan refinement */
  planPostconditionResult: Annotation<Record<string, unknown> | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Currently active story ID */
  currentStoryId: Annotation<string | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Path to the active worktree for the current story */
  worktreePath: Annotation<string | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Git branch for the current story */
  branch: Annotation<string | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Current pipeline phase */
  pipelinePhase: Annotation<PipelinePhase>({
    reducer: overwrite,
    default: () => 'preflight' as PipelinePhase,
  }),

  /** Result from the story picker node */
  storyPickerResult: Annotation<StoryPickerResult | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Result from dev implementation subgraph */
  devResult: Annotation<DevResult | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Result from review subgraph */
  reviewResult: Annotation<ReviewResult | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Result from QA verification subgraph */
  qaResult: Annotation<QAResult | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Retry tracking for the current story */
  retryContext: Annotation<RetryContext | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Model configuration for LLM tier selection */
  modelConfig: Annotation<ModelConfig>({
    reducer: overwrite,
    default: () => ModelConfigSchema.parse({}),
  }),

  /** Story IDs that have been completed (append reducer) */
  completedStories: Annotation<string[]>({
    reducer: append,
    default: () => [],
  }),

  /** Story IDs that are blocked (append reducer) */
  blockedStories: Annotation<string[]>({
    reducer: append,
    default: () => [],
  }),

  /** Accumulated errors across pipeline execution (append reducer) */
  errors: Annotation<string[]>({
    reducer: append,
    default: () => [],
  }),

  /** Whether Ollama is available (set by preflight) */
  ollamaAvailable: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  /** Story IDs available for processing */
  storyIds: Annotation<string[]>({
    reducer: overwrite,
    default: () => [],
  }),

  /** Phase to resume from after phase_router determines story state */
  resumePhase: Annotation<ResumePhase | null>({
    reducer: overwrite,
    default: () => null,
  }),
})

/** TypeScript type for pipeline orchestrator V2 state */
export type PipelineOrchestratorV2State = typeof PipelineOrchestratorV2StateAnnotation.State

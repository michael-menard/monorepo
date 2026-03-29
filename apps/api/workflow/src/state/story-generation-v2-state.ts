/**
 * Story Generation V2 Graph State
 *
 * Standalone state annotation for the story-generation-v2 agentic LangGraph.
 * This is the v2 bake-off version — adds per-flow codebase scouting, agentic
 * story slicing, high-specificity enrichment, and agentic dependency wiring.
 *
 * Key additions over v1:
 *   - flowScoutResults: per-flow codebase research before any LLM work
 *   - enrichedStories: stories with file refs, function names, impl hints
 *   - tokenUsage: tracked per LLM-calling node (append reducer)
 *   - bakeOffVersion: 'v2-agentic' tag for comparison
 */

import { z } from 'zod'
import { Annotation } from '@langchain/langgraph'
import type { NormalizedPlan, Flow } from './plan-refinement-state.js'
import { GeneratedStorySchema } from './story-generation-state.js'

// ============================================================================
// FlowScoutResult Schema
// ============================================================================

/**
 * Produced by the flow_codebase_scout node for each flow.
 * Captures relevant files and patterns before any LLM reasoning begins.
 */
export const FlowScoutResultSchema = z.object({
  /** The flow id this scout result belongs to */
  flowId: z.string(),
  /** File paths likely touched by this flow */
  relevantFiles: z.array(z.string()).default([]),
  /** Existing functions to call or extend */
  relevantFunctions: z
    .array(
      z.object({
        file: z.string(),
        name: z.string(),
        signature: z.string().optional(),
      }),
    )
    .default([]),
  /** Patterns already in use (naming, error handling, etc.) */
  existingPatterns: z.array(z.string()).default([]),
  /** Things that already exist in the codebase */
  alreadyExists: z.array(z.string()).default([]),
  /** Things that need to be created */
  needsCreation: z.array(z.string()).default([]),
})

export type FlowScoutResult = z.infer<typeof FlowScoutResultSchema>

// ============================================================================
// EnrichedStory Schema
// ============================================================================

/**
 * Extends GeneratedStory with implementation context.
 * Produced by the story_enricher_agent node.
 */
export const EnrichedStorySchema = GeneratedStorySchema.extend({
  /** File paths relevant to implementing this story */
  relevantFiles: z.array(z.string()).default([]),
  /** Functions in "file.ts: functionName()" format */
  relevantFunctions: z.array(z.string()).default([]),
  /** Patterns to follow, gotchas, implementation notes */
  implementationHints: z.array(z.string()).default([]),
  /** Scope boundary for this story */
  scopeBoundary: z
    .object({
      inScope: z.array(z.string()).default([]),
      outOfScope: z.array(z.string()).default([]),
    })
    .default({ inScope: [], outOfScope: [] }),
  /** Traceability from AC index to flow step reference */
  acFlowTraceability: z
    .array(
      z.object({
        /** Index into acceptance_criteria[] */
        acIndex: z.number().int().min(0),
        /** e.g. "flow-1/step-2" */
        flowStepRef: z.string(),
      }),
    )
    .default([]),
  /** Whether this story passed enrichment postconditions */
  postconditionsPassed: z.boolean().default(false),
  /** What failed during enrichment postcondition check (for retry feedback) */
  enrichmentFailures: z.array(z.string()).default([]),
})

export type EnrichedStory = z.infer<typeof EnrichedStorySchema>

// ============================================================================
// StoryPostconditionResult Schema
// ============================================================================

/**
 * Result of the per-story postcondition check in story_enricher_agent.
 */
export const StoryPostconditionResultSchema = z.object({
  storyTitle: z.string(),
  passed: z.boolean(),
  failures: z
    .array(
      z.object({
        check: z.string(),
        reason: z.string(),
      }),
    )
    .default([]),
})

export type StoryPostconditionResult = z.infer<typeof StoryPostconditionResultSchema>

// ============================================================================
// GenerationV2Phase Enum
// ============================================================================

export const GenerationV2PhaseSchema = z.enum([
  'load_plan',
  'flow_codebase_scout',
  'story_slicer',
  'story_enricher',
  'dependency_wirer',
  'validation',
  'write_to_kb',
  'complete',
  'error',
])

export type GenerationV2Phase = z.infer<typeof GenerationV2PhaseSchema>

// ============================================================================
// TokenUsage Schema
// ============================================================================

/**
 * Token usage record for a single LLM call.
 * Appended to state.tokenUsage by each agentic node.
 */
export const TokenUsageSchema = z.object({
  inputTokens: z.number().int().min(0).default(0),
  outputTokens: z.number().int().min(0).default(0),
  nodeId: z.string(),
})

export type TokenUsage = z.infer<typeof TokenUsageSchema>

// ============================================================================
// DependencyEdge Schema (same shape as v1 for compatibility)
// ============================================================================

export const DependencyEdgeV2Schema = z.object({
  from: z.string(),
  to: z.string(),
  type: z.string(),
})

export type DependencyEdgeV2 = z.infer<typeof DependencyEdgeV2Schema>

// ============================================================================
// ValidationResult Schema
// ============================================================================

export const ValidationResultV2Schema = z.object({
  passed: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
})

export type ValidationResultV2 = z.infer<typeof ValidationResultV2Schema>

// ============================================================================
// WriteResult Schema
// ============================================================================

export const WriteResultV2Schema = z.object({
  storiesWritten: z.number().int().min(0),
  storiesFailed: z.number().int().min(0),
  errors: z.array(z.string()),
})

export type WriteResultV2 = z.infer<typeof WriteResultV2Schema>

// ============================================================================
// State Annotation
// ============================================================================

/** Overwrite reducer for most fields */
const overwrite = <T>(_: T, b: T): T => b

/** Append reducer for arrays */
const append = <T>(current: T[], update: T[]): T[] => [...current, ...update]

/**
 * StoryGenerationV2StateAnnotation
 *
 * Standalone state for the story-generation-v2 agentic LangGraph.
 * Plan-centric (planSlug), not story-centric (storyId).
 */
export const StoryGenerationV2StateAnnotation = Annotation.Root({
  /** Plan slug (primary identifier) */
  planSlug: Annotation<string>(),

  /** Refined/normalized plan loaded from KB */
  refinedPlan: Annotation<NormalizedPlan | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Confirmed flows extracted from the refined plan */
  flows: Annotation<Flow[]>({
    reducer: overwrite,
    default: () => [],
  }),

  /** Per-flow codebase scout results (one per flow, append reducer) */
  flowScoutResults: Annotation<FlowScoutResult[]>({
    reducer: append,
    default: () => [],
  }),

  /** Story outlines from slicer — before enrichment */
  storyOutlines: Annotation<import('./story-generation-state.js').GeneratedStory[]>({
    reducer: overwrite,
    default: () => [],
  }),

  /** Enriched stories with implementation context */
  enrichedStories: Annotation<EnrichedStory[]>({
    reducer: overwrite,
    default: () => [],
  }),

  /** Dependency edges between stories */
  dependencyEdges: Annotation<DependencyEdgeV2[]>({
    reducer: overwrite,
    default: () => [],
  }),

  /** Parallel execution groups (each inner array can run in parallel) */
  parallelGroups: Annotation<string[][]>({
    reducer: overwrite,
    default: () => [],
  }),

  /** Stories in execution order: minimum-path first, then topological order */
  orderedStories: Annotation<EnrichedStory[]>({
    reducer: overwrite,
    default: () => [],
  }),

  /** Validation result from validation node */
  validationResult: Annotation<ValidationResultV2 | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Result from writing stories to KB */
  writeResult: Annotation<WriteResultV2 | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Current generation phase */
  generationV2Phase: Annotation<GenerationV2Phase>({
    reducer: overwrite,
    default: () => 'load_plan',
  }),

  /** Enricher retry count (incremented when stories fail postconditions) */
  enricherRetryCount: Annotation<number>({
    reducer: overwrite,
    default: () => 0,
  }),

  /** Maximum enricher retries before proceeding anyway */
  maxEnricherRetries: Annotation<number>({
    reducer: overwrite,
    default: () => 2,
  }),

  /** Token usage records — one per LLM-calling node (append reducer) */
  tokenUsage: Annotation<TokenUsage[]>({
    reducer: append,
    default: () => [],
  }),

  /** Bake-off version tag for comparison with v1 */
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
})

/** TypeScript type for story generation v2 state */
export type StoryGenerationV2State = typeof StoryGenerationV2StateAnnotation.State

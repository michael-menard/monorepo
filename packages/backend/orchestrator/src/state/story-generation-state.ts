/**
 * Story Generation Graph State
 *
 * Standalone state annotation for the story-generation LangGraph.
 * Uses Annotation.Root (not extending GraphState) because story-generation
 * is plan-centric (planSlug), not story-centric (storyId).
 *
 * APRS-4010: ST-1
 * APRS-4020: ST-1 (extended with dependency wiring + validation state)
 */

import { z } from 'zod'
import { Annotation } from '@langchain/langgraph'
import type { NormalizedPlan, Flow } from './plan-refinement-state.js'

// ============================================================================
// SlicedFlow Schema
// ============================================================================

/**
 * A sliced portion of a flow — represents a bounded unit of implementable work.
 * AC-2: flow_id, step_indices, scope_description
 */
export const SlicedFlowSchema = z.object({
  /** Reference to the parent flow id */
  flow_id: z.string().min(1),
  /** Indices of steps (1-based) included in this slice */
  step_indices: z.array(z.number().int().positive()),
  /** Human-readable description of what this slice covers */
  scope_description: z.string().min(1),
})

export type SlicedFlow = z.infer<typeof SlicedFlowSchema>

// ============================================================================
// GeneratedStory Schema
// ============================================================================

/**
 * A story generated from a sliced flow.
 * AC-2: title, description, acceptance_criteria[], subtasks[], tags[], risk,
 *       minimum_path (default false), parent_plan_slug, parent_flow_id, flow_step_reference
 */
export const GeneratedStorySchema = z.object({
  /** Story title */
  title: z.string().min(1),
  /** Story description */
  description: z.string().min(1),
  /** Acceptance criteria */
  acceptance_criteria: z.array(z.string()),
  /** Implementation subtasks */
  subtasks: z.array(z.string()),
  /** Categorization tags */
  tags: z.array(z.string()),
  /** Risk level */
  risk: z.enum(['low', 'medium', 'high']),
  /** Whether this is on the minimum path (MVP) */
  minimum_path: z.boolean().default(false),
  /** Parent plan slug */
  parent_plan_slug: z.string().min(1),
  /** Parent flow id */
  parent_flow_id: z.string().min(1),
  /** Reference to the flow step(s) this story covers */
  flow_step_reference: z.string().min(1),
})

export type GeneratedStory = z.infer<typeof GeneratedStorySchema>

// ============================================================================
// GenerationPhase Enum
// ============================================================================

export const GenerationPhaseSchema = z.enum([
  'load_plan',
  'slice_flows',
  'generate_stories',
  'wire_dependencies',
  'validate_graph',
  'complete',
  'error',
])

export type GenerationPhase = z.infer<typeof GenerationPhaseSchema>

// ============================================================================
// Dependency Edge Schema (APRS-4020: ST-1)
// ============================================================================

/**
 * A directed dependency edge between two stories.
 * ARCH-001: composite key title|flow_id used as edge identifiers.
 */
export const DependencyEdgeSchema = z.object({
  /** Composite key of the source story: "title|flow_id" */
  from: z.string(),
  /** Composite key of the target story: "title|flow_id" */
  to: z.string(),
  /** Edge type (e.g. 'flow_order', 'cross_flow') */
  type: z.string(),
})

export type DependencyEdge = z.infer<typeof DependencyEdgeSchema>

// ============================================================================
// ValidationResult Schema (APRS-4020: ST-1)
// ============================================================================

/**
 * Result from graph validation.
 */
export const ValidationResultSchema = z.object({
  passed: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
})

export type ValidationResult = z.infer<typeof ValidationResultSchema>

// ============================================================================
// State Annotation
// ============================================================================

/** Overwrite reducer for most fields */
const overwrite = <T>(_: T, b: T): T => b

/**
 * StoryGenerationStateAnnotation
 *
 * Standalone state for the story-generation LangGraph.
 * Separate from GraphState — plan-centric, not story-centric.
 */
export const StoryGenerationStateAnnotation = Annotation.Root({
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

  /** Sliced flows — output of slice_flows node */
  slicedFlows: Annotation<SlicedFlow[]>({
    reducer: overwrite,
    default: () => [],
  }),

  /** Generated stories — output of generate_stories node */
  generatedStories: Annotation<GeneratedStory[]>({
    reducer: overwrite,
    default: () => [],
  }),

  /** Dependency edges inferred between stories — output of wire_dependencies node */
  dependencyEdges: Annotation<DependencyEdge[]>({
    reducer: overwrite,
    default: () => [],
  }),

  /** Parallel groups computed from topological layer partitioning */
  parallelGroups: Annotation<string[][]>({
    reducer: overwrite,
    default: () => [],
  }),

  /** Stories ordered: minimum-path first, then topological order */
  orderedStories: Annotation<GeneratedStory[]>({
    reducer: overwrite,
    default: () => [],
  }),

  /** Validation result from validate_graph node */
  validationResult: Annotation<ValidationResult | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Stories with dependency info attached (alias for ordered stories with dep context) */
  generatedStoriesWithDeps: Annotation<GeneratedStory[]>({
    reducer: overwrite,
    default: () => [],
  }),

  /** Current generation phase */
  generationPhase: Annotation<GenerationPhase>({
    reducer: overwrite,
    default: () => 'load_plan',
  }),

  /** Accumulated errors (append reducer) */
  errors: Annotation<string[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),

  /** Accumulated warnings (append reducer) */
  warnings: Annotation<string[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
})

/** TypeScript type for story generation state */
export type StoryGenerationState = typeof StoryGenerationStateAnnotation.State

/**
 * Story Generation Graph State
 *
 * Standalone state annotation for the story-generation LangGraph.
 * Uses Annotation.Root (not extending GraphState) because story-generation
 * is plan-centric (planSlug), not story-centric (storyId).
 *
 * Separate from PlanRefinementStateAnnotation per DEC-1.
 *
 * APRS-4010: ST-1, AC-1, AC-2
 */

import { z } from 'zod'
import { Annotation } from '@langchain/langgraph'
import type { NormalizedPlan, Flow } from './plan-refinement-state.js'

// ============================================================================
// Generation Phase Enum
// ============================================================================

export const GenerationPhaseSchema = z.enum([
  'load_plan',
  'slice_flows',
  'generate_stories',
  'complete',
  'error',
])

export type GenerationPhase = z.infer<typeof GenerationPhaseSchema>

// ============================================================================
// Sliced Flow Schema
// ============================================================================

/**
 * A sliced portion of a flow, representing one story's worth of work.
 * AC-4: flow_id, step_indices, scope_description.
 */
export const SlicedFlowSchema = z.object({
  /** ID of the parent flow */
  flow_id: z.string().min(1),
  /** Indices of flow steps included in this slice (1-based) */
  step_indices: z.array(z.number().int().positive()),
  /** Human-readable description of what this slice covers */
  scope_description: z.string().min(1),
})

export type SlicedFlow = z.infer<typeof SlicedFlowSchema>

// ============================================================================
// Subtask Schema
// ============================================================================

export const SubtaskSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  files: z.array(z.string()).default([]),
  verification: z.string().default(''),
})

export type Subtask = z.infer<typeof SubtaskSchema>

// ============================================================================
// Generated Story Schema
// ============================================================================

/**
 * AC-2: GeneratedStorySchema with fields compatible with kb_create_story.
 */
export const GeneratedStorySchema = z.object({
  /** Story title (template-derived) */
  title: z.string().min(1),
  /** Story description (LLM-generated) */
  description: z.string().default(''),
  /** Acceptance criteria (LLM-generated) */
  acceptance_criteria: z.array(z.string()).default([]),
  /** Subtasks with files and verification */
  subtasks: z.array(SubtaskSchema).default([]),
  /** Tags (template-derived from plan + flow) */
  tags: z.array(z.string()).default([]),
  /** Risk assessment (LLM-generated) */
  risk: z.string().default(''),
  /** Whether this story is on the minimum viable path (default false, set by APRS-4020) */
  minimum_path: z.boolean().default(false),
  /** Slug of the parent plan */
  parent_plan_slug: z.string().min(1),
  /** ID of the parent flow */
  parent_flow_id: z.string().min(1),
  /** Reference to the flow step(s) this story covers */
  flow_step_reference: z.string().default(''),
})

export type GeneratedStory = z.infer<typeof GeneratedStorySchema>

// ============================================================================
// State Annotation
// ============================================================================

/** Overwrite reducer for most fields */
const overwrite = <T>(_: T, b: T): T => b

/**
 * StoryGenerationStateAnnotation
 *
 * AC-1: planSlug, refinedPlan, flows, slicedFlows, generatedStories,
 *       generationPhase, errors, warnings.
 */
export const StoryGenerationStateAnnotation = Annotation.Root({
  /** Plan slug (primary identifier) */
  planSlug: Annotation<string>(),

  /** Refined plan loaded from KB */
  refinedPlan: Annotation<NormalizedPlan | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Flows extracted from the refined plan (confirmed only) */
  flows: Annotation<Flow[]>({
    reducer: overwrite,
    default: () => [],
  }),

  /** Sliced flows ready for story generation */
  slicedFlows: Annotation<SlicedFlow[]>({
    reducer: overwrite,
    default: () => [],
  }),

  /** Generated stories output */
  generatedStories: Annotation<GeneratedStory[]>({
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

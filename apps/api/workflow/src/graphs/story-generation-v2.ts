/**
 * Story Generation V2 Graph
 *
 * Agentic pipeline for high-specificity story generation.
 * Composes: load_plan → flow_codebase_scout → story_slicer_agent
 *         → story_enricher_agent (with retry loop)
 *         → dependency_wirer_agent → validation_node → write_to_kb_v2 → END
 *
 * Key differences from v1:
 *   - flow_codebase_scout: deterministic per-flow codebase research before LLM work
 *   - story_slicer_agent: LLM-driven slice boundary decisions
 *   - story_enricher_agent: enriches with file refs, function names, impl hints + postconditions
 *   - dependency_wirer_agent: LLM detects cross-flow dependencies from story scopes
 *   - validation_node: deterministic postconditions on full story set
 *
 * Retry loop: story_enricher_agent → story_enricher_agent when stories fail postconditions
 *             (up to maxEnricherRetries).
 *
 * bakeOffVersion: 'v2-agentic'
 */

import { z } from 'zod'
import { StateGraph, START, END } from '@langchain/langgraph'
import {
  StoryGenerationV2StateAnnotation,
  type StoryGenerationV2State,
} from '../state/story-generation-v2-state.js'
import { createLoadPlanNode, type PlanLoaderFn } from '../nodes/story-generation-v2/load-plan.js'
import {
  createFlowCodebaseScoutNode,
  type SearchCodebaseFn,
  type ReadFileSummaryFn,
} from '../nodes/story-generation-v2/flow-codebase-scout.js'
import {
  createStorySlicerAgentNode,
  type SlicerLlmAdapterFn,
} from '../nodes/story-generation-v2/story-slicer-agent.js'
import {
  createStoryEnricherAgentNode,
  type EnricherLlmAdapterFn,
} from '../nodes/story-generation-v2/story-enricher-agent.js'
import {
  createDependencyWirerAgentNode,
  type DependencyWirerLlmAdapterFn,
} from '../nodes/story-generation-v2/dependency-wirer-agent.js'
import { createValidationNode } from '../nodes/story-generation-v2/validation-node.js'
import {
  createWriteToKbV2Node,
  type KbWriterFn,
  type TokenLoggerFn,
  type StoryIdGeneratorFn,
} from '../nodes/story-generation-v2/write-to-kb.js'

// ============================================================================
// Config Schema
// ============================================================================

export const StoryGenerationV2GraphConfigSchema = z.object({
  planLoader: z.function().optional(),
  searchCodebase: z.function().optional(),
  readFileSummary: z.function().optional(),
  slicerLlmAdapter: z.function().optional(),
  enricherLlmAdapter: z.function().optional(),
  dependencyWirerLlmAdapter: z.function().optional(),
  kbWriter: z.function().optional(),
  tokenLogger: z.function().optional(),
  storyIdGenerator: z.function().optional(),
  maxStoriesPerFlow: z.number().int().positive().optional(),
})

export type StoryGenerationV2GraphConfig = z.infer<typeof StoryGenerationV2GraphConfigSchema>

// ============================================================================
// Conditional Edge Functions
// ============================================================================

/**
 * After load_plan: proceed to flow_codebase_scout or END on error.
 */
function afterLoadPlan(state: StoryGenerationV2State): 'flow_codebase_scout' | '__end__' {
  if (state.generationV2Phase === 'error') {
    return '__end__'
  }
  return 'flow_codebase_scout'
}

/**
 * After flow_codebase_scout: proceed to story_slicer or END on error.
 */
function afterFlowCodebaseScout(state: StoryGenerationV2State): 'story_slicer' | '__end__' {
  if (state.generationV2Phase === 'error') {
    return '__end__'
  }
  return 'story_slicer'
}

/**
 * After story_slicer: proceed to story_enricher or END on error.
 */
function afterStorySlicer(state: StoryGenerationV2State): 'story_enricher' | '__end__' {
  if (state.generationV2Phase === 'error') {
    return '__end__'
  }
  return 'story_enricher'
}

/**
 * After story_enricher: retry loop, advance, or END on error.
 *
 * - 'story_enricher' if phase === 'story_enricher' (stories failed postconditions)
 * - 'dependency_wirer' if phase === 'dependency_wirer'
 * - '__end__' if phase === 'error'
 */
function afterStoryEnricher(
  state: StoryGenerationV2State,
): 'story_enricher' | 'dependency_wirer' | '__end__' {
  if (state.generationV2Phase === 'error') {
    return '__end__'
  }
  if (state.generationV2Phase === 'story_enricher') {
    return 'story_enricher'
  }
  return 'dependency_wirer'
}

/**
 * After dependency_wirer: proceed to validation or END on error.
 */
function afterDependencyWirer(state: StoryGenerationV2State): 'validation' | '__end__' {
  if (state.generationV2Phase === 'error') {
    return '__end__'
  }
  return 'validation'
}

/**
 * After validation: proceed to write_to_kb or END on error.
 */
function afterValidation(state: StoryGenerationV2State): 'write_to_kb' | '__end__' {
  if (state.generationV2Phase === 'error') {
    return '__end__'
  }
  return 'write_to_kb'
}

// ============================================================================
// Graph Factory
// ============================================================================

/**
 * Creates and compiles the story-generation-v2 graph.
 *
 * Graph:
 *   START → load_plan → flow_codebase_scout → story_slicer
 *         → story_enricher [↺ retry loop]
 *         → dependency_wirer → validation → write_to_kb → END
 *
 * Injectable adapters for all LLM calls and KB operations.
 * bakeOffVersion defaults to 'v2-agentic' via state annotation default.
 *
 * @param config - Optional config with injectable adapters
 */
export function createStoryGenerationV2Graph(
  config: {
    planLoader?: PlanLoaderFn
    searchCodebase?: SearchCodebaseFn
    readFileSummary?: ReadFileSummaryFn
    slicerLlmAdapter?: SlicerLlmAdapterFn
    enricherLlmAdapter?: EnricherLlmAdapterFn
    dependencyWirerLlmAdapter?: DependencyWirerLlmAdapterFn
    kbWriter?: KbWriterFn
    tokenLogger?: TokenLoggerFn
    storyIdGenerator?: StoryIdGeneratorFn
    maxStoriesPerFlow?: number
  } = {},
) {
  const graph = new StateGraph(StoryGenerationV2StateAnnotation)
    .addNode('load_plan', createLoadPlanNode({ planLoader: config.planLoader }))
    .addNode(
      'flow_codebase_scout',
      createFlowCodebaseScoutNode({
        searchCodebase: config.searchCodebase,
        readFileSummary: config.readFileSummary,
      }),
    )
    .addNode(
      'story_slicer',
      createStorySlicerAgentNode({
        llmAdapter: config.slicerLlmAdapter,
        maxStoriesPerFlow: config.maxStoriesPerFlow,
      }),
    )
    .addNode(
      'story_enricher',
      createStoryEnricherAgentNode({
        llmAdapter: config.enricherLlmAdapter,
      }),
    )
    .addNode(
      'dependency_wirer',
      createDependencyWirerAgentNode({
        llmAdapter: config.dependencyWirerLlmAdapter,
      }),
    )
    .addNode('validation', createValidationNode())
    .addNode(
      'write_to_kb',
      createWriteToKbV2Node({
        kbWriter: config.kbWriter,
        tokenLogger: config.tokenLogger,
        storyIdGenerator: config.storyIdGenerator,
      }),
    )

    // START → load_plan
    .addEdge(START, 'load_plan')

    // load_plan → flow_codebase_scout | END
    .addConditionalEdges('load_plan', afterLoadPlan, {
      flow_codebase_scout: 'flow_codebase_scout',
      __end__: END,
    })

    // flow_codebase_scout → story_slicer | END
    .addConditionalEdges('flow_codebase_scout', afterFlowCodebaseScout, {
      story_slicer: 'story_slicer',
      __end__: END,
    })

    // story_slicer → story_enricher | END
    .addConditionalEdges('story_slicer', afterStorySlicer, {
      story_enricher: 'story_enricher',
      __end__: END,
    })

    // story_enricher → story_enricher (retry) | dependency_wirer | END
    .addConditionalEdges('story_enricher', afterStoryEnricher, {
      story_enricher: 'story_enricher',
      dependency_wirer: 'dependency_wirer',
      __end__: END,
    })

    // dependency_wirer → validation | END
    .addConditionalEdges('dependency_wirer', afterDependencyWirer, {
      validation: 'validation',
      __end__: END,
    })

    // validation → write_to_kb | END
    .addConditionalEdges('validation', afterValidation, {
      write_to_kb: 'write_to_kb',
      __end__: END,
    })

    // write_to_kb → END
    .addEdge('write_to_kb', END)

  return graph.compile()
}

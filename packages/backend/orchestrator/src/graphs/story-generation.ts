/**
 * Story Generation Graph
 *
 * Composes load_refined_plan, slice_flows, generate_stories, wire_dependencies,
 * validate_graph, and write_to_kb nodes into a LangGraph StateGraph.
 *
 * Graph structure:
 *   START → load_refined_plan → slice_flows → generate_stories
 *         → wire_dependencies → validate_graph → write_to_kb → END
 *   Conditional edges: error → END at each step
 *
 * APRS-4010: ST-5
 * APRS-4020: ST-4
 * APRS-4030: ST-4 (AC-6: added write_to_kb node)
 */

import { z } from 'zod'
import { StateGraph, START, END } from '@langchain/langgraph'
import {
  StoryGenerationStateAnnotation,
  type StoryGenerationState,
} from '../state/story-generation-state.js'
import {
  createLoadRefinedPlanNode,
  type PlanLoaderFn,
} from '../nodes/story-generation/load-refined-plan.js'
import { createSliceFlowsNode } from '../nodes/story-generation/slice-flows.js'
import {
  createGenerateStoriesNode,
  type LlmAdapterFn,
} from '../nodes/story-generation/generate-stories.js'
import {
  createWireDependenciesNode,
  type MinimumPathFn,
} from '../nodes/story-generation/wire-dependencies.js'
import {
  createValidateGraphNode,
  type GraphValidatorFn,
} from '../nodes/story-generation/validate-graph.js'
import {
  createWriteToKbNode,
  type KbWriterFn,
  type StoryIdGeneratorFn,
} from '../nodes/story-generation/write-to-kb.js'

// ============================================================================
// Config Schema
// ============================================================================

export const StoryGenerationGraphConfigSchema = z.object({
  /** Injectable plan-loader adapter for load_refined_plan */
  planLoader: z.function().optional(),
  /** Injectable LLM adapter for generate_stories */
  llmAdapter: z.function().optional(),
  /** Injectable graph validator adapter for validate_graph */
  graphValidator: z.function().optional(),
  /** Injectable KB writer adapter for write_to_kb */
  kbWriter: z.function().optional(),
})

export type StoryGenerationGraphConfig = z.infer<typeof StoryGenerationGraphConfigSchema>

// ============================================================================
// Conditional Edge Functions
// ============================================================================

/**
 * Routes after load_refined_plan: proceed to slice_flows or END on error.
 */
function afterLoadRefinedPlan(state: StoryGenerationState): 'slice_flows' | '__end__' {
  if (state.generationPhase === 'error') {
    return '__end__'
  }
  return 'slice_flows'
}

/**
 * Routes after slice_flows: proceed to generate_stories or END on error.
 */
function afterSliceFlows(state: StoryGenerationState): 'generate_stories' | '__end__' {
  if (state.generationPhase === 'error') {
    return '__end__'
  }
  return 'generate_stories'
}

/**
 * Routes after generate_stories: proceed to wire_dependencies or END on error.
 */
function afterGenerateStories(state: StoryGenerationState): 'wire_dependencies' | '__end__' {
  if (state.generationPhase === 'error') {
    return '__end__'
  }
  return 'wire_dependencies'
}

/**
 * Routes after wire_dependencies: proceed to validate_graph or END on error.
 */
function afterWireDependencies(state: StoryGenerationState): 'validate_graph' | '__end__' {
  if (state.generationPhase === 'error') {
    return '__end__'
  }
  return 'validate_graph'
}

/**
 * Routes after validate_graph: proceed to write_to_kb or END on error.
 */
function afterValidateGraph(state: StoryGenerationState): 'write_to_kb' | '__end__' {
  if (state.generationPhase === 'error') {
    return '__end__'
  }
  return 'write_to_kb'
}

// ============================================================================
// Graph Factory
// ============================================================================

/**
 * Creates and compiles the story-generation graph.
 *
 * Graph: START→load_refined_plan→slice_flows→generate_stories
 *        →wire_dependencies→validate_graph→write_to_kb→END
 * Injectable adapters: planLoader, llmAdapter, graphValidator, kbWriter.
 *
 * @param config - Optional configuration with injectable adapters
 * @returns Compiled StateGraph
 */
export function createStoryGenerationGraph(
  config: {
    planLoader?: PlanLoaderFn
    llmAdapter?: LlmAdapterFn
    minimumPathFn?: MinimumPathFn
    graphValidator?: GraphValidatorFn
    kbWriter?: KbWriterFn
    storyIdGenerator?: StoryIdGeneratorFn
  } = {},
) {
  const graph = new StateGraph(StoryGenerationStateAnnotation)
    .addNode('load_refined_plan', createLoadRefinedPlanNode({ planLoader: config.planLoader }))
    .addNode('slice_flows', createSliceFlowsNode())
    .addNode('generate_stories', createGenerateStoriesNode({ llmAdapter: config.llmAdapter }))
    .addNode(
      'wire_dependencies',
      createWireDependenciesNode({ minimumPathFn: config.minimumPathFn }),
    )
    .addNode('validate_graph', createValidateGraphNode({ graphValidator: config.graphValidator }))
    .addNode(
      'write_to_kb',
      createWriteToKbNode({
        kbWriter: config.kbWriter,
        storyIdGenerator: config.storyIdGenerator,
      }),
    )

    // START → load_refined_plan
    .addEdge(START, 'load_refined_plan')

    // load_refined_plan → slice_flows | END
    .addConditionalEdges('load_refined_plan', afterLoadRefinedPlan, {
      slice_flows: 'slice_flows',
      __end__: END,
    })

    // slice_flows → generate_stories | END
    .addConditionalEdges('slice_flows', afterSliceFlows, {
      generate_stories: 'generate_stories',
      __end__: END,
    })

    // generate_stories → wire_dependencies | END
    .addConditionalEdges('generate_stories', afterGenerateStories, {
      wire_dependencies: 'wire_dependencies',
      __end__: END,
    })

    // wire_dependencies → validate_graph | END
    .addConditionalEdges('wire_dependencies', afterWireDependencies, {
      validate_graph: 'validate_graph',
      __end__: END,
    })

    // validate_graph → write_to_kb | END
    .addConditionalEdges('validate_graph', afterValidateGraph, {
      write_to_kb: 'write_to_kb',
      __end__: END,
    })

    // write_to_kb → END
    .addEdge('write_to_kb', END)

  return graph.compile()
}

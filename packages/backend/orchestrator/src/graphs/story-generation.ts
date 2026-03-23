/**
 * Story Generation Graph
 *
 * Composes load_refined_plan, slice_flows, and generate_stories nodes
 * into a LangGraph StateGraph.
 *
 * Graph structure (AC-6):
 *   START -> load_refined_plan -> slice_flows -> generate_stories -> END
 *   Each node has conditional edge: error -> END
 *
 * DEC-5: Partial graph — APRS-4020 adds wire_dependencies and validate_graph.
 *        APRS-4030 adds write_to_kb.
 *
 * APRS-4010: ST-5
 */

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

// ============================================================================
// Conditional Edge Functions
// ============================================================================

/**
 * Routes after load_refined_plan: proceed to slice_flows or END on error.
 */
function afterLoadPlan(state: StoryGenerationState): 'slice_flows' | '__end__' {
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
 * Routes after generate_stories: always END (terminal node in this partial graph).
 */
function afterGenerateStories(_state: StoryGenerationState): '__end__' {
  return '__end__'
}

// ============================================================================
// Graph Factory
// ============================================================================

/**
 * Creates and compiles the story-generation graph.
 *
 * AC-6: START→load_refined_plan→slice_flows→generate_stories→END
 * with conditional edges (error→END at each step).
 *
 * @param config - Optional configuration with injectable adapters
 * @returns Compiled StateGraph
 */
export function createStoryGenerationGraph(
  config: {
    planLoader?: PlanLoaderFn
    llmAdapter?: LlmAdapterFn
  } = {},
) {
  const graph = new StateGraph(StoryGenerationStateAnnotation)
    .addNode('load_refined_plan', createLoadRefinedPlanNode({ planLoader: config.planLoader }))
    .addNode('slice_flows', createSliceFlowsNode())
    .addNode('generate_stories', createGenerateStoriesNode({ llmAdapter: config.llmAdapter }))

    // START -> load_refined_plan
    .addEdge(START, 'load_refined_plan')

    // load_refined_plan -> slice_flows | END
    .addConditionalEdges('load_refined_plan', afterLoadPlan, {
      slice_flows: 'slice_flows',
      __end__: END,
    })

    // slice_flows -> generate_stories | END
    .addConditionalEdges('slice_flows', afterSliceFlows, {
      generate_stories: 'generate_stories',
      __end__: END,
    })

    // generate_stories -> END
    .addConditionalEdges('generate_stories', afterGenerateStories, {
      __end__: END,
    })

  return graph.compile()
}

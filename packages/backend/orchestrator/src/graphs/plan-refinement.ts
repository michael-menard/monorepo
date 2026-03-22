/**
 * Plan Refinement Graph
 *
 * Composes normalize_plan and extract_flows nodes into a LangGraph StateGraph.
 * Edge: START -> normalize_plan -> extract_flows -> END
 *
 * APRS-2010: ST-4
 */

import { z } from 'zod'
import { StateGraph, START, END } from '@langchain/langgraph'
import {
  PlanRefinementStateAnnotation,
  type PlanRefinementState,
} from '../state/plan-refinement-state.js'
import { createNormalizePlanNode } from '../nodes/plan-refinement/normalize-plan.js'
import { createExtractFlowsNode } from '../nodes/plan-refinement/extract-flows.js'
import type { PlanLoaderFn } from '../nodes/plan-refinement/normalize-plan.js'
import type { LlmAdapterFn, FlowWriterFn } from '../nodes/plan-refinement/extract-flows.js'

// ============================================================================
// Config Schema
// ============================================================================

export const PlanRefinementGraphConfigSchema = z.object({
  /** Injectable plan-loader adapter for normalize_plan */
  planLoader: z.function().optional(),
  /** Injectable LLM adapter for extract_flows */
  llmAdapter: z.function().optional(),
  /** Injectable flow-writer adapter for extract_flows (defaults to no-op) */
  flowWriter: z.function().optional(),
})

export type PlanRefinementGraphConfig = z.infer<typeof PlanRefinementGraphConfigSchema>

// ============================================================================
// Conditional Edge Functions
// ============================================================================

/**
 * Routes after normalize_plan: proceed to extract_flows or END on error.
 */
function afterNormalize(state: PlanRefinementState): 'extract_flows' | typeof END {
  if (state.refinementPhase === 'error') {
    return END
  }
  return 'extract_flows'
}

// ============================================================================
// Graph Factory
// ============================================================================

/**
 * Creates and compiles the plan-refinement graph.
 *
 * Graph structure:
 *   START -> normalize_plan -> extract_flows -> END
 *
 * @param config - Optional configuration with injectable adapters
 * @returns Compiled StateGraph
 */
export function createPlanRefinementGraph(
  config: {
    planLoader?: PlanLoaderFn
    llmAdapter?: LlmAdapterFn
    flowWriter?: FlowWriterFn
  } = {},
) {
  const graph = new StateGraph(PlanRefinementStateAnnotation)
    .addNode('normalize_plan', createNormalizePlanNode({ planLoader: config.planLoader }))
    .addNode(
      'extract_flows',
      createExtractFlowsNode({
        llmAdapter: config.llmAdapter,
        flowWriter: config.flowWriter,
      }),
    )
    .addEdge(START, 'normalize_plan')
    .addConditionalEdges('normalize_plan', afterNormalize, {
      extract_flows: 'extract_flows',
      __end__: END,
    })
    .addEdge('extract_flows', END)

  return graph.compile()
}

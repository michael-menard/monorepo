/**
 * Plan Refinement V2 Graph
 *
 * Agentic replacement for the v1 plan-refinement pipeline. Uses a single
 * refinement_agent node with a tool belt instead of the fixed
 * coverage_agent → gap_specialists → reconciliation sequence.
 *
 * Graph structure:
 *   START → grounding_scout → feasibility_scan → refinement_agent
 *         → postcondition_gate
 *         → [pass: END | retry: refinement_agent | error: END]
 *
 * Designed for bake-off comparison against v1 (bakeOffVersion: 'v2-agentic').
 */

import { z } from 'zod'
import { StateGraph, START, END } from '@langchain/langgraph'
import {
  PlanRefinementV2StateAnnotation,
  type PlanRefinementV2State,
} from '../state/plan-refinement-v2-state.js'
import {
  createGroundingScoutNode,
  type KbStoriesAdapterFn,
  type KbRelatedPlansAdapterFn,
} from '../nodes/plan-refinement-v2/grounding-scout.js'
import { createFeasibilityScanNode } from '../nodes/plan-refinement-v2/feasibility-scan.js'
import {
  createRefinementAgentNode,
  type LlmAdapterFn,
  type QueryKbFn,
  type SearchCodebaseFn,
  type CallSpecialistFn,
  type FlagForHumanFn,
} from '../nodes/plan-refinement-v2/refinement-agent.js'
import {
  createPostconditionGateNode,
  afterPostconditionGate,
} from '../nodes/plan-refinement-v2/postcondition-gate.js'

// ============================================================================
// Config Schema
// ============================================================================

export const PlanRefinementV2GraphConfigSchema = z.object({
  // grounding_scout adapters
  kbStoriesAdapter: z.function().optional(),
  kbRelatedPlansAdapter: z.function().optional(),
  // refinement_agent adapters
  llmAdapter: z.function().optional(),
  queryKb: z.function().optional(),
  searchCodebase: z.function().optional(),
  callSpecialist: z.function().optional(),
  flagForHuman: z.function().optional(),
  // tunables
  maxRetries: z.number().int().positive().optional(),
  maxInternalIterations: z.number().int().positive().optional(),
  bakeOffVersion: z.string().optional(),
})

export type PlanRefinementV2GraphConfig = {
  // grounding_scout
  kbStoriesAdapter?: KbStoriesAdapterFn
  kbRelatedPlansAdapter?: KbRelatedPlansAdapterFn
  // refinement_agent
  llmAdapter?: LlmAdapterFn
  queryKb?: QueryKbFn
  searchCodebase?: SearchCodebaseFn
  callSpecialist?: CallSpecialistFn
  flagForHuman?: FlagForHumanFn
  // tunables
  maxRetries?: number
  maxInternalIterations?: number
  bakeOffVersion?: string
}

// ============================================================================
// Graph Factory
// ============================================================================

/**
 * Creates and compiles the plan-refinement-v2 agentic graph.
 *
 * All adapters are optional — the graph degrades gracefully with no-op stubs.
 * Inject adapters for integration/production use.
 *
 * @param config - Injectable adapters and tunables
 * @returns Compiled StateGraph
 */
export function createPlanRefinementV2Graph(config: PlanRefinementV2GraphConfig = {}) {
  const graph = new StateGraph(PlanRefinementV2StateAnnotation)
    .addNode(
      'grounding_scout',
      createGroundingScoutNode({
        kbStoriesAdapter: config.kbStoriesAdapter,
        kbRelatedPlansAdapter: config.kbRelatedPlansAdapter,
      }),
    )
    .addNode('feasibility_scan', createFeasibilityScanNode())
    .addNode(
      'refinement_agent',
      createRefinementAgentNode({
        llmAdapter: config.llmAdapter,
        queryKb: config.queryKb,
        searchCodebase: config.searchCodebase,
        callSpecialist: config.callSpecialist,
        flagForHuman: config.flagForHuman,
        maxInternalIterations: config.maxInternalIterations,
      }),
    )
    .addNode('postcondition_gate', createPostconditionGateNode())

    .addEdge(START, 'grounding_scout')
    .addEdge('grounding_scout', 'feasibility_scan')
    .addEdge('feasibility_scan', 'refinement_agent')
    .addEdge('refinement_agent', 'postcondition_gate')
    .addConditionalEdges('postcondition_gate', afterPostconditionGate, {
      refinement_agent: 'refinement_agent',
      complete: END,
      __end__: END,
    })

  return graph.compile()
}

// Re-export conditional edge for testing
export { afterPostconditionGate }

// Re-export state type for consumers
export type { PlanRefinementV2State }

/**
 * Review V2 Graph
 *
 * Agentic replacement for the v1 review pipeline.
 *
 * Graph structure:
 *   START → diff_analyzer → risk_assessor → review_agent → postcondition_gate
 *         → [pass → complete → END | retry → review_agent | verdict_ready → complete → END]
 *
 * bakeOffVersion: 'v2-agentic'
 */

import { z } from 'zod'
import { StateGraph, START, END } from '@langchain/langgraph'
import { ReviewV2StateAnnotation, type ReviewV2State } from '../state/review-v2-state.js'
import { createDiffAnalyzerNode, type DiffReaderFn } from '../nodes/review-v2/diff-analyzer.js'
import {
  createRiskAssessorNode,
  type LlmAdapterFn as RiskLlmAdapterFn,
} from '../nodes/review-v2/risk-assessor.js'
import {
  createReviewAgentNode,
  type LlmAdapterFn as ReviewLlmAdapterFn,
  type ReadFileFn,
  type SearchCodebaseFn,
  type QueryKbFn,
} from '../nodes/review-v2/review-agent.js'
import {
  createReviewPostconditionGateNode,
  afterReviewGate,
} from '../nodes/review-v2/postcondition-gate.js'

// ============================================================================
// Config Schema
// ============================================================================

export const ReviewV2GraphConfigSchema = z.object({
  diffReader: z.function().optional(),
  riskLlmAdapter: z.function().optional(),
  reviewLlmAdapter: z.function().optional(),
  readFile: z.function().optional(),
  searchCodebase: z.function().optional(),
  queryKb: z.function().optional(),
  maxRetries: z.number().int().min(0).optional(),
  bakeOffVersion: z.string().optional(),
})

export type ReviewV2GraphConfig = {
  diffReader?: DiffReaderFn
  riskLlmAdapter?: RiskLlmAdapterFn
  reviewLlmAdapter?: ReviewLlmAdapterFn
  readFile?: ReadFileFn
  searchCodebase?: SearchCodebaseFn
  queryKb?: QueryKbFn
  maxRetries?: number
  bakeOffVersion?: string
}

// ============================================================================
// Graph Factory
// ============================================================================

/**
 * Creates and compiles the review-v2 agentic graph.
 *
 * All adapters are optional — degrades gracefully with no-op stubs.
 *
 * @param config - Injectable adapters and tunables
 * @returns Compiled StateGraph
 */
export function createReviewV2Graph(config: ReviewV2GraphConfig = {}) {
  const graph = new StateGraph(ReviewV2StateAnnotation)
    .addNode(
      'diff_analyzer',
      createDiffAnalyzerNode({
        diffReader: config.diffReader,
      }),
    )
    .addNode(
      'risk_assessor',
      createRiskAssessorNode({
        llmAdapter: config.riskLlmAdapter,
      }),
    )
    .addNode(
      'review_agent',
      createReviewAgentNode({
        llmAdapter: config.reviewLlmAdapter,
        readFile: config.readFile,
        searchCodebase: config.searchCodebase,
        queryKb: config.queryKb,
      }),
    )
    .addNode('postcondition_gate', createReviewPostconditionGateNode())

    .addEdge(START, 'diff_analyzer')
    .addEdge('diff_analyzer', 'risk_assessor')
    .addEdge('risk_assessor', 'review_agent')
    .addEdge('review_agent', 'postcondition_gate')

    // postcondition_gate → complete | review_agent (retry) | END
    .addConditionalEdges('postcondition_gate', afterReviewGate, {
      review_agent: 'review_agent',
      complete: END,
      __end__: END,
    })

  return graph.compile()
}

// Re-export edge function for testing
export { afterReviewGate }

// Re-export state type for consumers
export type { ReviewV2State }

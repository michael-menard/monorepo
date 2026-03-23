/**
 * Plan Refinement Graph
 *
 * Composes normalize_plan, extract_flows, human_review_checkpoint,
 * final_validation, and story_readiness_check nodes into a LangGraph StateGraph.
 *
 * Graph structure (AC-6):
 *   START -> normalize_plan -> extract_flows -> human_review_checkpoint
 *   human_review_checkpoint -> final_validation (approve)
 *   human_review_checkpoint -> gap_coverage (edit) — stubbed to extract_flows (DEC-6)
 *   human_review_checkpoint -> END (reject/defer)
 *   final_validation -> story_readiness_check (pass)
 *   final_validation -> END (error)
 *   story_readiness_check -> END
 *
 * APRS-2010: ST-4, APRS-2030: ST-5
 */

import { z } from 'zod'
import { StateGraph, START, END } from '@langchain/langgraph'
import {
  PlanRefinementStateAnnotation,
  type PlanRefinementState,
} from '../state/plan-refinement-state.js'
import { createNormalizePlanNode } from '../nodes/plan-refinement/normalize-plan.js'
import { createExtractFlowsNode } from '../nodes/plan-refinement/extract-flows.js'
import {
  createHumanReviewCheckpointNode,
  type DecisionCallback,
} from '../nodes/plan-refinement/human-review-checkpoint.js'
import { createFinalValidationNode } from '../nodes/plan-refinement/final-validation.js'
import {
  createStoryReadinessCheckNode,
  type ReadinessScoreFn,
} from '../nodes/plan-refinement/story-readiness-check.js'
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
  /** Injectable decision callback for human_review_checkpoint (APRS-2030) */
  decisionCallback: z.function().optional(),
  /** Injectable readiness score function for story_readiness_check (APRS-2030) */
  scoreFn: z.function().optional(),
})

export type PlanRefinementGraphConfig = z.infer<typeof PlanRefinementGraphConfigSchema>

// ============================================================================
// Conditional Edge Functions
// ============================================================================

/**
 * Routes after normalize_plan: proceed to extract_flows or END on error.
 */
function afterNormalize(state: PlanRefinementState): 'extract_flows' | '__end__' {
  if (state.refinementPhase === 'error') {
    return '__end__'
  }
  return 'extract_flows'
}

/**
 * Routes after human_review_checkpoint (AC-6):
 *   approve → final_validation
 *   edit → extract_flows (DEC-6: stubbed, gap_coverage not yet available)
 *   reject/defer → END
 */
function afterHumanReview(
  state: PlanRefinementState,
): 'final_validation' | 'extract_flows' | '__end__' {
  if (state.refinementPhase === 'final_validation') {
    return 'final_validation'
  }
  if (state.refinementPhase === 'gap_coverage') {
    // DEC-6: gap_coverage stubbed with direct edge to extract_flows during development
    return 'extract_flows'
  }
  // reject (error) or defer (complete) → END
  return '__end__'
}

/**
 * Routes after final_validation (AC-6):
 *   pass (story_readiness) → story_readiness_check
 *   error → END
 */
function afterFinalValidation(state: PlanRefinementState): 'story_readiness_check' | '__end__' {
  if (state.refinementPhase === 'story_readiness') {
    return 'story_readiness_check'
  }
  return '__end__'
}

// ============================================================================
// Graph Factory
// ============================================================================

/**
 * Creates and compiles the plan-refinement graph.
 *
 * @param config - Optional configuration with injectable adapters
 * @returns Compiled StateGraph
 */
export function createPlanRefinementGraph(
  config: {
    planLoader?: PlanLoaderFn
    llmAdapter?: LlmAdapterFn
    flowWriter?: FlowWriterFn
    decisionCallback?: DecisionCallback
    scoreFn?: ReadinessScoreFn
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
    .addNode(
      'human_review_checkpoint',
      createHumanReviewCheckpointNode({ decisionCallback: config.decisionCallback }),
    )
    .addNode('final_validation', createFinalValidationNode())
    .addNode('story_readiness_check', createStoryReadinessCheckNode({ scoreFn: config.scoreFn }))

    // START -> normalize_plan
    .addEdge(START, 'normalize_plan')

    // normalize_plan -> extract_flows | END
    .addConditionalEdges('normalize_plan', afterNormalize, {
      extract_flows: 'extract_flows',
      __end__: END,
    })

    // extract_flows -> human_review_checkpoint
    .addEdge('extract_flows', 'human_review_checkpoint')

    // human_review_checkpoint -> final_validation | extract_flows (edit/DEC-6) | END
    .addConditionalEdges('human_review_checkpoint', afterHumanReview, {
      final_validation: 'final_validation',
      extract_flows: 'extract_flows',
      __end__: END,
    })

    // final_validation -> story_readiness_check | END
    .addConditionalEdges('final_validation', afterFinalValidation, {
      story_readiness_check: 'story_readiness_check',
      __end__: END,
    })

    // story_readiness_check -> END
    .addEdge('story_readiness_check', END)

  return graph.compile()
}

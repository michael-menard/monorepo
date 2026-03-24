/**
 * Plan Refinement Graph
 *
 * Composes normalize_plan, extract_flows, coverage_agent, gap_specialists,
 * reconciliation, human_review_checkpoint, final_validation, and
 * story_readiness_check nodes into a LangGraph StateGraph.
 *
 * Graph structure (AC-6):
 *   START -> normalize_plan -> (afterNormalize) -> extract_flows
 *         -> coverage_agent -> gap_specialists -> reconciliation
 *         -> (afterGapCoverage) -> coverage_agent | human_review_checkpoint
 *   human_review_checkpoint -> final_validation (approve)
 *   human_review_checkpoint -> extract_flows (edit — DEC-6)
 *   human_review_checkpoint -> END (reject/defer)
 *   final_validation -> story_readiness_check (pass)
 *   final_validation -> END (error)
 *   story_readiness_check -> END
 *
 * APRS-2010: ST-4
 * APRS-2020: ST-5 (gap coverage loop)
 * APRS-2030: ST-5 (human review, final validation, story readiness)
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
import { createCoverageAgentNode } from '../nodes/plan-refinement/coverage-agent.js'
import type { CoverageAdapterFn } from '../nodes/plan-refinement/coverage-agent.js'
import { createGapSpecialistsNode } from '../nodes/plan-refinement/gap-specialists.js'
import type { SpecialistAdapterFn } from '../nodes/plan-refinement/gap-specialists.js'
import { createReconciliationNode } from '../nodes/plan-refinement/reconciliation.js'
import type {
  ReconciliationAdapterFn,
  FindingsWriterFn,
} from '../nodes/plan-refinement/reconciliation.js'
import {
  createHumanReviewCheckpointNode,
  type DecisionCallback,
} from '../nodes/plan-refinement/human-review-checkpoint.js'
import { createFinalValidationNode } from '../nodes/plan-refinement/final-validation.js'
import {
  createStoryReadinessCheckNode,
  type ReadinessScoreFn,
} from '../nodes/plan-refinement/story-readiness-check.js'

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
  // Gap coverage loop adapters (APRS-2020)
  coverageAdapter: z.function().optional(),
  uxSpecialist: z.function().optional(),
  qaSpecialist: z.function().optional(),
  securitySpecialist: z.function().optional(),
  reconciliationAdapter: z.function().optional(),
  findingsWriter: z.function().optional(),
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
 * Routes after reconciliation: loop back to coverage_agent or proceed to human_review_checkpoint.
 *
 * Exit conditions (any one triggers exit to human review):
 * 1. iterationCount >= maxIterations (hard cap, AC-GAP-3)
 * 2. circuitBreakerOpen (LLM failures, AC-GAP-3)
 * 3. refinementPhase === 'complete' (no gaps found)
 * 4. Convergence: |gapFindings.length - previousGapCount| / max(previousGapCount, 1) < 0.05
 */
export function afterGapCoverage(
  state: PlanRefinementState,
): 'coverage_agent' | 'human_review_checkpoint' {
  // Exit: phase is complete (no gaps)
  if (state.refinementPhase === 'complete') return 'human_review_checkpoint'
  // Exit: hard cap
  if (state.iterationCount >= state.maxIterations) return 'human_review_checkpoint'
  // Exit: circuit breaker
  if (state.circuitBreakerOpen) return 'human_review_checkpoint'
  // Exit: convergence
  const prevCount = state.previousGapCount
  const currentCount = state.gapFindings.length
  if (prevCount > 0) {
    const delta = Math.abs(currentCount - prevCount) / Math.max(prevCount, 1)
    if (delta < 0.05) return 'human_review_checkpoint'
  }
  // Loop back
  return 'coverage_agent'
}

/**
 * Routes after human_review_checkpoint (AC-6):
 *   approve → final_validation
 *   edit → extract_flows (DEC-6: re-run from extract_flows)
 *   reject/defer → END
 */
function afterHumanReview(
  state: PlanRefinementState,
): 'final_validation' | 'extract_flows' | '__end__' {
  if (state.refinementPhase === 'final_validation') {
    return 'final_validation'
  }
  if (state.refinementPhase === 'gap_coverage') {
    // DEC-6: edit routes back to extract_flows
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
 * Graph structure:
 *   START -> normalize_plan -> (afterNormalize) -> extract_flows
 *         -> coverage_agent -> gap_specialists -> reconciliation
 *         -> (afterGapCoverage) -> coverage_agent | human_review_checkpoint
 *   human_review_checkpoint -> final_validation | extract_flows | END
 *   final_validation -> story_readiness_check | END
 *   story_readiness_check -> END
 *
 * @param config - Optional configuration with injectable adapters
 * @returns Compiled StateGraph
 */
export function createPlanRefinementGraph(
  config: {
    planLoader?: PlanLoaderFn
    llmAdapter?: LlmAdapterFn
    flowWriter?: FlowWriterFn
    coverageAdapter?: CoverageAdapterFn
    uxSpecialist?: SpecialistAdapterFn
    qaSpecialist?: SpecialistAdapterFn
    securitySpecialist?: SpecialistAdapterFn
    reconciliationAdapter?: ReconciliationAdapterFn
    findingsWriter?: FindingsWriterFn
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
      'coverage_agent',
      createCoverageAgentNode({
        coverageAdapter: config.coverageAdapter,
      }),
    )
    .addNode(
      'gap_specialists',
      createGapSpecialistsNode({
        uxSpecialist: config.uxSpecialist,
        qaSpecialist: config.qaSpecialist,
        securitySpecialist: config.securitySpecialist,
      }),
    )
    .addNode(
      'reconciliation',
      createReconciliationNode({
        reconciliationAdapter: config.reconciliationAdapter,
        findingsWriter: config.findingsWriter,
      }),
    )
    .addNode(
      'human_review_checkpoint',
      createHumanReviewCheckpointNode({ decisionCallback: config.decisionCallback }),
    )
    .addNode('final_validation', createFinalValidationNode())
    .addNode('story_readiness_check', createStoryReadinessCheckNode({ scoreFn: config.scoreFn }))

    .addEdge(START, 'normalize_plan')
    .addConditionalEdges('normalize_plan', afterNormalize, {
      extract_flows: 'extract_flows',
      __end__: END,
    })
    .addEdge('extract_flows', 'coverage_agent')
    .addEdge('coverage_agent', 'gap_specialists')
    .addEdge('gap_specialists', 'reconciliation')
    .addConditionalEdges('reconciliation', afterGapCoverage, {
      coverage_agent: 'coverage_agent',
      human_review_checkpoint: 'human_review_checkpoint',
    })
    .addConditionalEdges('human_review_checkpoint', afterHumanReview, {
      final_validation: 'final_validation',
      extract_flows: 'extract_flows',
      __end__: END,
    })
    .addConditionalEdges('final_validation', afterFinalValidation, {
      story_readiness_check: 'story_readiness_check',
      __end__: END,
    })
    .addEdge('story_readiness_check', END)

  return graph.compile()
}

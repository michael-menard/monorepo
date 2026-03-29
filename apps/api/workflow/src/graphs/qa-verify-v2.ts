/**
 * QA Verify V2 Graph
 *
 * Agentic replacement for the v1 qa-verify pipeline.
 *
 * Graph structure:
 *   START → ac_parser → test_strategy_agent → test_executor → result_interpreter
 *         → evidence_assembler → postcondition_gate
 *         → [pass → complete → END | retry → result_interpreter | complete → END]
 *
 * bakeOffVersion: 'v2-agentic'
 */

import { z } from 'zod'
import { StateGraph, START, END } from '@langchain/langgraph'
import { QAVerifyV2StateAnnotation, type QAVerifyV2State } from '../state/qa-verify-v2-state.js'
import { createAcParserNode, type KbStoryAdapterFn } from '../nodes/qa-verify-v2/ac-parser.js'
import {
  createTestStrategyAgentNode,
  type LlmAdapterFn as StrategyLlmAdapterFn,
} from '../nodes/qa-verify-v2/test-strategy-agent.js'
import {
  createTestExecutorNode,
  type UnitTestRunnerFn,
  type E2eTestRunnerFn,
} from '../nodes/qa-verify-v2/test-executor.js'
import {
  createResultInterpreterNode,
  type LlmAdapterFn as InterpreterLlmAdapterFn,
} from '../nodes/qa-verify-v2/result-interpreter.js'
import { createEvidenceAssemblerNode } from '../nodes/qa-verify-v2/evidence-assembler.js'
import {
  createQaPostconditionGateNode,
  afterQaGate,
} from '../nodes/qa-verify-v2/postcondition-gate.js'

// ============================================================================
// Config Schema
// ============================================================================

export const QAVerifyV2GraphConfigSchema = z.object({
  kbStoryAdapter: z.function().optional(),
  strategyLlmAdapter: z.function().optional(),
  unitTestRunner: z.function().optional(),
  e2eTestRunner: z.function().optional(),
  interpreterLlmAdapter: z.function().optional(),
  maxRetries: z.number().int().min(0).optional(),
  bakeOffVersion: z.string().optional(),
})

export type QAVerifyV2GraphConfig = {
  kbStoryAdapter?: KbStoryAdapterFn
  strategyLlmAdapter?: StrategyLlmAdapterFn
  unitTestRunner?: UnitTestRunnerFn
  e2eTestRunner?: E2eTestRunnerFn
  interpreterLlmAdapter?: InterpreterLlmAdapterFn
  maxRetries?: number
  bakeOffVersion?: string
}

// ============================================================================
// Conditional Edge Functions
// ============================================================================

/**
 * After result_interpreter: advance to evidence_assembler.
 */
function afterResultInterpreter(state: QAVerifyV2State): 'evidence_assembler' | '__end__' {
  if (state.qaVerifyV2Phase === 'error') return '__end__'
  return 'evidence_assembler'
}

// ============================================================================
// Graph Factory
// ============================================================================

/**
 * Creates and compiles the qa-verify-v2 agentic graph.
 *
 * All adapters are optional — degrades gracefully with no-op stubs.
 *
 * @param config - Injectable adapters and tunables
 * @returns Compiled StateGraph
 */
export function createQAVerifyV2Graph(config: QAVerifyV2GraphConfig = {}) {
  const graph = new StateGraph(QAVerifyV2StateAnnotation)
    .addNode(
      'ac_parser',
      createAcParserNode({
        kbAdapter: config.kbStoryAdapter,
      }),
    )
    .addNode(
      'test_strategy_agent',
      createTestStrategyAgentNode({
        llmAdapter: config.strategyLlmAdapter,
      }),
    )
    .addNode(
      'test_executor',
      createTestExecutorNode({
        unitTestRunner: config.unitTestRunner,
        e2eTestRunner: config.e2eTestRunner,
      }),
    )
    .addNode(
      'result_interpreter',
      createResultInterpreterNode({
        llmAdapter: config.interpreterLlmAdapter,
      }),
    )
    .addNode('evidence_assembler', createEvidenceAssemblerNode())
    .addNode('postcondition_gate', createQaPostconditionGateNode())

    .addEdge(START, 'ac_parser')
    .addEdge('ac_parser', 'test_strategy_agent')
    .addEdge('test_strategy_agent', 'test_executor')
    .addEdge('test_executor', 'result_interpreter')

    // result_interpreter → evidence_assembler | END
    .addConditionalEdges('result_interpreter', afterResultInterpreter, {
      evidence_assembler: 'evidence_assembler',
      __end__: END,
    })

    .addEdge('evidence_assembler', 'postcondition_gate')

    // postcondition_gate → complete | result_interpreter (retry) | END
    .addConditionalEdges('postcondition_gate', afterQaGate, {
      result_interpreter: 'result_interpreter',
      complete: END,
      __end__: END,
    })

  return graph.compile()
}

// Re-export edge function for testing
export { afterQaGate }

// Re-export state type for consumers
export type { QAVerifyV2State }

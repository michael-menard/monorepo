/**
 * Dev Implement V2 Graph
 *
 * Agentic replacement for the v1 dev-implement pipeline.
 *
 * Graph structure:
 *   START → story_scout → implementation_planner → implementation_executor
 *         → [complete → evidence_collector → postcondition_gate → END]
 *         → [stuck    → error → END]
 *
 * Test-running lives INSIDE the executor's tool belt, not as a separate node.
 * The agent decides when to run tests. Failing tests → fail clean with diagnosis.
 * Escalation (Sonnet → Opus → human) handles tier changes, not the graph.
 *
 * bakeOffVersion: 'v2-agentic'
 */

import { z } from 'zod'
import { StateGraph, START, END } from '@langchain/langgraph'
import {
  DevImplementV2StateAnnotation,
  type DevImplementV2State,
} from '../state/dev-implement-v2-state.js'
import {
  createStoryScoutNode,
  type KbStoryAdapterFn,
  type CodebaseSearchFn,
} from '../nodes/dev-implement-v2/story-scout.js'
import {
  createImplementationPlannerNode,
  type LlmAdapterFn as PlannerLlmAdapterFn,
  type QueryKbFn,
  type SearchCodebaseFn,
  type ReadFileFn,
  type ListDirectoryFn as PlannerListDirectoryFn,
} from '../nodes/dev-implement-v2/implementation-planner.js'
import {
  createImplementationExecutorNode,
  type LlmAdapterFn as ExecutorLlmAdapterFn,
  type WriteFileFn,
  type RunTestsFn,
  type QueryKbFn as ExecutorQueryKbFn,
  type ListDirectoryFn as ExecutorListDirectoryFn,
} from '../nodes/dev-implement-v2/implementation-executor.js'
import {
  createEvidenceCollectorNode,
  type ReadFileFn as EvidenceReadFileFn,
} from '../nodes/dev-implement-v2/evidence-collector.js'
import {
  createDevImplementPostconditionGateNode,
  afterDevImplementGate,
} from '../nodes/dev-implement-v2/postcondition-gate.js'

// ============================================================================
// Config Schema
// ============================================================================

export const DevImplementV2GraphConfigSchema = z.object({
  // story_scout adapters
  kbStoryAdapter: z.function().optional(),
  codebaseSearch: z.function().optional(),
  // implementation_planner adapters
  plannerLlmAdapter: z.function().optional(),
  queryKb: z.function().optional(),
  searchCodebase: z.function().optional(),
  readFile: z.function().optional(),
  listDirectory: z.function().optional(),
  // implementation_executor adapters
  executorLlmAdapter: z.function().optional(),
  writeFile: z.function().optional(),
  runTests: z.function().optional(),
  // tunables
  maxInternalIterations: z.number().int().positive().optional(),
  maxPlannerIterations: z.number().int().positive().optional(),
  bakeOffVersion: z.string().optional(),
})

export type DevImplementV2GraphConfig = {
  kbStoryAdapter?: KbStoryAdapterFn
  codebaseSearch?: CodebaseSearchFn
  plannerLlmAdapter?: PlannerLlmAdapterFn
  queryKb?: QueryKbFn
  searchCodebase?: SearchCodebaseFn
  readFile?: ReadFileFn
  listDirectory?: PlannerListDirectoryFn
  executorLlmAdapter?: ExecutorLlmAdapterFn
  writeFile?: WriteFileFn
  runTests?: RunTestsFn
  maxInternalIterations?: number
  maxPlannerIterations?: number
  bakeOffVersion?: string
}

// ============================================================================
// Conditional Edge Functions
// ============================================================================

/**
 * After implementation_executor: route to evidence_collector on complete,
 * or END on error (stuck verdict already attached diagnosis to errors[]).
 */
function afterExecutor(state: DevImplementV2State): 'evidence_collector' | '__end__' {
  if (state.devImplementV2Phase === 'error') return '__end__'
  return 'evidence_collector'
}

// ============================================================================
// Graph Factory
// ============================================================================

/**
 * Creates and compiles the dev-implement-v2 agentic graph.
 *
 * All adapters are optional — degrades gracefully with no-op stubs.
 *
 * @param config - Injectable adapters and tunables
 * @returns Compiled StateGraph
 */
export function createDevImplementV2Graph(config: DevImplementV2GraphConfig = {}) {
  const graph = new StateGraph(DevImplementV2StateAnnotation)
    .addNode(
      'story_scout',
      createStoryScoutNode({
        kbAdapter: config.kbStoryAdapter,
        codebaseSearch: config.codebaseSearch,
      }),
    )
    .addNode(
      'implementation_planner',
      createImplementationPlannerNode({
        llmAdapter: config.plannerLlmAdapter,
        queryKb: config.queryKb,
        searchCodebase: config.searchCodebase,
        readFile: config.readFile,
        listDirectory: config.listDirectory,
        maxInternalIterations: config.maxPlannerIterations,
      }),
    )
    .addNode(
      'implementation_executor',
      createImplementationExecutorNode({
        llmAdapter: config.executorLlmAdapter,
        readFile: config.readFile as EvidenceReadFileFn | undefined,
        writeFile: config.writeFile,
        runTests: config.runTests,
        queryKb: config.queryKb as ExecutorQueryKbFn | undefined,
        listDirectory: config.listDirectory as ExecutorListDirectoryFn | undefined,
        maxInternalIterations: config.maxInternalIterations,
      }),
    )
    .addNode(
      'evidence_collector',
      createEvidenceCollectorNode({
        readFile: config.readFile as EvidenceReadFileFn | undefined,
      }),
    )
    .addNode('postcondition_gate', createDevImplementPostconditionGateNode())

    // Linear start
    .addEdge(START, 'story_scout')
    .addEdge('story_scout', 'implementation_planner')
    .addEdge('implementation_planner', 'implementation_executor')

    // Executor → evidence_collector (complete) | END (stuck)
    .addConditionalEdges('implementation_executor', afterExecutor, {
      evidence_collector: 'evidence_collector',
      __end__: END,
    })

    // evidence_collector → postcondition_gate
    .addEdge('evidence_collector', 'postcondition_gate')

    // postcondition_gate → END (pass or fail — no retries)
    .addConditionalEdges('postcondition_gate', afterDevImplementGate, {
      complete: END,
      __end__: END,
    })

  return graph.compile()
}

// Re-export edge function for testing
export { afterDevImplementGate }

// Re-export state type for consumers
export type { DevImplementV2State }

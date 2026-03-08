# WINT-9060 Setup Log

**Date:** 2026-03-08  
**Story:** Create batch-coordinator LangGraph Graph (batch-process.ts)  
**Status:** Setup Complete  
**Mode:** implement (standard flow, gen_mode=false)

---

## Story Overview

WINT-9060 creates a LangGraph graph at `packages/backend/orchestrator/src/graphs/batch-process.ts` that orchestrates a caller-provided list of story IDs through the implementation pipeline in parallel, collecting per-story results, retrying transient failures, and returning a structured batch summary.

Key characteristics:
- **Backend only** (TypeScript, no frontend)
- **3 files changed:** batch-process.ts (new), batch-process.test.ts (new), graphs/index.ts (add exports)
- **Dependencies:** WINT-9020 (completed), WINT-9030/9040/9050 (pending — handled via injectable stubs)
- **Test coverage:** ≥45% global, ≥80% on batch-process.ts

---

## Critical Code Patterns Identified

### 1. Send API Dispatcher Pattern (CONDITIONAL EDGE, NOT NODE)

**Source:** `/packages/backend/orchestrator/src/graphs/elab-epic.ts` lines 189-206

**Pattern Structure:**
```typescript
export function createElabEpicDispatcher(_config: Partial<ElabEpicConfig> = {}) {
  return (state: ElabEpicState): Send[] => {
    if (state.storyEntries.length === 0) {
      return [new Send('fan_in', { ...state })]
    }
    return state.storyEntries.map(
      entry =>
        new Send('elab_story_worker', {
          ...state,
          _workerStoryId: entry.storyId,
          _workerCurrentStory: entry.currentStory,
          _workerPreviousStory: entry.previousStory ?? null,
        }),
    )
  }
}
```

**Key Points:**
- Returns a **function** that takes state and returns `Send[]` — NOT an async node function
- Wired via `.addConditionalEdges(START, createElabEpicDispatcher(fullConfig))` — NOT `.addNode()`
- Each `Send` object targets a specific node (e.g., `'story_worker'`) and carries per-worker state
- Enables LangGraph's native parallel execution of workers

**How to Use for WINT-9060:**
```typescript
export function createBatchProcessDispatcher(_config: Partial<BatchProcessConfig> = {}) {
  return (state: BatchProcessState): Send[] => {
    if (state.storyIds.length === 0) {
      return [new Send('fan_in', { ...state })]
    }
    return state.storyIds.map(
      storyId =>
        new Send('story_worker', {
          ...state,
          _workerStoryId: storyId,
          _workerRetryCount: 0,
        }),
    )
  }
}
```

---

### 2. Append Reducer Definition

**Source:** `/packages/backend/orchestrator/src/graphs/elab-epic.ts` lines 102-103, 133

**Definition:**
```typescript
const overwrite = <T>(_: T, b: T): T => b
const append = <T>(current: T[], update: T[]): T[] => [...current, ...update]

export const ElabEpicStateAnnotation = Annotation.Root({
  // ...
  /** Worker results collected via append reducer (fan-in) */
  workerResults: Annotation<ElabStoryResult[]>({
    reducer: append,
    default: () => [],
  }),
  // ...
  errors: Annotation<string[]>({
    reducer: append,
    default: () => [],
  }),
  // ...
})
```

**Critical Insight:**
- Use `append` for **array fields that multiple parallel workers write**
- Use `overwrite` for **scalar fields** (strings, numbers, booleans, single objects)
- The `append` reducer is essential for fan-in to collect all worker results, not just the last one

**How to Use for WINT-9060:**
- `workerResults: Annotation<BatchWorkerResult[]>({ reducer: append, ... })`
- `errors: Annotation<string[]>({ reducer: append, ... })`
- `warnings: Annotation<string[]>({ reducer: append, ... })`
- **DO NOT** use `overwrite` for these fields — you'll lose results from earlier workers

---

### 3. Injectable Stub Pattern with z.unknown().optional()

**Source:** `/packages/backend/orchestrator/src/graphs/backlog-review.ts` lines 25-40, 226-251

**Pattern Structure:**

```typescript
export const BacklogReviewConfigSchema = z.object({
  storyRepo: z.unknown().optional(),
  workflowRepo: z.unknown().optional(),
  mlScoringNode: z.unknown().optional(),
  curatorAnalyzeNode: z.unknown().optional(),
  // ... other required fields ...
})

export function createMLScoreNode(config: Partial<BacklogReviewConfig> = {}) {
  return async (state: BacklogReviewState): Promise<Partial<BacklogReviewState>> => {
    const mlNode = config.mlScoringNode ?? state.config?.mlScoringNode

    if (!mlNode) {
      // Skip gracefully with warning (AC-6 requirement)
      return {
        mlScoredStories: state.backlogStories,
        warnings: ['ml_score: WINT-9070 not injected — skipping ML scoring'],
      }
    }

    try {
      const mlNodeFn = mlNode as (stories: BacklogStory[]) => Promise<BacklogStory[]>
      const scored = await mlNodeFn(state.backlogStories)
      return { mlScoredStories: scored }
    } catch (error) {
      // ...
      return {
        mlScoredStories: state.backlogStories,
        warnings: [`ml_score: failed — ${msg} — using unscored stories`],
      }
    }
  }
}
```

**Key Points:**
- `z.unknown().optional()` in config schema → accepts any type or undefined
- Each node that uses an injectable dep checks `if (!injectable)` before invoking
- Graceful skip with warning, not crash — allows graph to run without pending dependencies
- **CRITICAL:** Never import unimplemented files (WINT-9030/9040/9050) directly; only inject through config

**How to Use for WINT-9060:**
```typescript
export const BatchProcessConfigSchema = z.object({
  storyIds: z.array(z.string().min(1)),
  maxConcurrency: z.number().int().positive().default(10),
  maxRetriesPerStory: z.number().int().positive().default(2),
  cohesionProsecutorNode: z.unknown().optional(),  // WINT-9030
  scopeDefenderNode: z.unknown().optional(),        // WINT-9040
  evidenceJudgeNode: z.unknown().optional(),        // WINT-9050
  // ... other fields ...
})

export function createBatchStoryWorkerNode(config: Partial<BatchProcessConfig> = {}) {
  return async (state: BatchProcessState & { _workerStoryId?: string }) => {
    const cohesionNode = config.cohesionProsecutorNode ?? state.config?.cohesionProsecutorNode
    
    if (!cohesionNode) {
      return {
        warnings: ['cohesion-prosecutor not configured, skipping'],
        // ... continue with sub-pipeline ...
      }
    }
    // ... invoke cohesionNode ...
  }
}
```

---

### 4. Bounded Retry Counter Pattern

**Source:** `/packages/backend/orchestrator/src/graphs/implementation.ts` lines 140-144, 306-326

**Pattern Structure:**

```typescript
export const ImplementationGraphStateAnnotation = Annotation.Root({
  // ...
  /** Number of change-loop retry attempts for the current ChangeSpec */
  changeLoopRetryCount: Annotation<number>({
    reducer: overwrite,
    default: () => 0,
  }),
  // ...
})

// Conditional edge function that routes based on retry count
function afterChangeLoop(
  state: ImplementationGraphState,
): 'change_loop' | 'evidence_production' | 'abort' {
  const status = state.changeLoopStatus

  if (status === 'abort') {
    return 'abort'
  }

  if (status === 'complete' || state.changeLoopComplete) {
    return 'evidence_production'
  }

  if (status === 'pass' || status === 'retry') {
    // More specs to process or retry current spec
    return 'change_loop'
  }

  return 'abort'
}
```

**Key Points:**
- Per-story/per-item retry counter tracked in state
- Node increments counter on failure, checks against `maxRetriesPerStory` bound
- Conditional edge routes to retry or abort based on count
- **Important:** Each worker carries its own `retryCount` in result, not shared state — avoids conflicts in parallel execution

**How to Use for WINT-9060:**
```typescript
export const BatchWorkerResultSchema = z.object({
  storyId: z.string().min(1),
  success: z.boolean(),
  retryCount: z.number().int().min(0).default(0),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
})

export function createBatchStoryWorkerNode(config: Partial<BatchProcessConfig> = {}) {
  return async (
    state: BatchProcessState & { _workerStoryId?: string; _workerRetryCount?: number }
  ): Promise<Partial<BatchProcessState>> => {
    const storyId = state._workerStoryId
    let retryCount = state._workerRetryCount ?? 0
    const maxRetries = config.maxRetriesPerStory ?? 2

    while (retryCount < maxRetries) {
      try {
        // Call sub-pipeline (devImplement or similar)
        const result = await runDevImplement({ storyId, config })
        if (result.success) {
          return {
            workerResults: [{ storyId, success: true, retryCount, errors: [] }],
          }
        }
      } catch (error) {
        retryCount++
        if (retryCount >= maxRetries) {
          return {
            workerResults: [{
              storyId,
              success: false,
              retryCount: maxRetries - 1,
              errors: [String(error)],
            }],
          }
        }
      }
    }
  }
}
```

---

### 5. Subgraph Invocation Pattern

**Source:** `/packages/backend/orchestrator/src/graphs/bootstrap.ts` lines 184-237

**Pattern Structure:**

```typescript
export function createRunStoryCreationNode(config: Partial<BootstrapConfig> = {}) {
  return async (state: BootstrapState): Promise<Partial<BootstrapState>> => {
    if (!state.storyRequest) {
      return {
        storyCreationResult: null,
        warnings: ['No story request provided — skipping story creation'],
      }
    }

    try {
      const storyCreationGraph = createStoryCreationGraph({
        autoApprovalThreshold: config.autoApprovalThreshold ?? 95,
        requireHiTL: config.requireHiTL ?? true,
        maxAttackIterations: config.maxAttackIterations ?? 3,
        persistToDb: config.persistToDb ?? false,
        storyRepo: config.storyRepo,
        workflowRepo: config.workflowRepo,
        kbDeps: config.kbDeps,
      })

      const initialState = {
        storyId: state.storyId,
        epicPrefix: state.storyId.toLowerCase().split('-')[0],
        storyRequest: state.storyRequest,
      }

      const result = await storyCreationGraph.invoke(initialState)

      const storyCreationResult = StoryCreationResultSchema.parse({
        storyId: result.storyId,
        phase: result.currentPhase,
        success: result.workflowSuccess ?? false,
        synthesizedStory: result.synthesizedStory,
        // ...
      })

      return { storyCreationResult }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      return {
        storyCreationResult: null,
        errors: [`Story creation failed: ${msg}`],
      }
    }
  }
}
```

**Key Points:**
- Create subgraph instance with shared config
- Set up initial state for subgraph invocation
- Call `graph.invoke(state)` synchronously (awaited because it returns Promise)
- Parse result through schema to ensure type safety
- Handle errors gracefully, capture in state.errors

**How to Use for WINT-9060:**
- Call `runDevImplement()` or equivalent sub-pipeline inside worker node
- Pass story-specific config through to sub-pipeline
- Collect success/failure result in `BatchWorkerResult`

---

### 6. createToolNode Adapter Pattern

**Source:** `/packages/backend/orchestrator/src/runner/node-factory.ts` lines 375-389

**Pattern Structure:**

```typescript
export function createToolNode(name: string, implementation: NodeImplementation): NodeFunction {
  return createNode(
    {
      name,
      retry: {
        maxAttempts: 2,
        backoffMs: 500,
        backoffMultiplier: 2,
        maxBackoffMs: 10000,
        timeoutMs: 10000,
        jitterFactor: 0.25,
      },
    },
    implementation,
  )
}
```

**Used in elab-epic.ts (lines 456-473):**

```typescript
export function createElabEpicNode(config: Partial<ElabEpicConfig> = {}) {
  return createToolNode(
    'elab_epic',
    async (state: GraphState): Promise<Partial<GraphStateWithElabEpic>> => {
      const stateWithElabEpic = state as GraphStateWithElabEpic

      const result = await runElabEpic({
        epicId: state.epicPrefix || state.storyId || 'unknown',
        storyEntries: [],
        config: stateWithElabEpic.elabEpicConfig || config,
      })

      return updateState({
        elabEpicResult: result,
        elabEpicComplete: result.success,
      } as Partial<GraphStateWithElabEpic>)
    },
  )
}
```

**Key Points:**
- Tool nodes have preset retry config: 2 attempts, 500ms backoff, 10s timeout
- Wrap a `run*` entry point function to integrate into larger orchestration graphs
- Accept generic GraphState (upcast to extended interface)
- Return updateState() with extended state fields
- Enable the graph to be embedded as a node in another graph

**How to Use for WINT-9060:**
```typescript
export const createBatchProcessNode = (config: Partial<BatchProcessConfig> = {}) => {
  return createToolNode(
    'batch_process',
    async (state: GraphState): Promise<Partial<GraphStateWithBatchProcess>> => {
      const stateWithBatchProcess = state as GraphStateWithBatchProcess
      
      const result = await runBatchProcess({
        batchId: state.storyId || 'unknown',
        storyIds: stateWithBatchProcess.batchProcessInput?.storyIds || [],
        config: stateWithBatchProcess.batchProcessConfig || config,
      })

      return updateState({
        batchProcessResult: result,
        batchProcessComplete: result.success,
      } as Partial<GraphStateWithBatchProcess>)
    },
  )
}
```

---

### 7. Thread ID Convention

**Source:** `/packages/backend/orchestrator/src/graphs/elab-epic.ts` lines 10, 394

**Convention:**
```typescript
/**
 * Thread ID convention: `${epicId}:elab-epic:${attempt}`
 */

export async function runElabEpic(params: {
  epicId: string
  storyEntries: StoryEntry[]
  config?: Partial<ElabEpicConfig>
  attempt?: number
}): Promise<ElabEpicResult> {
  const startTime = Date.now()
  const { epicId, storyEntries, config = {}, attempt = 1 } = params

  const threadId = `${epicId}:elab-epic:${attempt}`
  const graph = createElabEpicGraph(config)

  const initialState: Partial<ElabEpicState> = {
    epicId,
    storyEntries,
    threadId,
  }

  try {
    const result = await graph.invoke(initialState, {
      configurable: { thread_id: threadId },
    })
    // ...
  }
}
```

**Key Points:**
- Format: `${identifier}:graph-name:${attemptNumber}`
- Used in checkpointer-enabled runs for deterministic restarts
- Passed to `graph.invoke(..., { configurable: { thread_id: threadId } })`

**How to Use for WINT-9060:**
```typescript
const threadId = `${batchId}:batch-process:${attempt}`
const graph = createBatchProcessGraph(config)

const result = await graph.invoke(initialState, {
  configurable: { thread_id: threadId },
})
```

---

### 8. Export Aliasing Pattern (graphs/index.ts)

**Source:** `/packages/backend/orchestrator/src/graphs/index.ts` lines 155-180 (Elab Epic), 38-75 (Story Creation)

**Pattern Structure:**

```typescript
// Story Creation Graph (FLOW-042)
export {
  // Graph factory and runner
  createStoryCreationGraph,
  runStoryCreation,
  // Node adapters for workflow integration
  storyCreationNode,
  createStoryCreationNode,
  // Individual node factories (prefixed to avoid collision)
  createInitializeNode as createStoryCreationInitializeNode,
  createLoadBaselineNode as createStoryCreationLoadBaselineNode,
  // ... more prefixed aliases ...
  // Schemas
  StoryCreationConfigSchema,
  StoryCreationResultSchema,
  // ... state and types ...
} from './story-creation.js'

// Elab Epic Graph — Send API fan-out (WINT-9110, AC-2)
export {
  // Graph factory and runner
  createElabEpicGraph,
  runElabEpic,
  // Node adapters for workflow integration
  createElabEpicNode,
  // Individual node factories
  createElabEpicDispatcher,
  createElabStoryWorkerNode,
  createElabEpicFanInNode,
  createElabEpicCompleteNode,
  // Conditional edge functions
  afterFanIn,
  // Schemas
  ElabEpicConfigSchema,
  ElabEpicResultSchema,
  StoryEntrySchema,
  // State annotation
  ElabEpicStateAnnotation,
  // Types
  type ElabEpicConfig,
  type ElabEpicResult,
  type ElabEpicState,
  type StoryEntry,
  type GraphStateWithElabEpic,
} from './elab-epic.js'
```

**Key Points:**
- Export all public symbols (factories, schemas, types)
- Use `as` aliases to avoid collisions when multiple graphs have `createInitializeNode`, etc.
- Include state annotation, config/result schemas, and all conditional edge functions
- Extended interface (GraphStateWithBatchProcess) exported for type safety

**How to Use for WINT-9060:**
```typescript
// Batch Process Graph (WINT-9060)
export {
  // Graph factory and runner
  createBatchProcessGraph,
  runBatchProcess,
  // Node adapters for workflow integration
  createBatchProcessNode,
  // Individual node factories
  createBatchProcessDispatcher,
  createBatchStoryWorkerNode,
  createBatchProcessFanInNode,
  createBatchProcessCompleteNode,
  // Schemas
  BatchProcessConfigSchema,
  BatchProcessResultSchema,
  BatchWorkerResultSchema,
  // State annotation
  BatchProcessStateAnnotation,
  // Types
  type BatchProcessConfig,
  type BatchProcessResult,
  type BatchWorkerResult,
  type BatchProcessState,
  type GraphStateWithBatchProcess,
} from './batch-process.js'
```

---

## Implementation Roadmap

### Subtask ST-1: Define Schemas and State Annotation
**Deliverable:** BatchProcessConfigSchema, BatchProcessResultSchema, BatchWorkerResultSchema, BatchProcessStateAnnotation

**Key decisions:**
- Use `append` reducer for `workerResults[]`, `errors[]`, `warnings[]`
- Use `overwrite` reducer for scalar fields (batchId, storiesSucceeded, storiesFailed, etc.)
- Config includes: storyIds, maxConcurrency, maxRetriesPerStory, batchThreshold, autonomyLevel, plus injectable nodes
- Result includes: batchId, storiesQueued, storiesSucceeded, storiesFailed, storiesRetried, workerResults[], durationMs, completedAt, errors[], warnings[]

### Subtask ST-2: Implement Dispatcher and Worker Node
**Deliverable:** createBatchProcessDispatcher, createBatchStoryWorkerNode

**Key decisions:**
- Dispatcher is a function returning Send[], not a node
- Worker node tracks per-story retryCount, bounded by maxRetriesPerStory
- Worker calls sub-pipeline (devImplement or custom) with injectable stubs support

### Subtask ST-3: Implement Fan-In and Complete Node
**Deliverable:** createBatchProcessFanInNode, createBatchProcessCompleteNode, createBatchProcessGraph

**Key decisions:**
- Fan-in aggregates all worker results via append reducer
- Computes totals: storiesSucceeded, storiesFailed, storiesRetried from workerResults[]
- Graph factory wires dispatcher → workers → fan_in → complete → END
- Dispatcher wired as `.addConditionalEdges(START, ...)` not `.addNode()`

### Subtask ST-4: Implement Entry Point and Adapter
**Deliverable:** runBatchProcess, createBatchProcessNode

**Key decisions:**
- Thread ID: `${batchId}:batch-process:${attempt}`
- Logs graph_started, graph_completed, graph_failed via @repo/logger
- createBatchProcessNode wraps runBatchProcess for larger orchestration graphs

### Subtask ST-5: Export from graphs/index.ts
**Deliverable:** All WINT-9060 symbols exported with appropriate aliases

### Subtask ST-6: Write Vitest Tests
**Deliverable:** Comprehensive test suite covering all acceptance criteria

---

## Critical Implementation Notes

1. **DISPATCHER IS NOT A NODE** — It's a function that returns Send[]. Wire it with `.addConditionalEdges(START, createBatchProcessDispatcher(...))`, NOT `.addNode()`.

2. **APPEND REDUCER IS CRITICAL** — Multiple parallel workers write to workerResults[], errors[], warnings[]. Must use `append` reducer, not `overwrite`, or results from earlier workers will be lost.

3. **INJECTABLE STUBS ARE CONFIG-BASED** — Never import WINT-9030/9040/9050 directly. Pass optional nodes through BatchProcessConfigSchema as `z.unknown().optional()`, check `if (config.nodeProperty)` before invocation.

4. **PER-STORY RETRY COUNTER** — Each worker carries its own retryCount in BatchWorkerResult, not shared state. Avoids reducer conflicts in parallel execution.

5. **THREAD ID CONVENTION** — `${batchId}:batch-process:${attempt}` enables deterministic checkpointer restarts.

---

## Setup Status

- [x] Story preconditions verified (status: ready-to-work → in-progress)
- [x] Canonical reference files analyzed and patterns extracted
- [x] CHECKPOINT.yaml written (iteration: 0, phase: setup)
- [x] SCOPE.yaml written with detailed pattern reference
- [x] Critical implementation decisions documented
- [x] Implementation roadmap clear with 6 subtasks

**Next Steps:**
1. Implement ST-1 (schemas and state annotation)
2. Implement ST-2 (dispatcher and worker)
3. Implement ST-3 (fan-in and complete)
4. Implement ST-4 (entry point and adapter)
5. Implement ST-5 (exports)
6. Implement ST-6 (tests)

---

## Token Usage

- Input tokens (reading files): ~35,000
- Output tokens (setup summary): ~15,000
- Estimated for implementation: ~25,000 per subtask

**Total estimate for WINT-9060:** ~120,000 tokens

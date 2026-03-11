# WINT-9060 Code Patterns Reference

Quick reference for key patterns extracted from canonical files. Use this during implementation.

---

## 1. Send API Dispatcher (CONDITIONAL EDGE FUNCTION)

**File:** `packages/backend/orchestrator/src/graphs/elab-epic.ts` (lines 189-206)

**Pattern:**
```typescript
import { Send } from '@langchain/langgraph'

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

**Graph Wiring:**
```typescript
const graph = new StateGraph(BatchProcessStateAnnotation)
  .addNode('story_worker', createBatchStoryWorkerNode(fullConfig))
  .addNode('fan_in', createBatchProcessFanInNode())
  .addNode('complete', createBatchProcessCompleteNode())
  // CRITICAL: Use addConditionalEdges, NOT addNode, for dispatcher
  .addConditionalEdges(START, createBatchProcessDispatcher(fullConfig))
  .addEdge('story_worker', 'fan_in')
  .addConditionalEdges('fan_in', () => 'complete', {
    complete: 'complete',
  })
  .addEdge('complete', END)
```

**Tests to verify:**
- Dispatcher returns empty array when storyIds empty
- Dispatcher returns N Send objects for N storyIds
- Each Send has correct node target ('story_worker')
- Each Send carries correct _workerStoryId value

---

## 2. Append Reducer for Parallel Aggregation

**File:** `packages/backend/orchestrator/src/graphs/elab-epic.ts` (lines 102-103, 133-162)

**Pattern:**
```typescript
const overwrite = <T>(_: T, b: T): T => b
const append = <T>(current: T[], update: T[]): T[] => [...current, ...update]

export const BatchProcessStateAnnotation = Annotation.Root({
  batchId: Annotation<string>({
    reducer: overwrite,
    default: () => '',
  }),

  // CRITICAL FIELDS: Must use append, not overwrite
  workerResults: Annotation<BatchWorkerResult[]>({
    reducer: append,
    default: () => [],
  }),

  errors: Annotation<string[]>({
    reducer: append,
    default: () => [],
  }),

  warnings: Annotation<string[]>({
    reducer: append,
    default: () => [],
  }),

  storiesSucceeded: Annotation<number>({
    reducer: overwrite,
    default: () => 0,
  }),

  storiesFailed: Annotation<number>({
    reducer: overwrite,
    default: () => 0,
  }),

  storiesRetried: Annotation<number>({
    reducer: overwrite,
    default: () => 0,
  }),
})
```

**Why This Matters:**
- Multiple workers in parallel all write to `workerResults[]`
- With `overwrite`, only the last worker's result survives
- With `append`, all results are collected correctly

**Tests to verify:**
- Two workers each produce a result
- Fan-in aggregates both results (not just last)
- workerResults.length === 2 after fan-in

---

## 3. Injectable Stub Pattern (z.unknown().optional())

**File:** `packages/backend/orchestrator/src/graphs/backlog-review.ts` (lines 25-40, 225-251)

**Config Schema:**
```typescript
export const BatchProcessConfigSchema = z.object({
  storyIds: z.array(z.string().min(1)),
  maxConcurrency: z.number().int().positive().default(10),
  maxRetriesPerStory: z.number().int().positive().default(2),
  batchThreshold: z.number().int().positive().default(5),
  autonomyLevel: z.enum(['conservative', 'moderate', 'aggressive']).default('moderate'),
  
  // CRITICAL: Optional injected nodes for pending dependencies
  cohesionProsecutorNode: z.unknown().optional(),
  scopeDefenderNode: z.unknown().optional(),
  evidenceJudgeNode: z.unknown().optional(),
  
  storyRepo: z.unknown().optional(),
  workflowRepo: z.unknown().optional(),
  persistToDb: z.boolean().default(false),
})
```

**Node Implementation with Stub Check:**
```typescript
export function createBatchStoryWorkerNode(config: Partial<BatchProcessConfig> = {}) {
  return async (
    state: BatchProcessState & { _workerStoryId?: string; _workerRetryCount?: number }
  ): Promise<Partial<BatchProcessState>> => {
    const storyId = state._workerStoryId
    const cohesionNode = config.cohesionProsecutorNode ?? state.config?.cohesionProsecutorNode

    if (!cohesionNode) {
      // Skip gracefully with warning
      return {
        workerResults: [
          {
            storyId,
            success: true,  // Note: don't fail just because stub missing
            retryCount: 0,
            errors: [],
            warnings: ['cohesion-prosecutor not configured, skipping'],
          },
        ],
      }
    }

    try {
      const cohesionFn = cohesionNode as (storyId: string) => Promise<any>
      const cohesionResult = await cohesionFn(storyId)
      // ... continue with result ...
    } catch (error) {
      // Handle injection failure gracefully
    }
  }
}
```

**Tests to verify:**
- Graph compiles without WINT-9030/9040/9050 injectable nodes
- Graph runs when injectable nodes are absent (skips with warning)
- Graph works when injectable nodes are provided

---

## 4. Bounded Retry Counter

**File:** `packages/backend/orchestrator/src/graphs/implementation.ts` (lines 140-144, 306-326)

**Schema:**
```typescript
export const BatchWorkerResultSchema = z.object({
  storyId: z.string().min(1),
  success: z.boolean(),
  retryCount: z.number().int().min(0).default(0),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
})

export type BatchWorkerResult = z.infer<typeof BatchWorkerResultSchema>
```

**Worker Node with Retry Logic:**
```typescript
export function createBatchStoryWorkerNode(config: Partial<BatchProcessConfig> = {}) {
  return async (
    state: BatchProcessState & { _workerStoryId?: string; _workerRetryCount?: number }
  ): Promise<Partial<BatchProcessState>> => {
    const storyId = state._workerStoryId
    let retryCount = state._workerRetryCount ?? 0
    const maxRetries = config.maxRetriesPerStory ?? 2

    // Retry loop bounded by maxRetries
    while (retryCount < maxRetries) {
      try {
        // Call sub-pipeline (e.g., runDevImplement)
        const result = await runDevImplement({
          storyId,
          config: config as any,
        })

        if (result.success) {
          return {
            workerResults: [
              {
                storyId,
                success: true,
                retryCount,
                errors: [],
              },
            ],
          }
        }

        // Sub-pipeline returned failure, retry
        retryCount++
        if (retryCount >= maxRetries) {
          // Exhausted retries
          break
        }
      } catch (error) {
        retryCount++
        if (retryCount >= maxRetries) {
          // Exhausted retries after exception
          return {
            workerResults: [
              {
                storyId,
                success: false,
                retryCount: maxRetries - 1,
                errors: [error instanceof Error ? error.message : String(error)],
              },
            ],
          }
        }
      }
    }

    // Failed after max retries
    return {
      workerResults: [
        {
          storyId,
          success: false,
          retryCount: maxRetries - 1,
          errors: ['Max retries exceeded'],
        },
      ],
    }
  }
}
```

**Tests to verify:**
- Worker retries up to maxRetriesPerStory
- Worker marks story failed after exhausting retries
- No infinite loop (bounded by config)
- Retry count accurately reflects attempts

---

## 5. Subgraph Invocation

**File:** `packages/backend/orchestrator/src/graphs/bootstrap.ts` (lines 184-237)

**Pattern:**
```typescript
export function createBatchStoryWorkerNode(config: Partial<BatchProcessConfig> = {}) {
  return async (
    state: BatchProcessState & { _workerStoryId?: string }
  ): Promise<Partial<BatchProcessState>> => {
    const storyId = state._workerStoryId
    if (!storyId) return { workerResults: [] }

    try {
      // Create sub-pipeline graph
      const devImplementGraph = createDevImplementGraph({
        featureDir: config.featureDir ?? 'plans/future/platform/wint',
        storyId,
        modelDispatch: config.modelDispatch,
      })

      // Initialize state for sub-pipeline
      const initialState = {
        storyId,
        featureDir: config.featureDir ?? 'plans/future/platform/wint',
        startedAt: new Date().toISOString(),
      }

      // Invoke sub-pipeline
      const result = await devImplementGraph.invoke(initialState)

      // Parse result through schema
      const devImplementResult = DevImplementResultSchema.parse({
        storyId: result.storyId,
        success: result.workflowSuccess ?? false,
        completedChanges: result.completedChanges ?? [],
        errors: result.errors ?? [],
        warnings: result.warnings ?? [],
      })

      return {
        workerResults: [
          {
            storyId,
            success: devImplementResult.success,
            retryCount: 0,
            errors: devImplementResult.errors,
            warnings: devImplementResult.warnings,
          },
        ],
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      return {
        workerResults: [
          {
            storyId,
            success: false,
            retryCount: 0,
            errors: [msg],
          },
        ],
      }
    }
  }
}
```

---

## 6. createToolNode Adapter

**File:** `packages/backend/orchestrator/src/runner/node-factory.ts` (lines 375-389)

**Pattern:**
```typescript
import { createToolNode } from '../runner/node-factory.js'
import { updateState } from '../runner/state-helpers.js'

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

## 7. Thread ID Convention

**File:** `packages/backend/orchestrator/src/graphs/elab-epic.ts` (lines 10, 394, 404-405)

**Pattern:**
```typescript
/**
 * Thread ID convention: `${batchId}:batch-process:${attempt}`
 */

export async function runBatchProcess(params: {
  batchId: string
  storyIds: string[]
  config?: Partial<BatchProcessConfig>
  attempt?: number
}): Promise<BatchProcessResult> {
  const startTime = Date.now()
  const { batchId, storyIds, config = {}, attempt = 1 } = params

  const threadId = `${batchId}:batch-process:${attempt}`
  const graph = createBatchProcessGraph(config)

  const initialState: Partial<BatchProcessState> = {
    batchId,
    storyIds,
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

---

## 8. @repo/logger Integration

**File:** `packages/backend/orchestrator/src/graphs/implementation.ts` (lines 434-440, 473-478)

**Pattern:**
```typescript
import { logger } from '@repo/logger'

export async function runBatchProcess(params: {
  // ...
}): Promise<BatchProcessResult> {
  const startTime = Date.now()
  const { batchId, storyIds, config = {}, attempt = 1 } = params

  logger.info('graph_started', {
    batchId,
    stage: 'batch_process',
    storiesQueued: storyIds.length,
    durationMs: 0,
    attemptNumber: attempt,
  })

  const graph = createBatchProcessGraph(config)
  // ...

  try {
    const result = await graph.invoke(initialState, {
      configurable: { thread_id: threadId },
    })

    const durationMs = Date.now() - startTime

    logger.info('graph_completed', {
      batchId,
      stage: 'batch_process',
      durationMs,
      storiesQueued: storyIds.length,
      storiesSucceeded: result.storiesSucceeded,
      storiesFailed: result.storiesFailed,
      success: result.workflowSuccess ?? false,
    })

    return BatchProcessResultSchema.parse({
      batchId,
      success: result.workflowSuccess ?? false,
      storiesQueued: storyIds.length,
      storiesSucceeded: result.storiesSucceeded ?? 0,
      storiesFailed: result.storiesFailed ?? 0,
      storiesRetried: result.storiesRetried ?? 0,
      workerResults: result.workerResults ?? [],
      durationMs,
      completedAt: new Date().toISOString(),
      errors: result.errors ?? [],
      warnings: result.warnings ?? [],
    })
  } catch (error) {
    const durationMs = Date.now() - startTime
    const msg = error instanceof Error ? error.message : 'Unknown error during batch process'

    logger.error('graph_failed', {
      batchId,
      stage: 'batch_process',
      durationMs,
      error: msg,
    })

    return {
      batchId,
      success: false,
      storiesQueued: storyIds.length,
      storiesSucceeded: 0,
      storiesFailed: 0,
      storiesRetried: 0,
      workerResults: [],
      durationMs,
      completedAt: new Date().toISOString(),
      errors: [msg],
      warnings: [],
    }
  }
}
```

---

## 9. Export Pattern in graphs/index.ts

**File:** `packages/backend/orchestrator/src/graphs/index.ts` (lines 155-180)

**Pattern:**
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

## Implementation Checklist

- [ ] ST-1: Schemas and state annotation (append reducer critical)
- [ ] ST-2: Dispatcher (Send[] conditional edge) and worker node (retry logic)
- [ ] ST-3: Fan-in (append aggregation) and complete node
- [ ] ST-4: Entry point (thread ID, logger) and node adapter
- [ ] ST-5: Exports in graphs/index.ts
- [ ] ST-6: Vitest tests covering all patterns

---

**Remember:**
1. **Dispatcher is NOT a node** — Use `.addConditionalEdges(START, ...)` not `.addNode()`
2. **append reducer is CRITICAL** — Use for workerResults[], errors[], warnings[]
3. **Injectable stubs are config-based** — z.unknown().optional(), never import unimplemented files
4. **Per-story retry count** — Track in BatchWorkerResult, not shared state
5. **Thread ID: `${batchId}:batch-process:${attempt}`** — Used in configurable.thread_id

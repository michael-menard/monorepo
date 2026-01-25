# Dev Feasibility Review: wrkf-1020 — Node Runner Infrastructure

**Story:** wrkf-1020: Node Runner Infrastructure
**Date:** 2026-01-23
**Reviewer:** pm-dev-feasibility-review

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| LangGraphJS node signature differs from assumed pattern | High | LangGraph nodes return **partial state updates**, not full state. Node factory must accommodate this partial return pattern rather than full state replacement. |
| Error handling not built into LangGraph node API | High | LangGraph docs do not document error handling in nodes. Node runner must implement try/catch wrapper with `NodeErrorSchema` population. |
| @repo/logger pino dependency may conflict with orchestrator's node.js environment | Medium | Logger uses pino which is Lambda-optimized. Test in orchestrator package context; may need `createLogger` variant. |
| Retry logic complexity for LLM vs tool nodes | Medium | Different node types need different retry strategies (LLM timeout vs transient network vs tool failure). Design retry config per node type. |
| Circular dependency between node runner and state schemas | Low | Node runner depends on wrkf-1010 state. Keep imports one-directional; runner imports state, not vice versa. |
| State mutation helpers may conflict with LangGraph's reducer pattern | Medium | LangGraph uses reducer functions for merging partial updates. Helpers must produce partial updates compatible with reducers defined in wrkf-1010. |

---

## Change Surface

| Path | Action | Notes |
|------|--------|-------|
| `packages/backend/orchestrator/src/runner/index.ts` | CREATE | Main exports for runner module |
| `packages/backend/orchestrator/src/runner/node-factory.ts` | CREATE | Factory for creating typed nodes with infrastructure wrappers |
| `packages/backend/orchestrator/src/runner/error-handler.ts` | CREATE | Error capture and `NodeErrorSchema` population utilities |
| `packages/backend/orchestrator/src/runner/retry.ts` | CREATE | Retry logic adapted from `@repo/api-client` patterns |
| `packages/backend/orchestrator/src/runner/logger.ts` | CREATE | Logger configuration for orchestrator context |
| `packages/backend/orchestrator/src/runner/state-helpers.ts` | CREATE | State mutation/update utilities producing partial updates |
| `packages/backend/orchestrator/src/runner/__tests__/node-factory.test.ts` | CREATE | Unit tests for node factory |
| `packages/backend/orchestrator/src/runner/__tests__/error-handler.test.ts` | CREATE | Unit tests for error handling |
| `packages/backend/orchestrator/src/runner/__tests__/retry.test.ts` | CREATE | Unit tests for retry logic |
| `packages/backend/orchestrator/src/index.ts` | MODIFY | Re-export runner module |
| `packages/backend/orchestrator/package.json` | MODIFY | Add `@repo/logger` dependency |

---

## Hidden Dependencies

- **@repo/logger dependency** — Must be added to `packages/backend/orchestrator/package.json`. Currently only has `@langchain/core`, `@langchain/langgraph`, and `zod`.

- **pino runtime** — The `@repo/logger` package uses pino v9.9.0. This should work in Node.js but Lambda-specific optimizations (X-Ray trace extraction, AWS context fields) may not apply in the orchestrator context.

- **Existing retry pattern in @repo/api-client** — The `packages/core/api-client/src/retry/retry-logic.ts` file provides a comprehensive retry implementation with:
  - `withRetry()` wrapper function
  - `CircuitBreaker` class
  - `isRetryableError()` classification
  - Exponential backoff with jitter
  - Priority-based retry configs

  This pattern should be adapted (not duplicated) for the orchestrator.

- **wrkf-1010 dependency** — Node runner imports from:
  - `GraphStateSchema` — Full state type
  - `NodeErrorSchema` — Error capture schema
  - `RoutingFlagSchema` — Routing decisions (proceed, retry, blocked, escalate, skip, complete)

  These must be available and stable before node runner implementation.

- **LangGraphJS Annotation API** — The wrkf-1010 DEV-FEASIBILITY notes uncertainty about whether pure Zod schemas or LangGraph's `Annotation.Root()` pattern is needed. This decision affects how node runner produces state updates.

---

## Missing AC Recommendations

Based on analysis of the scope description, LangGraph patterns, and existing codebase patterns, the following acceptance criteria should be added:

- [ ] **AC-1:** `createNode()` factory function accepts a node implementation function and returns a LangGraph-compatible node with error handling, logging, and retry wrappers.

- [ ] **AC-2:** Node factory signature matches LangGraph pattern: `(state: GraphState, config?: RunnableConfig) => Promise<Partial<GraphState>>` returning partial state updates.

- [ ] **AC-3:** All node executions log entry/exit with `@repo/logger`, including node name, execution time, and state field changes.

- [ ] **AC-4:** Error handler captures exceptions and populates `NodeErrorSchema` in state's `errors` array without crashing graph execution.

- [ ] **AC-5:** Retry logic supports configurable strategies: `none`, `exponential`, `linear` with per-node-type defaults.

- [ ] **AC-6:** Retry logic respects `RoutingFlagSchema` values — nodes returning `retry` flag trigger automatic re-execution.

- [ ] **AC-7:** State mutation helpers produce partial state updates compatible with LangGraph reducer merging.

- [ ] **AC-8:** `wrapWithInfrastructure()` higher-order function allows composing error handling, logging, and retry around any node implementation.

- [ ] **AC-9:** Node factory supports both sync and async node implementations.

- [ ] **AC-10:** Unit tests cover happy path execution, error capture, retry exhaustion, and logging behavior with 80%+ coverage for `src/runner/`.

- [ ] **AC-11:** TypeScript compilation passes with strict mode; node factory provides full type inference for state input/output.

---

## Integration Notes

### @repo/logger Integration

The `@repo/logger` package exports several logger types:

1. **`logger` (SimpleLogger)** — Basic pino-based logger with context support
   - `import { logger } from '@repo/logger'`
   - Uses: `logger.info('message', ...args)`

2. **`createLogger(context)`** — Factory for named loggers
   - `import { createLogger } from '@repo/logger'`
   - Returns `SimpleLogger` instance with context prefix

3. **`LambdaLogger`** — AWS Lambda-optimized with X-Ray trace support
   - `import { createLambdaLogger } from '@repo/logger'`
   - Not appropriate for orchestrator (Lambda-specific)

**Recommendation for wrkf-1020:**
```typescript
// packages/backend/orchestrator/src/runner/logger.ts
import { createLogger } from '@repo/logger'

export const orchestratorLogger = createLogger('orchestrator')

export function createNodeLogger(nodeName: string) {
  return createLogger(`orchestrator:${nodeName}`)
}
```

The `SimpleLogger` class provides `debug`, `info`, `warn`, `error` methods with structured pino output. This matches the codebase pattern used in `packages/core/api-client/src/retry/retry-logic.ts`:

```typescript
const logger = createLogger('api-client:retry-logic')
logger.warn(`Retry attempt ${attempt}/${retryConfig.maxAttempts}...`, undefined, { ... })
```

### LangGraph Compatibility

Based on LangGraph documentation and patterns:

1. **Node Signature:** Nodes receive full state but return **partial updates**:
   ```typescript
   type NodeFunction<S> = (state: S, config?: RunnableConfig) => Promise<Partial<S>>
   ```

2. **Partial State Returns:** LangGraph merges partial updates using reducer functions. The node runner should NOT require nodes to return full state.

3. **No Built-in Retry:** LangGraph does not provide native retry on node failure. The node runner must implement retry wrapper:
   ```typescript
   async function withNodeRetry<S>(
     node: NodeFunction<S>,
     state: S,
     config: NodeRetryConfig
   ): Promise<Partial<S>> {
     // Implement exponential backoff retry
   }
   ```

4. **Error Propagation:** LangGraph will halt execution if a node throws. The node runner should catch errors and return them in state's `errors` array, using the `RoutingFlagSchema` to signal `blocked` or `escalate`.

5. **RunnableConfig:** LangGraph passes a config object as second argument with:
   - `configurable?: Record<string, any>` — User-provided config
   - `callbacks?: Callbacks` — For streaming/tracing
   - `tags?: string[]` — Metadata tags
   - `metadata?: Record<string, unknown>` — Additional metadata

**Recommended Node Factory Pattern:**
```typescript
import { z } from 'zod'
import { GraphStateSchema, NodeErrorSchema, RoutingFlagSchema } from '../state'
import { createNodeLogger } from './logger'
import { withRetry } from './retry'

type GraphState = z.infer<typeof GraphStateSchema>
type NodeError = z.infer<typeof NodeErrorSchema>

interface NodeConfig {
  name: string
  retry?: {
    maxAttempts: number
    backoffMs: number
  }
}

export function createNode<T extends Partial<GraphState>>(
  config: NodeConfig,
  implementation: (state: GraphState) => Promise<T>
): (state: GraphState) => Promise<T & { errors?: NodeError[] }> {
  const logger = createNodeLogger(config.name)

  return async (state: GraphState) => {
    const startTime = Date.now()
    logger.info(`Node ${config.name} starting`, { storyId: state.storyId })

    try {
      const result = await withRetry(
        () => implementation(state),
        config.retry || { maxAttempts: 3, backoffMs: 1000 }
      )

      logger.info(`Node ${config.name} completed`, {
        storyId: state.storyId,
        durationMs: Date.now() - startTime,
      })

      return result
    } catch (error) {
      const nodeError: NodeError = {
        nodeName: config.name,
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
        stack: error instanceof Error ? error.stack : undefined,
      }

      logger.error(`Node ${config.name} failed`, error, {
        storyId: state.storyId,
        durationMs: Date.now() - startTime,
      })

      return {
        errors: [...(state.errors || []), nodeError],
        routingFlags: { ...state.routingFlags, [config.name]: 'blocked' },
      } as T & { errors: NodeError[] }
    }
  }
}
```

### Retry Logic Adaptation

The existing `packages/core/api-client/src/retry/retry-logic.ts` provides excellent patterns to adapt:

| Existing Pattern | Orchestrator Adaptation |
|------------------|------------------------|
| `withRetry()` wrapper | `withNodeRetry()` for graph nodes |
| `isRetryableError()` | `isNodeRetryable()` — different error types (LLM timeout, tool failure, state validation) |
| `CircuitBreaker` | May not apply — nodes run sequentially in graph, not concurrent API calls |
| `calculateRetryDelay()` | Reuse exponential backoff with jitter |
| `RetryConfig` type | `NodeRetryConfig` — simpler, no serverless-specific fields |

**Recommended approach:** Import core utilities from `@repo/api-client` or create a shared retry package, rather than duplicating logic.

---

## Blockers

**No hard blockers** — This story can proceed once wrkf-1010 is implemented.

**Soft blockers / dependencies:**

1. **wrkf-1010 completion** — The `GraphStateSchema`, `NodeErrorSchema`, and `RoutingFlagSchema` must be defined before node runner can use them. These are in `generated` status.

2. **LangGraph Annotation decision** — The wrkf-1010 feasibility review flagged uncertainty about whether to use pure Zod schemas or LangGraph's `Annotation.Root()` pattern. This decision affects how node runner produces state updates:
   - If pure Zod: Node runner returns plain objects matching `Partial<GraphState>`
   - If Annotation: May need to use LangGraph's channel update syntax

   **Recommendation:** Proceed with pure Zod for now; LangGraph v0.2.x supports generic typed state without requiring Annotation wrappers.

3. **@repo/logger dependency** — Must be added to orchestrator's package.json before implementation.

---

## Reference Patterns

### Existing Retry Pattern (api-client)

```typescript
// packages/core/api-client/src/retry/retry-logic.ts
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  endpoint = 'default',
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  let lastError: any

  for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
    try {
      const result = await operation()
      return result
    } catch (error) {
      lastError = error
      const errorInfo = isRetryableError(error)

      if (!errorInfo.isRetryable || attempt === retryConfig.maxAttempts) {
        break
      }

      const delay = calculateRetryDelay(attempt, errorInfo, retryConfig)
      await sleep(delay)
    }
  }

  throw lastError
}
```

### Existing Logger Pattern (api-client)

```typescript
// packages/core/api-client/src/retry/retry-logic.ts
import { createLogger } from '@repo/logger'

const logger = createLogger('api-client:retry-logic')

logger.warn(
  `Retry attempt ${attempt}/${retryConfig.maxAttempts} after ${delay}ms`,
  undefined,
  {
    endpoint,
    error: errorInfo.message,
    statusCode: errorInfo.statusCode,
  },
)
```

### Proposed Node Factory Pattern

```typescript
// packages/backend/orchestrator/src/runner/node-factory.ts
import { z } from 'zod'
import { GraphStateSchema, NodeErrorSchema } from '../state'
import { createNodeLogger } from './logger'
import { withNodeRetry, NodeRetryConfig } from './retry'

type GraphState = z.infer<typeof GraphStateSchema>

export interface CreateNodeOptions {
  name: string
  retry?: Partial<NodeRetryConfig>
  logStateFields?: (keyof GraphState)[]
}

export function createNode<T extends Partial<GraphState>>(
  options: CreateNodeOptions,
  implementation: (state: GraphState) => Promise<T>,
) {
  const logger = createNodeLogger(options.name)

  return async (state: GraphState): Promise<T> => {
    logger.debug(`Entering node`, {
      storyId: state.storyId,
      ...(options.logStateFields && Object.fromEntries(
        options.logStateFields.map(k => [k, state[k]])
      )),
    })

    const startTime = performance.now()

    try {
      const result = await withNodeRetry(
        () => implementation(state),
        options.retry,
      )

      logger.info(`Node completed`, {
        storyId: state.storyId,
        durationMs: Math.round(performance.now() - startTime),
      })

      return result

    } catch (error) {
      logger.error(`Node failed after retries`, error, {
        storyId: state.storyId,
        durationMs: Math.round(performance.now() - startTime),
      })

      // Return error in state rather than throwing
      return {
        errors: [
          ...(state.errors || []),
          {
            nodeName: options.name,
            message: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
            retryable: false,
          },
        ],
      } as T
    }
  }
}
```

---

## Verdict

**CAN_IMPLEMENT** — with minor prerequisites

The story scope is well-defined and technically feasible. The codebase provides excellent patterns to follow:
- `@repo/logger` for structured logging
- `@repo/api-client/retry/retry-logic.ts` for retry patterns
- Existing Zod schema patterns in `packages/backend/*-core/`

**Prerequisites before starting:**
1. Complete wrkf-1010 (GraphState Schema) — provides type definitions
2. Add `@repo/logger` to orchestrator package.json
3. Confirm pure Zod approach (recommended) vs LangGraph Annotation

**Estimated complexity:** Medium — 8-12 hours implementation + tests

---

*Generated by pm-dev-feasibility-review agent | 2026-01-23*

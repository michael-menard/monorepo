# Implementation Plan - WRKF-1020: Node Runner Infrastructure

## Scope Surface

- **backend/API:** yes (pure TypeScript library)
- **frontend/UI:** no
- **infra/config:** no
- **notes:** Adds `src/runner/` module to `@repo/orchestrator` package. No HTTP endpoints, no UI components.

---

## Acceptance Criteria Checklist

### Original ACs (AC-1 through AC-16)
- [ ] AC-1: `createNode()` factory with error handling, logging, retry wrappers
- [ ] AC-2: Node signature matches `(state, config?) => Promise<Partial<GraphState>>`
- [ ] AC-3: Entry/exit logging with node name, story ID, duration (ms)
- [ ] AC-4: Error handler populates `NodeErrorSchema` in state.errors
- [ ] AC-5: Retry logic with configurable `maxAttempts` and `backoffMs`
- [ ] AC-6: Retry exhaustion sets `routingFlags` to `blocked`
- [ ] AC-7: `updateState()` produces LangGraph-compatible partial updates
- [ ] AC-8: State helpers support all field types (artifactPaths, routingFlags, evidenceRefs, gateDecisions, errors)
- [ ] AC-9: Factory supports sync and async node implementations
- [ ] AC-10: All exports accessible from `@repo/orchestrator`
- [ ] AC-11: 80%+ test coverage for `src/runner/`
- [ ] AC-12: TypeScript compilation with strict mode
- [ ] AC-13: `@repo/logger` added to dependencies
- [ ] AC-14: No `console.log` statements
- [ ] AC-15: Optional `timeoutMs` config with `NodeTimeoutError`
- [ ] AC-16: `isRetryableNodeError()` classifies ZodError as non-retryable

### New ACs (AC-17 through AC-24)
- [ ] AC-17: Cancellation via `AbortSignal` (RunnableConfig.signal)
- [ ] AC-18: Retry jitter (0-25% variance)
- [ ] AC-19: `onTimeout` cleanup callback
- [ ] AC-20: Stack trace sanitization
- [ ] AC-21: Circuit breaker pattern
- [ ] AC-22: Node execution context (traceId, graphExecutionId, etc.)
- [ ] AC-23: `onRetryAttempt` callback
- [ ] AC-24: Error message templates (NODE_TIMEOUT, RETRY_EXHAUSTED, etc.)

---

## Files To Touch (Expected)

### Modify
| Path | Change |
|------|--------|
| `packages/backend/orchestrator/package.json` | Add `@repo/logger` dependency |
| `packages/backend/orchestrator/src/index.ts` | Export runner module |

### Create - Source Files
| Path | Purpose |
|------|---------|
| `packages/backend/orchestrator/src/runner/index.ts` | Runner module exports |
| `packages/backend/orchestrator/src/runner/types.ts` | Zod schemas for NodeConfig, NodeRetryConfig, etc. |
| `packages/backend/orchestrator/src/runner/errors.ts` | NodeTimeoutError, NodeCancellationError, error constants |
| `packages/backend/orchestrator/src/runner/error-classification.ts` | `isRetryableNodeError()` utility |
| `packages/backend/orchestrator/src/runner/timeout.ts` | Timeout wrapper with cleanup callback |
| `packages/backend/orchestrator/src/runner/retry.ts` | `withNodeRetry()` with jitter, circuit breaker |
| `packages/backend/orchestrator/src/runner/circuit-breaker.ts` | Circuit breaker implementation |
| `packages/backend/orchestrator/src/runner/state-helpers.ts` | `updateState()` helper |
| `packages/backend/orchestrator/src/runner/logger.ts` | `createNodeLogger()` factory |
| `packages/backend/orchestrator/src/runner/context.ts` | Node execution context |
| `packages/backend/orchestrator/src/runner/node-factory.ts` | `createNode()` factory |

### Create - Test Files
| Path | Purpose |
|------|---------|
| `packages/backend/orchestrator/src/runner/__tests__/types.test.ts` | Schema validation tests |
| `packages/backend/orchestrator/src/runner/__tests__/errors.test.ts` | Custom error class tests |
| `packages/backend/orchestrator/src/runner/__tests__/error-classification.test.ts` | Error classification tests |
| `packages/backend/orchestrator/src/runner/__tests__/timeout.test.ts` | Timeout wrapper tests |
| `packages/backend/orchestrator/src/runner/__tests__/retry.test.ts` | Retry logic tests |
| `packages/backend/orchestrator/src/runner/__tests__/circuit-breaker.test.ts` | Circuit breaker tests |
| `packages/backend/orchestrator/src/runner/__tests__/state-helpers.test.ts` | State helper tests |
| `packages/backend/orchestrator/src/runner/__tests__/logger.test.ts` | Logger factory tests |
| `packages/backend/orchestrator/src/runner/__tests__/context.test.ts` | Execution context tests |
| `packages/backend/orchestrator/src/runner/__tests__/node-factory.test.ts` | Factory tests |
| `packages/backend/orchestrator/src/runner/__tests__/integration.test.ts` | Integration tests |

---

## Reuse Targets

| Package/Module | Reuse Pattern |
|----------------|---------------|
| `@repo/logger` | `createLogger()` for structured logging |
| `@repo/api-client/retry/retry-logic.ts` | Adapt `calculateRetryDelay()`, `CircuitBreaker`, jitter patterns |
| `@repo/api-client/retry/error-handling.ts` | Reference for error classification patterns |
| `packages/backend/orchestrator/src/state/` | Import `GraphState`, `NodeError`, `RoutingFlag` types |
| `zod` | Schema definitions, `ZodError` detection |
| `@langchain/core` | `RunnableConfig` type for config parameter |

---

## Architecture Notes (Ports & Adapters)

### Core Layer (`src/runner/`)
- Pure TypeScript functions with no external I/O
- Depends only on: `zod`, `@repo/logger`, state types from `src/state/`
- No direct imports from `@langchain/langgraph` except types

### Boundaries
- `createNode()` returns a LangGraph-compatible node function
- Circuit breaker is node-local (per node instance, not global)
- Error classification is deterministic (no async operations)

### Pattern Decisions
| Pattern | Implementation |
|---------|----------------|
| Retry | Adapt from `@repo/api-client` with jitter (0-25%) |
| Circuit Breaker | Node-local instance, not global Map |
| Logging | Pino via `createLogger('orchestrator:runner')` |
| Error Capture | Return in state.errors, never throw to graph |
| Timeout | Promise.race with AbortController |

---

## Step-by-Step Plan (Small Steps)

### Step 1: Add @repo/logger dependency
**Objective:** Enable structured logging in orchestrator package
**Files:** `packages/backend/orchestrator/package.json`
**Verification:** `pnpm install` succeeds, no workspace errors

### Step 2: Create error constants and classes
**Objective:** Define NodeTimeoutError, NodeCancellationError, and error code constants
**Files:** `src/runner/errors.ts`, `src/runner/__tests__/errors.test.ts`
**Verification:** `pnpm test --filter @repo/orchestrator` passes

### Step 3: Create Zod schemas for configuration types
**Objective:** Define NodeConfig, NodeRetryConfig, CircuitBreakerConfig, NodeExecutionContext schemas
**Files:** `src/runner/types.ts`, `src/runner/__tests__/types.test.ts`
**Verification:** Types compile, schema validation tests pass

### Step 4: Implement error classification
**Objective:** Create `isRetryableNodeError()` that classifies errors correctly
**Files:** `src/runner/error-classification.ts`, `src/runner/__tests__/error-classification.test.ts`
**Verification:** Tests for ZodError (non-retryable), TypeError (non-retryable), timeout (retryable)

### Step 5: Implement stack trace sanitization
**Objective:** Create utility to sanitize stack traces (max length, filter node_modules)
**Files:** Update `src/runner/errors.ts`, add tests in `errors.test.ts`
**Verification:** Sanitization tests pass

### Step 6: Implement circuit breaker
**Objective:** Create per-node circuit breaker with configurable threshold and recovery
**Files:** `src/runner/circuit-breaker.ts`, `src/runner/__tests__/circuit-breaker.test.ts`
**Verification:** Circuit opens after failures, half-open recovery works

### Step 7: Implement timeout wrapper
**Objective:** Create timeout wrapper with cleanup callback and AbortSignal support
**Files:** `src/runner/timeout.ts`, `src/runner/__tests__/timeout.test.ts`
**Verification:** Timeout fires correctly, cleanup callback invoked, abort signal handled

### Step 8: Implement retry logic
**Objective:** Create `withNodeRetry()` with jitter, backoff, and onRetryAttempt callback
**Files:** `src/runner/retry.ts`, `src/runner/__tests__/retry.test.ts`
**Verification:** Jitter variance is 0-25%, backoff multiplier works, callback fires

### Step 9: Implement state helpers
**Objective:** Create `updateState()` for immutable partial state updates
**Files:** `src/runner/state-helpers.ts`, `src/runner/__tests__/state-helpers.test.ts`
**Verification:** All field types (artifactPaths, routingFlags, etc.) update correctly

### Step 10: Implement node logger factory
**Objective:** Create `createNodeLogger()` that wraps @repo/logger with node context
**Files:** `src/runner/logger.ts`, `src/runner/__tests__/logger.test.ts`
**Verification:** Logger includes node name, story ID in output

### Step 11: Implement execution context
**Objective:** Create NodeExecutionContext with traceId, graphExecutionId, retryAttempt
**Files:** `src/runner/context.ts`, `src/runner/__tests__/context.test.ts`
**Verification:** Context creation and access works correctly

### Step 12: Implement node factory
**Objective:** Create `createNode()` that composes all wrappers (logging, retry, timeout, error handling)
**Files:** `src/runner/node-factory.ts`, `src/runner/__tests__/node-factory.test.ts`
**Verification:** Factory creates callable node, all wrappers applied in correct order

### Step 13: Create runner module index
**Objective:** Export all runner module components
**Files:** `src/runner/index.ts`
**Verification:** All exports accessible

### Step 14: Update package index
**Objective:** Export runner module from package root
**Files:** `packages/backend/orchestrator/src/index.ts`
**Verification:** Imports from `@repo/orchestrator` resolve correctly

### Step 15: Integration tests
**Objective:** Test full node execution flow with all features
**Files:** `src/runner/__tests__/integration.test.ts`
**Verification:** Happy path, error capture, retry exhaustion, circuit breaker integration all work

### Step 16: Coverage verification
**Objective:** Ensure 80%+ coverage for src/runner/
**Files:** N/A (run coverage)
**Verification:** `pnpm test:coverage --filter @repo/orchestrator` shows 80%+ for runner/

### Step 17: Final lint and type check
**Objective:** Ensure no lint errors, all types compile
**Files:** All created files
**Verification:** `pnpm lint --filter @repo/orchestrator`, `pnpm check-types --filter @repo/orchestrator`

---

## Test Plan

### Unit Tests (per file)
```bash
pnpm test --filter @repo/orchestrator
```

### Type Check
```bash
pnpm check-types --filter @repo/orchestrator
```

### Lint
```bash
pnpm lint --filter @repo/orchestrator
```

### Coverage (must be 80%+)
```bash
pnpm test:coverage --filter @repo/orchestrator
# Verify src/runner/ shows 80%+ line coverage
```

### Build
```bash
pnpm build --filter @repo/orchestrator
```

### Playwright
Not applicable (no UI changes)

### HTTP Contract
Not applicable (no API endpoints)

---

## Stop Conditions / Blockers

### None Identified

All dependencies are available:
- wrkf-1010 (GraphState schemas) is at `uat` status with implementation complete
- `@repo/logger` exists and exports `createLogger()`
- `@langchain/core` is installed (provides RunnableConfig type)
- Retry patterns in `@repo/api-client` are available to adapt

---

## Token Log

| Operation | Type | Bytes | Tokens (est) |
|-----------|------|-------|--------------|
| Read: wrkf-1020.md | input | 27,886 | ~6,972 |
| Read: LESSONS-LEARNED.md | input | 23,104 | ~5,776 |
| Read: orchestrator/src/index.ts | input | 1,448 | ~362 |
| Read: orchestrator/package.json | input | 728 | ~182 |
| Read: api-client retry-logic.ts | input | 13,284 | ~3,321 |
| Read: api-client error-handling.ts | input | 5,128 | ~1,282 |
| Read: logger/src/index.ts | input | 1,476 | ~369 |
| Read: logger/src/simple-logger.ts | input | 3,152 | ~788 |
| Read: state/index.ts | input | 1,600 | ~400 |
| Read: state/refs/node-error.ts | input | 740 | ~185 |
| Read: state/graph-state.ts | input | 4,724 | ~1,181 |
| Read: SCOPE.md | input | 730 | ~183 |
| Write: IMPLEMENTATION-PLAN.md | output | 12,500 | ~3,125 |
| **Total** | — | **96,500** | **~24,126** |

---

## Implementation Notes

### Jitter Pattern (from @repo/api-client)
```typescript
// 0-25% jitter variance
const jitterRange = delay * 0.25
const jitter = Math.random() * jitterRange
return delay + jitter
```

### Circuit Breaker Pattern (adapted from @repo/api-client)
```typescript
class NodeCircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

  canExecute(): boolean { ... }
  recordSuccess(): void { ... }
  recordFailure(): void { ... }
}
```

### Error Capture Pattern
```typescript
// Never throw - always return error in state
return updateState(state, {
  errors: [...state.errors, {
    nodeId: config.name,
    message: error.message,
    code: getErrorCode(error),
    timestamp: new Date().toISOString(),
    stack: sanitizeStack(error.stack),
    recoverable: isRetryableNodeError(error),
  }],
  routingFlags: { ...state.routingFlags, blocked: true }
})
```

### Timeout with AbortSignal
```typescript
async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  signal?: AbortSignal,
  onTimeout?: () => void
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        onTimeout?.()
        reject(new NodeTimeoutError(...))
      }, timeoutMs)
      signal?.addEventListener('abort', () => clearTimeout(timer))
    })
  ])
}
```

---

*Generated by Planner Agent | 2026-01-24*

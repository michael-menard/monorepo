# PROOF - WRKF-1020: Node Runner Infrastructure

**Date:** 2026-01-24
**Status:** COMPLETE

---

## Story

**WRKF-1020** - Node Runner Infrastructure

Provide reusable infrastructure for all LangGraph nodes - a factory pattern, error capture, retry logic, logging integration, and state mutation helpers - that enables consistent, observable, and resilient node execution.

---

## Summary

What was implemented:

- Created `createNode()` factory function that wraps node implementations with logging, error handling, retry, timeout, and circuit breaker infrastructure
- Implemented custom error classes: `NodeTimeoutError`, `NodeCancellationError`, `NodeCircuitOpenError`, `NodeRetryExhaustedError` with error code constants
- Created `isRetryableNodeError()` utility that classifies errors (ZodError/TypeError NOT retryable; timeout/network ARE retryable)
- Implemented `withNodeRetry()` with configurable exponential backoff, jitter (0-25%), and `onRetryAttempt` callback
- Created `NodeCircuitBreaker` class with CLOSED/OPEN/HALF_OPEN states for fail-fast behavior
- Implemented `withTimeout()` wrapper with AbortSignal support and `onTimeout` cleanup callback
- Created `updateState()` and field-specific state mutation helpers for immutable partial state updates
- Implemented `createNodeLogger()` factory integrating with `@repo/logger` for structured entry/exit logging
- Created `NodeExecutionContext` schema with traceId, graphExecutionId, retryAttempt for observability
- Implemented stack trace sanitization (maxLength, filterNodeModules, relativePaths)

---

## Acceptance Criteria -> Evidence

### AC-1: createNode() factory with error handling, logging, retry wrappers
- **Evidence:**
  - File: `packages/backend/orchestrator/src/runner/node-factory.ts` (created)
  - Tests: `node-factory.test.ts` - 23 tests covering factory creation, wrapper composition
  - Command: `pnpm test --filter @repo/orchestrator -- src/runner/__tests__/node-factory.test.ts` - PASSED

### AC-2: Node signature matches (state, config?) => Promise<Partial<GraphState>>
- **Evidence:**
  - File: `packages/backend/orchestrator/src/runner/node-factory.ts` - `NodeImplementation` type definition
  - TypeScript compilation: `pnpm build --filter @repo/orchestrator` - PASSED
  - Tests: `node-factory.test.ts` validates return type is Partial<GraphState>

### AC-3: Entry/exit logging with node name, story ID, duration (ms)
- **Evidence:**
  - File: `packages/backend/orchestrator/src/runner/logger.ts` - `logEntry()`, `logExit()` methods
  - Tests: `logger.test.ts` - 14 tests verifying logging behavior
  - Command: `pnpm test --filter @repo/orchestrator -- src/runner/__tests__/logger.test.ts` - PASSED

### AC-4: Error handler populates NodeErrorSchema in state.errors
- **Evidence:**
  - File: `packages/backend/orchestrator/src/runner/state-helpers.ts` - `createNodeError()`, `addErrors()`
  - File: `packages/backend/orchestrator/src/runner/node-factory.ts` - error capture in catch block
  - Tests: `state-helpers.test.ts`, `node-factory.test.ts` - error capture tests

### AC-5: Retry logic with configurable maxAttempts and backoffMs
- **Evidence:**
  - File: `packages/backend/orchestrator/src/runner/retry.ts` - `withNodeRetry()` with `NodeRetryConfig`
  - File: `packages/backend/orchestrator/src/runner/types.ts` - `NodeRetryConfigSchema`
  - Tests: `retry.test.ts` - 22 tests covering retry configuration

### AC-6: Retry exhaustion sets routingFlags to blocked
- **Evidence:**
  - File: `packages/backend/orchestrator/src/runner/node-factory.ts` - returns blocked state on exhaustion
  - File: `packages/backend/orchestrator/src/runner/errors.ts` - `NodeRetryExhaustedError`
  - Tests: `integration.test.ts` - retry exhaustion test case

### AC-7: updateState() produces LangGraph-compatible partial updates
- **Evidence:**
  - File: `packages/backend/orchestrator/src/runner/state-helpers.ts` - `updateState()` function
  - Tests: `state-helpers.test.ts` - 30 tests covering immutable updates

### AC-8: State helpers support all field types
- **Evidence:**
  - File: `packages/backend/orchestrator/src/runner/state-helpers.ts` - `updateArtifactPaths()`, `updateRoutingFlags()`, `addEvidenceRefs()`, `updateGateDecisions()`, `addErrors()`
  - Tests: `state-helpers.test.ts` - tests for each field type

### AC-9: Factory supports sync and async implementations
- **Evidence:**
  - File: `packages/backend/orchestrator/src/runner/node-factory.ts` - `NodeImplementation` accepts both
  - Tests: `node-factory.test.ts` - tests with sync and async handlers

### AC-10: All exports accessible from @repo/orchestrator
- **Evidence:**
  - File: `packages/backend/orchestrator/src/runner/index.ts` - exports all runner components
  - File: `packages/backend/orchestrator/src/index.ts` - re-exports runner module
  - Command: `pnpm build --filter @repo/orchestrator` - PASSED

### AC-11: 80%+ test coverage for src/runner/
- **Evidence:**
  - Command: `pnpm test --filter @repo/orchestrator -- --coverage`
  - Coverage: **96.91%** for src/runner/ (exceeds 80% requirement)
  - Tests: 220 tests for runner module (327 total for package)

### AC-12: TypeScript compilation with strict mode
- **Evidence:**
  - Command: `pnpm --filter @repo/orchestrator exec tsc --noEmit` - PASSED
  - Command: `pnpm build --filter @repo/orchestrator` - PASSED

### AC-13: @repo/logger added to dependencies
- **Evidence:**
  - File: `packages/backend/orchestrator/package.json` - `"@repo/logger": "workspace:*"`

### AC-14: No console.log statements
- **Evidence:**
  - Command: `grep -r "console.log" packages/backend/orchestrator/src/runner/`
  - Result: Only match is in comment documenting AC requirement

### AC-15: Optional timeoutMs with NodeTimeoutError
- **Evidence:**
  - File: `packages/backend/orchestrator/src/runner/timeout.ts` - `withTimeout()` function
  - File: `packages/backend/orchestrator/src/runner/errors.ts` - `NodeTimeoutError` class
  - Tests: `timeout.test.ts` - 18 tests

### AC-16: isRetryableNodeError() classifies errors correctly
- **Evidence:**
  - File: `packages/backend/orchestrator/src/runner/error-classification.ts` - `isRetryableNodeError()`
  - Tests: `error-classification.test.ts` - 31 tests covering ZodError (false), TypeError (false), NodeTimeoutError (true)

### AC-17: Cancellation via AbortSignal
- **Evidence:**
  - File: `packages/backend/orchestrator/src/runner/timeout.ts` - AbortSignal support
  - File: `packages/backend/orchestrator/src/runner/errors.ts` - `NodeCancellationError`
  - Tests: `timeout.test.ts` - cancellation tests

### AC-18: Retry jitter (0-25% variance)
- **Evidence:**
  - File: `packages/backend/orchestrator/src/runner/retry.ts` - `calculateRetryDelay()` with jitter
  - File: `packages/backend/orchestrator/src/runner/types.ts` - `jitterFactor` in `NodeRetryConfigSchema`
  - Tests: `retry.test.ts` - jitter calculation tests

### AC-19: onTimeout cleanup callback
- **Evidence:**
  - File: `packages/backend/orchestrator/src/runner/timeout.ts` - `onTimeout` parameter
  - File: `packages/backend/orchestrator/src/runner/types.ts` - `onTimeout` in config
  - Tests: `timeout.test.ts` - cleanup callback tests

### AC-20: Stack trace sanitization
- **Evidence:**
  - File: `packages/backend/orchestrator/src/runner/errors.ts` - `sanitizeStackTrace()` function
  - Tests: `errors.test.ts` - sanitization tests (maxLength, filterNodeModules, relativePaths)

### AC-21: Circuit breaker pattern
- **Evidence:**
  - File: `packages/backend/orchestrator/src/runner/circuit-breaker.ts` - `NodeCircuitBreaker` class
  - File: `packages/backend/orchestrator/src/runner/errors.ts` - `NodeCircuitOpenError`
  - Tests: `circuit-breaker.test.ts` - 22 tests covering CLOSED/OPEN/HALF_OPEN states

### AC-22: Node execution context (traceId, graphExecutionId, etc.)
- **Evidence:**
  - File: `packages/backend/orchestrator/src/runner/types.ts` - `NodeExecutionContextSchema`
  - File: `packages/backend/orchestrator/src/runner/types.ts` - `createNodeExecutionContext()`
  - Tests: `types.test.ts` - context creation tests

### AC-23: onRetryAttempt callback
- **Evidence:**
  - File: `packages/backend/orchestrator/src/runner/retry.ts` - `onRetryAttempt` callback in `withNodeRetry()`
  - File: `packages/backend/orchestrator/src/runner/types.ts` - `onRetryAttempt` in `NodeRetryConfigSchema`
  - Tests: `retry.test.ts` - callback invocation tests

### AC-24: Error message templates
- **Evidence:**
  - File: `packages/backend/orchestrator/src/runner/errors.ts` - `NodeErrorCodes` constants, `NodeErrorMessages` templates
  - Tests: `errors.test.ts` - error code and message tests

---

## Reuse & Architecture Compliance

### Reuse-First Summary

**Reused:**
- `@repo/logger` - `createLogger()` for structured logging
- `zod` - Schema definitions and validation
- `@langchain/core` - `RunnableConfig` type
- Pattern from `@repo/api-client/retry/retry-logic.ts` - adapted `calculateRetryDelay()`, jitter, circuit breaker patterns
- Pattern from `@repo/api-client/retry/error-handling.ts` - adapted error classification approach
- `packages/backend/orchestrator/src/state/` - imported `GraphState`, `NodeError`, `RoutingFlag` types from wrkf-1010

**Created (and why):**
- `NodeTimeoutError`, `NodeCancellationError`, `NodeCircuitOpenError`, `NodeRetryExhaustedError` - Node-specific error types with different properties than HTTP errors
- `isRetryableNodeError()` - Different error classification rules for graph nodes (ZodError handling)
- `NodeCircuitBreaker` - Node-local circuit breaker (per instance, not global Map like HTTP client)
- `withTimeout()` - Integration with NodeExecutionContext and onTimeout callback specific to nodes
- `createNodeLogger()` - Entry/exit logging pattern specific to graph node execution
- `updateState()` and helpers - LangGraph requires partial state returns, not full state

### Ports & Adapters Compliance

**Core Layer (src/runner/):**
- Pure TypeScript functions with no external I/O
- All error classes, retry logic, circuit breaker, state helpers are transport-agnostic
- No direct imports from `@langchain/langgraph` except types

**Adapter Layer:**
- `RunnableConfig` from `@langchain/core` used as config parameter type
- `@repo/logger` handles actual logging transport

---

## Verification

### Decisive Commands

| Command | Outcome |
|---------|---------|
| `pnpm build --filter @repo/orchestrator` | PASSED - TypeScript compilation successful |
| `pnpm --filter @repo/orchestrator exec tsc --noEmit` | PASSED - No type errors |
| `pnpm eslint packages/backend/orchestrator/src/runner/*.ts` | PASSED - No lint errors |
| `pnpm test --filter @repo/orchestrator` | PASSED - 327/327 tests passing |
| `pnpm test --filter @repo/orchestrator -- --coverage` | PASSED - 96.91% coverage for src/runner/ |
| `grep -r "console.log" packages/backend/orchestrator/src/runner/` | PASSED - No console.log in code |

### Test Summary

| Test File | Tests | Status |
|-----------|-------|--------|
| errors.test.ts | 30 | PASSED |
| types.test.ts | 30 | PASSED |
| error-classification.test.ts | 31 | PASSED |
| circuit-breaker.test.ts | 22 | PASSED |
| timeout.test.ts | 18 | PASSED |
| retry.test.ts | 22 | PASSED |
| state-helpers.test.ts | 30 | PASSED |
| logger.test.ts | 14 | PASSED |
| node-factory.test.ts | 23 | PASSED |
| integration.test.ts | 21 | PASSED |
| **Total (runner)** | **220** | **PASSED** |

### Coverage Report (src/runner/)

| File | Statements | Branches | Functions | Lines |
|------|------------|----------|-----------|-------|
| circuit-breaker.ts | 92.95% | 86.36% | 100% | 92.95% |
| error-classification.ts | 100% | 100% | 100% | 100% |
| errors.ts | 100% | 100% | 100% | 100% |
| index.ts | 100% | 100% | 100% | 100% |
| logger.ts | 83.33% | 93.75% | 81.25% | 83.33% |
| node-factory.ts | 100% | 97.91% | 100% | 100% |
| retry.ts | 94.8% | 88.46% | 100% | 94.8% |
| state-helpers.ts | 100% | 100% | 100% | 100% |
| timeout.ts | 98.95% | 84.37% | 100% | 98.95% |
| types.ts | 95.12% | 75% | 100% | 95.12% |
| **Total** | **96.91%** | **93.82%** | **96.59%** | **96.91%** |

### Playwright
Not applicable - pure TypeScript library with no UI.

---

## Deviations / Notes

### Minor Deviations

1. **Separate types.ts file:** Implementation plan created a separate `types.ts` file for Zod schemas rather than inline definitions. This is acceptable as a reasonable architectural choice for maintainability.

2. **Additional utility functions:** Created convenience functions beyond AC requirements:
   - `createSimpleNode()` - No-retry node factory
   - `createLLMNode()` - LLM preset configuration
   - `createToolNode()` - Tool preset configuration
   - `RETRY_PRESETS` - Standard configurations for common node types

These additions do not conflict with ACs and provide useful conveniences for consumers.

---

## Blockers

**None.** No blockers were encountered during implementation.

---

## Files Created/Modified

### Source Files (11 created, 1 modified)

| File | Action |
|------|--------|
| `packages/backend/orchestrator/package.json` | MODIFIED - added @repo/logger dependency |
| `packages/backend/orchestrator/src/index.ts` | MODIFIED - added runner exports |
| `packages/backend/orchestrator/src/runner/index.ts` | CREATED |
| `packages/backend/orchestrator/src/runner/errors.ts` | CREATED |
| `packages/backend/orchestrator/src/runner/types.ts` | CREATED |
| `packages/backend/orchestrator/src/runner/error-classification.ts` | CREATED |
| `packages/backend/orchestrator/src/runner/circuit-breaker.ts` | CREATED |
| `packages/backend/orchestrator/src/runner/timeout.ts` | CREATED |
| `packages/backend/orchestrator/src/runner/retry.ts` | CREATED |
| `packages/backend/orchestrator/src/runner/state-helpers.ts` | CREATED |
| `packages/backend/orchestrator/src/runner/logger.ts` | CREATED |
| `packages/backend/orchestrator/src/runner/node-factory.ts` | CREATED |

### Test Files (10 created)

| File | Tests |
|------|-------|
| `packages/backend/orchestrator/src/runner/__tests__/errors.test.ts` | 30 |
| `packages/backend/orchestrator/src/runner/__tests__/types.test.ts` | 30 |
| `packages/backend/orchestrator/src/runner/__tests__/error-classification.test.ts` | 31 |
| `packages/backend/orchestrator/src/runner/__tests__/circuit-breaker.test.ts` | 22 |
| `packages/backend/orchestrator/src/runner/__tests__/timeout.test.ts` | 18 |
| `packages/backend/orchestrator/src/runner/__tests__/retry.test.ts` | 22 |
| `packages/backend/orchestrator/src/runner/__tests__/state-helpers.test.ts` | 30 |
| `packages/backend/orchestrator/src/runner/__tests__/logger.test.ts` | 14 |
| `packages/backend/orchestrator/src/runner/__tests__/node-factory.test.ts` | 23 |
| `packages/backend/orchestrator/src/runner/__tests__/integration.test.ts` | 21 |

---

## Token Summary

### This Agent (Proof Writer)

| Operation | Type | Bytes | Tokens (est) |
|-----------|------|-------|--------------|
| Read: wrkf-1020.md | input | 27,886 | ~6,972 |
| Read: IMPLEMENTATION-PLAN.md | input | 12,500 | ~3,125 |
| Read: PLAN-VALIDATION.md | input | 8,400 | ~2,100 |
| Read: BACKEND-LOG.md | input | 15,600 | ~3,900 |
| Read: VERIFICATION.md | input | 11,600 | ~2,900 |
| Read: SCOPE.md | input | 1,200 | ~300 |
| Bash: test/build/lint verification | input | 2,000 | ~500 |
| Write: PROOF-WRKF-1020.md | output | 14,000 | ~3,500 |
| **Total** | — | **93,186** | **~23,297** |

### Aggregated from Sub-Agents

| Agent | Input Tokens | Output Tokens | Total |
|-------|--------------|---------------|-------|
| Planner | ~18,350 | ~3,125 | ~21,475 |
| Plan Validator | ~8,500 | ~2,100 | ~10,600 |
| Backend Coder | ~18,350 | ~26,213 | ~44,563 |
| Verifier | ~15,576 | ~2,450 | ~18,026 |
| Proof Writer | ~19,797 | ~3,500 | ~23,297 |
| **Grand Total** | **~80,573** | **~37,388** | **~117,961** |

---

*Proof generated by Proof Writer Agent | 2026-01-24*

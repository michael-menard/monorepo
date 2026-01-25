# TEST-PLAN: wrkf-1022-A (Core Middleware Infrastructure)

## Overview

This test plan covers the core middleware infrastructure for the LangGraph Orchestrator node execution system. The middleware pattern enables custom behavior injection at node lifecycle points (beforeNode, afterNode, onError).

---

## Happy Path Tests

| ID | Test Description | Expected Outcome | Evidence |
|----|------------------|------------------|----------|
| HP-1 | Create middleware with all hooks defined | Middleware object validates against NodeMiddlewareSchema | Test output |
| HP-2 | Create middleware with only beforeNode hook | Middleware created, other hooks are undefined | Test output |
| HP-3 | Create middleware with only afterNode hook | Middleware created, other hooks are undefined | Test output |
| HP-4 | Create middleware with only onError hook | Middleware created, other hooks are undefined | Test output |
| HP-5 | beforeNode modifies state before execution | Node receives modified state from beforeNode | Test output |
| HP-6 | afterNode modifies result after execution | Final result includes afterNode changes merged | Test output |
| HP-7 | onError transforms error | Transformed NodeError is captured in state.errors | Test output |
| HP-8 | Multiple middleware execute in correct order | beforeNode: first→last, afterNode: last→first, onError: first→last | Test output |
| HP-9 | Node works with empty middleware array | Node executes normally without middleware | Test output |
| HP-10 | Node works without middleware config | Node executes normally (middleware optional) | Test output |
| HP-11 | composeMiddleware combines multiple middleware | Single composed middleware has all hooks | Test output |
| HP-12 | ctx object persists across beforeNode→afterNode | Data set in beforeNode ctx is readable in afterNode ctx | Test output |
| HP-13 | ctx object persists across beforeNode→onError | Data set in beforeNode ctx is readable in onError ctx | Test output |
| HP-14 | shouldRun returns false skips middleware | Middleware hooks are not called when shouldRun returns false | Test output |
| HP-15 | shouldRun returns true executes middleware | Middleware hooks are called normally when shouldRun returns true | Test output |
| HP-16 | Async shouldRun resolves to false skips middleware | Middleware skipped when Promise<false> returned | Test output |
| HP-17 | Async shouldRun resolves to true executes middleware | Middleware executed when Promise<true> returned | Test output |
| HP-18 | Middleware execution logs at debug level | @repo/logger called with middleware name and node name | Test mock assertions |
| HP-19 | State is deep-cloned before hook invocation | Mutations in hook don't affect original state | Test output |
| HP-20 | createNodeMiddleware helper creates valid middleware | Helper produces NodeMiddlewareSchema-valid object | Test output |
| HP-21 | Import all exports from @repo/orchestrator | All middleware exports resolve correctly | Import test |
| HP-22 | Middleware executes on each retry attempt | When node retries, middleware runs again | Test output |
| HP-23 | shouldRun receives state after previous middleware | Second middleware's shouldRun sees first middleware's state changes | Test output |

---

## Error Cases

| ID | Test Description | Expected Error | Evidence |
|----|------------------|----------------|----------|
| EC-1 | beforeNode throws an error | Node skipped, error captured in state.errors | Test output |
| EC-2 | afterNode throws an error | Error captured, node result preserved | Test output |
| EC-3 | onError throws an error | Original error preserved, middleware error logged | Test output |
| EC-4 | composeMiddleware with invalid middleware | Throws MiddlewareValidationError with descriptive message | Test output |
| EC-5 | composeMiddleware with null in array | Throws MiddlewareValidationError | Test output |
| EC-6 | composeMiddleware with non-object | Throws MiddlewareValidationError | Test output |
| EC-7 | beforeNode returns invalid state | Error captured, original state used | Test output |
| EC-8 | shouldRun throws synchronously | Error logged, middleware skipped, node proceeds | Test output |
| EC-9 | Async shouldRun rejects | Error logged, middleware skipped, node proceeds | Test output |

---

## Edge Cases

| ID | Test Description | Expected Behavior | Evidence |
|----|------------------|-------------------|----------|
| EDGE-1 | Middleware with undefined name | Logs as "anonymous" in debug output | Test output |
| EDGE-2 | beforeNode returns void | Original state passed to node | Test output |
| EDGE-3 | afterNode returns void | Node result unchanged | Test output |
| EDGE-4 | onError returns void | Original error used | Test output |
| EDGE-5 | Middleware array with undefined entries | Undefined entries skipped gracefully | Test output |
| EDGE-6 | Single middleware in array | Works same as multiple | Test output |
| EDGE-7 | State mutation attempted in beforeNode | Clone ensures original unchanged | Test output |
| EDGE-8 | State mutation attempted in afterNode | Clone ensures original unchanged | Test output |
| EDGE-9 | Very large state object (performance) | structuredClone handles without error | Test output |
| EDGE-10 | State with circular references | structuredClone handles without error | Test output |
| EDGE-11 | Middleware with all hooks as no-op functions | All hooks called but no changes | Test output |
| EDGE-12 | composeMiddleware with empty array | Returns no-op middleware | Test output |
| EDGE-13 | composeMiddleware with single middleware | Returns equivalent middleware | Test output |
| EDGE-14 | ctx modifications in afterNode | ctx changes don't affect already-run hooks | Test output |

---

## Integration Tests

| ID | Test Description | Expected Behavior | Evidence |
|----|------------------|-------------------|----------|
| INT-1 | Middleware integrates with createNode() from wrkf-1020 | Middleware executes during node execution | Test output |
| INT-2 | Middleware works with GraphStateSchema from wrkf-1010 | State validation passes | Test output |
| INT-3 | Middleware works with all RoutingFlag enum values | No errors with any flag value | Test output |
| INT-4 | @repo/logger integration works correctly | Logger methods called with expected format | Test mock assertions |
| INT-5 | Middleware + retry integration | On retry, middleware runs on each attempt | Test output |

---

## Evidence Requirements

- [ ] `pnpm build --filter @repo/orchestrator` completes without errors
- [ ] `pnpm check-types --filter @repo/orchestrator` completes without errors
- [ ] `pnpm test --filter @repo/orchestrator` shows all tests passing
- [ ] Test coverage report showing **80%+ for `src/runner/middleware/`**
- [ ] All exports accessible from `@repo/orchestrator`
- [ ] No `console.log` statements in codebase (grep verification)

---

## Coverage Targets

| Directory | Target | Rationale |
|-----------|--------|-----------|
| `src/runner/middleware/` | 80%+ | Core middleware logic must be well-tested |
| `src/runner/middleware/types.ts` | 90%+ | Schema definitions are critical |
| `src/runner/middleware/executor.ts` | 85%+ | Execution logic is complex |
| `src/runner/middleware/compose.ts` | 80%+ | Composition logic must be reliable |

---

*Generated by PM Agent (pm-draft-test-plan sub-agent) | 2026-01-24*

# TEST-PLAN: wrkf-1022-B (Middleware Extensions & Utilities)

## Overview

This test plan covers the middleware extensions and utilities built on top of the core middleware infrastructure (wrkf-1022-A). Includes built-in middleware implementations, convenience utilities, and testing helpers.

---

## Happy Path Tests

| ID | Test Description | Expected Outcome | Evidence |
|----|------------------|------------------|----------|
| HP-1 | loggingMiddleware logs node entry at info level | Logger.info called with node name and "entering" | Test mock assertions |
| HP-2 | loggingMiddleware logs node exit with duration | Logger.info called with node name, "exiting", and duration ms | Test mock assertions |
| HP-3 | loggingMiddleware timing is accurate | Duration matches elapsed time within tolerance | Test output |
| HP-4 | validationMiddleware passes valid state | No error thrown, node executes | Test output |
| HP-5 | validationMiddleware throws on invalid state | Throws validation error with details | Test output |
| HP-6 | filterMiddleware removes middleware by name | Composed middleware excludes filtered name | Test output |
| HP-7 | filterMiddleware removes middleware by predicate | Composed middleware excludes matching predicate | Test output |
| HP-8 | Middleware with auto-generated name | Name is unique string (e.g., "middleware-1") | Test output |
| HP-9 | Middleware with explicit name preserved | Name matches provided value | Test output |
| HP-10 | skipClone: true bypasses state cloning | State is same reference (not cloned) | Test output |
| HP-11 | skipClone: false (default) clones state | State is different reference (cloned) | Test output |
| HP-12 | forNodes factory runs only for specified nodes | Middleware executes for listed nodes only | Test output |
| HP-13 | forNodes factory skips unlisted nodes | Middleware does not execute for other nodes | Test output |
| HP-14 | whenFlag factory runs when flag is set | Middleware executes when routing flag is true | Test output |
| HP-15 | whenFlag factory skips when flag is not set | Middleware skips when routing flag is false/missing | Test output |
| HP-16 | createMockMiddleware creates callable mock | Mock middleware validates against schema | Test output |
| HP-17 | createMockMiddleware tracks hook calls | Mock records beforeNode/afterNode/onError invocations | Test output |
| HP-18 | Import all exports from @repo/orchestrator | All new exports resolve correctly | Import test |

---

## Error Cases

| ID | Test Description | Expected Error | Evidence |
|----|------------------|----------------|----------|
| EC-1 | loggingMiddleware with missing logger | Falls back to console or throws clear error | Test output |
| EC-2 | validationMiddleware with non-object state | Throws ZodError with path info | Test output |
| EC-3 | filterMiddleware with invalid predicate | Throws TypeError with helpful message | Test output |
| EC-4 | forNodes with empty node list | Logs warning, middleware never runs | Test output |
| EC-5 | whenFlag with non-existent flag | Middleware skips (treats missing as false) | Test output |
| EC-6 | createMockMiddleware with invalid config | Throws validation error | Test output |

---

## Edge Cases

| ID | Test Description | Expected Behavior | Evidence |
|----|------------------|-------------------|----------|
| EDGE-1 | loggingMiddleware with 0ms execution | Logs "0ms" duration | Test output |
| EDGE-2 | loggingMiddleware with very long execution | Logs accurate large duration | Test output |
| EDGE-3 | validationMiddleware with extra fields | Passes (Zod passthrough by default) | Test output |
| EDGE-4 | filterMiddleware with no matches | Returns original middleware array unchanged | Test output |
| EDGE-5 | filterMiddleware with all matches | Returns empty array | Test output |
| EDGE-6 | Auto-naming multiple anonymous middleware | Each gets unique name | Test output |
| EDGE-7 | skipClone with circular reference state | No clone attempted, no error | Test output |
| EDGE-8 | forNodes with single node string | Works same as array | Test output |
| EDGE-9 | whenFlag with multiple flags (AND logic) | All flags must be true | Test output |
| EDGE-10 | createMockMiddleware assertions after no calls | Empty call history | Test output |
| EDGE-11 | Built-in middleware composed together | loggingMiddleware + validationMiddleware work in sequence | Test output |

---

## Integration Tests

| ID | Test Description | Expected Behavior | Evidence |
|----|------------------|-------------------|----------|
| INT-1 | loggingMiddleware integrates with createNode() | Entry/exit logged during node execution | Test output |
| INT-2 | validationMiddleware integrates with createNode() | Validation runs before node execution | Test output |
| INT-3 | Built-in middleware with core middleware system | Works with composeMiddleware and executor | Test output |
| INT-4 | Pattern factories with core shouldRun | forNodes/whenFlag set shouldRun correctly | Test output |
| INT-5 | Testing utilities verify real middleware | createMockMiddleware can verify middleware behavior | Test output |

---

## Evidence Requirements

- [ ] `pnpm build --filter @repo/orchestrator` completes without errors
- [ ] `pnpm check-types --filter @repo/orchestrator` completes without errors
- [ ] `pnpm test --filter @repo/orchestrator` shows all tests passing
- [ ] Test coverage report showing **80%+ for `src/runner/middleware/built-in/`**
- [ ] Test coverage report showing **80%+ for `src/runner/middleware/utilities/`**
- [ ] All new exports accessible from `@repo/orchestrator`
- [ ] No `console.log` statements in implementation (grep verification)

---

## Coverage Targets

| Directory | Target | Rationale |
|-----------|--------|-----------|
| `src/runner/middleware/built-in/` | 80%+ | Built-in middleware must be reliable |
| `src/runner/middleware/built-in/logging.ts` | 90%+ | Core utility, widely used |
| `src/runner/middleware/built-in/validation.ts` | 90%+ | Security-critical validation |
| `src/runner/middleware/utilities/` | 80%+ | Developer utilities must be well-tested |
| `src/runner/middleware/utilities/filter.ts` | 80%+ | Composition utility |
| `src/runner/middleware/utilities/factories.ts` | 80%+ | Pattern factories |
| `src/runner/middleware/utilities/testing.ts` | 80%+ | Testing helpers |

---

*Generated by PM Agent (pm-draft-test-plan sub-agent) | 2026-01-24*

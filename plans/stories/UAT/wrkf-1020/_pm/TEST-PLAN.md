# Test Plan: wrkf-1020 — Node Runner Infrastructure

## Overview

This test plan covers the Node Runner Infrastructure for the LangGraph Orchestrator. The infrastructure provides a factory pattern for creating graph nodes, error handling with retry logic, logging integration via `@repo/logger`, and state mutation helpers.

**Dependency:** This story depends on **wrkf-1010: GraphState Schema** which provides:
- `GraphStateSchema`, `ArtifactTypeSchema`, `RoutingFlagSchema`, `GateDecisionSchema`
- `validateGraphState()`, `createInitialState()` utilities
- All schemas export inferred TypeScript types via `z.infer<>`

---

## Happy Path Tests

| ID | Test Description | Expected Outcome | Evidence |
|----|------------------|------------------|----------|
| HP-1 | Create a node using the factory pattern with valid config | Node function is created and callable | Test output |
| HP-2 | Execute a node with valid GraphState input | Node returns updated GraphState | Test output |
| HP-3 | Node receives correctly typed state (z.infer<GraphStateSchema>) | TypeScript compiles without errors | Type-check output |
| HP-4 | Node returns correctly typed state | Return type matches GraphState | Type-check output |
| HP-5 | Logger is invoked on node entry with node name and state context | Logger.info called with expected args | Test mock assertions |
| HP-6 | Logger is invoked on node exit with execution duration | Logger.info called with duration metric | Test mock assertions |
| HP-7 | State mutation helper updates single field immutably | Original state unchanged, new state has update | Test output |
| HP-8 | State mutation helper updates nested field (e.g., artifactPaths) | Nested field updated correctly | Test output |
| HP-9 | State mutation helper updates routingFlags | RoutingFlag enum value set correctly | Test output |
| HP-10 | State mutation helper adds to evidenceRefs array | Evidence ref appended correctly | Test output |
| HP-11 | State mutation helper updates gateDecisions | GateDecision enum value set correctly | Test output |
| HP-12 | State mutation helper adds to errors array | NodeError appended correctly | Test output |
| HP-13 | Import node infrastructure from `@repo/orchestrator` | Import resolves correctly | Import test |
| HP-14 | Factory creates node with custom name for logging | Node name appears in log output | Test mock assertions |
| HP-15 | Retry logic succeeds on first attempt (no retry needed) | Node executes once, returns result | Test output |

---

## Error Cases

| ID | Test Description | Expected Error | Evidence |
|----|------------------|----------------|----------|
| EC-1 | Node handler throws an error | Error captured in state.errors array | Test error output |
| EC-2 | Node handler throws after all retry attempts exhausted | Final error captured, routingFlag set to 'blocked' | Test error output |
| EC-3 | Node receives invalid GraphState (validation fails) | ZodError thrown with validation details | Test error output |
| EC-4 | Node returns invalid GraphState (post-validation fails) | ZodError thrown with validation details | Test error output |
| EC-5 | Factory called with empty node name | Error: node name required | Test error output |
| EC-6 | Factory called with invalid retry config (negative retries) | Error: invalid retry configuration | Test error output |
| EC-7 | Node handler returns undefined instead of state | Error: handler must return GraphState | Test error output |
| EC-8 | Node handler returns null instead of state | Error: handler must return GraphState | Test error output |
| EC-9 | Logger unavailable (import fails) | Graceful degradation or clear error message | Test error output |
| EC-10 | Retry delay configuration exceeds max allowed | Error: retry delay exceeds maximum | Test error output |
| EC-11 | Node handler throws non-Error object | Error wrapped and captured in state.errors | Test error output |
| EC-12 | State mutation helper called with invalid field name | TypeScript error (compile-time) or runtime error | Type-check / Test output |

---

## Edge Cases

| ID | Test Description | Expected Behavior | Evidence |
|----|------------------|-------------------|----------|
| EDGE-1 | Node executes with minimal GraphState (all optional fields empty) | Node executes successfully | Test output |
| EDGE-2 | Node executes with all optional fields populated | Node executes successfully | Test output |
| EDGE-3 | Retry succeeds on second attempt after first failure | State contains error from first attempt, result from second | Test output |
| EDGE-4 | Retry succeeds on final allowed attempt | State contains all intermediate errors | Test output |
| EDGE-5 | Zero retries configured (fail immediately) | Single execution, immediate capture on failure | Test output |
| EDGE-6 | Large retry count (10+) configured | Respects configured retry count | Test output |
| EDGE-7 | Node execution time is 0ms (very fast) | Duration logged as 0 or sub-millisecond | Test output |
| EDGE-8 | Multiple nodes execute in sequence (state flows correctly) | Each node receives previous node's output | Test output |
| EDGE-9 | State mutation helper called with same value (no-op) | State unchanged, no error | Test output |
| EDGE-10 | State mutation helper called multiple times in sequence | All mutations applied correctly | Test output |
| EDGE-11 | Error message contains special characters | Error captured without corruption | Test output |
| EDGE-12 | Error stack trace is very long (1000+ chars) | Error captured (possibly truncated) | Test output |
| EDGE-13 | Node name contains special characters | Logging handles gracefully | Test output |
| EDGE-14 | Concurrent node execution (if supported) | State isolation maintained | Test output |
| EDGE-15 | Node handler is async and takes significant time | Execution completes, duration accurate | Test output |
| EDGE-16 | State.errors array already contains errors | New errors appended, existing preserved | Test output |
| EDGE-17 | State.routingFlags already set to 'blocked' | Node respects existing blocked state | Test output |
| EDGE-18 | Empty string values in GraphState fields | Parsed/handled according to schema rules | Test output |

---

## Integration Tests

| ID | Test Description | Expected Behavior | Evidence |
|----|------------------|-------------------|----------|
| INT-1 | Node runner integrates with wrkf-1010 GraphState schema | Uses validateGraphState() from wrkf-1010 | Test output |
| INT-2 | Node runner uses createInitialState() from wrkf-1010 | Initial state created correctly | Test output |
| INT-3 | Node runner works with all RoutingFlag enum values | proceed, retry, blocked, escalate, skip, complete | Test output |
| INT-4 | Node runner works with all GateDecision enum values | PASS, CONCERNS, FAIL, WAIVED, PENDING | Test output |
| INT-5 | Node runner works with all ArtifactType enum values | All artifact path keys handled | Test output |
| INT-6 | @repo/logger integration works correctly | Logger methods called with expected format | Test mock assertions |

---

## Type Safety Tests

| ID | Test Description | Expected Behavior | Evidence |
|----|------------------|-------------------|----------|
| TS-1 | Node handler type signature enforces GraphState input | TypeScript error on wrong input type | Type-check output |
| TS-2 | Node handler type signature enforces GraphState output | TypeScript error on wrong return type | Type-check output |
| TS-3 | State mutation helpers are fully typed | Autocomplete works, type errors on invalid fields | Type-check output |
| TS-4 | Factory function returns correctly typed node | Return type is (state: GraphState) => Promise<GraphState> | Type-check output |
| TS-5 | All exports have proper type definitions | d.ts files generated correctly | Build output |

---

## Evidence Requirements

### Build and Type Verification
- [ ] `pnpm build --filter @repo/orchestrator` completes without errors
- [ ] `pnpm check-types --filter @repo/orchestrator` completes without errors
- [ ] Generated `dist/` contains `.d.ts` type definition files for all exports

### Test Execution
- [ ] `pnpm test --filter @repo/orchestrator` shows all tests passing
- [ ] Test output includes coverage report
- [ ] Coverage threshold: **80%+ for `src/nodes/` directory**

### Coverage Breakdown
- [ ] `src/nodes/factory.ts` (or equivalent) — 80%+ line coverage
- [ ] `src/nodes/retry.ts` (or equivalent) — 80%+ line coverage
- [ ] `src/nodes/state-helpers.ts` (or equivalent) — 80%+ line coverage
- [ ] `src/nodes/logging.ts` (or equivalent) — 80%+ line coverage

### Import Verification
- [ ] Exports are accessible from `@repo/orchestrator`:
  ```typescript
  import {
    createNode,           // Factory function
    withRetry,           // Retry wrapper
    updateState,         // State mutation helper
    NodeConfig,          // Config type
  } from '@repo/orchestrator'
  ```

### Logger Integration
- [ ] Verify `@repo/logger` is used (not `console.log`)
- [ ] Logger calls include structured metadata (node name, duration, error details)

---

## Test File Structure

Expected test file locations:
```
packages/backend/orchestrator/src/
├── nodes/
│   ├── index.ts                    # Node infrastructure exports
│   ├── factory.ts                  # Node factory implementation
│   ├── retry.ts                    # Retry logic
│   ├── state-helpers.ts            # State mutation helpers
│   ├── logging.ts                  # Logging integration
│   └── __tests__/
│       ├── factory.test.ts         # Factory tests (HP-1 to HP-4, EC-5, EC-6)
│       ├── retry.test.ts           # Retry tests (HP-15, EC-2, EDGE-3 to EDGE-6)
│       ├── state-helpers.test.ts   # State mutation tests (HP-7 to HP-12, EDGE-9, EDGE-10)
│       ├── logging.test.ts         # Logging tests (HP-5, HP-6, HP-14, EC-9)
│       ├── error-handling.test.ts  # Error tests (EC-1 to EC-4, EC-7, EC-8, EC-11)
│       └── integration.test.ts     # Integration tests (INT-1 to INT-6)
```

---

## Blocking Issues

### Potential Blockers
1. **wrkf-1010 must be completed first** — This story depends on the GraphState schema being available
2. **@repo/logger availability** — Verify logger package is accessible from orchestrator package

### Pre-Implementation Checks
- [ ] Verify wrkf-1010 is completed and merged
- [ ] Verify `@repo/logger` can be added as dependency to `@repo/orchestrator`
- [ ] Verify LangGraph node pattern compatibility with proposed factory approach

---

## Commands for Evidence Collection

```bash
# Build verification
pnpm build --filter @repo/orchestrator

# Type checking
pnpm check-types --filter @repo/orchestrator

# Run tests with coverage
pnpm test --filter @repo/orchestrator -- --coverage

# Verify imports work (create temp test file)
echo "import { createNode, withRetry, updateState } from '@repo/orchestrator'" > /tmp/test-import.ts
pnpm exec tsc --noEmit /tmp/test-import.ts
```

---

*Generated by PM Test Plan Agent | 2026-01-23*

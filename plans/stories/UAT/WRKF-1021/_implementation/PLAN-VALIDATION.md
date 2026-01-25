# Plan Validation: WRKF-1021

## Summary

- **Status:** VALID
- **Issues Found:** 1 (minor)
- **Blockers:** 0

---

## AC Coverage

| AC | Description | Addressed in Step | Status |
|----|-------------|-------------------|--------|
| AC-1 | `NodeMetrics` Zod schema with per-node metrics fields | Step 1 | OK |
| AC-2 | `NodeMetricsCollector` class with `recordSuccess`, `recordFailure`, `recordRetry` methods | Step 3 | OK |
| AC-3 | `getNodeMetrics(nodeName)` returns metrics for specific node | Step 3 | OK |
| AC-4 | `getAllNodeMetrics()` returns Map of all node metrics | Step 3 | OK |
| AC-5 | `resetNodeMetrics(nodeName?)` clears metrics | Step 3 | OK |
| AC-6 | Node factory integrates with optional `metricsCollector` config | Steps 8, 9 | OK |
| AC-7 | Metrics capture is optional (nodes work without collector) | Steps 8, 9 | OK |
| AC-8 | Duration percentiles p50, p90, p99 from rolling window | Step 2 | OK |
| AC-9 | Exports from `@repo/orchestrator` | Steps 10, 11 | OK |
| AC-10 | Unit tests with 80%+ coverage | Steps 12-19 | OK |
| AC-11 | Integration test with actual node execution | Step 18 | OK |
| AC-12 | Configurable `windowSize` (default 100) | Steps 2, 3 | OK |
| AC-13 | Async-safe metric recording | Step 3, Step 16 | OK |
| AC-14 | Negative durationMs clamped to 0 with warning | Step 4 | OK |
| AC-15 | Failure counts by error category (timeout, validation, network, other) | Step 1, Step 3 | OK |
| AC-16 | `toJSON()` method for serializable snapshot | Step 6 | OK |
| AC-17 | Threshold events for failure rate and latency | Step 5 | OK |

**Coverage:** 17/17 ACs addressed (100%)

---

## File Path Validation

### Files to CREATE

| Path | Exists | Valid Pattern | Status |
|------|--------|---------------|--------|
| `packages/backend/orchestrator/src/runner/metrics.ts` | No (to create) | Yes | OK |
| `packages/backend/orchestrator/src/runner/__tests__/metrics.test.ts` | No (to create) | Yes | OK |

### Files to MODIFY

| Path | Exists | Valid Pattern | Status |
|------|--------|---------------|--------|
| `packages/backend/orchestrator/src/runner/node-factory.ts` | Yes | Yes | OK |
| `packages/backend/orchestrator/src/runner/types.ts` | Yes | Yes | OK |
| `packages/backend/orchestrator/src/runner/index.ts` | Yes | Yes | OK |
| `packages/backend/orchestrator/src/index.ts` | Yes | Yes | OK |

**Validation Result:**
- Valid paths: 6
- Invalid paths: 0
- All paths follow `packages/backend/**` architecture for backend packages

---

## Reuse Target Validation

| Target | Exists | Location | Status |
|--------|--------|----------|--------|
| `@repo/api-client/src/retry/retry-logic.ts` | Yes | `packages/core/api-client/src/retry/retry-logic.ts` | OK |
| `RetryMetrics` interface pattern | Yes | Lines 30-38 of retry-logic.ts | OK |
| `CircuitBreaker` class pattern | Yes | Lines 144-208 of retry-logic.ts | OK |
| `@repo/orchestrator/src/runner/types.ts` | Yes | `packages/backend/orchestrator/src/runner/types.ts` | OK |
| `@repo/orchestrator/src/runner/circuit-breaker.ts` | Yes | `packages/backend/orchestrator/src/runner/circuit-breaker.ts` | OK |
| `@repo/logger` | Yes | `packages/core/logger/` | OK |

**Pattern Analysis:**

The `RetryMetrics` interface in `@repo/api-client` provides a proven pattern:
```typescript
export interface RetryMetrics {
  totalAttempts: number
  successfulAttempts: number
  failedAttempts: number
  coldStartRetries: number
  timeoutRetries: number
  averageRetryDelay: number
  circuitBreakerTrips: number
}
```

The `NodeCircuitBreaker` class in `@repo/orchestrator` provides an excellent class-based pattern with:
- Private state management (`failures`, `lastFailureTime`, `state`)
- Recording methods (`recordSuccess()`, `recordFailure()`)
- State retrieval (`getStatus()`, `getState()`)
- Reset capability (`reset()`)

These patterns align well with the implementation plan's design for `NodeMetricsCollector`.

---

## Step Analysis

- **Total steps:** 20
- **Steps with verification:** 20 (100%)

| Step | Objective | Files | Verification | Status |
|------|-----------|-------|--------------|--------|
| 1 | Create Zod Schemas | metrics.ts | `pnpm eslint` | OK |
| 2 | Rolling Window Percentile Calculator | metrics.ts | `pnpm check-types` | OK |
| 3 | NodeMetricsCollector Class | metrics.ts | `pnpm check-types` | OK |
| 4 | Duration Validation and Logging | metrics.ts | `pnpm eslint` | OK |
| 5 | Threshold Events | metrics.ts | `pnpm check-types` | OK |
| 6 | toJSON Method | metrics.ts | `pnpm check-types` | OK |
| 7 | Factory Function | metrics.ts | `pnpm eslint` | OK |
| 8 | Add metricsCollector to Node Config | types.ts | `pnpm check-types` | OK |
| 9 | Integrate Metrics into Node Factory | node-factory.ts | `pnpm check-types` | OK |
| 10 | Export from Runner Index | runner/index.ts | `pnpm eslint` | OK |
| 11 | Export from Package Index | src/index.ts | `pnpm check-types` | OK |
| 12 | Unit Tests - Schema and Factory | metrics.test.ts | `pnpm test` | OK |
| 13 | Unit Tests - Recording Methods | metrics.test.ts | `pnpm test` | OK |
| 14 | Unit Tests - Retrieval and Reset | metrics.test.ts | `pnpm test` | OK |
| 15 | Unit Tests - Percentiles | metrics.test.ts | `pnpm test` | OK |
| 16 | Unit Tests - Edge Cases | metrics.test.ts | `pnpm test` | OK |
| 17 | Unit Tests - Thresholds and toJSON | metrics.test.ts | `pnpm test` | OK |
| 18 | Integration Test | metrics.test.ts | `pnpm test` | OK |
| 19 | Verify Full Test Coverage | all | `pnpm test --coverage` | OK |
| 20 | Final Verification | all | `pnpm lint/check-types/build/test` | OK |

**Step Dependencies:**
- Steps 1-11 are implementation (sequential, build on each other)
- Steps 12-19 are testing (depend on implementation completion)
- Step 20 is final verification (depends on all prior steps)

No circular dependencies detected.

---

## Test Plan Feasibility

### .http Files
- **Required:** None (this is a pure TypeScript library, no API endpoints)
- **Feasible:** N/A

### Playwright E2E Tests
- **Required:** None (no UI changes)
- **Feasible:** N/A

### Unit Test Commands
| Command | Valid | Notes |
|---------|-------|-------|
| `pnpm test --filter orchestrator -- metrics.test.ts` | Yes | Standard vitest pattern |
| `pnpm check-types --filter orchestrator` | Yes | Standard turbo filter |
| `pnpm lint --filter orchestrator` | Yes | Standard turbo filter |
| `pnpm build --filter orchestrator` | Yes | Standard turbo filter |
| `pnpm test --filter orchestrator --coverage` | Yes | Vitest coverage |

---

## Minor Issues

### Issue 1: types.ts Not Listed in Story File Touch List

**Finding:** The implementation plan correctly identifies `types.ts` as needing modification (Step 8), but the story file's "File Touch List" section does not include it.

**Impact:** Low - the plan itself is correct; this is a documentation gap in the story.

**Recommendation:** For clarity, the story could be updated to include `types.ts` in the File Touch List. However, this does not block implementation since the plan is authoritative.

---

## Verdict

**PLAN VALID**

The implementation plan is comprehensive, well-structured, and ready for execution:

1. **Complete AC Coverage:** All 17 acceptance criteria are mapped to specific implementation steps
2. **Valid File Paths:** All paths exist or are valid patterns for creation
3. **Proven Reuse Targets:** All referenced patterns (`RetryMetrics`, `CircuitBreaker`, `NodeCircuitBreaker`) exist and are well-suited for adaptation
4. **Detailed Steps:** 20 steps with clear objectives, files, and verification actions
5. **Logical Order:** Steps follow correct dependency order (schemas -> implementation -> tests)
6. **Feasible Test Plan:** All test commands are valid; no E2E or API tests required for this library-only change

The plan demonstrates strong alignment with:
- Existing orchestrator package patterns (`NodeCircuitBreaker` class)
- Existing api-client patterns (`RetryMetrics` interface)
- Project conventions (Zod-first types, `@repo/logger`)

---

## Completion Signal

**PLAN VALID**

---

*Validated by Plan Validator Agent | 2026-01-24*

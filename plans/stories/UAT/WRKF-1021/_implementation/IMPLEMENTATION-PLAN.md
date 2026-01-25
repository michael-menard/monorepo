# Implementation Plan - WRKF-1021: Node Execution Metrics

## Scope Surface

- **backend/API:** yes
- **frontend/UI:** no
- **infra/config:** no
- **notes:** Pure TypeScript library extension to `@repo/orchestrator` runner module. No endpoints, no UI, no infrastructure.

---

## Acceptance Criteria Checklist

From story wrkf-1021.md:

- [ ] AC-1: `NodeMetrics` Zod schema with per-node metrics fields
- [ ] AC-2: `NodeMetricsCollector` class with `recordSuccess`, `recordFailure`, `recordRetry` methods
- [ ] AC-3: `getNodeMetrics(nodeName)` returns metrics for specific node
- [ ] AC-4: `getAllNodeMetrics()` returns Map of all node metrics
- [ ] AC-5: `resetNodeMetrics(nodeName?)` clears metrics
- [ ] AC-6: Node factory integrates with optional `metricsCollector` config
- [ ] AC-7: Metrics capture is optional (nodes work without collector)
- [ ] AC-8: Duration percentiles p50, p90, p99 from rolling window
- [ ] AC-9: Exports from `@repo/orchestrator`
- [ ] AC-10: Unit tests with 80%+ coverage
- [ ] AC-11: Integration test with actual node execution
- [ ] AC-12: Configurable `windowSize` (default 100)
- [ ] AC-13: Async-safe metric recording
- [ ] AC-14: Negative durationMs clamped to 0 with warning
- [ ] AC-15: Failure counts by error category (timeout, validation, network, other)
- [ ] AC-16: `toJSON()` method for serializable snapshot
- [ ] AC-17: Threshold events for failure rate and latency

---

## Files To Touch (Expected)

### CREATE

| Path | Purpose |
|------|---------|
| `packages/backend/orchestrator/src/runner/metrics.ts` | NodeMetricsCollector class and schemas |
| `packages/backend/orchestrator/src/runner/__tests__/metrics.test.ts` | Unit tests for metrics module |

### MODIFY

| Path | Change |
|------|--------|
| `packages/backend/orchestrator/src/runner/node-factory.ts` | Add optional `metricsCollector` to config, record metrics on success/failure/retry |
| `packages/backend/orchestrator/src/runner/types.ts` | Add `metricsCollector` to `NodeConfigSchema` |
| `packages/backend/orchestrator/src/runner/index.ts` | Export metrics types and classes |
| `packages/backend/orchestrator/src/index.ts` | Re-export metrics from runner |

---

## Reuse Targets

| Package/Module | Pattern to Adapt |
|----------------|-----------------|
| `@repo/api-client/src/retry/retry-logic.ts` | `RetryMetrics` interface structure (counters, percentiles, reset) |
| `@repo/api-client/src/retry/retry-logic.ts` | `CircuitBreaker` class pattern (canExecute, recordSuccess, recordFailure, getState) |
| `@repo/orchestrator/src/runner/types.ts` | Zod schema patterns for config types |
| `@repo/orchestrator/src/runner/circuit-breaker.ts` | Class pattern with internal state management |
| `@repo/logger` | Warning logging for invalid inputs (AC-14) |

---

## Architecture Notes (Ports & Adapters)

### Core Module Design

The `metrics.ts` module is a pure domain module:
- No external I/O dependencies (no database, no network)
- Receives duration values as inputs, calculates metrics internally
- `@repo/logger` is the only external dependency (for warnings)

### Integration Point

The `createNode()` factory is the adapter that connects node execution to metrics:
- Accepts optional `metricsCollector` in config
- Calls `recordSuccess()`, `recordFailure()`, `recordRetry()` at appropriate points
- Does NOT create the collector - consumer provides it (dependency injection)

### Boundaries to Protect

1. **Metrics module has no knowledge of node internals** - receives only nodeName, durationMs, error info
2. **Node factory does not depend on metrics** - metrics collector is optional
3. **Percentile calculation is internal** - exposed only through `NodeMetrics` type

---

## Step-by-Step Plan (Small Steps)

### Step 1: Create Zod Schemas (AC-1, AC-15)

**Objective:** Define `NodeMetricsSchema`, `ErrorCategorySchema`, `ThresholdConfigSchema`

**Files:** `packages/backend/orchestrator/src/runner/metrics.ts`

**Actions:**
1. Create `metrics.ts` file
2. Import `z` from 'zod'
3. Define `ErrorCategorySchema` enum: `'timeout' | 'validation' | 'network' | 'other'`
4. Define `NodeMetricsSchema` with fields:
   - `totalExecutions: z.number()`
   - `successCount: z.number()`
   - `failureCount: z.number()`
   - `retryCount: z.number()`
   - `lastExecutionMs: z.number().nullable()`
   - `avgExecutionMs: z.number()`
   - `p50: z.number().nullable()`
   - `p90: z.number().nullable()`
   - `p99: z.number().nullable()`
   - `timeoutErrors: z.number()`
   - `validationErrors: z.number()`
   - `networkErrors: z.number()`
   - `otherErrors: z.number()`
5. Define `ThresholdConfigSchema` with optional fields:
   - `failureRateThreshold: z.number().min(0).max(1).optional()`
   - `latencyThresholdMs: z.number().min(0).optional()`
6. Export schemas and inferred types

**Verification:** `pnpm eslint packages/backend/orchestrator/src/runner/metrics.ts`

---

### Step 2: Implement Rolling Window Percentile Calculator (AC-8, AC-12)

**Objective:** Create internal class for rolling window duration tracking and percentile calculation

**Files:** `packages/backend/orchestrator/src/runner/metrics.ts`

**Actions:**
1. Add `RollingWindow` internal class with:
   - Constructor accepting `windowSize` (default 100)
   - `samples: number[]` array
   - `add(value: number)` method - adds sample, evicts oldest if at capacity
   - `getPercentile(p: number)` method - returns pth percentile (sorted calculation)
   - `clear()` method - resets samples
2. Implement percentile calculation: sort samples, find index at `floor((p/100) * length)`
3. Handle edge cases: empty array returns null, single sample returns that value for all percentiles

**Verification:** `pnpm check-types --filter orchestrator`

---

### Step 3: Implement NodeMetricsCollector Class (AC-2, AC-3, AC-4, AC-5, AC-12, AC-13)

**Objective:** Create main collector class with all recording and retrieval methods

**Files:** `packages/backend/orchestrator/src/runner/metrics.ts`

**Actions:**
1. Define `NodeMetricsCollectorConfig` type with `windowSize?: number`
2. Create `NodeMetricsCollector` class with:
   - Private `metrics: Map<string, InternalNodeMetrics>`
   - Private `windows: Map<string, RollingWindow>`
   - Constructor accepting optional config with `windowSize`
3. Implement `recordSuccess(nodeName: string, durationMs: number)`:
   - Get or create metrics entry for nodeName
   - Increment `totalExecutions`, `successCount`
   - Update duration tracking and percentiles
4. Implement `recordFailure(nodeName: string, durationMs: number, error?: unknown, errorType?: ErrorCategory)`:
   - Get or create metrics entry
   - Increment `totalExecutions`, `failureCount`
   - Increment appropriate error category counter
   - Update duration tracking
5. Implement `recordRetry(nodeName: string, attemptNumber: number)`:
   - Get or create metrics entry
   - Increment `retryCount`
6. Implement `getNodeMetrics(nodeName: string): NodeMetrics`:
   - Return metrics for node, or default empty metrics if unknown
7. Implement `getAllNodeMetrics(): Map<string, NodeMetrics>`:
   - Return copy of all metrics
8. Implement `resetNodeMetrics(nodeName?: string)`:
   - If nodeName provided, clear that node's metrics
   - Otherwise clear all metrics

**Verification:** `pnpm check-types --filter orchestrator`

---

### Step 4: Implement Duration Validation and Logging (AC-14)

**Objective:** Validate durationMs input, clamp negatives to 0 with warning

**Files:** `packages/backend/orchestrator/src/runner/metrics.ts`

**Actions:**
1. Import `{ createLogger }` from `@repo/logger`
2. Create logger instance: `const logger = createLogger('orchestrator:metrics')`
3. Add private `validateDuration(durationMs: number, nodeName: string): number` method:
   - If `durationMs < 0`, log warning with nodeName and original value
   - Return `Math.max(0, durationMs)`
4. Call `validateDuration()` at start of `recordSuccess()` and `recordFailure()`

**Verification:** `pnpm eslint packages/backend/orchestrator/src/runner/metrics.ts`

---

### Step 5: Implement Threshold Events (AC-17)

**Objective:** Add threshold configuration and event callbacks

**Files:** `packages/backend/orchestrator/src/runner/metrics.ts`

**Actions:**
1. Extend `NodeMetricsCollectorConfig` with:
   - `onFailureRateThreshold?: (nodeName: string, rate: number) => void`
   - `onLatencyThreshold?: (nodeName: string, p99: number) => void`
   - `failureRateThreshold?: number` (0-1)
   - `latencyThresholdMs?: number`
2. Store callbacks and thresholds in class instance
3. Add private `checkThresholds(nodeName: string)` method:
   - Calculate failure rate: `failureCount / totalExecutions`
   - If rate exceeds threshold and callback exists, invoke callback
   - If p99 exceeds latency threshold and callback exists, invoke callback
4. Call `checkThresholds()` at end of `recordSuccess()` and `recordFailure()`

**Verification:** `pnpm check-types --filter orchestrator`

---

### Step 6: Implement toJSON Method (AC-16)

**Objective:** Add serializable snapshot export

**Files:** `packages/backend/orchestrator/src/runner/metrics.ts`

**Actions:**
1. Define `SerializedMetricsSchema` as record of nodeName to NodeMetrics
2. Implement `toJSON(): SerializedMetrics`:
   - Convert internal Map to plain object
   - Calculate current percentiles for each node
   - Return JSON-serializable structure
3. Export `SerializedMetrics` type

**Verification:** `pnpm check-types --filter orchestrator`

---

### Step 7: Add Factory Function (AC-9)

**Objective:** Create `createNodeMetricsCollector()` factory

**Files:** `packages/backend/orchestrator/src/runner/metrics.ts`

**Actions:**
1. Export `createNodeMetricsCollector(config?: NodeMetricsCollectorConfig): NodeMetricsCollector`
2. Factory simply creates and returns new instance
3. Add JSDoc documentation

**Verification:** `pnpm eslint packages/backend/orchestrator/src/runner/metrics.ts`

---

### Step 8: Add metricsCollector to Node Config (AC-6, AC-7)

**Objective:** Extend NodeConfigSchema to accept optional metrics collector

**Files:** `packages/backend/orchestrator/src/runner/types.ts`

**Actions:**
1. Import `NodeMetricsCollector` type from `./metrics.js`
2. Add to `NodeConfigSchema`: `metricsCollector: z.any().optional()` (Zod cannot validate class instances)
3. Update `NodeConfig` and `NodeConfigInput` types to include:
   - `metricsCollector?: NodeMetricsCollector`

**Verification:** `pnpm check-types --filter orchestrator`

---

### Step 9: Integrate Metrics into Node Factory (AC-6)

**Objective:** Record metrics during node execution

**Files:** `packages/backend/orchestrator/src/runner/node-factory.ts`

**Actions:**
1. Add `metricsCollector` to `InternalNodeConfig` interface
2. Extract `metricsCollector` from `nodeConfigInput` in `createNode()`
3. After successful execution, call `metricsCollector?.recordSuccess(nodeConfig.name, durationMs)`
4. After failed execution, call `metricsCollector?.recordFailure(nodeConfig.name, durationMs, error, errorCategory)`
5. In retry callback, call `metricsCollector?.recordRetry(nodeConfig.name, attempt)`
6. Add error category mapping using `classifyError()` from error-classification

**Verification:** `pnpm check-types --filter orchestrator`

---

### Step 10: Export from Runner Index (AC-9)

**Objective:** Export metrics module from runner/index.ts

**Files:** `packages/backend/orchestrator/src/runner/index.ts`

**Actions:**
1. Add export block for metrics:
   ```typescript
   export {
     NodeMetricsSchema,
     NodeMetricsCollector,
     createNodeMetricsCollector,
     type NodeMetrics,
     type NodeMetricsCollectorConfig,
     type ErrorCategory,
     type SerializedMetrics,
   } from './metrics.js'
   ```

**Verification:** `pnpm eslint packages/backend/orchestrator/src/runner/index.ts`

---

### Step 11: Export from Package Index (AC-9)

**Objective:** Re-export metrics from main package index

**Files:** `packages/backend/orchestrator/src/index.ts`

**Actions:**
1. Add to runner exports:
   ```typescript
   // Metrics
   NodeMetricsSchema,
   NodeMetricsCollector,
   createNodeMetricsCollector,
   type NodeMetrics,
   type NodeMetricsCollectorConfig,
   type ErrorCategory,
   type SerializedMetrics,
   ```

**Verification:** `pnpm check-types --filter orchestrator`

---

### Step 12: Write Unit Tests - Schema and Factory (AC-10)

**Objective:** Test schema validation and factory function

**Files:** `packages/backend/orchestrator/src/runner/__tests__/metrics.test.ts`

**Actions:**
1. Create test file with imports
2. Test `NodeMetricsSchema` validation (valid, invalid inputs)
3. Test `createNodeMetricsCollector()` factory creates instance
4. Test `createNodeMetricsCollector()` with custom windowSize

**Verification:** `pnpm test --filter orchestrator -- metrics.test.ts`

---

### Step 13: Write Unit Tests - Recording Methods (AC-10)

**Objective:** Test recordSuccess, recordFailure, recordRetry

**Files:** `packages/backend/orchestrator/src/runner/__tests__/metrics.test.ts`

**Actions:**
1. Test `recordSuccess()` increments counters correctly
2. Test `recordFailure()` increments failure counters
3. Test `recordFailure()` with error categories
4. Test `recordRetry()` increments retry count
5. Test duration tracking (avgExecutionMs, lastExecutionMs)

**Verification:** `pnpm test --filter orchestrator -- metrics.test.ts`

---

### Step 14: Write Unit Tests - Retrieval and Reset (AC-10)

**Objective:** Test getNodeMetrics, getAllNodeMetrics, resetNodeMetrics

**Files:** `packages/backend/orchestrator/src/runner/__tests__/metrics.test.ts`

**Actions:**
1. Test `getNodeMetrics()` returns correct metrics
2. Test `getNodeMetrics()` for unknown node returns default metrics
3. Test `getAllNodeMetrics()` returns all nodes
4. Test `resetNodeMetrics(nodeName)` clears specific node
5. Test `resetNodeMetrics()` clears all nodes

**Verification:** `pnpm test --filter orchestrator -- metrics.test.ts`

---

### Step 15: Write Unit Tests - Percentiles (AC-8, AC-10)

**Objective:** Test percentile calculation edge cases

**Files:** `packages/backend/orchestrator/src/runner/__tests__/metrics.test.ts`

**Actions:**
1. Test percentiles with single data point (p50=p90=p99=value)
2. Test percentiles with multiple data points
3. Test rolling window eviction (> windowSize samples)
4. Test empty node returns null percentiles

**Verification:** `pnpm test --filter orchestrator -- metrics.test.ts`

---

### Step 16: Write Unit Tests - Edge Cases (AC-10, AC-13, AC-14)

**Objective:** Test edge cases and error handling

**Files:** `packages/backend/orchestrator/src/runner/__tests__/metrics.test.ts`

**Actions:**
1. Test negative durationMs clamped to 0 (mock logger to verify warning)
2. Test concurrent async recording maintains consistency
3. Test very large duration values
4. Test threshold not configured (no error when exceeded)
5. Test error category defaults to 'other' when not specified

**Verification:** `pnpm test --filter orchestrator -- metrics.test.ts`

---

### Step 17: Write Unit Tests - Thresholds and toJSON (AC-10, AC-16, AC-17)

**Objective:** Test threshold callbacks and JSON serialization

**Files:** `packages/backend/orchestrator/src/runner/__tests__/metrics.test.ts`

**Actions:**
1. Test `onFailureRateThreshold` callback invoked when threshold exceeded
2. Test `onLatencyThreshold` callback invoked when p99 exceeds threshold
3. Test `toJSON()` returns serializable object
4. Test `toJSON()` structure matches expected format

**Verification:** `pnpm test --filter orchestrator -- metrics.test.ts`

---

### Step 18: Write Integration Test (AC-11)

**Objective:** Verify metrics captured during actual node execution

**Files:** `packages/backend/orchestrator/src/runner/__tests__/metrics.test.ts`

**Actions:**
1. Create integration test section
2. Create `NodeMetricsCollector` instance
3. Create node with `metricsCollector` in config using `createNode()`
4. Execute node with mock state
5. Verify `recordSuccess()` was called (check metrics via `getNodeMetrics()`)
6. Create failing node, execute, verify `recordFailure()` was called
7. Create retrying node, verify `recordRetry()` was called

**Verification:** `pnpm test --filter orchestrator -- metrics.test.ts`

---

### Step 19: Verify Full Test Coverage (AC-10)

**Objective:** Ensure 80%+ test coverage

**Files:** All test files

**Actions:**
1. Run `pnpm test --filter orchestrator --coverage`
2. Review coverage report for metrics.ts
3. Add tests for any uncovered branches
4. Target: 80%+ line and branch coverage

**Verification:** `pnpm test --filter orchestrator --coverage`

---

### Step 20: Final Verification

**Objective:** Complete lint, type-check, build, test cycle

**Files:** All modified files

**Actions:**
1. `pnpm lint --filter orchestrator`
2. `pnpm check-types --filter orchestrator`
3. `pnpm build --filter orchestrator`
4. `pnpm test --filter orchestrator`
5. Verify exports work: create temp file importing from `@repo/orchestrator`

**Verification:** All commands pass with no errors

---

## Test Plan

### Unit Tests

```bash
pnpm test --filter orchestrator -- metrics.test.ts
```

Expected test categories:
- Schema validation (4-6 tests)
- Factory function (2-3 tests)
- recordSuccess (4-6 tests)
- recordFailure (6-8 tests)
- recordRetry (2-3 tests)
- getNodeMetrics (3-4 tests)
- getAllNodeMetrics (2-3 tests)
- resetNodeMetrics (3-4 tests)
- Percentiles (5-7 tests)
- Edge cases (5-7 tests)
- Thresholds (4-6 tests)
- toJSON (3-4 tests)
- Integration (3-5 tests)

**Estimated total: ~50-65 tests**

### Type Checking

```bash
pnpm check-types --filter orchestrator
```

### Lint

```bash
pnpm lint --filter orchestrator
```

### Build

```bash
pnpm build --filter orchestrator
```

### Coverage

```bash
pnpm test --filter orchestrator --coverage
```

Target: 80%+ coverage on metrics.ts

---

## Stop Conditions / Blockers

### None Identified

The story is well-defined with:
- Clear pattern to adapt (`RetryMetrics` from `@repo/api-client`)
- Existing package structure from WRKF-1000/1010/1020
- Established test patterns from prior WRKF stories
- All dependencies available (`@repo/logger`, `zod`)

### Potential Issues to Monitor

| Risk | Impact | Mitigation |
|------|--------|------------|
| Percentile algorithm accuracy | Low | Use standard sorted-array approach |
| Async safety verification | Medium | Add concurrent test with Promise.all |
| Node factory modification scope | Low | Keep changes minimal - just add optional metricsCollector |

---

## Token Log

| Operation | Type | Bytes | Tokens (est) |
|-----------|------|-------|--------------|
| Read: wrkf-1021.md | input | 12,197 | ~3,050 |
| Read: LESSONS-LEARNED.md | input | 24,476 | ~6,119 |
| Read: retry-logic.ts | input | 14,287 | ~3,572 |
| Read: orchestrator/src/index.ts | input | 4,174 | ~1,044 |
| Read: runner/index.ts | input | 3,142 | ~786 |
| Read: node-factory.ts | input | 11,088 | ~2,772 |
| Read: types.ts | input | 6,003 | ~1,501 |
| Read: SCOPE.md | input | 568 | ~142 |
| Write: IMPLEMENTATION-PLAN.md | output | ~14,000 | ~3,500 |
| **Total** | — | ~90,000 | **~22,500** |

---

*Generated by Planner Agent | 2026-01-24*

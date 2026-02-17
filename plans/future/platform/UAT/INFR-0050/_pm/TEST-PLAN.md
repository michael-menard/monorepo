# Test Plan: INFR-0050 — Event SDK (Shared Telemetry Hooks)

**Story ID**: INFR-0050
**Generated**: 2026-02-15
**Epic**: INFR (Infrastructure)

---

## Test Strategy

This story introduces an event buffering SDK with async patterns, OTel integration, and process lifecycle management. Testing must validate correctness, performance, resilience, and integration with existing telemetry infrastructure.

**Testing Pyramid**:
- **Unit Tests** (70%): Buffer logic, configuration, hook functions in isolation
- **Integration Tests** (25%): Real PostgreSQL via testcontainers, OTel span extraction
- **Performance Tests** (5%): Batch vs individual insert benchmarks

---

## Test Scope

### In Scope
- Event buffer accumulation and flushing (size + interval triggers)
- Hook function behavior (`withStepTracking`, `withStateTracking`)
- OpenTelemetry context extraction (correlation_id from active span)
- Batch insertion via `insertWorkflowEventsBatch()`
- Graceful shutdown (SIGTERM/SIGINT flush)
- Error resilience (DB unavailable, validation errors)
- Configuration validation (Zod schemas)

### Out of Scope
- Event replay mechanisms (deferred to TELE-0020)
- Prometheus metrics export (covered by TELE-0020)
- Frontend telemetry hooks (backend-only story)
- Migration of existing orchestrator nodes (separate follow-up story)

---

## Test Cases

### 1. Buffer Logic (Unit)

**Test File**: `packages/backend/db/src/telemetry-sdk/__tests__/buffer.test.ts`

| Test ID | Description | Assertions |
|---------|-------------|------------|
| BUF-001 | Buffer flushes when size threshold reached | Mock flush function called, buffer cleared |
| BUF-002 | Buffer flushes when interval elapsed | Mock timer fires, flush called, buffer cleared |
| BUF-003 | Buffer overflow handling | Verify drop-oldest or error strategy per config |
| BUF-004 | Empty buffer flush is no-op | No DB call when buffer empty |
| BUF-005 | Flush timer cleared on manual flush | No duplicate flushes |
| BUF-006 | Concurrent event additions | No race conditions, all events preserved |

**Mocking Strategy**:
- Mock `insertWorkflowEventsBatch()` to spy on calls
- Use `vi.useFakeTimers()` for interval testing
- Use `vi.spyOn()` for buffer state inspection

---

### 2. Hook Functions (Integration)

**Test File**: `packages/backend/db/src/telemetry-sdk/__tests__/hooks.test.ts`

| Test ID | Description | Setup | Assertions |
|---------|-------------|-------|------------|
| HOOK-001 | `withStepTracking` emits event on success | Wrap successful async operation | Event buffered with correct event_type, step_name, duration |
| HOOK-002 | `withStepTracking` emits event on error | Wrap throwing operation | Event buffered with error_message, status=failed |
| HOOK-003 | `withStepTracking` measures duration | Wrap delayed operation (100ms) | duration_ms ≈ 100ms ± 10ms |
| HOOK-004 | `withStepTracking` captures tokens/model | Pass tokens_used/model in options | Payload includes tokens_used, model |
| HOOK-005 | `withStateTracking` emits immediately | Call with state transition | Event NOT buffered, inserted synchronously |
| HOOK-006 | Hook passes through return value | Wrap operation returning {data: 'test'} | Return value === {data: 'test'} |
| HOOK-007 | Hook preserves error type | Wrap operation throwing ValidationError | Caught error instanceof ValidationError |

**Test Data**:
```typescript
const mockStepOperation = async () => {
  await delay(100)
  return { result: 'success' }
}

const mockFailingOperation = async () => {
  throw new Error('Step failed')
}
```

---

### 3. OpenTelemetry Integration (Integration)

**Test File**: `packages/backend/db/src/telemetry-sdk/__tests__/otel-integration.test.ts`

| Test ID | Description | Setup | Assertions |
|---------|-------------|-------|------------|
| OTEL-001 | Extract correlation_id from active span | Create OTel span, call hook | Event correlation_id === span.spanContext().traceId |
| OTEL-002 | Correlation_id null when no active span | No span context, call hook | Event correlation_id === null |
| OTEL-003 | Correlation_id captured at event creation time | Create span, buffer event, end span, flush | Event has original trace ID, not null |

**Test Setup**:
```typescript
import { trace, context } from '@opentelemetry/api'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'

const provider = new NodeTracerProvider()
provider.register()
const tracer = trace.getTracer('test-tracer')
```

---

### 4. Batch Insertion (Integration with PostgreSQL)

**Test File**: `packages/backend/db/src/telemetry-sdk/__tests__/batch-insert.test.ts`

**Testcontainers Setup**:
```typescript
import { PostgreSqlContainer } from '@testcontainers/postgresql'

let container: PostgreSqlContainer
let db: DrizzleDB

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16').start()
  db = drizzle(container.getConnectionString())
  // Run migrations to create telemetry.workflow_events table
  await migrate(db, { migrationsFolder: './src/migrations' })
})

afterAll(async () => {
  await container.stop()
})
```

| Test ID | Description | Setup | Assertions |
|---------|-------------|-------|------------|
| BATCH-001 | Insert 100 events in single batch | Buffer 100 events, flush | All 100 rows in DB, 1 INSERT call |
| BATCH-002 | Idempotency via ON CONFLICT | Insert same event_id twice | Only 1 row inserted |
| BATCH-003 | Partial batch failure handling | Mock DB error on insert | Warning logged, no crash |
| BATCH-004 | Batch chunking for large inserts | Buffer 1000 events (>65535 params limit) | Events chunked into multiple INSERT statements |
| BATCH-005 | Validation errors caught | Buffer event with invalid schema | Error logged, valid events still inserted |

**Performance Baseline**:
- Batch insert 100 events: <100ms
- Batch insert vs 100 individual inserts: ≥10x faster

---

### 5. Graceful Shutdown (Integration)

**Test File**: `packages/backend/db/src/telemetry-sdk/__tests__/shutdown.test.ts`

| Test ID | Description | Setup | Assertions |
|---------|-------------|-------|------------|
| SHUT-001 | SIGTERM triggers buffer flush | Buffer 50 events, emit SIGTERM | All 50 events in DB before process exits |
| SHUT-002 | SIGINT triggers buffer flush | Buffer 50 events, emit SIGINT | All 50 events in DB before process exits |
| SHUT-003 | Flush timeout prevents hanging | Buffer events, mock DB delay 10s, timeout 5s | Flush aborted after 5s, process exits |
| SHUT-004 | Multiple shutdown signals deduplicated | Emit SIGTERM twice quickly | Flush called once, no errors |

**Test Setup**:
```typescript
import { EventEmitter } from 'events'

const mockProcess = new EventEmitter() as NodeJS.Process
// Replace process.on listeners with mockProcess
```

---

### 6. Configuration Validation (Unit)

**Test File**: `packages/backend/db/src/telemetry-sdk/__tests__/config.test.ts`

| Test ID | Description | Input | Outcome |
|---------|-------------|-------|---------|
| CFG-001 | Valid config accepted | {source: 'orchestrator', enableBuffering: true, bufferSize: 100, flushIntervalMs: 5000} | Parsed successfully |
| CFG-002 | Invalid bufferSize rejected | {bufferSize: -1} | Zod validation error |
| CFG-003 | Invalid flushIntervalMs rejected | {flushIntervalMs: 'not-a-number'} | Zod validation error |
| CFG-004 | Missing required fields rejected | {source: 'orchestrator'} (no bufferSize) | Zod validation error |
| CFG-005 | Default values applied | {} | Defaults: enableBuffering=true, bufferSize=100, flushIntervalMs=5000 |

---

### 7. Error Resilience (Unit + Integration)

**Test File**: `packages/backend/db/src/telemetry-sdk/__tests__/error-handling.test.ts`

| Test ID | Description | Scenario | Expected Behavior |
|---------|-------------|----------|-------------------|
| ERR-001 | DB connection unavailable | Mock DB client throws connection error | Warning logged via @repo/logger, operation continues, no crash |
| ERR-002 | Malformed event payload | Event missing required field | Validation error logged, event dropped, other events processed |
| ERR-003 | Flush during DB outage | DB down when flush triggered | Error logged, buffer retained, retry on next interval |
| ERR-004 | Hook wraps throwing operation | Operation throws Error | Event emitted with error details, error re-thrown to caller |
| ERR-005 | Buffer overflow with drop-oldest | Buffer at max size, new event added | Oldest event dropped, new event added, warning logged |

**Assertion Pattern**:
```typescript
const mockLogger = vi.spyOn(logger, 'warn')
await flushBuffer() // triggers DB error
expect(mockLogger).toHaveBeenCalledWith(expect.stringContaining('Event flush failed'))
expect(sdk).not.toThrow() // SDK does not crash
```

---

### 8. SDK Initialization (Unit)

**Test File**: `packages/backend/db/src/telemetry-sdk/__tests__/init.test.ts`

| Test ID | Description | Setup | Assertions |
|---------|-------------|-------|------------|
| INIT-001 | SDK initializes with config | Call `initTelemetrySdk(validConfig)` | Returns object with withStepTracking, withStateTracking functions |
| INIT-002 | Flush timer starts on init | Init with flushIntervalMs=1000 | Timer active, flush called after 1000ms |
| INIT-003 | Multiple init calls throw error | Call `initTelemetrySdk()` twice | Second call throws or returns same instance |
| INIT-004 | SDK can be shutdown | Call `sdk.shutdown()` | Timer cleared, buffer flushed, no memory leaks |

---

## Coverage Requirements

**Minimum Coverage**: 80% (exceeds global 45% requirement due to SDK criticality)

**Target Coverage by Module**:
- `buffer.ts`: 90% (state transitions, edge cases)
- `hooks.ts`: 85% (success/error paths, metadata capture)
- `batch-insert.ts`: 80% (chunking, idempotency)
- `config.ts`: 95% (validation paths)
- `otel-integration.ts`: 75% (span extraction, fallback)

**Coverage Exclusions**:
- Type definition files (`__types__/index.ts`)
- Test utilities (`__tests__/helpers.ts`)

---

## Test Execution

### Local Development
```bash
# Run all SDK tests
pnpm --filter @repo/db test telemetry-sdk

# Run specific test file
pnpm --filter @repo/db test buffer.test.ts

# Coverage report
pnpm --filter @repo/db test --coverage telemetry-sdk
```

### CI Pipeline
- All tests run on every PR
- Testcontainers require Docker available in CI
- Performance tests run on main branch only (avoid noise in PRs)

---

## Performance Benchmarks

**Benchmark File**: `packages/backend/db/src/telemetry-sdk/__tests__/benchmarks.test.ts`

| Benchmark | Target | Measurement |
|-----------|--------|-------------|
| Batch insert 100 events | <100ms | Testcontainers PostgreSQL |
| Batch insert 1000 events | <500ms | Testcontainers PostgreSQL |
| Hook overhead (no buffering) | <1ms per call | In-memory timing |
| OTel span extraction | <0.1ms per call | In-memory timing |
| Buffer size=100, flush | <50ms | Mock DB |

**Baseline Comparison**:
- Individual inserts: 100 events = ~1000ms (10ms per event)
- Batch inserts: 100 events = ~100ms (1ms per event)
- **Expected improvement**: 10x faster ✅

---

## Test Risks & Mitigations

### Risk 1: Buffering hides event loss
**Scenario**: Orchestrator crashes before flush, buffered events lost
**Mitigation**:
- SHUT-001/002/003 test graceful shutdown
- Document buffer overflow strategy in SDK README
- Future story: Persistent queue (TELE-0021)

### Risk 2: Race conditions in flush timer
**Scenario**: Manual flush + timer flush fire simultaneously
**Mitigation**:
- BUF-005 tests timer clearing on manual flush
- Use mutex/lock pattern in flush implementation
- Test concurrent flush calls (BUF-006)

### Risk 3: Testcontainers setup complexity
**Scenario**: CI environment lacks Docker, tests fail
**Mitigation**:
- Document Docker requirement in README
- Provide skip flag for environments without Docker
- Mock DB layer for unit tests (no testcontainers)

### Risk 4: PostgreSQL parameter limit
**Scenario**: Batch insert >65535 params causes DB error
**Mitigation**:
- BATCH-004 tests chunking logic
- Calculate params per event (e.g., 10 fields = 10 params)
- Max batch size = 6553 events (65535 / 10)

### Risk 5: OTel span lifecycle
**Scenario**: Correlation_id captured after span ends
**Mitigation**:
- OTEL-003 tests correlation_id captured at event creation time
- Document: Extract trace ID immediately in hook, not at flush

---

## Dependencies

**Must Complete Before Testing**:
- INFR-0040: `telemetry.workflow_events` table exists (in-qa)
- INFR-0041: Event schemas and helpers available (completed)

**Test Infrastructure**:
- Vitest (existing)
- Testcontainers (add to @repo/db devDependencies)
- @opentelemetry/api, @opentelemetry/sdk-trace-node (existing in @repo/observability)

---

## Success Criteria

✅ All 40+ test cases passing
✅ 80%+ coverage on SDK modules
✅ Performance benchmarks meet targets
✅ No flaky tests (run 3x to verify stability)
✅ Testcontainers integration documented
✅ Error resilience verified (DB outage scenarios)

---

**TEST PLAN COMPLETE**

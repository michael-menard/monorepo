# Dev Feasibility Review: INFR-0050 — Event SDK (Shared Telemetry Hooks)

**Story ID**: INFR-0050
**Reviewer**: PM Dev Feasibility Agent
**Generated**: 2026-02-15
**Epic**: INFR (Infrastructure)

---

## Executive Summary

**Verdict**: ✅ **FEASIBLE** with medium complexity

**Confidence**: HIGH (85%)

**Estimated Effort**: 3-5 days (including tests)

**Key Risks**:
1. Buffer overflow strategy needs user decision (drop oldest vs error vs block)
2. PostgreSQL parameter limit requires chunking logic for large batches
3. Race conditions between flush timer and shutdown handlers
4. Testcontainers setup may slow CI pipeline

**Blockers**:
- INFR-0040 must complete QA (currently in-qa) before implementation starts
- INFR-0041 already completed ✅

---

## Technical Feasibility

### 1. Reuse Assessment

#### Existing Components (High Reuse)

| Component | Location | Usage | Effort Saved |
|-----------|----------|-------|--------------|
| `insertWorkflowEvent()` | `packages/backend/db/src/workflow-events.ts` | Foundation for batch insert | HIGH - core primitive exists |
| Event Helper Functions | `packages/backend/db/src/workflow-events/helpers.ts` | Typed event creators (5 types) | HIGH - validation patterns established |
| Event Zod Schemas | `packages/backend/db/src/workflow-events/schemas.ts` | Payload validation | HIGH - no new schemas needed |
| OTel Utilities | `@repo/observability` | `trace.getActiveSpan()`, middleware patterns | MEDIUM - API exists, integration needed |
| Drizzle Batch Insert | `@repo/db` | `db.insert(table).values([...])` | HIGH - ORM supports batching natively |
| Logger | `@repo/logger` | Warn/error logging for resilience | HIGH - already integrated |

**Reuse Score**: 8/10 — Most infrastructure exists, SDK is primarily composition + buffering logic

#### New Components Required

| Component | Description | Complexity | Estimation |
|-----------|-------------|------------|------------|
| Event Buffer | In-memory queue with size/interval triggers | MEDIUM | 4-6 hours |
| Flush Timer | setInterval management with cleanup | LOW | 2-3 hours |
| Hook Functions | `withStepTracking()`, `withStateTracking()` wrappers | LOW | 3-4 hours |
| Shutdown Handlers | SIGTERM/SIGINT listeners with flush | MEDIUM | 3-4 hours |
| Batch Chunking | Split large batches to avoid PostgreSQL param limit | MEDIUM | 3-4 hours |
| SDK Initialization | Config validation + lifecycle management | LOW | 2-3 hours |
| Batch Insert Function | `insertWorkflowEventsBatch()` with error handling | MEDIUM | 4-5 hours |

**Total New Code**: ~25-30 hours (3-4 days) + Testing (~1-2 days)

---

### 2. Implementation Approach

#### Architecture

```
packages/backend/db/src/telemetry-sdk/
├── __types__/
│   └── index.ts          # Zod schemas for config, SDK interface
├── __tests__/
│   ├── buffer.test.ts
│   ├── hooks.test.ts
│   ├── otel-integration.test.ts
│   ├── batch-insert.test.ts
│   ├── shutdown.test.ts
│   ├── config.test.ts
│   └── benchmarks.test.ts
├── utils/
│   ├── buffer.ts         # Event buffer state management
│   ├── flush-timer.ts    # Interval management
│   └── batch-chunker.ts  # PostgreSQL param limit chunking
├── hooks.ts              # withStepTracking, withStateTracking
├── batch-insert.ts       # insertWorkflowEventsBatch()
├── config.ts             # SDK config schema + defaults
├── init.ts               # initTelemetrySdk()
├── index.ts              # Public API exports
└── README.md             # Usage documentation
```

**Design Decisions**:

1. **Buffer Overflow Strategy** ⚠️ NEEDS USER INPUT
   - **Option A**: Drop oldest events (graceful degradation)
   - **Option B**: Throw error (fail fast)
   - **Option C**: Block until flush (may slow orchestrator)
   - **Recommendation**: Drop oldest + warn (balances resilience + observability)

2. **Flush Timer Management**
   - Use `setInterval()` (Node.js built-in, no dependencies)
   - Clear timer on manual flush to prevent duplicates
   - Store timer ID in SDK state for shutdown cleanup

3. **OTel Context Propagation**
   - Extract `trace.getActiveSpan()` at **event creation time** (in hook)
   - Store correlation_id in event object immediately
   - Avoid extracting at flush time (span may have ended)

4. **Batch Insert Size Limits**
   - PostgreSQL has ~65535 parameter limit
   - Each event has ~10 fields → 10 params
   - Max batch size: **6553 events** per INSERT
   - Chunk batches >6500 events into multiple INSERTs
   - Use Drizzle's batch insert API: `db.insert(table).values([...])`

5. **Hook Function API Design**
   - **Return event_id?** No - hooks should be transparent wrappers
   - **Support custom metadata overrides?** Yes - allow `options.metadata` for flexibility
   - **Async only?** Yes - all hooks return Promise<T>

---

### 3. Dependencies & Blockers

#### Hard Blockers
- **INFR-0040** (in-qa): Must complete and deploy `telemetry.workflow_events` table before SDK can be used
  - Current Status: in-qa
  - Action: Wait for QA completion
  - ETA: ~1-2 days

#### Soft Dependencies
- **INFR-0041** (completed ✅): Typed event schemas
  - Status: Already merged
  - No blocker

#### New Dependencies
- **Testcontainers** (`@testcontainers/postgresql`): For integration tests
  - Action: Add to `@repo/db` devDependencies
  - CI Impact: Requires Docker in CI environment (already available)

---

### 4. Risk Analysis

#### Technical Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Buffer overflow crashes orchestrator | HIGH | LOW | Use drop-oldest strategy + warning logs |
| Race condition: timer + shutdown flush | MEDIUM | MEDIUM | Use mutex/lock in flush function, test SHUT-004 |
| PostgreSQL param limit exceeded | MEDIUM | LOW | Implement chunking (batch-chunker.ts), test BATCH-004 |
| OTel span ended before correlation_id extracted | MEDIUM | MEDIUM | Extract trace ID immediately in hook, test OTEL-003 |
| Event loss on process crash (before flush) | MEDIUM | HIGH | Document limitation, defer persistent queue to TELE-0021 |
| Testcontainers slow CI pipeline | LOW | HIGH | Cache Docker images, run integration tests in parallel |

#### Complexity Risks

| Risk | Mitigation |
|------|------------|
| Buffer state management complexity | Use simple array + index tracking, comprehensive unit tests |
| Shutdown handler race conditions | Register handlers once, use flag to prevent duplicate flushes |
| OTel API changes | Pin @opentelemetry/api version, reuse @repo/observability abstractions |

---

### 5. Implementation Questions (for Developer)

#### Critical Decisions

1. **Buffer Overflow Strategy**
   - **Question**: Drop oldest, throw error, or block until flush?
   - **Recommendation**: Drop oldest + warn (graceful degradation)
   - **Trade-off**: Lose some events vs crash orchestrator
   - **User Input Needed**: YES ⚠️

2. **Flush Timer vs Scheduler Library**
   - **Question**: Use `setInterval()` or library like `node-schedule`?
   - **Recommendation**: `setInterval()` (simpler, no dependencies)
   - **Trade-off**: Manual timer management vs library complexity

3. **Singleton vs Factory Pattern**
   - **Question**: SDK as singleton or allow multiple instances?
   - **Recommendation**: Singleton (one event buffer per process)
   - **Implementation**: `initTelemetrySdk()` returns cached instance on subsequent calls

4. **Batch Chunking Algorithm**
   - **Question**: Chunk by event count or parameter count?
   - **Recommendation**: Event count (simpler, conservative limit of 6500 events)
   - **Calculation**: 10 fields/event × 6500 = 65000 params (under 65535 limit)

5. **Hook Function Return Value**
   - **Question**: Return event_id for debugging?
   - **Recommendation**: No - hooks should be transparent wrappers, return original operation result
   - **Alternative**: Log event_id via @repo/logger in debug mode

---

### 6. Testing Strategy

**Framework**: Vitest + Testcontainers

**Test Pyramid**:
- Unit Tests: 70% (buffer, config, hooks in isolation)
- Integration Tests: 25% (PostgreSQL, OTel)
- Performance Tests: 5% (batch benchmarks)

**Key Test Areas** (see TEST-PLAN.md for full details):
- Buffer logic (size/interval triggers, overflow)
- Hook functions (success/error paths, metadata capture)
- OTel integration (correlation_id extraction)
- Batch insertion (chunking, idempotency)
- Graceful shutdown (SIGTERM/SIGINT)
- Error resilience (DB unavailable, validation errors)

**Testcontainers Impact**:
- Adds ~5-10s per test suite run (container startup)
- Requires Docker in CI (already available)
- Recommendation: Run testcontainers tests in parallel, cache images

---

### 7. Performance Considerations

#### Expected Performance

| Metric | Target | Baseline (Individual Inserts) | Expected Improvement |
|--------|--------|-------------------------------|----------------------|
| 100 events | <100ms | ~1000ms (10ms/event) | **10x faster** ✅ |
| 1000 events | <500ms | ~10000ms (10ms/event) | **20x faster** ✅ |
| Hook overhead | <1ms | N/A | Negligible |
| OTel extraction | <0.1ms | N/A | Negligible |

#### Optimization Opportunities
- **Batch Coalescing**: If multiple flushes queued, merge into single batch
- **Compression**: gzip payloads before insert (deferred to future story)
- **Connection Pooling**: Reuse DB connections (@repo/db already handles this)

---

### 8. Migration Path

**Adoption Pattern**:
1. SDK available in `@repo/db` after INFR-0050 completion
2. Orchestrator nodes can opt-in incrementally
3. Replace manual `insertWorkflowEvent()` calls with `withStepTracking()`
4. No breaking changes to existing event infrastructure

**Example Migration**:
```typescript
// BEFORE (manual)
import { insertWorkflowEvent, createStepCompletedEvent } from '@repo/db'

const event = createStepCompletedEvent({
  event_id: uuidv4(),
  step_name: 'analyze',
  duration_ms: 1234,
  // ... manual metadata
})
await insertWorkflowEvent(event)

// AFTER (SDK)
import { withStepTracking } from '@repo/db/telemetry-sdk'

await withStepTracking('analyze', async () => {
  // step logic
}, { tokens_used: 500, model: 'sonnet' })
// Event auto-emitted, correlation_id auto-populated
```

**Follow-up Story**: INFR-0051 — Orchestrator SDK Adoption

---

### 9. Documentation Requirements

**SDK README** (`packages/backend/db/src/telemetry-sdk/README.md`):
- Quick start guide
- Configuration options
- Hook function examples
- Migration guide from manual `insertWorkflowEvent()`
- Performance characteristics
- Error handling behavior
- Shutdown behavior

**Update Existing Docs**:
- `packages/backend/db/README.md` - Link to telemetry-sdk
- `docs/architecture/telemetry.md` - Add SDK section (if exists)

---

## Effort Estimation

### Breakdown

| Task | Estimated Hours | Notes |
|------|----------------|-------|
| Buffer implementation | 4-6h | State management, flush triggers |
| Hook functions | 3-4h | Wrappers with duration tracking |
| Batch insert function | 4-5h | Chunking, error handling, idempotency |
| Shutdown handlers | 3-4h | SIGTERM/SIGINT listeners |
| OTel integration | 2-3h | Span extraction, correlation_id |
| Config + validation | 2-3h | Zod schemas, defaults |
| SDK initialization | 2-3h | Singleton pattern, lifecycle |
| Unit tests | 8-10h | Buffer, hooks, config, init |
| Integration tests | 6-8h | PostgreSQL, OTel, shutdown |
| Performance benchmarks | 2-3h | Batch vs individual comparison |
| Documentation | 3-4h | README, migration guide |

**Total**: 39-53 hours

**Estimate**: **3-5 days** (assuming 8-10 productive hours/day)

**Confidence**: HIGH (85%)

---

## Recommendations

### Do This
✅ **Start Implementation After INFR-0040 Completes QA** - Hard blocker
✅ **Use Drop-Oldest Buffer Overflow Strategy** - Graceful degradation
✅ **Implement Batch Chunking** - Avoid PostgreSQL param limit errors
✅ **Extract Correlation IDs at Event Creation** - Avoid OTel span lifecycle issues
✅ **Add Comprehensive Shutdown Tests** - Critical for data integrity
✅ **Document Buffer Overflow Behavior** - Set user expectations

### Avoid This
❌ **Don't Block on Flush** - Could slow orchestrator unacceptably
❌ **Don't Extract Trace ID at Flush Time** - Span may have ended
❌ **Don't Skip Testcontainers Tests** - Integration coverage critical
❌ **Don't Return event_id from Hooks** - Keep API transparent

### Future Enhancements (Defer)
- Persistent event queue (TELE-0021)
- Event replay mechanism (INFR-0052)
- Prometheus metrics export (TELE-0020)
- Event sampling/throttling (TELE-0020)
- Frontend telemetry SDK (INFR-0053)

---

## Conclusion

INFR-0050 is **FEASIBLE** with medium complexity. The SDK builds on solid foundation from INFR-0040/0041, with most infrastructure already in place. Key implementation challenges (buffer overflow, batch chunking, shutdown handling) are well-understood and testable.

**Critical Path**:
1. Wait for INFR-0040 QA completion (1-2 days)
2. Implement SDK core (2-3 days)
3. Add comprehensive tests (1-2 days)
4. Document usage patterns (0.5 day)

**Estimated Total**: **4-6 days** from start to ready-for-qa

**Recommended Start Date**: After INFR-0040 moves to UAT or production

---

**DEV FEASIBILITY COMPLETE**

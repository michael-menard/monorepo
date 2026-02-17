---
generated: "2026-02-15"
baseline_used: "/Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: INFR-0050

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: None identified

### Relevant Existing Features

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| INFR-0040 Workflow Events Table | `packages/backend/database-schema/src/schema/telemetry.ts` | in-qa | Foundation - basic synchronous event ingestion |
| INFR-0041 Event SDK Schemas | `packages/backend/db/src/workflow-events/` | completed | Typed event schemas and helper functions |
| @repo/observability | `packages/backend/observability/` | Active | OpenTelemetry tracing + Prometheus metrics patterns |
| Drizzle ORM Schemas | `packages/backend/database-schema/src/schema/` | Active | Database schema patterns |
| @repo/db Client | `packages/backend/db/` | Active | Database connection pooling |
| Docker Compose Stack | `infra/compose.lego-app.yaml` | Active | PostgreSQL + Redis + Prometheus + Grafana + OTel |

### Active In-Progress Work

| Story | Status | Overlap Risk | Notes |
|-------|--------|--------------|-------|
| INFR-0040 | in-qa | None | Dependency - must complete before INFR-0050 |
| INFR-0041 | completed | None | Dependency - provides typed schemas foundation |

### Constraints to Respect

1. **Database Layer**: All schemas use Drizzle ORM with Zod-first types (no TypeScript interfaces)
2. **Event Model**: UUID for event_id, immutable append-only log
3. **Resilient Error Handling**: Event logging must not crash orchestrator (warn + continue pattern)
4. **Schema Separation**: `telemetry.*` namespace isolated from other schemas
5. **Protected Features**: Do not break existing `insertWorkflowEvent()` API surface

---

## Retrieved Context

### Related Endpoints
None - this is a backend SDK/library story without HTTP endpoints.

### Related Components

| Component | Location | Type | Usage Pattern |
|-----------|----------|------|---------------|
| `insertWorkflowEvent()` | `packages/backend/db/src/workflow-events.ts` | Function | Synchronous event insertion to telemetry.workflow_events |
| Event Helper Functions | `packages/backend/db/src/workflow-events/helpers.ts` | Functions | Typed event creators (5 event types) |
| Event Schemas | `packages/backend/db/src/workflow-events/schemas.ts` | Zod Schemas | Payload validation for each event_type |
| OpenTelemetry Middleware | `packages/backend/observability/src/tracing/hono-middleware.ts` | Middleware | Distributed tracing pattern for HTTP |
| Prometheus Metrics | `packages/backend/observability/src/metrics/` | Metrics | Counter/histogram/gauge patterns |
| React Hook Pattern | `packages/core/app-component-library/src/hooks/useRateLimitCooldown.ts` | Hook | Reusable stateful logic with cleanup |

### Reuse Candidates

1. **@repo/observability Patterns**:
   - Middleware-like composition pattern from `createTracingMiddleware()`
   - Metadata enrichment (correlation IDs from trace context)
   - Error handling with graceful degradation

2. **Existing Event Infrastructure**:
   - `insertWorkflowEvent()` as the core insertion primitive
   - Event helper functions from INFR-0041 for typed event creation
   - Zod schemas for validation

3. **React Hook Patterns** (conceptual inspiration):
   - `useRateLimitCooldown` demonstrates stateful hook with lifecycle management
   - Callback patterns with cleanup
   - SessionStorage persistence pattern

4. **Resilience Package** (from ADR):
   - Circuit breaker + rate limiter patterns
   - Timeout handling with AbortController
   - Pre-configured service policies (openAI, Cognito, S3, PostgreSQL, Redis)

---

## Knowledge Context

### Lessons Learned

No relevant lessons loaded from KB (lessons_loaded: false). This is a greenfield SDK story building on completed INFR-0040/0041 foundation.

### Blockers to Avoid (from past stories)

Based on INFR-0040/0041 execution patterns:
- **Avoid mixing event_id generation responsibilities** - INFR-0041 established that callers provide event_id
- **Avoid silent validation failures** - Use `.parse()` not `.safeParse()` to fail fast
- **Avoid breaking existing API surface** - Additive changes only to `insertWorkflowEvent()`

### Architecture Decisions (ADRs)

| ADR | Title | Constraint | Applies To INFR-0050 |
|-----|-------|------------|----------------------|
| ADR-Resilience-Observability | Resilience & Observability Infrastructure | OpenTelemetry for tracing, Prometheus for metrics, @repo/observability package | ✅ Yes - SDK should integrate with existing observability stack |

**Key ADR Constraints:**
- OpenTelemetry is the standard for distributed tracing
- Prometheus + prom-client for metrics collection
- @repo/observability provides tracing middleware and metrics patterns
- Docker stack provides Prometheus (9090), Grafana (3003), OTel Collector (4317/4318)

### Patterns to Follow

1. **Middleware/Hook Composition Pattern**:
   - Composable functions that wrap operations
   - Context enrichment (metadata, correlation IDs)
   - Lifecycle management (setup/teardown)

2. **Resilient Error Handling**:
   - Catch DB errors, log warnings, never crash caller
   - Graceful degradation when telemetry unavailable
   - From INFR-0040: "Event logging must not crash orchestrator"

3. **Zod-First Validation**:
   - Runtime validation with typed schemas
   - Fail-fast on malformed inputs
   - Auto-generate TypeScript types with `z.infer<>`

4. **Observability Integration**:
   - Extract correlation IDs from active OpenTelemetry span
   - Enrich events with trace context automatically
   - Follow @repo/observability patterns

### Patterns to Avoid

1. **TypeScript interfaces instead of Zod schemas** - Violates project standard
2. **Mutable event records** - Events are append-only, immutable
3. **Cross-schema dependencies** - Keep telemetry.* isolated
4. **Custom primary key generation** - Use existing UUID pattern
5. **Silent failures in validation** - Use `.parse()` to throw errors

---

## Conflict Analysis

No conflicts detected.

---

## Story Seed

### Title
Event SDK (Shared Telemetry Hooks)

### Description

**Context:**
INFR-0040 created the `telemetry.workflow_events` table with basic synchronous ingestion via `insertWorkflowEvent()`. INFR-0041 added typed event schemas and helper functions for the 5 core event types. However, orchestrator nodes must manually call `insertWorkflowEvent()` for each event, leading to:
- **Boilerplate**: Every node duplicates the same event emission pattern
- **Missing Context**: No automatic enrichment with correlation IDs from active OpenTelemetry spans
- **Manual Metadata**: Nodes must manually populate source/emitter/correlation_id fields
- **No Buffering**: Synchronous DB writes may slow down orchestrator execution
- **No Batch Support**: No way to emit multiple events efficiently

**Problem:**
The current event ingestion is functional but not ergonomic or performant. Orchestrator nodes need a **reusable SDK** that:
1. Provides hook-like functions for automatic event emission
2. Auto-enriches events with OpenTelemetry trace context
3. Buffers events in memory for batch insertion
4. Gracefully handles telemetry failures without blocking workflow execution
5. Integrates with existing @repo/observability patterns

**Proposed Solution:**
Create an **Event SDK** package/module that provides:
- **Telemetry Hooks**: Composable functions that wrap operations and emit events automatically
- **Context Enrichment**: Auto-populate correlation_id from active OTel span, source/emitter from config
- **Buffered Ingestion**: In-memory event buffer with configurable flush interval (e.g., 5s or 100 events)
- **Batch Insert Function**: `insertWorkflowEventsBatch()` for efficient bulk writes
- **Graceful Degradation**: Buffer overflow handling, telemetry downtime resilience
- **Developer Experience**: Simple API like `withStepTracking(stepName, () => operation())` that auto-emits step_completed events

This SDK will be the **canonical way** for orchestrator nodes (and future LangGraph nodes) to emit telemetry events, replacing manual `insertWorkflowEvent()` calls.

### Initial Acceptance Criteria

**Note:** These are preliminary ACs to guide PM elaboration. Full story will refine and expand based on dev feasibility and test planning.

- [ ] **AC-1**: Create `withStepTracking()` hook function
  - **Purpose**: Wrap a step operation, auto-emit `step_completed` event on success/error
  - **Signature**: `withStepTracking(stepName: string, operation: () => Promise<T>, options?: StepTrackingOptions): Promise<T>`
  - **Behavior**: Measure duration, capture tokens/model if provided, emit event on completion
  - **Integration**: Extract correlation_id from active OTel span if available

- [ ] **AC-2**: Create `withStateTracking()` hook function
  - **Purpose**: Emit `item_state_changed` event when state transitions occur
  - **Signature**: `withStateTracking(itemId: string, fromState: string, toState: string, options?: StateTrackingOptions): Promise<void>`
  - **Behavior**: Emit event immediately (not buffered, since state changes are critical)

- [ ] **AC-3**: Create in-memory event buffer
  - **Purpose**: Accumulate events before flushing to database in batches
  - **Configuration**: Max buffer size (default: 100), max flush interval (default: 5000ms)
  - **Behavior**: Auto-flush on buffer size or interval, whichever comes first

- [ ] **AC-4**: Create `insertWorkflowEventsBatch()` function
  - **Purpose**: Insert multiple events efficiently using Drizzle batch insert API
  - **Signature**: `insertWorkflowEventsBatch(events: WorkflowEventInput[]): Promise<void>`
  - **Error Handling**: Resilient - catch DB errors, log warnings, never crash
  - **Idempotency**: Leverage ON CONFLICT DO NOTHING on event_id from INFR-0040

- [ ] **AC-5**: Auto-enrich events with OpenTelemetry context
  - **Behavior**: Extract trace ID from active span (`trace.getActiveSpan()`) and populate correlation_id
  - **Fallback**: If no active span, leave correlation_id null
  - **Integration**: Use @repo/observability's OTel utilities

- [ ] **AC-6**: Add event buffer flush on process shutdown
  - **Purpose**: Ensure buffered events are persisted before orchestrator exits
  - **Implementation**: Register SIGTERM/SIGINT handlers to flush buffer
  - **Timeout**: Flush timeout (e.g., 5s) to prevent hanging shutdown

- [ ] **AC-7**: Create SDK configuration interface
  - **Fields**: `source` (e.g., "orchestrator"), `enableBuffering` (boolean), `bufferSize` (number), `flushIntervalMs` (number)
  - **Location**: `packages/backend/db/src/telemetry-sdk/config.ts`
  - **Validation**: Zod schema for config object

- [ ] **AC-8**: Export SDK initialization function
  - **Purpose**: Initialize SDK with config, start buffer flush timer
  - **Signature**: `initTelemetrySdk(config: TelemetrySdkConfig): TelemetrySdk`
  - **Behavior**: Return object with hook functions (withStepTracking, withStateTracking, etc.)

- [ ] **AC-9**: Add unit tests for buffering logic
  - **Coverage**: Buffer size threshold, flush interval, overflow handling, shutdown flush
  - **Framework**: Vitest
  - **Location**: `packages/backend/db/src/telemetry-sdk/__tests__/buffer.test.ts`

- [ ] **AC-10**: Add integration tests for hook functions
  - **Coverage**: withStepTracking success/error paths, withStateTracking, OTel context extraction
  - **Framework**: Vitest + testcontainers (PostgreSQL)
  - **Location**: `packages/backend/db/src/telemetry-sdk/__tests__/hooks.test.ts`

- [ ] **AC-11**: Document SDK usage patterns
  - **Location**: `packages/backend/db/src/telemetry-sdk/README.md`
  - **Content**: Configuration examples, hook function usage, migration guide from manual insertWorkflowEvent calls

### Non-Goals

- **Async Event Queue with Persistence** - Defer to future story if in-memory buffer insufficient
- **Event Replay Mechanisms** - Defer to TELE-0020
- **Prometheus Metrics Export** - Covered by TELE-0020 (Prometheus Metrics Mapping)
- **Event Archival/Retention** - Covered by INFR-0060
- **Event Sampling/Throttling** - Defer to TELE-0020 once query patterns emerge
- **GIN Indexes on JSONB Payload** - Defer to TELE-0010 based on dashboard query needs
- **Migration of Existing Orchestrator Nodes** - This story provides the SDK; adoption in orchestrator is a separate follow-up story
- **Frontend Telemetry Hooks** - This story is backend-only; frontend may have separate telemetry SDK needs
- **Real-time Event Streaming (Kafka/Redis Streams)** - MVP uses PostgreSQL only; streaming deferred to future story

### Reuse Plan

**Components to Reuse:**

1. **INFR-0040/0041 Foundation**:
   - `insertWorkflowEvent()` function as primitive
   - Event helper functions (`createStepCompletedEvent()`, etc.)
   - Zod schemas for all 5 event types
   - `telemetry.workflow_events` table schema

2. **@repo/observability Patterns**:
   - `trace.getActiveSpan()` for extracting correlation IDs
   - Middleware composition pattern (apply to hook functions)
   - OpenTelemetry re-exports (Span, Context, trace, propagation)

3. **Drizzle ORM**:
   - Batch insert API: `db.insert(table).values([...])`
   - ON CONFLICT DO NOTHING for idempotency

4. **React Hook Patterns** (conceptual):
   - Stateful lifecycle management from `useRateLimitCooldown`
   - Cleanup on unmount pattern → cleanup on process exit

**Packages to Leverage:**
- `@repo/db` - Event insertion functions
- `@repo/observability` - OTel utilities
- `@repo/logger` - Logging warnings/errors

**New Packages Required:**
None - SDK lives in `packages/backend/db/src/telemetry-sdk/`

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Context for Testing:**
- **Buffer Logic**: Test buffer size threshold, flush interval, overflow handling (drop oldest? throw?)
- **Shutdown Flush**: Test SIGTERM/SIGINT handlers flush buffer within timeout
- **OTel Integration**: Test correlation_id extraction with and without active span
- **Error Cases**: Test DB unavailable, batch insert partial failures, validation errors
- **Performance**: Benchmark batch insert vs individual inserts (expect 10x improvement)

**Test Risks:**
- Buffering may hide event loss if orchestrator crashes before flush
- Race conditions between flush timer and shutdown handler
- Testcontainers setup complexity for integration tests

### For UI/UX Advisor

Not applicable - backend-only SDK story.

### For Dev Feasibility

**Key Implementation Questions:**
1. **Buffer Overflow Strategy**: Drop oldest events? Block until flush? Throw error?
2. **Flush Timer Management**: Use setInterval or scheduler library? Clear on shutdown?
3. **OTel Context Propagation**: Ensure correlation_id captured at event creation time, not flush time
4. **Batch Insert Size Limits**: PostgreSQL parameter limit (~65535 params) - chunk large batches?
5. **Hook Function API Design**: Should hooks return event_id for debugging? Should they support custom metadata overrides?

**Dependencies to Verify:**
- INFR-0040 must be in production (not just in-qa) before this story starts implementation
- INFR-0041 completion confirmed (status shows ready-for-qa, verify before starting)

**Reuse Opportunities:**
- @repo/observability already has OTel utilities - ensure compatibility
- Consider extracting buffer logic as reusable utility if applicable to other domains

---

## Follow-up Story Candidates

Based on non-goals and future needs:

1. **INFR-0051: Orchestrator SDK Adoption** - Migrate existing orchestrator nodes to use INFR-0050 SDK (blocked by INFR-0050)
2. **INFR-0052: Event Replay CLI** - CLI tool to replay events for debugging/testing (blocked by INFR-0050)
3. **INFR-0053: Frontend Telemetry SDK** - Client-side event tracking SDK for React apps (inspired by INFR-0050 patterns)
4. **TELE-0021: Real-time Event Streaming** - Kafka/Redis Streams integration for event fanout (blocked by TELE-0020, INFR-0050)

---

**STORY-SEED COMPLETE**

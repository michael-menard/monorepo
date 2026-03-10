---
generated: "2026-02-14"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
parent_story: INFR-0040
---

# Story Seed: INFR-0041

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: None

### Relevant Existing Features
| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Drizzle ORM | Active | `packages/backend/database-schema/` | Schema definitions with Zod-first types |
| @repo/db Client | Active | `packages/backend/db/` | Connection pooling, exports for workflows |
| Docker Compose Stack | Active | `infra/compose.lego-app.yaml` | PostgreSQL, Prometheus, Grafana, OTel |
| Orchestrator State Machine | Active | `packages/backend/orchestrator/src/state/` | Source of state transitions |
| Workflow Events Table | Ready-for-QA | INFR-0040 | `telemetry.workflow_events` with basic ingestion |

### Active In-Progress Work
| Story | Status | Surface | Notes |
|-------|--------|---------|-------|
| INFR-0040 | ready-for-qa | database, backend | Workflow events table + basic insertWorkflowEvent() |

### Constraints to Respect
- All database schemas must use Drizzle ORM with Zod-first types (no TypeScript interfaces)
- Postgres schema separation: `telemetry.*` for events and metrics
- Event model uses UUID for event_id (consistent with all existing patterns)
- Immutable append-only event log (no updates, only inserts)

---

## Retrieved Context

### Related Endpoints
- None (backend infrastructure work)

### Related Components
- `packages/backend/db/src/workflow-events.ts` - insertWorkflowEvent() function from INFR-0040
- `packages/backend/database-schema/src/schema/telemetry.ts` - Telemetry schema namespace
- `packages/backend/orchestrator/src/state/story-state-machine.ts` - Source of workflow state transitions

### Reuse Candidates
- **Patterns**: INFR-0040's telemetry schema namespace pattern
- **Patterns**: Drizzle ORM table definitions with pgTable
- **Packages**: @repo/db client with connection pooling
- **Patterns**: Zod-first type definitions from existing schemas

---

## Knowledge Context

### Lessons Learned
_No KB query performed - using INFR-0040 deferred items as guidance_

### Parent Story (INFR-0040) Deferred Items

**22 items logged to KB**, categorized as:

#### High-Priority Enhancements (Candidates for INFR-0041)
1. **Batch insert function** - insertWorkflowEvent inserts one event at a time. Need `insertWorkflowEventsBatch(events[])` for high-volume ingestion
2. **Event payload validation** - Validate payload structure per event_type using Zod schemas
3. **Event source metadata** - Track which agent/node emitted each event (agent_id, node_name, hostname)
4. **Correlation ID support** - Link workflow events to OpenTelemetry traces via correlation_id field

#### Performance Optimizations (Defer to Later)
5. GIN index on JSONB payload for payload-specific queries
6. Composite indexes for specific query patterns:
   - `(run_id, event_type, ts)` - "show all step_completed events for run-123"
   - `(item_id, event_type, ts)` - story-specific telemetry
   - `(workflow_name, agent_role, ts)` - agent performance queries
7. Table partitioning strategy for 10M+ rows
8. SQL views for common queries (materialized views)

#### Integration & Tooling (Defer to INFR-0050/TELE stories)
9. Event sampling/throttling for high-volume events
10. Prometheus metrics export (TELE-0020)
11. Event archival to S3 (INFR-0060)
12. Event replay capability
13. Migration rollback SQL generation tooling

#### UX Polish
14. Event_id prefixes (e.g., `evt_state_01J4Z7X...`)
15. Event deduplication window beyond unique constraint
16. Return inserted event from insertWorkflowEvent

### Blockers to Avoid (from INFR-0040)
- None - INFR-0040 completed successfully with 14 ACs

### Architecture Decisions (ADRs)
_No ADR review performed - using INFR-0040 established patterns_

| Decision | Constraint |
|----------|------------|
| ULID vs UUID | Use UUID for consistency with all existing patterns (kb.*, work.*, ai.*) |
| Event ingestion | Synchronous insert acceptable for MVP, async queue deferred to INFR-0050 |
| Error handling | Event logging must not crash orchestrator (catch errors, log warnings) |
| Idempotency | Caller provides event_id, unique index prevents duplicates |

### Patterns to Follow
- Zod-first type definitions (use `z.infer<>` for TypeScript types)
- Drizzle ORM table definitions with pgTable
- JSONB for flexible/optional fields
- Auto-generate Zod schemas from Drizzle schemas
- Immutable event records (append-only, no updates)

### Patterns to Avoid
- TypeScript interfaces instead of Zod schemas
- Inline SQL without ORM
- Mutable event records (events are append-only)
- Cross-schema dependencies between telemetry and other namespaces
- Custom primary key generation (use Drizzle's defaultRandom() for UUID)

---

## Conflict Analysis

No conflicts detected.

**Validation Checks:**
- ✅ No overlapping active work
- ✅ No pattern violations
- ✅ No protected area violations
- ✅ Parent story (INFR-0040) in ready-for-qa state
- ✅ Downstream dependencies (INFR-0050, TELE-0010) still pending

---

## Story Seed

### Title
**Workflow Event SDK - Typed Schemas & Validation**

### Description

**Context:**
INFR-0040 created the `telemetry.workflow_events` table with basic synchronous ingestion via `insertWorkflowEvent()`. The table accepts any JSONB payload without validation, and callers must manually construct event objects.

**Problem:**
- **No type safety**: Event payloads are unvalidated JSONB, causing runtime errors if structure is wrong
- **No schema per event_type**: Each of the 5 event types (`item_state_changed`, `step_completed`, `story_changed`, `gap_found`, `flow_issue`) has different payload requirements, but these are undocumented
- **Manual event construction**: Orchestrator nodes manually build event objects, leading to inconsistent field naming and missing data
- **No payload validation**: Invalid payloads silently inserted, breaking downstream telemetry queries
- **Missing metadata**: No correlation_id for distributed tracing, no source metadata for debugging
- **INFR-0050 blocked**: Event SDK story needs typed schemas as foundation

**Current Gaps (from INFR-0040 deferred items):**
1. No Zod schemas for event_type-specific payloads
2. No validation before insertion
3. No source/emitter metadata fields
4. No correlation_id for OpenTelemetry integration
5. Manual event object construction in orchestrator nodes

**Goal:**
Create a **typed event schema library** that:
1. Defines Zod schemas for all 5 event types with typed payloads
2. Adds validation to `insertWorkflowEvent()` to reject malformed events
3. Exports typed helper functions for each event type (e.g., `createItemStateChangedEvent()`)
4. Adds metadata fields: `correlation_id`, `source`, `emitted_by` to table schema
5. Documents event payload structures for downstream consumers (TELE-0010, INFR-0050)

This story provides the **schema foundation** for INFR-0050 (Event SDK with hooks/middleware) and TELE-0010 (telemetry dashboards).

### Initial Acceptance Criteria

**Schema Definition (5 ACs)**

- [ ] **AC-1**: Create Zod schema for `item_state_changed` event payload
  - **Fields**: `from_state`, `to_state`, `item_id`, `item_type`, `reason`
  - **Location**: `packages/backend/db/src/workflow-events/schemas.ts`
  - **Export**: `ItemStateChangedPayloadSchema`

- [ ] **AC-2**: Create Zod schema for `step_completed` event payload
  - **Fields**: `step_name`, `duration_ms`, `tokens_used`, `model`, `status`, `error_message?`
  - **Export**: `StepCompletedPayloadSchema`

- [ ] **AC-3**: Create Zod schema for `story_changed` event payload
  - **Fields**: `change_type`, `field_changed`, `old_value`, `new_value`, `item_id`
  - **Export**: `StoryChangedPayloadSchema`

- [ ] **AC-4**: Create Zod schema for `gap_found` event payload
  - **Fields**: `gap_type`, `gap_description`, `severity`, `item_id`, `workflow_name`
  - **Export**: `GapFoundPayloadSchema`

- [ ] **AC-5**: Create Zod schema for `flow_issue` event payload
  - **Fields**: `issue_type`, `issue_description`, `recovery_action`, `workflow_name`, `agent_role`
  - **Export**: `FlowIssuePayloadSchema`

**Table Schema Enhancement (3 ACs)**

- [ ] **AC-6**: Add `correlation_id` column to `workflow_events` table
  - **Type**: `uuid`, nullable
  - **Purpose**: Link to OpenTelemetry trace IDs
  - **Migration**: New Drizzle migration file

- [ ] **AC-7**: Add `source` column to `workflow_events` table
  - **Type**: `text`, nullable
  - **Purpose**: Source system/service that emitted event (e.g., "orchestrator", "langgraph-node")

- [ ] **AC-8**: Add `emitted_by` column to `workflow_events` table
  - **Type**: `text`, nullable
  - **Purpose**: Agent/node that emitted event (e.g., "dev-implementation-leader", "pm-story-seed-agent")

**Validation & Helpers (4 ACs)**

- [ ] **AC-9**: Update `insertWorkflowEvent()` to validate payload against event_type schema
  - **Behavior**: Parse payload with corresponding Zod schema based on event_type
  - **Error Handling**: Throw validation error with detailed message if payload invalid
  - **Location**: `packages/backend/db/src/workflow-events.ts`

- [ ] **AC-10**: Create typed helper function `createItemStateChangedEvent()`
  - **Signature**: `createItemStateChangedEvent({ from, to, itemId, itemType, reason }): WorkflowEventInput`
  - **Behavior**: Constructs event object with UUID, validates payload, returns typed object
  - **Location**: `packages/backend/db/src/workflow-events/helpers.ts`

- [ ] **AC-11**: Create typed helper functions for remaining 4 event types
  - `createStepCompletedEvent()`
  - `createStoryChangedEvent()`
  - `createGapFoundEvent()`
  - `createFlowIssueEvent()`

- [ ] **AC-12**: Export unified `WorkflowEventSchemas` object with all schemas
  - **Structure**: `{ item_state_changed: schema, step_completed: schema, ... }`
  - **Export**: From `packages/backend/db/src/index.ts`

**Testing & Documentation (3 ACs)**

- [ ] **AC-13**: Add unit tests for all 5 event type schemas
  - **Location**: `packages/backend/db/src/workflow-events/__tests__/schemas.test.ts`
  - **Coverage**: Valid payloads, invalid payloads, required vs optional fields

- [ ] **AC-14**: Add unit tests for validation in `insertWorkflowEvent()`
  - **Coverage**: Valid events insert successfully, invalid events throw validation error

- [ ] **AC-15**: Document event schemas and payload examples
  - **Location**: `packages/backend/db/src/workflow-events/README.md`
  - **Content**: Table for each event type with payload fields, types, descriptions, examples

### Non-Goals

- **Async event queue/buffer** - Deferred to INFR-0050 (Event SDK)
- **Batch insert function** - Deferred to INFR-0050 (async ingestion)
- **Event sampling/throttling** - Deferred to TELE-0020
- **Prometheus metrics export** - Deferred to TELE-0020
- **Event archival/retention** - Deferred to INFR-0060
- **Event replay mechanisms** - Deferred to future telemetry story
- **GIN indexes on JSONB payload** - Deferred until query patterns emerge
- **Composite indexes** - Covered by INFR-0040, additional indexes deferred to TELE-0010
- **Migration to orchestrator nodes** - Not part of this story; INFR-0050 will provide SDK for easy adoption

### Reuse Plan

**Components to Reuse:**
- INFR-0040's `telemetry.workflow_events` table and schema namespace
- INFR-0040's `insertWorkflowEvent()` function (enhance with validation)
- Drizzle ORM patterns from `packages/backend/database-schema/src/schema/`
- Zod schema generation patterns from existing schemas

**Patterns to Follow:**
- Zod-first type definitions (use `z.infer<>` for TypeScript types)
- Discriminated union pattern for event_type-specific schemas
- Helper functions that return fully validated objects
- Export schemas and helpers from @repo/db package
- Unit tests using Vitest + testcontainers

**New Packages Required:**
- None - all work within existing @repo/db and database-schema

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- Focus on schema validation edge cases (missing fields, wrong types, extra fields)
- Test all 5 event type schemas independently
- Test insertWorkflowEvent() validation with valid/invalid payloads for all event types
- Test new metadata columns (correlation_id, source, emitted_by) accept NULL and UUID/text values
- Consider adding snapshot tests for example payloads

### For UI/UX Advisor
- No UI work - backend infrastructure story

### For Dev Feasibility
- **Dependencies**: INFR-0040 must complete QA and be promoted to UAT before starting
- **Migration Strategy**: New migration adds 3 columns (correlation_id, source, emitted_by) - backward compatible
- **Validation Strategy**: Zod parse() vs safeParse() - use parse() to fail fast on invalid payloads
- **Helper Function Design**: Consider builder pattern vs simple function arguments
- **Documentation**: README.md with examples is critical for INFR-0050 and TELE-0010 adoption
- **Estimated Effort**: 1 story point (similar to INFR-0040)
- **Risk**: None - additive changes only, no breaking changes to existing table/function

---

## Parent Story Context (INFR-0040)

### What Was Built
- `telemetry.workflow_events` table with 10 columns
- `workflow_event_type` enum with 5 event types
- `insertWorkflowEvent()` function for synchronous ingestion
- 9 indexes for query performance
- Basic unit tests for insertion and idempotency

### What Was Deferred (22 items)
**High-priority items that should be INFR-0041 scope:**
1. Event payload validation with Zod schemas
2. Event source/emitter metadata fields
3. Correlation ID for distributed tracing

**Lower-priority items deferred to INFR-0050 or later:**
4. Batch insert function (async ingestion)
5. Event_id prefixes for readability
6. Return inserted event from insertWorkflowEvent
7. Event deduplication cache (Redis)
8. Sampling/throttling for high-volume events

**Performance optimizations deferred to TELE stories:**
9. GIN index on JSONB payload
10. Additional composite indexes
11. SQL materialized views
12. Table partitioning (INFR-0060)

**Integration work deferred to INFR-0050/TELE-0010:**
13. Prometheus metrics export (TELE-0020)
14. Event archival to S3 (INFR-0060)
15. Event replay capability

### Blocks Downstream Work
- **INFR-0050** (Event SDK): Needs typed schemas from INFR-0041 as foundation
- **TELE-0010** (Docker Telemetry Stack): Can start with INFR-0040's basic events, but INFR-0041 improves data quality

### Dependencies
- **Hard Dependency**: INFR-0040 must complete QA (current status: ready-for-qa)
- **Soft Dependencies**: None

---

## Next Steps

1. **PM Phase**: Generate test plan, dev feasibility assessment
2. **Elaboration**: Review AC completeness, identify gaps
3. **Implementation**:
   - Phase 1: Define 5 Zod schemas for event payloads
   - Phase 2: Add 3 metadata columns to table (migration)
   - Phase 3: Add validation to insertWorkflowEvent()
   - Phase 4: Create 5 helper functions
   - Phase 5: Write tests + documentation
4. **QA**: Verify all 5 event types validate correctly, test edge cases

---

**STORY-SEED COMPLETE**

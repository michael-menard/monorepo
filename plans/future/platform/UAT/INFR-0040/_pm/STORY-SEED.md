---
generated: "2026-02-13"
baseline_used: "/Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: INFR-0040

## Reality Context

### Baseline Status
- Loaded: Yes
- Date: 2026-02-13
- Gaps: None - baseline is active and current

### Relevant Existing Features

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| Drizzle ORM Schemas | `packages/backend/database-schema/src/schema/` | Active | INFR-0040 will add workflow event schemas here |
| @repo/db Client | `packages/backend/db/` | Active | Database connection pooling and client exports |
| Orchestrator State Machine | `packages/backend/orchestrator/src/state/story-state-machine.ts` | Active | Source of story state transitions to track |
| @repo/observability | `packages/backend/observability/` | Active | Existing OpenTelemetry and Prometheus metrics infrastructure |
| Docker Compose Stack | `infra/compose.lego-app.yaml` | Active | PostgreSQL + Redis + Prometheus + Grafana + OTel already running |
| Orchestrator Artifacts | `packages/backend/orchestrator/src/artifacts/` | Active | YAML artifact schemas with Zod validation |

### Active In-Progress Work

| Story | Phase | Overlap Risk |
|-------|-------|--------------|
| None | N/A | No active platform stories - INFR-0040 is Wave 1 (no dependencies) |

### Constraints to Respect

**From Baseline:**
- All database schemas must use Drizzle ORM with Zod-first types (no TypeScript interfaces)
- Database schema files go in `packages/backend/database-schema/src/schema/`
- Auto-generate Zod schemas via `drizzle-zod` in `packages/backend/db/src/generated-schemas.ts`
- Protected: existing production DB schemas, Knowledge Base schemas, Umami analytics schema, @repo/db client API

**From Story Dependencies:**
- INFR-0040 has NO dependencies (Wave 1 story)
- INFR-0040 blocks INFR-0050 (Event SDK) and TELE-0010 (Docker Telemetry Stack)
- Downstream stories depend on this event table existing and being populated

**From Architecture:**
- Postgres schema separation: `kb.*` (knowledge), `work.*` (artifacts), `telemetry.*` (events), `ai.*` (models)
- Event model uses ULID for event_id (idempotent ingestion with unique index)
- Immutable append-only event log (no updates, only inserts)
- Normalize what you query often; everything else goes in JSONB

---

## Retrieved Context

### Related Database Schemas

**Existing Schema Pattern (`packages/backend/database-schema/src/schema/index.ts`):**
- Uses Drizzle ORM with `pgTable`, `pgEnum`, `pgSchema` for namespacing
- Exports all tables for Drizzle discovery
- UUID primary keys with `uuid('id').primaryKey().defaultRandom()`
- Timestamp fields: `timestamp('created_at').notNull().defaultNow()`
- JSONB fields: `jsonb('field_name').$type<TypeHere>()`
- Indexes for common query patterns

**Schema Namespace Pattern (Umami example):**
```typescript
export const umami = pgSchema('umami')
export const account = umami.table('account', { ... })
```

**Relevant to INFR-0040:**
- Need to create `telemetry` pgSchema namespace
- Event table will be `telemetry.workflow_events`
- Event enum will define 5 core event types from INFR PLAN.md

### Related Observability Infrastructure

**@repo/observability (`packages/backend/observability/`):**
- Already has OpenTelemetry tracing with spans
- Has Prometheus metrics middleware
- Exports `createMetricsEndpoint()`, `createHttpMetricsMiddleware()`
- This infrastructure can be leveraged to emit workflow events

**Docker Stack (`infra/compose.lego-app.yaml`):**
- PostgreSQL on port 5432 (ready for event table)
- Prometheus on port 9090
- Grafana on port 3003
- OTel Collector on ports 4317/4318
- All with persistent volumes and health checks

### State Machine Context

**Story Status Enum (`packages/backend/orchestrator/src/state/story-state-machine.ts`):**
- 17 story statuses defined in `StoryStatusSchema`
- `validTransitions` map defines valid state transitions
- Status-to-directory mapping for physical organization
- This is the source data for `workflow.item_state_changed` events

### Reuse Candidates

**Must Reuse:**
- Drizzle ORM table definitions
- `pgSchema()` for telemetry namespace
- UUID primary keys with defaultRandom()
- JSONB for flexible event payload storage
- Timestamp with defaultNow() for event timestamp
- Index patterns for common queries

**Should Create:**
- New `telemetry` pgSchema namespace
- `workflow_events` table in telemetry schema
- `workflow_event_type` pgEnum with 5 event types
- Migration file in `packages/backend/database-schema/src/migrations/`
- Drizzle migration command in package.json

---

## Knowledge Context

### Lessons Learned
- Lessons loaded: No (no KB queries run - Wave 1 foundation story)
- No prior workflow event ingestion attempts in this codebase

### Blockers to Avoid (from ADRs)
- None directly applicable - this is infrastructure/schema work

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Path Schema | Not applicable (backend schema work) |
| ADR-002 | Infrastructure-as-Code | Use CloudFormation for infrastructure (not applicable for DB schema) |
| ADR-005 | Testing Strategy | If adding UAT tests, must use real services (not mocks) |

**Key Constraints:**
- Database schemas use Zod-first types (no TypeScript interfaces)
- All new database work must include migrations
- Schema separation: use `telemetry.*` namespace for workflow events

### Patterns to Follow
- Zod-first type definitions (use `z.infer<>` for TypeScript types)
- Drizzle ORM table definitions with pgTable
- JSONB for flexible/optional fields
- Indexes for frequently queried columns
- Auto-generate Zod schemas from Drizzle schemas

### Patterns to Avoid
- TypeScript interfaces instead of Zod schemas
- Inline SQL without ORM
- Mutable event records (events are append-only)
- Cross-schema dependencies between telemetry and other namespaces

---

## Conflict Analysis

No conflicts detected.

---

## Story Seed

### Title
Workflow Events Table + Ingestion

### Description

**Context:**
The orchestrator currently tracks workflow execution in memory and YAML files on disk. There is no persistent, queryable log of workflow events (state transitions, step completions, gaps found, etc.). This blocks downstream telemetry dashboards, learning loops, and cost tracking.

The INFR epic establishes a three-tier persistence architecture:
1. Operational DB (Postgres) - state, events, metadata
2. Artifact Blob Store (MinIO/S3) - large files
3. Knowledge Base (pgvector) - embeddings

INFR-0040 focuses on tier 1: creating the workflow events table and basic ingestion mechanism.

**Problem:**
- No centralized event log for workflow execution
- State transitions not tracked in queryable format
- Cost, tokens, duration not persisted per step
- Gap findings, flow issues, churn events not captured
- TELE-0010 (telemetry stack) blocked waiting for event data
- INFR-0050 (Event SDK) blocked waiting for event schema

**Proposed Solution:**
Create a `telemetry.workflow_events` table in Postgres with:
- Event type enum (5 core events from INFR PLAN.md)
- ULID event_id for idempotency
- Normalized columns for common queries (event_type, run_id, item_id, workflow_name, agent_role, status)
- JSONB payload for event-specific data
- Append-only, immutable design
- Unique index on event_id to prevent duplicates

Add basic ingestion function that orchestrator nodes can call to write events synchronously (async/queue ingestion comes later in INFR-0050).

### Initial Acceptance Criteria

- [ ] AC-1: Create `telemetry` pgSchema namespace in Drizzle schema files
- [ ] AC-2: Define `workflow_event_type` pgEnum with 5 event types: `item_state_changed`, `step_completed`, `story_changed`, `gap_found`, `flow_issue`
- [ ] AC-3: Create `workflow_events` table with columns:
  - `event_id` (text, ULID, primary key)
  - `event_type` (workflow_event_type enum, not null, indexed)
  - `event_version` (integer, default 1)
  - `ts` (timestamp, not null, defaultNow, indexed)
  - `run_id` (text, nullable, indexed)
  - `item_id` (text, nullable, indexed)
  - `workflow_name` (text, nullable, indexed)
  - `agent_role` (text, nullable, indexed)
  - `status` (text, nullable, indexed for step_completed events)
  - `payload` (jsonb, nullable, stores event-specific data)
- [ ] AC-4: Add unique index on `event_id` for idempotent ingestion
- [ ] AC-5: Add composite index on `(event_type, ts)` for telemetry queries
- [ ] AC-6: Add composite index on `(run_id, ts)` for run-specific queries
- [ ] AC-7: Create Drizzle migration file
- [ ] AC-8: Auto-generate Zod schemas from Drizzle schema using drizzle-zod
- [ ] AC-9: Create basic `insertWorkflowEvent()` function in `@repo/db` package
- [ ] AC-10: Add unit tests for event insertion and idempotency (duplicate event_id should be ignored)
- [ ] AC-11: Document event schema and payload structure in INFR epic README

### Non-Goals

- Event SDK with hooks/middleware (INFR-0050)
- Async event queue/buffer (INFR-0050)
- Prometheus metrics mapping (TELE-0020)
- Grafana dashboards (TELE-0030)
- Event retention/archival policy (INFR-0060)
- Migrating existing orchestrator runs to event format
- Event replay or backfill mechanisms
- Cross-schema queries joining events with other tables
- Event schema versioning beyond basic event_version field

### Reuse Plan

**Components:**
- Drizzle ORM table definitions (see `packages/backend/database-schema/src/schema/index.ts`)
- pgSchema pattern from Umami analytics schema
- UUID/timestamp patterns from existing tables

**Patterns:**
- Zod-first types with `z.infer<>`
- JSONB for flexible payloads
- Indexed columns for query performance
- Unique constraints for idempotency
- Auto-generated Zod schemas via drizzle-zod

**Packages:**
- `@repo/db` for database client and query functions
- `drizzle-orm` for schema definitions
- `drizzle-zod` for auto-generated Zod schemas
- `ulid` for event ID generation

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- Focus on idempotent insertion (duplicate event_id handling)
- Test JSONB payload flexibility for different event types
- Verify indexes improve query performance
- Test concurrent inserts (multiple orchestrator runs)
- Consider migration rollback testing

### For UI/UX Advisor
- Not applicable - this is backend-only schema work
- No frontend UI for INFR-0040

### For Dev Feasibility
- Review Drizzle migration process (existing migrations in `packages/backend/database-schema/src/migrations/`)
- Verify ULID library choice (recommend `ulid` npm package)
- Consider migration strategy for local dev, staging, production
- Evaluate whether to add event table to existing @repo/db exports or create new telemetry-specific client
- Plan for schema evolution (event_version field supports future changes)

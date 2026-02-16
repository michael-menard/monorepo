---
generated: "2026-02-13"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: INFR-004

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No active baseline reality file exists. Proceeding with codebase scanning and architectural context only.

### Relevant Existing Features

**Postgres Database Infrastructure:**
- Postgres connection via Drizzle ORM configured in `packages/backend/database-schema/drizzle.config.ts`
- Default database: `lego_projects`
- Existing schemas in `apps/api/knowledge-base/src/db/schema.ts`:
  - `knowledge_entries` table with pgvector support
  - `stories`, `story_artifacts`, `story_dependencies` tables (KBAR-001)
  - `tasks`, `work_state` tables (KBMEM series)
  - Audit logging pattern established via `audit_log`, `task_audit_log`, `story_audit_log` tables

**Migration Infrastructure:**
- Drizzle Kit for schema generation and migration (`pnpm db:generate`, `pnpm db:migrate`)
- Migration files in `apps/api/knowledge-base/src/db/migrations/`
- 11+ existing migrations demonstrate established patterns

**API Infrastructure:**
- Hono server in `apps/api/lego-api/server.ts`
- Domain-based routing structure (health, gallery, sets, wishlist, etc.)
- OpenTelemetry metrics/tracing support via `@repo/observability`
- Middleware pattern for CORS, logging, tracing

### Active In-Progress Work
- No active baseline to check for in-progress work
- Git status shows deleted YAML-based planning files (expected for INFR migration)

### Constraints to Respect
- **Database Connection**: Use existing Drizzle config at `packages/backend/database-schema/drizzle.config.ts`
- **Schema Location**: New schemas should be added to knowledge-base schema file or a new schema file in appropriate location
- **Migration Conventions**: Follow existing numbered migration pattern (`0XX_description.sql`)
- **JSONB Usage**: Postgres JSONB for semi-structured `payload` column (established pattern from existing tables)

---

## Retrieved Context

### Related Endpoints
- No existing telemetry endpoints found
- Health check pattern exists at `/health` in `apps/api/lego-api/domains/health/routes.js`
- Route mounting pattern: `app.route('/domain', domainRoutes)`

### Related Components
- **Drizzle ORM**: `packages/backend/database-schema/` for schema definitions
- **Database Client**: `packages/backend/db/` likely contains DB connection utilities
- **Observability**: `@repo/observability` for metrics/tracing middleware

### Reuse Candidates

**Schema Patterns to Reuse:**
1. **UUID Primary Keys**: All existing tables use `uuid('id').primaryKey().defaultRandom()`
2. **Timestamp Columns**: `timestamp('created_at').notNull().defaultNow()` pattern
3. **JSONB Columns**: `jsonb('column_name')` for semi-structured data (see `story_artifacts.content`, `tasks` metadata)
4. **Indexes**: `index('table_column_idx').on(table.column)` pattern for frequently queried columns
5. **Audit Logging**: Established pattern with trigger-based audit logs

**Migration Patterns:**
- Manual SQL migrations for custom indexes (e.g., pgvector IVFFlat index)
- Partition creation can be done in migration SQL

**API Route Patterns:**
- Hono router with domain-based organization
- TypeScript route handlers
- Middleware for observability

---

## Knowledge Context

### Lessons Learned
No lesson-learned KB entries retrieved (no KB search performed in this seed phase).

### Blockers to Avoid
Based on ADR analysis:
- **API Path Mismatch** (ADR-001): Frontend expects `/api/v2/{domain}`, backend provides `/{domain}`. Ensure telemetry endpoint follows this pattern.
- **Infrastructure Drift** (ADR-002): Avoid framework-specific IaC. Database schema is framework-agnostic (good).
- **UAT Mocking** (ADR-005): If UAT tests are written, ensure they use real database, not mocks.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Path Schema | Frontend: `/api/v2/{domain}`, Backend: `/{domain}` (proxied via Vite/APIGW) |
| ADR-002 | Infrastructure-as-Code Strategy | Use framework-agnostic CloudFormation templates |
| ADR-005 | Testing Strategy | UAT must use real services, not mocks |

### Patterns to Follow
1. **Drizzle ORM for schema definitions**: Define table schemas in TypeScript using Drizzle, generate migrations
2. **JSONB for semi-structured data**: Use JSONB columns for flexible payloads (event-specific data)
3. **Unique constraints for deduplication**: Implement idempotency via unique index on `event_id`
4. **Indexed query columns**: Add indexes on columns used for filtering (event_name, ts, item_id, run_id)
5. **Append-only semantics**: No UPDATE or DELETE operations on events table

### Patterns to Avoid
- Avoid using MongoDB or other document stores (ADR-002 context: stick to Postgres)
- Avoid hardcoding database credentials (use env vars as per existing pattern)
- Avoid mocking in UAT (ADR-005)

---

## Conflict Analysis

No conflicts detected.

---

## Story Seed

### Title
Workflow Events Table + Ingestion

### Description

**Context:**
The INFR epic aims to replace YAML-file-based persistence with Postgres for structured data. This story establishes the foundational workflow events table and ingestion endpoint that will serve as the source of truth for all downstream analytics, telemetry dashboards, and learning loop systems (TELE, LEARN, SDLC epics).

The existing codebase has a well-established Postgres infrastructure using Drizzle ORM with 11+ migrations, including tables for stories, tasks, artifacts, and knowledge entries. The database connection, migration tooling, and schema patterns are proven and ready to extend.

**Problem:**
Currently, workflow execution data (state transitions, agent completions, story changes, gaps found, flow issues) is either ephemeral or stored in scattered YAML files. This makes it impossible to:
- Query workflow metrics across stories
- Build real-time dashboards
- Detect patterns in workflow bottlenecks
- Provide agents with historical execution context

**Solution:**
Create an append-only `telemetry.workflow_events` table to store 5 core event types (item_state_changed, step_completed, story_changed, gap_found, flow_issue). Implement an idempotent ingestion endpoint at `POST /telemetry/events` that accepts event payloads and stores them with deduplication on `event_id`.

The table will use:
- ULID for `event_id` (sortable, time-based, unique)
- `event_version` integer for future schema evolution
- JSONB `payload` column for event-specific data
- Indexed columns (event_name, ts, item_id, run_id) for efficient querying
- Unique index on `event_id` for idempotent writes
- Monthly partitioning readiness (can be added in future migration)

### Initial Acceptance Criteria

**Schema & Migration:**
- [ ] AC-1: Create `telemetry` schema in Postgres
- [ ] AC-2: Define `workflow_events` table with columns: `event_id` (ULID PK), `event_version` (int), `event_name` (text), `ts` (timestamptz), `run_id` (text, nullable), `item_id` (text, nullable), `workflow_name` (text, nullable), `agent_role` (text, nullable), `payload` (JSONB)
- [ ] AC-3: Add unique index on `event_id` for deduplication
- [ ] AC-4: Add composite indexes on `(event_name, ts)`, `(item_id, ts)`, `(run_id, ts)` for query performance
- [ ] AC-5: Generate and apply Drizzle migration

**Ingestion Endpoint:**
- [ ] AC-6: Implement `POST /telemetry/events` endpoint in `apps/api/lego-api/domains/telemetry/routes.ts`
- [ ] AC-7: Validate event payload against Zod schema (event_id required, event_name required, ts required, payload JSONB)
- [ ] AC-8: Return 201 Created on new event insertion
- [ ] AC-9: Return 200 OK (idempotent) on duplicate `event_id` without error
- [ ] AC-10: Store all 5 core event types: `workflow.item_state_changed`, `workflow.step_completed`, `workflow.story_changed`, `workflow.gap_found`, `workflow.flow_issue`

**Testing:**
- [ ] AC-11: Unit tests for event validation (valid payloads, missing required fields, malformed ULID)
- [ ] AC-12: Integration tests for ingestion endpoint (insert new, dedupe on retry, query by filters)
- [ ] AC-13: Verify index usage in query execution plans

**Documentation:**
- [ ] AC-14: Document event schema in migration comments or adjacent `SCHEMAS.md`
- [ ] AC-15: Document ingestion endpoint in API route file comments

### Non-Goals
- **Partitioning Implementation**: Monthly partitioning will be deferred to INFR-005 (query optimization phase). The schema will be designed partition-ready but not partitioned in this story.
- **Event Streaming**: No real-time streaming (Kafka, Kinesis) in this phase. Simple HTTP POST ingestion only.
- **Retention Policies**: Automatic deletion or archival of old events is out of scope. Will be addressed in separate story.
- **Dashboard UI**: No UI components for viewing events. This is backend-only. Dashboards are covered in TELE epic.
- **Authentication/Authorization**: Telemetry ingestion endpoint will not enforce auth in this story (can be added later). Focus is on data model and idempotent ingestion.

### Reuse Plan

**Components:**
- Drizzle ORM schema definition patterns from `apps/api/knowledge-base/src/db/schema.ts`
- Migration tooling from `packages/backend/database-schema/drizzle.config.ts`
- Hono route structure from `apps/api/lego-api/server.ts` and domain route files

**Patterns:**
- UUID primary key pattern: `uuid('id').primaryKey().defaultRandom()` (adapt to ULID)
- JSONB column pattern for flexible payloads
- Unique index pattern for deduplication
- Composite index pattern for multi-column queries
- Timestamp with timezone pattern: `timestamp('ts', { withTimezone: true })`

**Packages:**
- `@repo/observability` - for metrics middleware (already integrated)
- `drizzle-orm` - for database schema and query building
- `zod` - for request validation schemas (existing pattern in project)
- `hono` - for API routing

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- **Unit Testing Focus**: Zod schema validation for event payloads (required fields, ULID format, event_name enum)
- **Integration Testing Focus**: Database insertion, deduplication behavior, query filtering by event_name/ts/item_id/run_id
- **Performance Testing**: Insert throughput (target: 100+ events/sec), query latency with indexes
- **Edge Cases**: Duplicate event_id handling, malformed ULID, missing required fields, extremely large JSONB payloads (>1MB)
- **Database Testing**: Verify unique constraint enforcement, index usage in EXPLAIN plans

### For UI/UX Advisor
- **Not Applicable**: This story is backend-only (database schema + API endpoint). No UI components.
- **Future Consideration**: When TELE epic builds dashboards, ensure event schema supports required queries.

### For Dev Feasibility
- **Schema Design Decisions**:
  - ULID vs UUID: ULID provides sortability by timestamp, which is valuable for time-series event data. Library: `ulid` npm package.
  - Partition Readiness: Design table to support `PARTITION BY RANGE (ts)` in future migration without schema changes.
  - JSONB vs Normalized: Events have heterogeneous payloads (different fields per event type). JSONB is appropriate. Frequently queried fields (event_name, ts, ids) are normalized.

- **Migration Strategy**:
  - Create `telemetry` schema first if it doesn't exist
  - Use `CREATE SCHEMA IF NOT EXISTS telemetry` in migration SQL
  - Drizzle can generate table definition, but partition setup (if deferred) requires manual SQL

- **Indexing Strategy**:
  - Unique index on `event_id` (deduplication)
  - B-tree indexes on `(event_name, ts)`, `(item_id, ts)`, `(run_id, ts)` for common query patterns
  - GIN index on `payload` JSONB column is optional and can be deferred (adds overhead to writes)

- **API Route Placement**:
  - Create new domain: `apps/api/lego-api/domains/telemetry/`
  - Follow existing pattern with `routes.ts` and service/repository layers
  - Mount at `/telemetry` in server.ts (frontend will access via `/api/v2/telemetry` per ADR-001)

- **Idempotency Implementation**:
  - Use `INSERT ... ON CONFLICT (event_id) DO NOTHING` SQL pattern
  - Drizzle: `db.insert(workflow_events).values(event).onConflictDoNothing({ target: workflow_events.event_id })`
  - Return 200 OK for conflict (not 409 Conflict, since idempotent retry is expected behavior)

- **Observability**:
  - Reuse existing `@repo/observability` middleware for metrics
  - Emit custom metrics: `telemetry_events_inserted_total`, `telemetry_events_deduplicated_total`
  - Trace ingestion latency

- **Dependency Check**:
  - `ulid` package for ULID generation (client-side will generate, backend validates format)
  - `zod` already in use for validation
  - `drizzle-orm` and `drizzle-kit` already configured

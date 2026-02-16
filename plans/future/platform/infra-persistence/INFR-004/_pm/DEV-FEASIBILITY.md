# Dev Feasibility Review: INFR-004 - Workflow Events Table + Ingestion

## Feasibility Summary

**Feasible for MVP:** Yes

**Confidence:** High

**Why:**
This story builds on well-established patterns in the codebase. Drizzle ORM infrastructure is mature (11+ migrations), Hono server is operational, and the schema design is straightforward. The append-only event model with ULID primary keys and JSONB payloads is a proven pattern. Idempotent ingestion via `ON CONFLICT DO NOTHING` is standard Postgres functionality. No new packages required beyond `ulid` for format validation. The scope is well-defined and implementation is low-risk.

---

## Likely Change Surface (Core Only)

### Database Layer

**New Files:**
- `apps/api/knowledge-base/src/db/schema.ts` (add telemetry schema + workflow_events table)
- `apps/api/knowledge-base/src/db/migrations/0XXX_telemetry_workflow_events.sql` (Drizzle-generated migration)

**Modified Files:**
- None (schema file is append-only)

---

### API Layer

**New Files:**
- `apps/api/lego-api/domains/telemetry/routes.ts` (ingestion endpoint)
- `apps/api/lego-api/domains/telemetry/validation.ts` (Zod schemas)
- `apps/api/lego-api/domains/telemetry/__tests__/validation.test.ts` (unit tests)
- `apps/api/lego-api/domains/telemetry/__tests__/ingestion.integration.test.ts` (integration tests)
- `apps/api/lego-api/domains/telemetry/telemetry.http` (manual test requests)

**Modified Files:**
- `apps/api/lego-api/server.ts` (mount `/telemetry` routes)

---

### Packages

**New Dependencies:**
- `ulid` (npm package for ULID validation)

**Existing Dependencies (Reused):**
- `drizzle-orm` (schema definition, query builder)
- `zod` (request validation)
- `hono` (routing)
- `@repo/observability` (metrics middleware)

---

### Critical Deploy Touchpoints

1. **Database Migration:**
   - Run `pnpm db:generate` to create migration SQL
   - Run `pnpm db:migrate` to apply migration
   - Verify `telemetry` schema and `workflow_events` table exist
   - Verify indexes created via `\d+ telemetry.workflow_events` in psql

2. **API Server Restart:**
   - Mount new `/telemetry` routes
   - Verify endpoint accessible at `/api/v2/telemetry/events` (via Vite proxy per ADR-001)

3. **Observability:**
   - Metrics emitted for ingestion success/failure
   - Tracing spans for ingestion requests

---

## MVP-Critical Risks

### Risk 1: ULID Library Choice

**Why it blocks MVP:**
Without ULID format validation, invalid `event_id` values could be inserted, breaking deduplication logic and downstream queries.

**Required Mitigation:**
- Use `ulid` npm package (https://github.com/ulid/javascript) for validation
- Add Zod refinement: `z.string().refine(val => ULID.isValid(val), { message: "Invalid ULID format" })`
- Unit test ULID validation with malformed inputs

**Decision for PM:**
Include `ulid` package as required dependency in implementation scope.

---

### Risk 2: Schema Namespace Collision

**Why it blocks MVP:**
If `telemetry` schema already exists in Postgres from another source, migration will fail.

**Required Mitigation:**
- Use `CREATE SCHEMA IF NOT EXISTS telemetry` in migration SQL
- Drizzle may not generate this automatically - add manual SQL in migration if needed
- Test migration on fresh DB and DB with existing schemas

**Decision for PM:**
Acceptance criteria should include "Migration runs cleanly on fresh DB **and** DB with existing schemas".

---

### Risk 3: Idempotency Implementation Drift

**Why it blocks MVP:**
If `ON CONFLICT DO NOTHING` is not implemented correctly, duplicate `event_id` submissions will cause 500 errors instead of silent idempotent behavior.

**Required Mitigation:**
- Use Drizzle's `.onConflictDoNothing({ target: workflow_events.event_id })` API
- Integration test must verify duplicate `event_id` returns 200 OK (not 201, not 500)
- Test concurrent duplicate submissions (race condition scenario)

**Decision for PM:**
Acceptance criteria AC-9 already covers this ("Return 200 OK on duplicate event_id without error"). Add integration test for concurrent duplicates.

---

### Risk 4: Timestamp Timezone Handling

**Why it blocks MVP:**
If `ts` column does not store timezone info, queries by time range will produce incorrect results (especially for cross-timezone systems).

**Required Mitigation:**
- Use `timestamp('ts', { withTimezone: true })` in Drizzle schema (already recommended in seed)
- Validation: Zod schema should accept ISO 8601 with timezone (e.g., `z.string().datetime()`)
- Test with multiple timezones to verify storage/retrieval consistency

**Decision for PM:**
Ensure AC-2 specifies `timestamp with timezone` explicitly for `ts` column.

---

### Risk 5: Index Creation Performance

**Why it blocks MVP:**
Creating indexes on large tables (if migration runs on production DB with existing data) can cause table locks and downtime.

**Required Mitigation:**
- This is a new table, so no existing data - not MVP-blocking
- Document index creation strategy for future migrations (use `CONCURRENTLY` for index creation on live tables)

**Decision for PM:**
Not MVP-blocking (new table). Add note to documentation: "For future index additions, use `CREATE INDEX CONCURRENTLY`".

---

## Missing Requirements for MVP

### Requirement 1: Event Retention Policy

**Context:**
Seed non-goals mention "retention policies" are out of scope. However, unbounded table growth will eventually cause performance degradation.

**Concrete Decision Text:**
"INFR-004 does not implement automatic deletion or archival. Event retention will be addressed in INFR-007 (planned for Q2 2026). For MVP, operators should manually monitor table size and plan for partitioning in INFR-005."

**Blocker Status:** Not blocking (explicitly deferred)

---

### Requirement 2: Payload Size Limit

**Context:**
Edge case in test plan tests >1MB payloads, but no explicit size limit defined.

**Concrete Decision Text:**
"Maximum payload size: 1MB. Requests exceeding this limit will return HTTP 413 Payload Too Large. Implement via middleware body size limit (Hono: `app.use(bodyLimit({ maxSize: 1024 * 1024 }))`)."

**Blocker Status:** Not blocking (can use default server limit if undefined)

---

### Requirement 3: Query Endpoint (GET /telemetry/events)

**Context:**
Test plan assumes ability to query events for validation, but index entry only mentions POST ingestion endpoint.

**Concrete Decision Text:**
"INFR-004 includes POST ingestion only. Query endpoint (GET /telemetry/events with filters) will be implemented in INFR-006 (Telemetry Query API). For MVP testing, use direct database queries via psql or DBeaver."

**Blocker Status:** Not blocking (testing can use direct DB access)

---

## MVP Evidence Expectations

### Database Evidence

**Required Artifacts:**
1. Migration SQL file generated by Drizzle (`0XXX_telemetry_workflow_events.sql`)
2. Screenshot or output of `\d+ telemetry.workflow_events` showing:
   - All columns with correct types
   - Primary key on `event_id`
   - Unique constraint on `event_id`
   - Indexes on `(event_name, ts)`, `(item_id, ts)`, `(run_id, ts)`

**Verification:**
```sql
-- Verify schema exists
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'telemetry';

-- Verify table structure
\d+ telemetry.workflow_events

-- Verify indexes
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'workflow_events';

-- Test insert
INSERT INTO telemetry.workflow_events (event_id, event_version, event_name, ts, payload)
VALUES ('01JCXY5Q2KZQX0EXAMPLE', 1, 'workflow.step_completed', NOW(), '{}');

-- Test unique constraint
INSERT INTO telemetry.workflow_events (event_id, event_version, event_name, ts, payload)
VALUES ('01JCXY5Q2KZQX0EXAMPLE', 1, 'workflow.step_completed', NOW(), '{}');
-- Should fail with unique constraint violation

-- Test query performance
EXPLAIN ANALYZE SELECT * FROM telemetry.workflow_events
WHERE event_name = 'workflow.step_completed' AND ts > NOW() - INTERVAL '1 day';
-- Should show index scan on (event_name, ts) index
```

---

### API Evidence

**Required Artifacts:**
1. `.http` file with all test requests (valid event, duplicate, missing fields, malformed ULID)
2. HTTP response logs showing:
   - 201 Created for new event
   - 200 OK for duplicate event_id
   - 400 Bad Request for validation errors
3. Integration test output (Vitest) showing all tests passing

**Verification:**
```bash
# Run integration tests
pnpm --filter @repo/lego-api test:integration telemetry

# Expected output:
# ✓ telemetry/ingestion.integration.test.ts (7 tests)
#   ✓ inserts new event with 201 status
#   ✓ returns 200 for duplicate event_id
#   ✓ validates required fields
#   ✓ validates ULID format
#   ✓ stores all 5 core event types
#   ✓ handles nullable fields correctly
#   ✓ handles concurrent duplicate submissions
```

---

### Observability Evidence

**Required Artifacts:**
1. Metrics output showing:
   - `telemetry_events_inserted_total` counter increments
   - `telemetry_events_deduplicated_total` counter increments on duplicate
2. Trace output showing ingestion request spans

**Verification:**
```bash
# Check metrics endpoint (if exposed)
curl http://localhost:3000/metrics | grep telemetry_events

# Expected output:
# telemetry_events_inserted_total{event_name="workflow.step_completed"} 5
# telemetry_events_deduplicated_total 2
```

---

### CI/Deploy Checkpoints

**Required Gates:**
1. **Migration Test (CI):**
   - CI job runs `pnpm db:migrate` on test DB
   - Verify migration applies cleanly
   - Verify rollback works (if Drizzle supports it)

2. **Integration Test (CI):**
   - All integration tests pass in CI environment
   - Database container available for tests

3. **Deployment Sequence:**
   - Deploy database migration first (before API code)
   - Verify migration applied: `SELECT * FROM telemetry.workflow_events LIMIT 1;`
   - Deploy API server with new routes
   - Smoke test ingestion endpoint: POST valid event, verify 201 response

---

## Reuse Plan Detail

### Schema Patterns (from existing tables)

**UUID Primary Key (adapt to ULID):**
```typescript
// Existing pattern (knowledge_entries table):
uuid('id').primaryKey().defaultRandom()

// Adapted for ULID (workflow_events table):
text('event_id').primaryKey()
// Note: ULID generated client-side, not via DB default
```

**Timestamp Columns:**
```typescript
// Reuse pattern:
timestamp('created_at', { withTimezone: true }).notNull().defaultNow()

// For workflow_events:
timestamp('ts', { withTimezone: true }).notNull()
// Note: ts provided by client (event timestamp), not DB insert time
```

**JSONB Columns:**
```typescript
// Reuse pattern (story_artifacts.content):
jsonb('content')

// For workflow_events:
jsonb('payload')
```

**Indexes:**
```typescript
// Reuse pattern:
index('knowledge_entries_tags_idx').on(knowledge_entries.tags)

// For workflow_events:
index('workflow_events_event_name_ts_idx').on(workflow_events.event_name, workflow_events.ts)
index('workflow_events_item_id_ts_idx').on(workflow_events.item_id, workflow_events.ts)
index('workflow_events_run_id_ts_idx').on(workflow_events.run_id, workflow_events.ts)
```

**Unique Constraints:**
```typescript
// New pattern for deduplication:
unique('workflow_events_event_id_unique').on(workflow_events.event_id)
// Or rely on PRIMARY KEY for uniqueness
```

---

### API Route Patterns (from existing domains)

**Domain Structure:**
```
apps/api/lego-api/domains/telemetry/
  routes.ts         # Hono router with POST /events endpoint
  validation.ts     # Zod schemas for request/response
  __tests__/
    validation.test.ts
    ingestion.integration.test.ts
  telemetry.http    # Manual test requests
```

**Route Mounting (server.ts):**
```typescript
// Existing pattern:
import { healthRoutes } from './domains/health/routes'
app.route('/health', healthRoutes)

// For telemetry:
import { telemetryRoutes } from './domains/telemetry/routes'
app.route('/telemetry', telemetryRoutes)
```

**Validation Pattern (Zod):**
```typescript
// Reuse from existing domains:
import { z } from 'zod'

const EventPayloadSchema = z.object({
  event_id: z.string().refine(val => ULID.isValid(val), {
    message: "Invalid ULID format"
  }),
  event_version: z.number().int().min(1),
  event_name: z.string().min(1),
  ts: z.string().datetime(),
  run_id: z.string().nullable().optional(),
  item_id: z.string().nullable().optional(),
  workflow_name: z.string().nullable().optional(),
  agent_role: z.string().nullable().optional(),
  payload: z.record(z.any()) // JSONB
})

type EventPayload = z.infer<typeof EventPayloadSchema>
```

**Observability Middleware (from existing routes):**
```typescript
// Existing pattern in server.ts:
import { metricsMiddleware, tracingMiddleware } from '@repo/observability'

app.use(metricsMiddleware())
app.use(tracingMiddleware())

// Telemetry routes automatically inherit these middlewares
```

---

### Idempotency Pattern (Drizzle)

**ON CONFLICT Implementation:**
```typescript
import { db } from '@repo/db'
import { workflow_events } from '../db/schema'

async function ingestEvent(event: EventPayload) {
  const result = await db
    .insert(workflow_events)
    .values({
      event_id: event.event_id,
      event_version: event.event_version,
      event_name: event.event_name,
      ts: new Date(event.ts),
      run_id: event.run_id,
      item_id: event.item_id,
      workflow_name: event.workflow_name,
      agent_role: event.agent_role,
      payload: event.payload
    })
    .onConflictDoNothing({ target: workflow_events.event_id })
    .returning({ event_id: workflow_events.event_id })

  // If returning array is empty, event was duplicate (conflict occurred)
  const created = result.length > 0

  return { event_id: event.event_id, created }
}
```

---

## Implementation Sequence

1. **Database Schema (Day 1)**
   - Define `telemetry` schema and `workflow_events` table in Drizzle
   - Add indexes
   - Generate migration
   - Test migration on local DB

2. **API Validation Layer (Day 1)**
   - Create Zod schemas with ULID validation
   - Unit tests for validation

3. **API Ingestion Endpoint (Day 2)**
   - Implement POST /telemetry/events route
   - Implement idempotent insert logic
   - Integration tests for insert/dedupe

4. **Testing & Evidence (Day 2)**
   - Run all unit + integration tests
   - Create .http file with manual test requests
   - Verify index usage via EXPLAIN
   - Document evidence in COMPLETION-REPORT.md

5. **Documentation (Day 2)**
   - Add migration comments
   - Add route file comments
   - Update API documentation (if exists)

**Total Estimate:** 2 days for experienced dev

---

## Architecture Alignment

**Ports/Adapters Compliance:**
- Ingestion endpoint is a port (HTTP input)
- Database access via Drizzle ORM is the adapter (persistence output)
- Domain logic (event validation, deduplication) is separate from infrastructure

**Reuse-First Compliance:**
- Zero new packages beyond `ulid` (validation only)
- All patterns reused from existing migrations and API routes
- No reinvention of database connection, routing, or observability

**Package Boundaries:**
- Schema in `packages/backend/database-schema/` (shared DB layer)
- API routes in `apps/api/lego-api/domains/telemetry/` (app-specific)
- No cross-domain coupling

**Testing Standards:**
- Unit tests for validation (no mocks)
- Integration tests with real database (per ADR-005: no mocks in UAT/integration)
- Evidence-based proof (database queries, HTTP responses)

---

## Summary

**MVP-Critical Risks:** 5 identified, all mitigatable during implementation
- ULID validation: use `ulid` package
- Schema collision: use `IF NOT EXISTS`
- Idempotency: Drizzle `.onConflictDoNothing()`
- Timezone handling: use `timestamp with timezone`
- Index creation: not blocking (new table)

**Missing Requirements:** 3 identified, all deferred or non-blocking
- Retention policy: deferred to INFR-007
- Payload size limit: use server default or add 1MB middleware limit
- Query endpoint: deferred to INFR-006

**Change Surface:** Minimal, well-isolated
- New schema file + migration
- New telemetry domain routes
- One line in server.ts to mount routes

**Confidence:** High - all patterns proven, no architectural unknowns, clear scope.

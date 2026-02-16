# Test Plan: INFR-004 - Workflow Events Table + Ingestion

## Scope Summary

**Endpoints Touched:**
- POST /telemetry/events (new)

**UI Touched:** No

**Data/Storage Touched:** Yes
- Postgres database (new `telemetry` schema)
- New table: `telemetry.workflow_events`
- Drizzle migration execution

---

## Happy Path Tests

### Test 1: Insert New Event Successfully

**Setup:**
- Database running with `telemetry` schema created
- POST /telemetry/events endpoint mounted
- Valid ULID generated for event_id

**Action:**
```http
POST /api/v2/telemetry/events
Content-Type: application/json

{
  "event_id": "01JCXY5Q2KZQX0EXAMPLE001",
  "event_version": 1,
  "event_name": "workflow.step_completed",
  "ts": "2026-02-13T19:00:00Z",
  "run_id": "run_12345",
  "item_id": "WISH-001",
  "workflow_name": "story-implementation",
  "agent_role": "dev-backend",
  "payload": {
    "step_name": "write_tests",
    "tokens_used": 12500,
    "cost_usd_est": 0.025,
    "model": "claude-opus-4.6"
  }
}
```

**Expected Outcome:**
- HTTP 201 Created
- Event stored in `workflow_events` table
- Response body confirms insertion with event_id

**Evidence:**
- HTTP status code = 201
- Response JSON contains `{ "event_id": "...", "created": true }`
- Database query confirms row exists: `SELECT * FROM telemetry.workflow_events WHERE event_id = '...'`

---

### Test 2: Insert All 5 Core Event Types

**Setup:**
- Same as Test 1

**Action:**
Post each event type with valid payloads:
1. `workflow.item_state_changed` - state transition (backlog → in-progress)
2. `workflow.step_completed` - agent step finish
3. `workflow.story_changed` - story metadata update
4. `workflow.gap_found` - missing requirement detected
5. `workflow.flow_issue` - workflow blockage

**Expected Outcome:**
- All 5 events inserted successfully
- HTTP 201 for each
- All events queryable by event_name filter

**Evidence:**
- 5 successful POST responses
- Database query: `SELECT DISTINCT event_name FROM telemetry.workflow_events` returns 5 rows

---

### Test 3: Idempotent Duplicate Insertion

**Setup:**
- Test 1 event already inserted

**Action:**
POST same event payload again (same event_id)

**Expected Outcome:**
- HTTP 200 OK (not 201)
- No duplicate row created
- Response body indicates idempotent result: `{ "event_id": "...", "created": false }`

**Evidence:**
- HTTP status code = 200
- Database query: `SELECT COUNT(*) FROM telemetry.workflow_events WHERE event_id = '...'` returns 1 (not 2)
- Response JSON contains `created: false`

---

### Test 4: Query Events by Filters

**Setup:**
- Multiple events inserted with different event_name, item_id, run_id values

**Action:**
Query events with filters (assuming GET endpoint or direct DB query):
1. Filter by `event_name = 'workflow.step_completed'`
2. Filter by `item_id = 'WISH-001'`
3. Filter by `run_id = 'run_12345'`
4. Filter by time range: `ts BETWEEN '2026-02-13 00:00:00' AND '2026-02-14 00:00:00'`

**Expected Outcome:**
- Correct subset of events returned for each filter
- Query execution plan shows index usage (verify via EXPLAIN)

**Evidence:**
- Result counts match expected filter logic
- `EXPLAIN ANALYZE` output shows index scans on `(event_name, ts)`, `(item_id, ts)`, `(run_id, ts)` indexes
- Query latency < 50ms for indexed queries

---

## Error Cases

### Error 1: Missing Required Field (event_id)

**Setup:**
- Endpoint ready

**Action:**
```http
POST /api/v2/telemetry/events
Content-Type: application/json

{
  "event_version": 1,
  "event_name": "workflow.step_completed",
  "ts": "2026-02-13T19:00:00Z",
  "payload": {}
}
```

**Expected Outcome:**
- HTTP 400 Bad Request
- Validation error: `event_id is required`

**Evidence:**
- HTTP status code = 400
- Response JSON contains validation error details: `{ "error": "Validation failed", "details": [{"field": "event_id", "message": "Required"}] }`

---

### Error 2: Malformed ULID

**Setup:**
- Endpoint ready

**Action:**
```http
POST /api/v2/telemetry/events
Content-Type: application/json

{
  "event_id": "INVALID-ULID-FORMAT",
  "event_version": 1,
  "event_name": "workflow.step_completed",
  "ts": "2026-02-13T19:00:00Z",
  "payload": {}
}
```

**Expected Outcome:**
- HTTP 400 Bad Request
- Validation error: `event_id must be valid ULID format`

**Evidence:**
- HTTP status code = 400
- Response JSON contains ULID format validation error

---

### Error 3: Missing Required Field (event_name)

**Setup:**
- Endpoint ready

**Action:**
```http
POST /api/v2/telemetry/events
Content-Type: application/json

{
  "event_id": "01JCXY5Q2KZQX0EXAMPLE002",
  "event_version": 1,
  "ts": "2026-02-13T19:00:00Z",
  "payload": {}
}
```

**Expected Outcome:**
- HTTP 400 Bad Request
- Validation error: `event_name is required`

**Evidence:**
- HTTP status code = 400
- Response JSON contains validation error for event_name

---

### Error 4: Missing Required Field (ts)

**Setup:**
- Endpoint ready

**Action:**
```http
POST /api/v2/telemetry/events
Content-Type: application/json

{
  "event_id": "01JCXY5Q2KZQX0EXAMPLE003",
  "event_version": 1,
  "event_name": "workflow.step_completed",
  "payload": {}
}
```

**Expected Outcome:**
- HTTP 400 Bad Request
- Validation error: `ts is required`

**Evidence:**
- HTTP status code = 400
- Response JSON contains validation error for ts field

---

## Edge Cases (Reasonable)

### Edge 1: Extremely Large JSONB Payload (>1MB)

**Setup:**
- Generate event payload with 1.5MB of JSON data

**Action:**
POST event with large payload

**Expected Outcome:**
- Either:
  - HTTP 413 Payload Too Large (if size limit enforced)
  - HTTP 201 Created with truncation warning (if partial storage)
- Clear error/warning message about payload size

**Evidence:**
- HTTP status code indicates handling strategy
- Response body includes size validation message
- Documentation updated with payload size limits

---

### Edge 2: Nullable Fields (run_id, item_id, workflow_name, agent_role)

**Setup:**
- Endpoint ready

**Action:**
```http
POST /api/v2/telemetry/events
Content-Type: application/json

{
  "event_id": "01JCXY5Q2KZQX0EXAMPLE004",
  "event_version": 1,
  "event_name": "workflow.gap_found",
  "ts": "2026-02-13T19:00:00Z",
  "run_id": null,
  "item_id": null,
  "workflow_name": null,
  "agent_role": null,
  "payload": {
    "gap_type": "missing_requirement"
  }
}
```

**Expected Outcome:**
- HTTP 201 Created
- Event stored with null values for nullable fields
- Query still works when filtering by non-null values

**Evidence:**
- HTTP status code = 201
- Database row shows NULL values for run_id, item_id, workflow_name, agent_role
- Filter queries handle NULL correctly

---

### Edge 3: High Concurrency (Duplicate event_id Submissions)

**Setup:**
- Endpoint ready
- Concurrent test client (e.g., k6 or artillery)

**Action:**
Submit same event_id in 100 parallel requests

**Expected Outcome:**
- First request: HTTP 201 Created
- Remaining 99 requests: HTTP 200 OK (idempotent)
- Only 1 row in database
- No database constraint violation errors logged

**Evidence:**
- Only 1 row exists in database
- All responses are either 201 or 200 (no 500 errors)
- Database logs show no unique constraint violation errors

---

### Edge 4: Empty Payload JSONB

**Setup:**
- Endpoint ready

**Action:**
```http
POST /api/v2/telemetry/events
Content-Type: application/json

{
  "event_id": "01JCXY5Q2KZQX0EXAMPLE005",
  "event_version": 1,
  "event_name": "workflow.item_state_changed",
  "ts": "2026-02-13T19:00:00Z",
  "payload": {}
}
```

**Expected Outcome:**
- HTTP 201 Created
- Event stored with empty JSONB object `{}`

**Evidence:**
- HTTP status code = 201
- Database query shows `payload` column = `{}`

---

### Edge 5: Boundary Timestamps (Past/Future)

**Setup:**
- Endpoint ready

**Action:**
Post events with:
1. Very old timestamp: `"ts": "2000-01-01T00:00:00Z"`
2. Far future timestamp: `"ts": "2100-12-31T23:59:59Z"`

**Expected Outcome:**
- Both events accepted (no timestamp range validation)
- Events queryable via time range filters

**Evidence:**
- HTTP 201 for both events
- Query by time range includes these edge cases

---

## Required Tooling Evidence

### Backend Testing

**1. Unit Tests (Vitest)**

File: `apps/api/lego-api/domains/telemetry/__tests__/validation.test.ts`

Tests:
- Zod schema validation (event_id required, ULID format, event_name required, ts required)
- Payload JSONB validation
- Nullable field handling

Assertions:
- `expect(validationResult.success).toBe(true)` for valid payloads
- `expect(validationResult.error.issues).toContainEqual(...)` for validation failures

---

**2. Integration Tests (Vitest + Database)**

File: `apps/api/lego-api/domains/telemetry/__tests__/ingestion.integration.test.ts`

Tests:
- Insert new event → verify 201 status
- Duplicate event_id → verify 200 status + no duplicate row
- Query by event_name filter → verify correct results
- Query by item_id filter → verify correct results
- Query by run_id filter → verify correct results
- Concurrent duplicate submissions → verify single row

Assertions:
- `expect(response.status).toBe(201)`
- `expect(dbRow.event_id).toBe(expectedId)`
- `expect(queryResults.length).toBe(expectedCount)`

---

**3. Database Tests (Direct SQL)**

File: `apps/api/knowledge-base/src/db/__tests__/workflow_events.db.test.ts`

Tests:
- Unique constraint on event_id enforced
- Indexes exist on (event_name, ts), (item_id, ts), (run_id, ts)
- Index usage verified via EXPLAIN ANALYZE
- JSONB column stores valid JSON

Assertions:
- `expect(constraintViolation).toThrow()` for duplicate event_id
- `expect(explainResult.planNodes).toContainIndexScan(...)`

---

**4. Performance Tests (k6 or Artillery)**

Script: `apps/api/lego-api/domains/telemetry/__tests__/load.k6.js`

Tests:
- Insert throughput: 100+ events/sec
- Query latency with indexes: < 50ms p95

Assertions:
- k6 checks for http_req_duration < 100ms
- Success rate > 99%

---

**5. HTTP Request Tests (.http files)**

File: `apps/api/lego-api/domains/telemetry/telemetry.http`

Requests:
- POST valid event (all event types)
- POST duplicate event_id
- POST with missing required fields
- POST with malformed ULID
- POST with large payload

Evidence:
- Status codes match expected (201, 200, 400)
- Response bodies contain expected fields

---

### Frontend

Not applicable - backend-only story.

---

## Risks to Call Out

### Risk 1: ULID Validation Library

**Risk:**
Zod does not have built-in ULID validation. Requires custom refinement or external library.

**Mitigation:**
- Use `ulid` npm package to validate format: `ULID.isValid(event_id)`
- Add Zod refinement: `z.string().refine(val => ULID.isValid(val), { message: "Invalid ULID format" })`

**Blocker Status:** Not blocking (implementation detail)

---

### Risk 2: Index Performance Under Load

**Risk:**
Without partitioning, table size may grow large enough that indexes degrade query performance over time.

**Mitigation:**
- Acceptance criteria includes index verification via EXPLAIN
- Partitioning is deferred to INFR-005 but acknowledged in non-goals
- Load testing with 10K+ rows to validate index usage

**Blocker Status:** Not blocking (future optimization tracked separately)

---

### Risk 3: Payload Size Limits

**Risk:**
No explicit payload size limit defined in acceptance criteria. Edge case test assumes limit enforcement but unclear what limit should be.

**Mitigation:**
- Define payload size limit (e.g., 1MB) in implementation phase
- Add validation or truncation strategy
- Document in API schema/comments

**Blocker Status:** Not blocking (can be clarified during implementation)

---

### Risk 4: Missing GET Endpoint

**Risk:**
Index entry does not mention a GET /telemetry/events endpoint for querying. Test Plan assumes query capability for validation.

**Mitigation:**
- Test 4 (query events) may need to use direct database queries if GET endpoint is out of scope
- Clarify with PM if query endpoint is included or deferred

**Blocker Status:** Not blocking (can use database queries for validation if needed)

---

## Test Coverage Summary

| Category | Test Count | Coverage |
|----------|------------|----------|
| Happy Path | 4 | Core ingestion flow, all event types, idempotency, query filters |
| Error Cases | 4 | Missing fields, malformed ULID |
| Edge Cases | 5 | Large payloads, nullable fields, concurrency, empty payload, boundary timestamps |
| **Total** | **13** | **High coverage of ingestion + deduplication + query scenarios** |

---

## Test Execution Order

1. Unit tests (validation schemas)
2. Database tests (schema migration, constraints, indexes)
3. Integration tests (endpoint insertion, deduplication)
4. Edge case tests (concurrency, payload sizes)
5. Performance tests (throughput, query latency)

---

## Pass Criteria

- All unit tests pass (100% coverage on validation logic)
- All integration tests pass (insertion, deduplication, query filtering)
- Database constraint tests pass (unique event_id, indexes exist)
- Performance tests meet targets (100+ events/sec, <50ms query latency)
- No unhandled errors in error case tests
- .http requests return expected status codes

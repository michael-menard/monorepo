# Test Plan: INFR-0040 — Workflow Events Table + Ingestion

## Scope Summary

- **Endpoints touched**: None (database schema work)
- **UI touched**: No
- **Data/storage touched**: Yes - PostgreSQL schema, tables, indexes, migrations

## Happy Path Tests

### Test 1: Create telemetry schema
- **Setup**: Clean database state (drop telemetry schema if exists)
- **Action**: Run Drizzle migration to create telemetry schema
- **Expected outcome**:
  - `telemetry` schema exists in Postgres
  - No errors during migration
- **Evidence**: Query `SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'telemetry'`

### Test 2: Create workflow_event_type enum
- **Setup**: telemetry schema created
- **Action**: Run migration to create workflow_event_type enum
- **Expected outcome**: Enum exists with 5 values: `item_state_changed`, `step_completed`, `story_changed`, `gap_found`, `flow_issue`
- **Evidence**: Query `SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'workflow_event_type'`

### Test 3: Create workflow_events table
- **Setup**: telemetry schema + enum created
- **Action**: Run migration to create workflow_events table
- **Expected outcome**:
  - Table `telemetry.workflow_events` exists
  - 10 columns: event_id, event_type, event_version, ts, run_id, item_id, workflow_name, agent_role, status, payload
  - Primary key on event_id
- **Evidence**: Query `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'telemetry' AND table_name = 'workflow_events'`

### Test 4: Create indexes
- **Setup**: workflow_events table created
- **Action**: Run migration to create indexes
- **Expected outcome**:
  - Unique index on event_id
  - Index on event_type
  - Index on ts
  - Composite index on (event_type, ts)
  - Composite index on (run_id, ts)
  - Index on item_id
  - Index on workflow_name
  - Index on agent_role
  - Index on status
- **Evidence**: Query `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'telemetry' AND tablename = 'workflow_events'`

### Test 5: Insert basic event
- **Setup**: workflow_events table with indexes
- **Action**: Call `insertWorkflowEvent()` with minimal payload:
  ```javascript
  await insertWorkflowEvent({
    event_id: ulid(),
    event_type: 'step_completed',
    payload: { step_name: 'test-step', duration_ms: 1500 }
  })
  ```
- **Expected outcome**:
  - 1 row inserted
  - event_version defaults to 1
  - ts defaults to NOW()
  - All nullable columns are NULL
- **Evidence**: Query `SELECT * FROM telemetry.workflow_events LIMIT 1`

### Test 6: Insert event with all fields
- **Setup**: workflow_events table
- **Action**: Call `insertWorkflowEvent()` with complete payload:
  ```javascript
  await insertWorkflowEvent({
    event_id: ulid(),
    event_type: 'item_state_changed',
    event_version: 1,
    run_id: 'run-123',
    item_id: 'INFR-0040',
    workflow_name: 'dev-implement-story',
    agent_role: 'dev-implementation-leader',
    status: 'in-progress',
    payload: { from: 'backlog', to: 'in-progress' }
  })
  ```
- **Expected outcome**: 1 row inserted with all fields populated
- **Evidence**: Query `SELECT * FROM telemetry.workflow_events WHERE item_id = 'INFR-0040'`

### Test 7: Query by event_type
- **Setup**: 3 events inserted (2x step_completed, 1x item_state_changed)
- **Action**: Query `SELECT * FROM telemetry.workflow_events WHERE event_type = 'step_completed' ORDER BY ts DESC`
- **Expected outcome**: 2 rows returned, sorted by timestamp descending
- **Evidence**: Check query plan uses index on event_type

### Test 8: Query by run_id
- **Setup**: 5 events inserted with same run_id
- **Action**: Query `SELECT * FROM telemetry.workflow_events WHERE run_id = 'run-123' ORDER BY ts`
- **Expected outcome**: 5 rows in chronological order
- **Evidence**: Check query plan uses composite index (run_id, ts)

## Error Cases

### Error 1: Duplicate event_id (idempotency test)
- **Setup**: 1 event already inserted with event_id = 'test-ulid-123'
- **Action**: Insert another event with same event_id
- **Expected outcome**:
  - Insert silently ignored (ON CONFLICT DO NOTHING) OR error caught and logged
  - Row count = 0
  - First event remains unchanged
- **Evidence**: Query `SELECT COUNT(*) FROM telemetry.workflow_events WHERE event_id = 'test-ulid-123'` returns 1

### Error 2: Invalid event_type
- **Setup**: workflow_events table
- **Action**: Attempt to insert event with event_type = 'invalid_type'
- **Expected outcome**: Postgres constraint violation error
- **Evidence**: Error message contains "invalid input value for enum workflow_event_type"

### Error 3: NULL event_id (required field)
- **Setup**: workflow_events table
- **Action**: Attempt to insert event without event_id
- **Expected outcome**: NOT NULL constraint violation
- **Evidence**: Error message contains "null value in column \"event_id\""

### Error 4: NULL event_type (required field)
- **Setup**: workflow_events table
- **Action**: Attempt to insert event without event_type
- **Expected outcome**: NOT NULL constraint violation
- **Evidence**: Error message contains "null value in column \"event_type\""

## Edge Cases (Reasonable)

### Edge 1: Large JSONB payload (boundary test)
- **Setup**: workflow_events table
- **Action**: Insert event with 100KB JSONB payload (nested objects, arrays)
- **Expected outcome**: Insert succeeds, payload stored as JSONB
- **Evidence**: Query `SELECT pg_column_size(payload) FROM telemetry.workflow_events WHERE event_id = '{event_id}'` returns ~100KB

### Edge 2: Empty JSONB payload
- **Setup**: workflow_events table
- **Action**: Insert event with payload = {} (empty object)
- **Expected outcome**: Insert succeeds, payload stored as `{}`
- **Evidence**: Query returns `payload = '{}'::jsonb`

### Edge 3: NULL payload
- **Setup**: workflow_events table
- **Action**: Insert event without payload field
- **Expected outcome**: Insert succeeds, payload = NULL
- **Evidence**: Query `SELECT payload IS NULL` returns true

### Edge 4: Concurrent inserts (race condition test)
- **Setup**: workflow_events table
- **Action**: Spawn 10 concurrent inserts with different event_ids from 2 orchestrator runs
- **Expected outcome**: All 10 events inserted successfully with no conflicts
- **Evidence**: Query `SELECT COUNT(*) FROM telemetry.workflow_events` returns 10

### Edge 5: Event version migration (future schema changes)
- **Setup**: workflow_events table
- **Action**: Insert events with event_version = 1, then insert events with event_version = 2
- **Expected outcome**: Both versions coexist, queries can filter by event_version
- **Evidence**: Query `SELECT DISTINCT event_version FROM telemetry.workflow_events` returns [1, 2]

### Edge 6: Timestamp precision
- **Setup**: workflow_events table
- **Action**: Insert 2 events within 1ms of each other
- **Expected outcome**: Both events have distinct timestamps with millisecond precision
- **Evidence**: Query `SELECT ts FROM telemetry.workflow_events ORDER BY ts` shows distinct timestamps

### Edge 7: Special characters in JSONB
- **Setup**: workflow_events table
- **Action**: Insert event with payload containing unicode, quotes, newlines
- **Expected outcome**: JSONB handles escaping, insert succeeds
- **Evidence**: Query returns payload with special characters intact

## Required Tooling Evidence

### Backend Testing

**Drizzle Migration**:
```bash
# Run migration
pnpm --filter @repo/db migrate:run

# Verify migration applied
pnpm --filter @repo/db migrate:status
```

**Unit Tests** (Vitest):
```typescript
// Location: packages/backend/db/src/__tests__/workflow-events.test.ts

describe('insertWorkflowEvent', () => {
  it('should insert minimal event', async () => {
    const event_id = ulid()
    await insertWorkflowEvent({
      event_id,
      event_type: 'step_completed',
      payload: { step: 'test' }
    })

    const result = await db.query.workflowEvents.findFirst({
      where: eq(workflowEvents.event_id, event_id)
    })

    expect(result).toBeDefined()
    expect(result?.event_type).toBe('step_completed')
    expect(result?.event_version).toBe(1)
  })

  it('should ignore duplicate event_id (idempotency)', async () => {
    const event_id = ulid()

    // First insert
    await insertWorkflowEvent({ event_id, event_type: 'gap_found', payload: {} })

    // Second insert (duplicate)
    await insertWorkflowEvent({ event_id, event_type: 'gap_found', payload: {} })

    const count = await db.select({ count: count() })
      .from(workflowEvents)
      .where(eq(workflowEvents.event_id, event_id))

    expect(count[0].count).toBe(1)
  })

  it('should handle NULL optional fields', async () => {
    const event_id = ulid()
    await insertWorkflowEvent({
      event_id,
      event_type: 'flow_issue',
      payload: null
    })

    const result = await db.query.workflowEvents.findFirst({
      where: eq(workflowEvents.event_id, event_id)
    })

    expect(result?.run_id).toBeNull()
    expect(result?.payload).toBeNull()
  })
})
```

**SQL Assertions**:
```sql
-- Assert schema exists
SELECT 1 FROM information_schema.schemata WHERE schema_name = 'telemetry';

-- Assert enum values
SELECT enumlabel FROM pg_enum
  JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
  WHERE pg_type.typname = 'workflow_event_type';

-- Assert indexes exist
SELECT indexname FROM pg_indexes
  WHERE schemaname = 'telemetry' AND tablename = 'workflow_events';

-- Assert unique constraint on event_id
SELECT conname FROM pg_constraint
  WHERE conrelid = 'telemetry.workflow_events'::regclass
    AND contype = 'u';
```

### Frontend
- **Not applicable** - backend-only story

## Risks to Call Out

1. **Migration Rollback**: Need to test rollback scenario if migration fails mid-way (e.g., after schema created but before indexes). Drizzle should handle this, but verify in local dev.

2. **ULID Library Choice**: Story assumes `ulid` npm package. Verify compatibility with Postgres text primary key and indexing performance.

3. **Index Performance**: Story assumes indexes will improve query performance. Should verify with EXPLAIN ANALYZE on realistic data volumes (e.g., 10K events).

4. **Concurrent Insert Performance**: Postgres can handle concurrent inserts, but test at scale to verify no bottlenecks. Consider connection pooling strategy.

5. **JSONB Indexing**: Story does NOT create GIN indexes on JSONB payload. If future queries filter on payload fields, those queries will be slow. Document this in "Non-Goals" or create follow-up story.

6. **Event Retention**: No TTL or archival policy. Table will grow unbounded. INFR-0060 addresses this, but document here for visibility.

7. **Cross-Environment Migration**: Need strategy for applying migrations to local dev, staging, production Postgres instances. Document in Infrastructure Notes.

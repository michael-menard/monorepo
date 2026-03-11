# Test Plan: INFR-0041 - Workflow Event SDK - Typed Schemas & Validation

**Story**: INFR-0041
**Generated**: 2026-02-14
**Parent Story**: INFR-0040
**Test Strategy**: Unit tests + integration tests (no E2E, no UI)

---

## Test Scope

### Surfaces Touched
- **Backend**: Yes (Zod schemas, validation logic, helper functions)
- **Database**: Yes (3 new columns in workflow_events table)
- **Frontend**: No
- **Infrastructure**: No (uses existing Postgres in Docker Compose)

### Components Under Test
1. **Event Type Schemas**: 5 Zod schemas for event payloads
2. **Validation Logic**: insertWorkflowEvent() payload validation
3. **Helper Functions**: 5 typed helper functions for event creation
4. **Database Migration**: 3 new metadata columns
5. **Exports**: WorkflowEventSchemas object

---

## Unit Tests

### Test Suite 1: Event Type Schemas
**Location**: `packages/backend/db/src/workflow-events/__tests__/schemas.test.ts`

#### Test: ItemStateChangedPayloadSchema
- **Valid payload**: `{ from_state: "backlog", to_state: "in-progress", item_id: "INFR-0040", item_type: "story" }` → passes
- **With optional reason**: `{ ..., reason: "user action" }` → passes
- **Missing required field**: `{ from_state: "backlog", to_state: "in-progress" }` (no item_id) → throws ZodError
- **Invalid type**: `{ from_state: 123, ... }` → throws ZodError
- **Extra fields**: `{ ..., extra_field: "value" }` → strips extra fields (or fails based on schema config)

#### Test: StepCompletedPayloadSchema
- **Valid payload**: `{ step_name: "elab-story", duration_ms: 45000, status: "success" }` → passes
- **With optional fields**: `{ ..., tokens_used: 12500, model: "claude-sonnet-4.5" }` → passes
- **Invalid status enum**: `{ ..., status: "invalid" }` → throws ZodError
- **Negative duration**: `{ ..., duration_ms: -100 }` → should pass (Zod number allows negatives by default, consider adding refinement if needed)
- **Missing required field**: `{ step_name: "elab-story" }` (no duration_ms, no status) → throws ZodError

#### Test: StoryChangedPayloadSchema
- **Valid payload**: `{ change_type: "updated", field_changed: "status", old_value: "backlog", new_value: "in-progress", item_id: "INFR-0040" }` → passes
- **Invalid change_type enum**: `{ change_type: "moved", ... }` → throws ZodError
- **Optional old_value/new_value**: `{ change_type: "created", field_changed: "status", new_value: "backlog", item_id: "INFR-0040" }` (no old_value) → passes
- **Any type for values**: `{ ..., old_value: { complex: "object" }, new_value: ["array"] }` → passes (any type)

#### Test: GapFoundPayloadSchema
- **Valid payload**: `{ gap_type: "missing_ac", gap_description: "No error handling", severity: "high", item_id: "INFR-0040", workflow_name: "elab-story" }` → passes
- **Invalid gap_type enum**: `{ gap_type: "invalid", ... }` → throws ZodError
- **Invalid severity enum**: `{ ..., severity: "critical" }` → throws ZodError (only low/medium/high allowed)
- **Missing required field**: `{ gap_type: "missing_ac", gap_description: "..." }` (no severity, no item_id) → throws ZodError

#### Test: FlowIssuePayloadSchema
- **Valid payload**: `{ issue_type: "tool_failure", issue_description: "Git push failed", workflow_name: "dev-implement-story" }` → passes
- **With optional fields**: `{ ..., recovery_action: "retry with --force-with-lease", agent_role: "dev-implementation-leader" }` → passes
- **Invalid issue_type enum**: `{ issue_type: "unknown", ... }` → throws ZodError
- **Missing required field**: `{ issue_type: "tool_failure" }` (no issue_description, no workflow_name) → throws ZodError

### Test Suite 2: Validation in insertWorkflowEvent()
**Location**: `packages/backend/db/src/__tests__/workflow-events.test.ts` (extend existing)

#### Test: Valid events insert successfully
- **item_state_changed**: Insert valid event → count = 1, payload matches input
- **step_completed**: Insert valid event → count = 1, payload matches input
- **story_changed**: Insert valid event → count = 1, payload matches input
- **gap_found**: Insert valid event → count = 1, payload matches input
- **flow_issue**: Insert valid event → count = 1, payload matches input

#### Test: Invalid events throw validation errors
- **Invalid payload for event_type**: Insert item_state_changed with step_completed payload → throws ZodError
- **Missing required field**: Insert step_completed with missing status → throws ZodError
- **Invalid enum value**: Insert gap_found with severity="critical" → throws ZodError
- **Error message includes context**: Validation error message includes event_type and field name

#### Test: Metadata columns accept values
- **correlation_id**: Insert event with correlation_id="550e8400-e29b-41d4-a716-446655440000" → stores UUID
- **source**: Insert event with source="orchestrator" → stores text
- **emitted_by**: Insert event with emitted_by="dev-implementation-leader" → stores text
- **NULL metadata**: Insert event without metadata fields → stores NULL for all 3 columns

### Test Suite 3: Helper Functions
**Location**: `packages/backend/db/src/workflow-events/__tests__/helpers.test.ts`

#### Test: createItemStateChangedEvent()
- **Valid params**: Call with valid params → returns WorkflowEventInput with correct structure
- **Generated event_id**: Returned event_id is valid UUID
- **Payload validation**: Returned payload matches ItemStateChangedPayloadSchema
- **Metadata fields**: Call with correlation_id, source, emitted_by → fields included in result
- **Missing required param**: Call without item_id → throws error

#### Test: createStepCompletedEvent()
- **Valid params**: Call with valid params → returns WorkflowEventInput
- **Optional fields**: Call with tokens_used, model → fields included in payload
- **Invalid status**: Call with status="invalid" → throws ZodError

#### Test: createStoryChangedEvent()
- **Valid params**: Call with valid params → returns WorkflowEventInput
- **Optional old_value**: Call without old_value → old_value is undefined in payload

#### Test: createGapFoundEvent()
- **Valid params**: Call with valid params → returns WorkflowEventInput
- **Invalid severity**: Call with severity="critical" → throws ZodError

#### Test: createFlowIssueEvent()
- **Valid params**: Call with valid params → returns WorkflowEventInput
- **Optional recovery_action**: Call without recovery_action → recovery_action is undefined in payload

---

## Integration Tests

### Test Suite 4: Database Migration
**Location**: `packages/backend/database-schema/src/__tests__/migration.test.ts` (or manual)

#### Test: Migration adds columns
- **Run migration**: `pnpm --filter @repo/db migrate:run` → succeeds
- **Query schema**: `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='telemetry' AND table_name='workflow_events'`
- **Verify columns**: correlation_id (uuid, YES), source (text, YES), emitted_by (text, YES)

#### Test: Migration rollback
- **Run migration**: Apply migration
- **Rollback**: `pnpm --filter @repo/db migrate:rollback` → succeeds
- **Verify removal**: correlation_id, source, emitted_by columns no longer exist

#### Test: Existing data unaffected
- **Insert event pre-migration**: Insert event with INFR-0040 schema
- **Run migration**: Apply new migration
- **Verify event**: Event still exists, new columns are NULL

### Test Suite 5: End-to-End Event Flow
**Location**: `packages/backend/db/src/__tests__/workflow-events.integration.test.ts`

#### Test: Helper → Insert → Verify
- **Create event**: Call createItemStateChangedEvent() with valid params
- **Insert event**: Call insertWorkflowEvent() with returned event
- **Query event**: SELECT * FROM telemetry.workflow_events WHERE event_id = ?
- **Verify**: All fields match, including metadata columns

#### Test: All event types
- **For each event type**: Create event with helper → Insert → Verify → Count = 5 total events

---

## Error Cases

### Test Suite 6: Validation Errors
**Location**: `packages/backend/db/src/__tests__/workflow-events.test.ts`

#### Test: Clear error messages
- **Invalid enum**: Validation error message includes field name and allowed values
- **Missing field**: Validation error message includes field name
- **Wrong type**: Validation error message includes expected type

#### Test: Validation performance
- **Benchmark**: Validate 1000 events of each type → total time < 5 seconds (5ms per event)

---

## Edge Cases

### Test Suite 7: Edge Cases
**Location**: `packages/backend/db/src/__tests__/workflow-events.edge-cases.test.ts`

#### Test: Large payloads
- **100KB payload**: Insert event with payload containing 100KB JSON object → succeeds
- **Validation time**: Validate large payload → completes in <10ms

#### Test: Unicode characters
- **UTF-8 in text fields**: Insert event with emojis, Chinese characters in gap_description → stores correctly

#### Test: Concurrent validation
- **Parallel inserts**: Spawn 10 parallel insertWorkflowEvent calls with different event types → all succeed, count = 10

#### Test: NULL vs undefined
- **Optional fields**: Insert event with optional field = null vs omitted → both store as NULL in database

#### Test: Empty strings
- **Required text fields**: Insert event with from_state="" → validate behavior (should fail or pass based on schema)

---

## Test Data

### Valid Payloads (Examples)

```typescript
// item_state_changed
{
  from_state: "backlog",
  to_state: "in-progress",
  item_id: "INFR-0040",
  item_type: "story",
  reason: "user action"
}

// step_completed
{
  step_name: "elab-story",
  duration_ms: 45000,
  tokens_used: 12500,
  model: "claude-sonnet-4.5",
  status: "success"
}

// story_changed
{
  change_type: "updated",
  field_changed: "status",
  old_value: "backlog",
  new_value: "in-progress",
  item_id: "INFR-0040"
}

// gap_found
{
  gap_type: "missing_ac",
  gap_description: "No AC for error handling",
  severity: "high",
  item_id: "INFR-0040",
  workflow_name: "elab-story"
}

// flow_issue
{
  issue_type: "tool_failure",
  issue_description: "Git push failed",
  recovery_action: "retry with --force-with-lease",
  workflow_name: "dev-implement-story",
  agent_role: "dev-implementation-leader"
}
```

### Invalid Payloads (Examples)

```typescript
// Missing required field
{ from_state: "backlog", to_state: "in-progress" } // no item_id

// Invalid enum
{ ..., status: "invalid" } // not "success" or "error"

// Wrong type
{ from_state: 123, ... } // should be string

// Invalid severity
{ ..., severity: "critical" } // should be "low" | "medium" | "high"
```

---

## Test Execution

### Local Development
1. **Start Postgres**: `docker-compose up -d postgres`
2. **Run migrations**: `pnpm --filter @repo/db migrate:run`
3. **Run unit tests**: `pnpm --filter @repo/db test`
4. **Run integration tests**: `pnpm --filter @repo/db test:integration`

### CI/CD
1. **Setup testcontainers**: Spin up Postgres container
2. **Run migrations**: Apply all migrations
3. **Run all tests**: `pnpm test`
4. **Verify coverage**: Ensure >80% coverage for new code

---

## Acceptance Criteria Coverage

| AC | Test Suite | Test Type |
|----|------------|-----------|
| AC-1 | Test Suite 1 | Unit |
| AC-2 | Test Suite 1 | Unit |
| AC-3 | Test Suite 1 | Unit |
| AC-4 | Test Suite 1 | Unit |
| AC-5 | Test Suite 1 | Unit |
| AC-6 | Test Suite 4 | Integration |
| AC-7 | Test Suite 4 | Integration |
| AC-8 | Test Suite 4 | Integration |
| AC-9 | Test Suite 2 | Unit |
| AC-10 | Test Suite 3 | Unit |
| AC-11 | Test Suite 3 | Unit |
| AC-12 | Test Suite 5 | Integration |
| AC-13 | Test Suite 1 | Unit |
| AC-14 | Test Suite 2 | Unit |
| AC-15 | Manual Review | Documentation |

---

## Test Risks

1. **Zod Validation Performance**
   - **Risk**: Validation overhead slows down event insertion
   - **Mitigation**: Benchmark validation time (target <5ms per event)
   - **Fallback**: Consider caching parsed schemas or using Zod's `.transform()` for performance

2. **Schema Evolution**
   - **Risk**: Future changes to event schemas break existing events
   - **Mitigation**: Document event_version field usage for future schema changes
   - **Fallback**: Version schemas separately (e.g., ItemStateChangedPayloadSchemaV2)

3. **Enum Value Growth**
   - **Risk**: Adding new enum values requires schema changes
   - **Mitigation**: Document process for adding new gap_type, issue_type, etc.
   - **Fallback**: Consider using `.or(z.string())` for extensibility (trade-off: weaker validation)

4. **Migration Rollback**
   - **Risk**: Migration fails mid-way, leaves schema in inconsistent state
   - **Mitigation**: Test rollback scenario in local dev
   - **Fallback**: Manual SQL to drop columns if Drizzle rollback fails

---

## Test Exit Criteria

- [ ] All 15 ACs have corresponding tests
- [ ] All unit tests pass (100% of test suite)
- [ ] All integration tests pass
- [ ] Migration applies cleanly in local dev
- [ ] Migration rollback works in local dev
- [ ] Code coverage >80% for new code
- [ ] No validation performance regressions (target <5ms per event)
- [ ] README.md documentation complete (AC-15)

---

**Test Plan Complete**

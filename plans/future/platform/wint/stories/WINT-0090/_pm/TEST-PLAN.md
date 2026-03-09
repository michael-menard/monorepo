# Test Plan: WINT-0090 - Create Story Management MCP Tools

**Story:** WINT-0090
**Feature:** Story Management MCP Tools
**Generated:** 2026-02-15
**Test Framework:** Vitest + Drizzle ORM

---

## Test Strategy

Follow the WINT-0110 session management MCP tools pattern:
- **Schema validation tests** - All Zod schemas with valid/invalid inputs
- **Function unit tests** - Query logic, error handling, edge cases
- **Integration tests** - Database round-trips with test data
- **Coverage target:** ≥80% (infrastructure story standard)
- **Pass rate requirement:** 100% for merge

---

## Test Data Requirements

### Database Seeding

Create test fixture stories in various states:

```typescript
const testStories = [
  { storyId: 'TEST-0001', state: 'backlog', epic: 'test-epic', priority: 'high', wave: 1 },
  { storyId: 'TEST-0002', state: 'in_progress', epic: 'test-epic', priority: 'medium', wave: 1 },
  { storyId: 'TEST-0003', state: 'done', epic: 'test-epic', priority: 'low', wave: 2 },
  { storyId: 'TEST-0004', state: 'ready_to_work', epic: 'other-epic', priority: 'high', wave: 1 },
  { storyId: 'TEST-0005', state: 'elaboration', epic: 'other-epic', priority: 'medium', wave: 2 },
]
```

### State Transition History

Seed `storyStates` table with transition history for some stories:

```typescript
const testStateHistory = [
  { storyId: 'TEST-0002', state: 'backlog', timestamp: '2026-02-01T00:00:00Z' },
  { storyId: 'TEST-0002', state: 'ready_to_work', timestamp: '2026-02-05T00:00:00Z' },
  { storyId: 'TEST-0002', state: 'in_progress', timestamp: '2026-02-10T00:00:00Z' },
]
```

---

## Test Suite Structure

### 1. Schema Validation Tests (`__tests__/schema-validation.test.ts`)

**Test:** StoryGetStatusInputSchema
- ✅ Valid UUID format
- ✅ Valid WINT-XXXX story ID format
- ✅ Valid INFR-XXXX story ID format
- ❌ Invalid UUID (malformed)
- ❌ Invalid story ID pattern
- ❌ Empty string
- ❌ Null/undefined

**Test:** StoryUpdateStatusInputSchema
- ✅ Valid storyId + status enum value
- ✅ Optional metadata object
- ✅ Default metadata to empty object
- ❌ Invalid status enum value
- ❌ Missing storyId
- ❌ Invalid metadata type

**Test:** StoryGetByStatusInputSchema
- ✅ Valid status with default limit=50, offset=0
- ✅ Custom limit within range (1-1000)
- ✅ Custom offset >= 0
- ✅ Max limit boundary (1000)
- ❌ Limit < 1
- ❌ Limit > 1000
- ❌ Negative offset
- ❌ Invalid status enum

**Test:** StoryGetByFeatureInputSchema
- ✅ Valid feature string with defaults
- ✅ Custom pagination params
- ✅ Feature with special characters
- ❌ Empty feature string
- ❌ Invalid limit/offset (same as above)

---

### 2. Function Unit Tests (`__tests__/story-management-tools.test.ts`)

**Test Group:** story_get_status
- ✅ Returns story data when story exists (by UUID)
- ✅ Returns story data when story exists (by human-readable ID)
- ✅ Returns null when story not found (graceful degradation)
- ✅ Includes current state from latest storyStates record
- ✅ Includes metadata, timestamps, priority, wave fields
- ✅ Logs warning on database error, returns null

**Test Group:** story_update_status
- ✅ Updates story state and creates storyStates transition record
- ✅ Validates state transition (no backward moves without flag)
- ✅ Accepts optional metadata object
- ✅ Returns updated story data after transaction
- ✅ Handles concurrent updates with database-level atomicity
- ✅ Logs warning and returns false on database error
- ❌ Rejects invalid state transition (e.g., 'done' → 'backlog' without override)

**Test Group:** story_get_by_status
- ✅ Returns stories filtered by current state
- ✅ Orders by priority DESC, createdAt ASC
- ✅ Respects limit parameter (default 50)
- ✅ Respects offset parameter (pagination)
- ✅ Returns empty array when no matches
- ✅ Handles limit=1000 (max boundary)
- ✅ Returns empty array on database error

**Test Group:** story_get_by_feature
- ✅ Returns stories filtered by epic/feature
- ✅ Orders by priority DESC, wave ASC, createdAt ASC
- ✅ Respects pagination (limit/offset)
- ✅ Case-sensitive epic matching
- ✅ Returns empty array when no matches
- ✅ Returns empty array on database error

---

### 3. Integration Tests (`__tests__/story-management-integration.test.ts`)

**Test:** Database round-trip for story_get_status
- Seed test database with story
- Call story_get_status with story ID
- Verify returned data matches seeded data

**Test:** State transition tracking
- Create story in 'backlog' state
- Update to 'ready_to_work' via story_update_status
- Update to 'in_progress'
- Query storyStates table to verify all transitions logged

**Test:** Pagination edge cases
- Seed 150 test stories
- Query with limit=50, offset=0 → verify 50 results
- Query with limit=50, offset=50 → verify next 50 results
- Query with limit=50, offset=100 → verify remaining 50 results
- Query with limit=50, offset=200 → verify empty array (offset > total)

**Test:** Concurrent update safety
- Create story
- Spawn 5 concurrent story_update_status calls with different states
- Verify only one succeeds (database transaction isolation)
- Verify storyStates has one transition record per update

**Test:** Story ID format handling
- Seed story with ID 'WINT-0090'
- Query with UUID → success
- Query with 'WINT-0090' → success
- Verify both return identical data

---

### 4. Error Handling Tests (`__tests__/error-handling.test.ts`)

**Test:** story_get_status with database error
- Mock database connection failure
- Verify function logs warning with @repo/logger
- Verify function returns null (no exception thrown)

**Test:** story_update_status with transaction rollback
- Mock database transaction failure
- Verify storyStates record NOT created (rollback)
- Verify function returns false
- Verify error logged

**Test:** Pagination with invalid database state
- Query with valid params but corrupted database
- Verify empty array returned (graceful degradation)
- Verify error logged

---

## Coverage Requirements

| Component | Minimum Coverage |
|-----------|------------------|
| Zod schemas | 100% (all validation rules) |
| story-get-status.ts | 85% |
| story-update-status.ts | 85% |
| story-get-by-status.ts | 80% |
| story-get-by-feature.ts | 80% |
| Overall package | ≥80% |

---

## Test Execution

```bash
# Run all tests
pnpm --filter @repo/mcp-tools test

# Run with coverage
pnpm --filter @repo/mcp-tools test:coverage

# Run integration tests only
pnpm --filter @repo/mcp-tools test --grep "integration"
```

---

## Quality Gates

- [ ] All 120+ tests passing (100% pass rate)
- [ ] Coverage ≥80% overall
- [ ] Schema validation tests cover all Zod rules
- [ ] Integration tests verify database round-trips
- [ ] Error handling tests verify graceful degradation
- [ ] No console.log usage (only @repo/logger)
- [ ] All async operations use proper error handling

---

## Edge Cases to Test

1. **Story ID format ambiguity** - Test that both UUID and human-readable IDs work
2. **Empty result sets** - Verify queries return empty arrays, not null/undefined
3. **Database connection pooling** - Verify single connection per Lambda constraint
4. **State transition validation** - Test backward state moves (should fail unless override)
5. **Pagination boundaries** - Test offset > total count, limit = 0, limit > max
6. **Concurrent updates** - Verify database transaction isolation prevents race conditions
7. **Missing story states** - Test stories with no state history (edge case from migration)
8. **Special characters in epic names** - Test filtering with unicode, spaces, hyphens

---

## Test Data Cleanup

All integration tests must:
- Create isolated test data with unique prefixes (`TEST-XXXX`)
- Clean up test data after each test (using Vitest afterEach hooks)
- Not interfere with other test suites running in parallel
- Use transactions where possible for automatic rollback

---

## Success Criteria

✅ All tests passing (100% pass rate)
✅ Coverage ≥80% (infrastructure story standard)
✅ All edge cases covered (8 categories listed above)
✅ Error handling verified (graceful degradation, no exceptions to MCP)
✅ Integration tests confirm database round-trips work
✅ Zod schemas catch all invalid inputs before execution

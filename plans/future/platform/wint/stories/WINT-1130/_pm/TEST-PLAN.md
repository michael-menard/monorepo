# Test Plan: WINT-1130

## Scope Summary

- **Endpoints touched**: None (MCP tools only)
- **UI touched**: No
- **Data/storage touched**: Yes (new `worktrees` table in `wint` schema, 4 new MCP tools)

**Surfaces**: Database schema + MCP tools

**Testing approach**: Unit tests for MCP tool logic, integration tests for DB operations with test database

**Coverage target**: ≥80% (infrastructure story)

---

## Happy Path Tests

### HP-1: Register new worktree for story

**Setup**:
- Test database with seeded stories table containing story `WINT-1130` in `in_progress` state
- No existing worktrees

**Action**:
- Call `worktree_register` MCP tool with:
  ```json
  {
    "storyId": "WINT-1130",
    "worktreePath": "/Users/dev/monorepo/tree/wint-1130",
    "branchName": "feature/wint-1130"
  }
  ```

**Expected**:
- Returns success with worktree ID (UUID)
- Database contains new worktree record with:
  - `status`: `active`
  - `createdAt`: current timestamp
  - `updatedAt`: current timestamp
  - `mergedAt`: null
  - `abandonedAt`: null

**Evidence**:
- Direct SQL query confirms record exists
- Returned UUID matches database UUID
- All timestamps are valid ISO-8601 format

### HP-2: Get active worktree by story ID

**Setup**:
- Test database with 1 active worktree for story `WINT-1130`

**Action**:
- Call `worktree_get_by_story` with storyId `WINT-1130`

**Expected**:
- Returns worktree object with:
  - `id`, `storyId`, `worktreePath`, `branchName`, `status`, `createdAt`, `updatedAt`
  - `status` is `active`

**Evidence**:
- Returned object matches database record
- No other worktrees returned (only active one)

### HP-3: List all active worktrees (pagination)

**Setup**:
- Test database with 25 active worktrees across different stories

**Action**:
- Call `worktree_list_active` with no parameters (default limit: 50)

**Expected**:
- Returns array of 25 worktree objects
- All objects have `status: active`
- Objects sorted by `createdAt` descending

**Evidence**:
- Array length is 25
- All `status` fields are `active`
- Sorted order verified by comparing timestamps

### HP-4: Mark worktree as merged

**Setup**:
- Test database with 1 active worktree (ID: `abc-123`)

**Action**:
- Call `worktree_mark_complete` with:
  ```json
  {
    "worktreeId": "abc-123",
    "status": "merged",
    "metadata": { "pr_number": 1234 }
  }
  ```

**Expected**:
- Returns success
- Database record updated:
  - `status`: `merged`
  - `mergedAt`: current timestamp
  - `metadata.pr_number`: 1234

**Evidence**:
- SQL query confirms status is `merged`
- `mergedAt` timestamp is within last 5 seconds
- `metadata` JSONB contains `pr_number: 1234`

### HP-5: Mark worktree as abandoned

**Setup**:
- Test database with 1 active worktree (ID: `def-456`)

**Action**:
- Call `worktree_mark_complete` with:
  ```json
  {
    "worktreeId": "def-456",
    "status": "abandoned",
    "metadata": { "reason": "session timeout" }
  }
  ```

**Expected**:
- Returns success
- Database record updated:
  - `status`: `abandoned`
  - `abandonedAt`: current timestamp
  - `metadata.reason`: "session timeout"

**Evidence**:
- SQL query confirms status is `abandoned`
- `abandonedAt` timestamp is within last 5 seconds
- `metadata` JSONB contains `reason: "session timeout"`

---

## Error Cases

### ERR-1: Register worktree for non-existent story (FK constraint)

**Setup**:
- Test database with no story matching `FAKE-999`

**Action**:
- Call `worktree_register` with `storyId: "FAKE-999"`

**Expected**:
- Returns error with message indicating FK constraint violation
- No record created in database

**Evidence**:
- Error object contains `code: 'FOREIGN_KEY_VIOLATION'` or similar
- SQL query confirms zero worktrees for `FAKE-999`

### ERR-2: Register worktree with invalid path (validation error)

**Setup**:
- Test database with valid story `WINT-1130`

**Action**:
- Call `worktree_register` with empty `worktreePath: ""`

**Expected**:
- Returns Zod validation error
- Error message indicates `worktreePath` must not be empty
- No record created in database

**Evidence**:
- Error object is Zod validation error
- Error path is `worktreePath`
- Database query confirms zero new records

### ERR-3: Get worktree for story with no active worktree

**Setup**:
- Test database with story `WINT-1130` but no worktrees

**Action**:
- Call `worktree_get_by_story` with `storyId: "WINT-1130"`

**Expected**:
- Returns `null` (not an error, graceful null return)

**Evidence**:
- Return value is strictly `null`
- No error thrown

### ERR-4: Mark non-existent worktree as complete

**Setup**:
- Test database with no worktree matching `nonexistent-uuid`

**Action**:
- Call `worktree_mark_complete` with `worktreeId: "nonexistent-uuid"`

**Expected**:
- Returns error indicating worktree not found
- No database changes

**Evidence**:
- Error message contains "not found" or similar
- Database query confirms no records modified

### ERR-5: List active worktrees with invalid pagination (negative offset)

**Setup**:
- Test database with 10 active worktrees

**Action**:
- Call `worktree_list_active` with `offset: -5`

**Expected**:
- Returns Zod validation error
- Error indicates `offset` must be non-negative

**Evidence**:
- Error object is Zod validation error
- Error path is `offset`

---

## Edge Cases

### EDGE-1: Concurrent worktree registration for same story

**Setup**:
- Test database with story `WINT-1130` in `in_progress` state
- No existing worktrees

**Action**:
- Simulate concurrent calls to `worktree_register` for same story (use Promise.all if testing with real DB, or mock concurrent transactions)

**Expected**:
- First call succeeds, creates active worktree
- Second call should either:
  - (Ideal) Fail with unique constraint violation if unique index on `(storyId, status)` where `status='active'` exists
  - (Fallback) Succeed but return existing worktree ID if tool implements "get or create" logic

**Evidence**:
- Database contains exactly 1 active worktree for story
- Second call either errors or returns same UUID as first call

### EDGE-2: Register worktree when story already has merged worktree

**Setup**:
- Test database with story `WINT-1130` already having 1 merged worktree

**Action**:
- Call `worktree_register` with new worktreePath for same story

**Expected**:
- Succeeds (merged worktrees do not block new registration)
- Database now has 1 merged + 1 active worktree for same story

**Evidence**:
- SQL query shows 2 worktrees for story: 1 merged, 1 active

### EDGE-3: Pagination at boundary (limit=50, 50 results)

**Setup**:
- Test database with exactly 50 active worktrees

**Action**:
- Call `worktree_list_active` with `limit: 50, offset: 0`

**Expected**:
- Returns all 50 worktrees
- No pagination error

**Evidence**:
- Array length is 50

### EDGE-4: Pagination beyond max limit (limit=1001)

**Setup**:
- Test database with 100 active worktrees

**Action**:
- Call `worktree_list_active` with `limit: 1001`

**Expected**:
- Returns Zod validation error (max limit is 1000)

**Evidence**:
- Error object is Zod validation error
- Error indicates `limit` exceeds maximum

### EDGE-5: Empty result set (no active worktrees)

**Setup**:
- Test database with zero active worktrees (only merged/abandoned)

**Action**:
- Call `worktree_list_active` with no parameters

**Expected**:
- Returns empty array `[]` (not null, not error)

**Evidence**:
- Return value is array with `length: 0`

### EDGE-6: Orphaned worktree (active worktree not marked complete)

**Setup**:
- Test database with 1 active worktree created 7 days ago

**Action**:
- Run manual cleanup query or tool (if implemented) to detect orphaned worktrees

**Expected**:
- Worktree flagged as orphaned based on age
- (Future: auto-mark as abandoned after threshold)

**Evidence**:
- Worktree status is still `active`
- `createdAt` timestamp is >7 days old
- No `mergedAt` or `abandonedAt` timestamp

### EDGE-7: Register worktree with very long path (500+ chars)

**Setup**:
- Test database with valid story `WINT-1130`

**Action**:
- Call `worktree_register` with `worktreePath` of 600 characters

**Expected**:
- Either:
  - (If validation enforced) Returns validation error indicating path too long
  - (If no limit) Succeeds and stores full path

**Evidence**:
- If error: Zod validation error with path constraint message
- If success: SQL query shows full 600-char path stored

### EDGE-8: Multiple page pagination

**Setup**:
- Test database with 75 active worktrees

**Action**:
- Page 1: `limit: 50, offset: 0`
- Page 2: `limit: 50, offset: 50`

**Expected**:
- Page 1 returns 50 worktrees
- Page 2 returns 25 worktrees
- No overlap between pages

**Evidence**:
- Page 1 array length is 50
- Page 2 array length is 25
- No duplicate worktree IDs across pages

---

## Required Tooling Evidence

### Backend

**Database Setup**:
- Test database with `wint.worktrees` table created via migration
- Test fixture script to seed stories and worktrees

**Unit Tests (Vitest)**:
- `packages/backend/mcp-tools/src/worktree-management/__tests__/worktree-register.test.ts`
- `packages/backend/mcp-tools/src/worktree-management/__tests__/worktree-get-by-story.test.ts`
- `packages/backend/mcp-tools/src/worktree-management/__tests__/worktree-list-active.test.ts`
- `packages/backend/mcp-tools/src/worktree-management/__tests__/worktree-mark-complete.test.ts`

**Integration Tests (Vitest)**:
- `packages/backend/mcp-tools/src/worktree-management/__tests__/integration.test.ts`
  - Tests all 4 tools against real test database
  - Tests FK constraint enforcement
  - Tests concurrent registration scenario
  - Tests pagination across multiple pages

**Assertions Required**:
- Zod schema validation for all inputs
- Database record presence/absence via SQL queries
- Field value correctness (status, timestamps, metadata)
- Array length and sorting order for list operations
- Error codes and messages for failure cases

**Coverage Metric**:
- Minimum 80% line coverage across all 4 MCP tool files
- 100% coverage of error handling paths

### Frontend

Not applicable (backend-only story).

---

## Risks to Call Out

### Risk 1: Concurrent Registration Race Condition

**Description**: Two sessions registering worktree for same story simultaneously could create 2 active worktrees unless unique constraint enforced.

**Mitigation**: Add unique partial index on `(storyId, status)` where `status='active'` in schema definition.

**Test**: EDGE-1 verifies this scenario.

### Risk 2: Orphaned Worktree Accumulation

**Description**: If sessions die without cleanup, active worktrees accumulate indefinitely.

**Mitigation**:
- Document expected cleanup via worktree skills integration (WINT-1140/WINT-1150)
- Consider future auto-abandon based on `createdAt` threshold
- Test verifies status is correctly set (EDGE-6)

**Test**: EDGE-6 validates orphaned worktree detection.

### Risk 3: FK Constraint on Story Deletion

**Description**: If story is deleted, what happens to worktrees?

**Mitigation**: Use `onDelete: 'cascade'` in FK definition so worktrees auto-delete when story deleted.

**Test**: ERR-1 verifies FK constraint enforcement; cascade behavior tested in integration tests.

### Risk 4: Path Length Limits

**Description**: File paths can be very long in nested directories. No validation could lead to database errors.

**Mitigation**: Consider adding `maxLength: 500` validation in Zod schema for `worktreePath`.

**Test**: EDGE-7 validates path length handling.

---

## Test Data Seed Requirements

### Stories Table Fixtures

```sql
INSERT INTO wint.stories (id, story_id, title, state, created_at) VALUES
  ('11111111-1111-1111-1111-111111111111', 'WINT-1130', 'Track Worktree Mapping', 'in_progress', NOW()),
  ('22222222-2222-2222-2222-222222222222', 'WINT-0090', 'Story Management MCP', 'done', NOW()),
  ('33333333-3333-3333-3333-333333333333', 'WINT-1140', 'Integrate Worktree Creation', 'backlog', NOW());
```

### Worktrees Table Fixtures

```sql
-- Active worktree
INSERT INTO wint.worktrees (id, story_id, worktree_path, branch_name, status, created_at, updated_at) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '/path/to/tree1', 'feature/wint-1130', 'active', NOW(), NOW());

-- Merged worktree
INSERT INTO wint.worktrees (id, story_id, worktree_path, branch_name, status, created_at, updated_at, merged_at, metadata) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', '/path/to/tree2', 'feature/wint-0090', 'merged', NOW(), NOW(), NOW(), '{"pr_number": 123}');

-- Abandoned worktree
INSERT INTO wint.worktrees (id, story_id, worktree_path, branch_name, status, created_at, updated_at, abandoned_at, metadata) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', '/path/to/tree3', 'feature/old-branch', 'abandoned', NOW(), NOW(), NOW(), '{"reason": "session timeout"}');
```

---

## Success Criteria

1. All happy path tests pass
2. All error cases handled gracefully (no uncaught exceptions)
3. All edge cases validated
4. ≥80% test coverage achieved
5. Integration tests confirm FK constraint enforcement
6. Concurrent registration scenario tested and documented
7. Orphaned worktree handling validated
8. All 4 MCP tools have JSDoc with usage examples
9. Test suite runs in CI without manual intervention

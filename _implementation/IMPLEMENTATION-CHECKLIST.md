# CDBE-3010 Implementation Checklist

**Story**: stories_current View — Single Query Target for Current Story State  
**Setup Completed**: 2026-03-19T04:45:19Z  
**Ready for Implementation**: YES ✓

---

## Pre-Implementation Review

- [ ] Read `SETUP-LOG.md` for setup verification and next steps
- [ ] Read `WORKING-SET.md` for constraints and reference patterns
- [ ] Verify migration slot 1030 is still available (check `ls apps/api/knowledge-base/src/db/migrations/`)
- [ ] Verify CDBE-1010 dependency (migration 1010_story_state_history_trigger.sql deployed)

---

## Implementation: Create Migration File

**File**: `apps/api/knowledge-base/src/db/migrations/1030_cdbe3010_stories_current_view.sql`

### Checklist

- [ ] **Safety Preamble DO Block**
  - [ ] Verify current_database() = 'knowledgebase'
  - [ ] Raise exception if wrong database
  - Pattern reference: WORKING-SET.md (CDBN-1050 lesson)

- [ ] **CREATE OR REPLACE VIEW**
  - [ ] View name: workflow.stories_current
  - [ ] Pattern reference: 999_add_plan_churn_tracking.sql (line 65)
  - [ ] Explicitly select all columns from workflow.stories:
    - story_id, feature, state, title, priority, description, tags
    - experiment_variant, blocked_reason, blocked_by_story
    - started_at, completed_at, file_hash, created_at, updated_at
  - [ ] Add column: current_state (from h.to_state)
  - [ ] Add column: entered_at (from h.created_at)

- [ ] **LATERAL Join for Latest Open Row**
  - [ ] Pattern reference: 1000_create_story_details_view.sql (lines 117–123)
  - [ ] Join to: workflow.story_state_history
  - [ ] Predicate: WHERE story_id = s.story_id AND exited_at IS NULL
  - [ ] Order by: created_at DESC
  - [ ] Limit: 1
  - [ ] ON true clause: required for LATERAL

- [ ] **COMMENT Statements**
  - [ ] COMMENT ON VIEW workflow.stories_current with migration number prefix
  - [ ] COMMENT ON COLUMN workflow.stories_current.current_state with migration number
  - [ ] COMMENT ON COLUMN workflow.stories_current.entered_at with migration number

### Acceptance Criteria (from Story)

- [ ] **AC-1**: CREATE OR REPLACE VIEW (idempotent, no DROP)
- [ ] **AC-2**: Explicit column list from workflow.stories
- [ ] **AC-3**: current_state from h.to_state (latest open row)
- [ ] **AC-4**: entered_at from h.created_at
- [ ] **AC-5**: NULL semantics for stories without history
- [ ] **AC-6**: COMMENT ON VIEW with migration number
- [ ] **AC-7**: COMMENT ON COLUMN for both new columns
- [ ] **AC-8**: Safety preamble DO block

---

## Implementation: Create pgtap Test File

**File**: `apps/api/knowledge-base/src/db/migrations/pgtap/1030_cdbe3010_stories_current_view_test.sql`

### Checklist

- [ ] **File Structure**
  - [ ] BEGIN;
  - [ ] SELECT plan(N); (estimate test count)
  - [ ] ... test assertions ...
  - [ ] SELECT * FROM finish();
  - [ ] ROLLBACK;
  - Pattern reference: 1010_story_state_history_trigger_test.sql

- [ ] **Test Story Setup**
  - [ ] INSERT INTO workflow.stories (story_id, feature, state, title) ON CONFLICT DO NOTHING
  - [ ] Create test story: TEST-3010-VIEW or similar

- [ ] **View Existence**
  - [ ] has_view('workflow', 'stories_current', 'view exists')

- [ ] **Test Scenario 1: Story With History Row**
  - [ ] Insert test story
  - [ ] Insert state history row (exited_at IS NULL)
  - [ ] Query workflow.stories_current
  - [ ] Assert current_state matches h.to_state
  - [ ] Assert entered_at matches h.created_at

- [ ] **Test Scenario 2: Story Without History Row**
  - [ ] Insert test story (no history rows)
  - [ ] Query workflow.stories_current
  - [ ] Assert current_state IS NULL
  - [ ] Assert entered_at IS NULL

- [ ] **Test Scenario 3: Story With Closed + Open Rows**
  - [ ] Insert test story
  - [ ] Insert first history row (will be closed)
  - [ ] Insert second history row (remains open, exited_at IS NULL)
  - [ ] Query workflow.stories_current
  - [ ] Assert current_state matches SECOND row's to_state (not first)
  - [ ] Assert entered_at matches SECOND row's created_at (not first)

- [ ] **Idempotency Test**
  - [ ] Assert migration can be re-run without errors
  - [ ] Specifically: CREATE OR REPLACE VIEW runs twice without error

### Acceptance Criteria (from Story)

- [ ] **AC-9**: pgtap test file with 4 scenarios (has_view + 3 data scenarios)
- [ ] **AC-10**: Idempotency verified (re-run exits 0)

---

## Verification Phase

After implementation:

- [ ] **Run Migration**
  ```bash
  psql $KB_DATABASE_URL -f apps/api/knowledge-base/src/db/migrations/1030_cdbe3010_stories_current_view.sql
  ```
  Expected: No errors, view created

- [ ] **Run Tests**
  ```bash
  psql $KB_DATABASE_URL -f apps/api/knowledge-base/src/db/migrations/pgtap/1030_cdbe3010_stories_current_view_test.sql | pg_prove
  ```
  Expected: All tests pass (ok ...)

- [ ] **Verify Idempotency**
  ```bash
  psql $KB_DATABASE_URL -f apps/api/knowledge-base/src/db/migrations/1030_cdbe3010_stories_current_view.sql
  ```
  Expected: Second run also exits 0 without errors

- [ ] **Verify Index Usage** (EXPLAIN plan shows index scan)
  ```sql
  EXPLAIN SELECT * FROM workflow.stories_current WHERE story_id = 'CDBE-3010';
  ```

---

## Code Review Checklist

- [ ] **AC Compliance**
  - [ ] All 12 ACs (AC-1 through AC-12) addressed
  - [ ] AC-11: Index dependency (idx_story_state_history_open_rows) confirmed present

- [ ] **Non-Goals Validation**
  - [ ] No INSTEAD OF UPDATE trigger on view
  - [ ] No RLS policies added to view
  - [ ] workflow.story_details unchanged
  - [ ] workflow.stories table unchanged
  - [ ] No from_state column exposed
  - [ ] No API/TypeScript/UI changes

- [ ] **Pattern Conformance**
  - [ ] Safety preamble matches CDBN-1050 lesson pattern
  - [ ] LATERAL join matches 1000_story_details_view pattern
  - [ ] CREATE OR REPLACE VIEW matches 999_plan_churn pattern
  - [ ] pgtap structure matches 1010_trigger_test pattern

- [ ] **Documentation**
  - [ ] COMMENT statements cite migration number (1030)
  - [ ] Comments are clear and descriptive

---

## QA Phase Checklist

- [ ] **Deployment Readiness**
  - [ ] Migration applies cleanly to KB database
  - [ ] No RLS privilege issues (view inherits from underlying tables)
  - [ ] Rollback plan: DROP VIEW workflow.stories_current;

- [ ] **Performance Verification**
  - [ ] Partial index (idx_story_state_history_open_rows) used by LATERAL join
  - [ ] EXPLAIN plan confirms index scan
  - [ ] No full table scans on story_state_history

- [ ] **Cross-Role Testing** (if applicable)
  - [ ] agent_role can query view (SELECT permission inherited)
  - [ ] lambda_role can query view
  - [ ] reporting_role can query view

---

## Reference Files in Codebase

| File | Pattern | Lines |
|------|---------|-------|
| `1000_create_story_details_view.sql` | LATERAL join for latest row | 117–123 |
| `999_add_plan_churn_tracking.sql` | CREATE OR REPLACE VIEW | 65 |
| `1010_story_state_history_trigger_test.sql` | pgtap test structure | 10–201 |

---

## Key Constraints to Remember

1. **Safety Preamble**: Required (established CDBN-1050 lesson)
2. **Idempotency**: CREATE OR REPLACE VIEW handles this automatically
3. **Column Exposure**: Use explicit list (not s.*) to avoid future surprises
4. **RLS Inheritance**: View inherits SECURITY INVOKER — no new grants needed
5. **Index Dependency**: idx_story_state_history_open_rows must exist (migration 1010)
6. **Pure DDL Scope**: No TypeScript, API handlers, or UI components

---

## Success Criteria

- [ ] Both SQL files created and committed
- [ ] Migration applies cleanly to KB database
- [ ] All pgtap tests pass
- [ ] Idempotency verified (re-run successful)
- [ ] All 12 ACs addressed
- [ ] No API/TypeScript/UI scope violations
- [ ] Code review approved
- [ ] QA verified

---

## When Done

Update story status in KB:
- State: ready_for_review (after implementation + verification)
- Phase: dev
- Iteration: 0

Next phase: Code review verification → QA

# CDBE-2020 Working Set

## Story
**ID**: CDBE-2020  
**Title**: resolve_blocker and complete_artifact Stored Procedures  
**Status**: in_progress  
**Phase**: setup (iteration 0)  

---

## Branch & Worktree
- **Branch**: story/CDBE-2020
- **Worktree**: /Users/michaelmenard/Development/monorepo/tree/story/CDBE-2020

---

## Constraints (from CLAUDE.md + Phase 1 patterns)

1. **Migration Idempotency**
   - Use CREATE OR REPLACE FUNCTION for function definitions
   - Use ALTER TABLE ... ADD COLUMN IF NOT EXISTS for column additions
   - Ensure second migration run exits with code 0

2. **Pre-Condition Guards (AC-10)**
   - DO block at top of migration must check pg_proc for workflow.validate_caller existence
   - RAISE EXCEPTION with clear message if validate_caller not found
   - Functions only created if guard passes

3. **Security & Permissions**
   - Both functions must have SECURITY INVOKER
   - Must GRANT EXECUTE to agent_role
   - Entry point: PERFORM workflow.validate_caller(...) to check caller authorization

4. **Schema Consistency**
   - resolution_notes column: ADD to workflow.story_blockers (migration 1050 confirmed missing)
   - Type: text, no NOT NULL constraint (optional for some calls)
   - Include COMMENT ON COLUMN citation of migration number

5. **Test Coverage (pgtap)**
   - Happy path: HP-1 through HP-5 (soft-delete, upsert, supersession)
   - Error cases: EC-1 through EC-5 (P0001, not-found, already-deleted, invalid type)
   - Edge cases: ED-1 through ED-4 (last-of-many, DO UPDATE no re-trigger, idempotency, pre-condition)
   - Minimum: pass all 14 test cases

6. **Code Pattern Compliance**
   - SQL naming: snake_case for tables, functions, columns
   - No barrel files (N/A for SQL)
   - No console.log (N/A for SQL)
   - Zod schemas (N/A for SQL)

---

## Dependencies

### Upstream Stories (completed/in-progress)
- **CDBE-1030**: Artifact versioning with supersession trigger
- **CDBE-2005**: workflow.allowed_agents, workflow.validate_caller()
- **CDBE-1050**: workflow.story_blockers table, soft-delete pattern

### Known Blockers
- Migration slot number: must be assigned at ST-1 (TBD, expected 1061+)
- resolution_notes column: must be added in this migration (ST-2)

---

## Files to Read

### Story Definition
- `plans/future/platform/consolidate-db-enhancements/CDBE-2020/CDBE-2020.md` — full story spec + AC-1–16
- `plans/future/platform/consolidate-db-enhancements/CDBE-2020/_pm/dev-feasibility.yaml` — feasibility analysis
- `plans/future/platform/consolidate-db-enhancements/CDBE-2020/_pm/test-plan.yaml` — test strategy

### Reference Migrations (patterns to follow)
- `apps/api/knowledge-base/src/db/migrations/1005_allowed_agents.sql` — validate_caller guard pattern
- `apps/api/knowledge-base/src/db/migrations/1050_cascade_trigger_prerequisites.sql` — story_blockers table definition
- `apps/api/knowledge-base/src/db/migrations/1010_story_state_history_trigger.sql` — RETURNS TABLE pattern
- `apps/api/knowledge-base/src/db/migrations/1020_artifact_cascade_triggers.sql` — artifact trigger pattern

### Reference Tests (pgtap patterns)
- `apps/api/knowledge-base/src/db/migrations/pgtap/1020_artifact_cascade_triggers_test.sql` — pgtap structure + fixtures

---

## Files to Modify

### New Migration File (ST-2 + ST-3)
- **Path**: `apps/api/knowledge-base/src/db/migrations/XXXX_resolve_blocker_complete_artifact.sql`
  - Replace XXXX with confirmed slot number from ST-1 (expected: 1061)
  - Content:
    1. Pre-condition DO block (AC-10)
    2. ALTER TABLE workflow.story_blockers ADD COLUMN IF NOT EXISTS resolution_notes text
    3. CREATE OR REPLACE FUNCTION workflow.resolve_blocker(...)
    4. CREATE OR REPLACE FUNCTION workflow.complete_artifact(...)
    5. GRANT EXECUTE on both to agent_role
    6. RAISE NOTICE completion block

### New pgtap Test File (ST-4)
- **Path**: `apps/api/knowledge-base/src/db/migrations/pgtap/XXXX_resolve_blocker_complete_artifact_test.sql`
  - Coverage: HP-1–5, EC-1–5, ED-1–4 (14 cases)
  - Fixtures: test-agent-2020, TEST-2020-STORY1, TEST-2020-ART-STORY
  - Executed via: psql $PGTAP_URL -f ... | pg_prove

---

## Subtasks

### ST-1: Confirm migration slot
- **Goal**: Determine next available migration slot number after CDBE-1060
- **Action**: `ls apps/api/knowledge-base/src/db/migrations/ | sort | tail -5` (confirms 1060 is latest)
- **Decision**: Assign 1061 to CDBE-2020 (unless CDBE-2010 or CDBE-2030 already claimed it)
- **Output**: Document slot number in migration file header comment

### ST-2: Write resolve_blocker function
- **Goal**: Implement `workflow.resolve_blocker(blocker_id uuid, caller_agent_id text, resolution_notes text)`
- **Dependencies**: ST-1 (slot number confirmed)
- **Coverage**: AC-1, AC-2, AC-3, AC-4, AC-5, AC-10, AC-11, AC-12, AC-14
- **Key**:
  - Entry point: PERFORM workflow.validate_caller(caller_agent_id)
  - Fetch blocker row, raise if not found or already soft-deleted
  - UPDATE workflow.story_blockers SET deleted_at = NOW(), resolution_notes = $3 WHERE id = $1
  - Check remaining active blockers for story_id
  - RETURN TABLE with (story_id text, fully_unblocked boolean)
  - GRANT EXECUTE to agent_role

### ST-3: Write complete_artifact function
- **Goal**: Implement `workflow.complete_artifact(story_id text, artifact_type text, artifact_name text, phase text, iteration int, checksum text, caller_agent_id text, summary jsonb)`
- **Dependencies**: ST-2 (in same migration file)
- **Coverage**: AC-6, AC-7, AC-8, AC-9, AC-11, AC-12, AC-14, AC-15
- **Key**:
  - Entry point: PERFORM workflow.validate_caller(caller_agent_id)
  - INSERT INTO artifacts.story_artifacts (...) VALUES (...)
  - ON CONFLICT (story_id, artifact_type, artifact_name, iteration) DO UPDATE SET (...)
  - COMMENT ON FUNCTION noting trigger interaction (DO UPDATE path does NOT re-fire BEFORE INSERT trigger)
  - GRANT EXECUTE to agent_role

### ST-4: Write pgtap test suite
- **Goal**: Comprehensive test coverage for resolve_blocker and complete_artifact
- **Dependencies**: ST-3 (functions must exist)
- **Coverage**: AC-13 (test coverage requirement)
- **Structure**:
  ```sql
  BEGIN;
  SELECT plan(14);  -- HP-1–5 (5) + EC-1–5 (5) + ED-1–4 (4)
  
  -- Happy path tests (HP-1 through HP-5)
  -- Error case tests (EC-1 through EC-5)
  -- Edge case tests (ED-1 through ED-4)
  
  SELECT * FROM finish();
  ROLLBACK;
  ```
- **Verification**: `psql $PGTAP_URL -f ... | pg_prove` (all tests pass)

---

## Verification Steps

### Migration Idempotency
```bash
psql $DB_URL -f apps/api/knowledge-base/src/db/migrations/1061_resolve_blocker_complete_artifact.sql
# First run: installs functions
psql $DB_URL -f apps/api/knowledge-base/src/db/migrations/1061_resolve_blocker_complete_artifact.sql
# Second run: exits 0 (idempotent)
echo $?  # Expected: 0
```

### pgtap Test Suite
```bash
psql $PGTAP_URL -f apps/api/knowledge-base/src/db/migrations/pgtap/1061_resolve_blocker_complete_artifact_test.sql | pg_prove
# Expected: all tests pass (ok 1 .. ok 14)
```

### Function Existence & Permissions
```sql
-- Check functions exist in pg_proc
SELECT has_function('workflow', 'resolve_blocker', ARRAY['uuid', 'text', 'text']);
SELECT has_function('workflow', 'complete_artifact', ARRAY['text', 'text', 'text', 'text', 'int', 'text', 'text', 'jsonb']);

-- Check GRANT EXECUTE to agent_role
SELECT * FROM information_schema.role_routine_grants WHERE routine_name = 'resolve_blocker';
SELECT * FROM information_schema.role_routine_grants WHERE routine_name = 'complete_artifact';
```

---

## Known Risks & Mitigations

| Risk | Source | Mitigation | Status |
|------|--------|-----------|--------|
| Migration slot collision | Phase 2 (CDBE-2010, 2030) | ST-1 inspection + coordination | TBD |
| resolution_notes column missing | Migration 1050 (confirmed) | Add ALTER TABLE in CDBE-2020 migration (ST-2) | Ready |
| CDBE-2005 not deployed | Unknown status | AC-10 pre-condition guard + clear error message | Guarded |
| ON CONFLICT trigger re-fire | PostgreSQL behavior | Documented in COMMENT ON FUNCTION (ED-2 test validates) | Tested |

---

## Next Execution

When implementation phase begins:

1. **Read story spec** (`CDBE-2020.md` — already in context)
2. **Execute ST-1** — Confirm migration slot (expected: 1061)
3. **Execute ST-2** — Write resolve_blocker migration SQL
4. **Execute ST-3** — Write complete_artifact migration SQL + GRANT + RAISE NOTICE
5. **Execute ST-4** — Write pgtap test suite
6. **Verify** — Run psql idempotency check + pg_prove test suite
7. **Commit** — Git commit with story ID + subtask refs

---

## Timeline Estimate

- ST-1: 15 min (migration inspection)
- ST-2: 90 min (resolve_blocker function + tests understanding)
- ST-3: 90 min (complete_artifact function + integration)
- ST-4: 120 min (pgtap test suite + fixtures)
- Verification: 30 min (idempotency + test execution)
- **Total**: ~5.25 hours (conservative estimate)

---

## Decision Log

(None yet — deferred to implementation phase per dev-feasibility)

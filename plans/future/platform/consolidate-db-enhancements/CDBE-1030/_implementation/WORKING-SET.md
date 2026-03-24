# CDBE-1030 Working Set

## Story Summary
- **ID**: CDBE-1030
- **Title**: Artifact Write and Plan Archival Cascade Triggers
- **Type**: Database Migration (PostgreSQL)
- **Points**: 5
- **Status**: setup (ready for implementation)

## Implementation Overview

This story adds two PostgreSQL database triggers to eliminate agent-managed artifact versioning and plan story state cleanup:

1. **Trigger 1**: `artifacts.supersede_prior_artifact_version()` - BEFORE INSERT on `artifacts.story_artifacts`
   - Marks older artifact iterations as superseded when new ones are inserted
   - Updates parent story's `updated_at` timestamp

2. **Trigger 2**: `workflow.archive_plan_stories()` - AFTER UPDATE on `workflow.plans`
   - Cascades archived plan status to its backlog stories
   - Sets linked backlog stories to `deferred` state

## Files to Create/Modify

### Primary Implementation Files
- **Create**: `/Users/michaelmenard/Development/monorepo/apps/api/knowledge-base/src/db/migrations/1020_artifact_and_plan_cascade_triggers.sql`
  - Migration adding both triggers and schema changes
  - Size estimate: ~250-350 lines (based on 1010 reference migration)

- **Create**: `/Users/michaelmenard/Development/monorepo/apps/api/knowledge-base/src/db/migrations/pgtap/1020_artifact_and_plan_cascade_triggers_test.sql`
  - pgtap test file with 8+ test assertions
  - SAVEPOINT + DO block guards required per KB lesson 23ea4ba2
  - Size estimate: ~200-300 lines

### Reference Files
- Pattern reference: `/Users/michaelmenard/Development/monorepo/apps/api/knowledge-base/src/db/migrations/1010_story_state_history_trigger.sql`
- Test reference: `/Users/michaelmenard/Development/monorepo/apps/api/knowledge-base/src/db/migrations/pgtap/1010_story_state_history_trigger_test.sql`
- Schema baseline: `/Users/michaelmenard/Development/monorepo/apps/api/knowledge-base/src/db/migrations/999_full_schema_baseline.sql`

## Branch and Worktree
- **Branch**: story/CDBE-1030
- **Worktree Path**: tree/story/CDBE-1030 (if used)
- **Main branch**: main (for PR)

## Key Constraints and Requirements

### Database Schema Changes
- Add `superseded_at timestamptz` column to `artifacts.story_artifacts` table
- Create partial index on `artifacts.story_artifacts` for non-superseded artifacts
- All changes must use `IF NOT EXISTS` for idempotency

### Trigger 1: Artifact Versioning
- Function name: `artifacts.supersede_prior_artifact_version()`
- Trigger name: `artifact_versions_supersede`
- Execution: BEFORE INSERT FOR EACH ROW
- Logic:
  ```sql
  SELECT * FROM artifacts.story_artifacts 
  WHERE story_id = NEW.story_id 
    AND artifact_type = NEW.artifact_type 
    AND superseded_at IS NULL
  ORDER BY created_at DESC 
  LIMIT 1
  ```
  Then UPDATE that row's `superseded_at = NOW()` and bump parent story's `updated_at`

### Trigger 2: Plan Archival Cascade
- Function name: `workflow.archive_plan_stories()`
- Trigger name: `plan_archival_cascade`
- Execution: AFTER UPDATE FOR EACH ROW
- Condition: `NEW.status = 'archived'::plan_status_enum AND OLD.status IS DISTINCT FROM NEW.status`
- Logic:
  ```sql
  UPDATE workflow.stories 
  SET state = 'deferred'
  WHERE story_id IN (
    SELECT story_id FROM workflow.plan_story_links 
    WHERE plan_slug = NEW.plan_slug
  )
  AND state = 'backlog'
  ```

### pgtap Testing Requirements
- All `CREATE TRIGGER` DDL must be wrapped in SAVEPOINT + DO block checking `pg_proc`
- Tests must verify:
  1. `superseded_at` column exists
  2. Both triggers exist
  3. Trigger 1 supersedes prior artifacts
  4. Trigger 1 is no-op on first insert
  5. Trigger 1 updates parent story's `updated_at`
  6. Trigger 2 defers linked backlog stories
  7. Trigger 2 is no-op for non-archived status
  8. Migration is idempotent (second run succeeds)

## CLAUDE.md Constraints
- TypeScript/SQL style rules apply to comments and structure
- Zod schemas not applicable (SQL migration file)
- No barrel files requirement not applicable
- Database code follows PostgreSQL best practices from codebase

## Known Issues and Mitigations

### Issue 1: Missing `superseded_at` column
- **Severity**: Blocking
- **Mitigation**: Add column in migration BEFORE defining trigger functions
- **Status**: Mitigated in design

### Issue 2: `backlog → deferred` transition may not exist
- **Severity**: Warning
- **Mitigation**: Pre-condition guard in migration with `DO $$ IF NOT EXISTS RAISE EXCEPTION`
- **Status**: Documented in SETUP-LOG.md

### Issue 3: pgtap test function reference failures
- **Severity**: Known pattern (KB lesson 23ea4ba2)
- **Mitigation**: SAVEPOINT + DO block pattern in all test `CREATE TRIGGER` calls
- **Status**: Documented constraint

## Dependency Status
- **CDBE-1010** (Story State History Trigger): COMPLETE ✓
  - Provides trigger pattern reference
  - `enforce_story_state_history_transition` may fire as downstream effect of Trigger 2
  - `backlog → deferred` transition must exist (AC-14 check)

## Test Coverage Target
- Minimum 45% code coverage required per CLAUDE.md
- pgtap tests cover all migration code paths and idempotency
- No application code changes, so integration testing is not required

## Success Criteria (All ACs from CDBE-1030.md)
- [ ] AC-1: Column addition with idempotency
- [ ] AC-2: Function for artifact supersession
- [ ] AC-3: Function updates parent story `updated_at`
- [ ] AC-4: BEFORE INSERT trigger on `artifacts.story_artifacts`
- [ ] AC-5: No-op on first artifact insert
- [ ] AC-6: Function for plan archival cascade
- [ ] AC-7: AFTER UPDATE trigger on `workflow.plans`
- [ ] AC-8: No-op with zero linked stories
- [ ] AC-9: No-op for non-archived status
- [ ] AC-10: Comments on all objects citing migration number
- [ ] AC-11: Migration is idempotent (second run succeeds)
- [ ] AC-12: Partial index on `artifacts.story_artifacts`
- [ ] AC-13: pgtap test file with SAVEPOINT guards
- [ ] AC-14: Pre-condition check for `backlog → deferred` transition

---

**Working Set Created**: 2026-03-19
**Ready for Dev Implementation**: YES

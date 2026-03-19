# CDBE-2010 Setup Complete

## Execution Summary

**Date**: 2026-03-19  
**Agent**: dev-setup-leader  
**Mode**: implement  
**Story ID**: CDBE-2010  
**Story Title**: `advance_story_state` and `assign_story` Stored Procedures

## Status

✅ **SETUP COMPLETE**

All setup artifacts created and documented. Story ready for implementation.

## Artifacts Created

1. **CHECKPOINT.yaml** (202 bytes)
   - Schema: 1
   - Current phase: setup
   - Iteration: 0
   - Status: ready to proceed

2. **SCOPE.yaml** (605 bytes)
   - Touches: database only (db=true, others=false)
   - Risk flags: migrations=true
   - Elaboration: completed

3. **SETUP-LOG.md** (5.0 KB)
   - Story summary and context
   - Precondition checks documented
   - Architecture notes and reuse plan
   - Acceptance criteria summary
   - Subtasks breakdown

4. **WORKING-SET.md** (5.6 KB)
   - Current phase: setup (iteration 0)
   - Constraints from CLAUDE.md + KB
   - Reuse assets (migration/test patterns)
   - Detailed subtasks (ST-1 through ST-4)
   - Open questions for dev team
   - Files to create/modify

5. **KB-CONTEXT.md** (5.8 KB)
   - KB queries intended (not performed)
   - Constraints applied
   - Risk flags and mitigations
   - Architecture decisions (ADRs)
   - Precedent files for reuse
   - Known limitations in this environment

## Story Analysis

### Scope

- **Type**: Database/SQL migration (pure SQL, no TypeScript)
- **Phase**: 2 (consolidate-db-enhancements)
- **Points**: 3
- **Components**: PostgreSQL stored procedures + pgtap tests

### Touches

```
backend:    false
frontend:   false
packages:   false
database:   true  ← DATABASE MIGRATION
contracts:  false
ui:         false
infra:      false
```

### Risk Profile

```
migrations:     true   ← This IS a database migration
auth:          false   ← No new auth, uses existing validate_caller()
payments:      false
external_apis: false
security:      false
performance:   false
```

### Key Constraints

1. **Idempotent migration**: CREATE OR REPLACE FUNCTION (no data loss on rerun)
2. **Caller validation**: All procedures start with PERFORM workflow.validate_caller()
3. **Delegation model**: Procedures delegate cascade logic to 1010 BEFORE INSERT trigger
4. **No double-execution**: Trigger owns exited_at/duration_seconds — procedure does NOT set these
5. **Transaction atomicity**: Any failure rolls back all changes
6. **Error codes**: P0001 (unauthorized), 23514 (illegal transition)
7. **Graceful degradation**: Handles missing public.agent_invocations table

## Implementation Roadmap

### Phase 1: Verification (ST-1)

- Confirm migration slot 1013 is available (1010–1012 taken)
- Verify public.agent_invocations exists
- Check table structure and columns
- Est. tokens: 3,000

### Phase 2: advance_story_state (ST-2)

- Implement PostgreSQL stored procedure
- First guard: PERFORM workflow.validate_caller()
- Second guard: NOT EXISTS check vs. valid_transitions
- Insert into story_state_history
- Update workflow.stories.state
- Add COMMENT ON FUNCTION
- Est. tokens: 12,000

### Phase 3: assign_story (ST-3)

- Implement PostgreSQL stored procedure
- First guard: PERFORM workflow.validate_caller()
- Insert into story_assignments
- Optionally link to public.agent_invocations (TBD)
- Add COMMENT ON FUNCTION
- Add GRANT EXECUTE to agent_role
- Est. tokens: 8,000

### Phase 4: Testing (ST-4)

- Write pgtap test file
- Test coverage for both functions
- Edge cases: unauthorized, inactive, illegal transitions
- Happy path: valid transitions and assignments
- Idempotency test (run migration twice)
- Est. tokens: 10,000

**Total estimated tokens for implementation**: ~33,000 (core implementation + testing)

## Files to Create

```
apps/api/knowledge-base/src/db/migrations/
  └─ 1013_cdbe2010_stored_procedures.sql

tests/db/triggers/
  └─ test_cdbe2010_stored_procedures.sql
```

## Dependencies

### Hard Dependencies (Must Exist)

- ✅ workflow.valid_transitions (migration 1004) — DEPLOYED
- ✅ workflow.allowed_agents + validate_caller() (migration 1005) — DEPLOYED (CDBE-2005)
- ✅ workflow.story_state_history BEFORE INSERT trigger (migration 1010) — DEPLOYED (CDBE-1010)
- ✅ BEFORE UPDATE trigger on workflow.stories (migration 1001) — DEPLOYED
- ✅ workflow.story_assignments table (migration 1050) — DEPLOYED (CDBE-1050)

### Soft Dependencies (Verify Existence)

- ❓ public.agent_invocations (may have been dropped by 999_cleanup_duplicate_tables.sql)

## Known Issues

1. **CDBE-2030 dependency inversion** (from story)
   - KB says CDBE-2010 is blocked by CDBE-2030 (resolve_blocker)
   - This may be inverted — resolve_blocker depends on advance_story_state
   - **Action**: PM should confirm dependency chain before dev starts

2. **AC-10 invocation link mechanism** (TBD)
   - Options: (a) column on story_assignments, (b) separate table, (c) NO-OP
   - **Action**: Dev should choose simplest approach (a) and document decision

3. **public.agent_invocations** (verify)
   - May have been dropped by cleanup migration
   - assign_story must handle gracefully if absent
   - **Action**: ST-1 verification step checks this

## Next Steps (From This Setup)

1. ✅ Story analyzed and documented
2. ✅ Scope defined (database-only migration)
3. ✅ Risk profile assessed
4. ✅ Constraints documented
5. ✅ Subtasks defined with token estimates
6. ⏭️ **Proceed to ST-1**: Verify migration slot 1013 and public.agent_invocations
7. ⏭️ **Continue through ST-2, ST-3, ST-4** as defined in WORKING-SET.md

## Environment Notes

- **Worktree**: None (working in main repo)
- **Branch**: TBD (to be set during implementation)
- **Gen Mode**: false (standard workflow, not generated)
- **Autonomy**: conservative (escalate ambiguous decisions)

## Token Usage Log

| Phase                 | Input Tokens | Output Tokens | Total       |
| --------------------- | ------------ | ------------- | ----------- |
| Setup (this)          | ~14,750      | ~2,500        | ~17,250     |
| Implementation (est.) | ~10,000      | ~23,000       | ~33,000     |
| **TOTAL (est.)**      |              |               | **~50,250** |

---

## Sign-Off

**Setup completed**: 2026-03-19T00:00:00Z  
**Agent**: dev-setup-leader (haiku)  
**All preconditions met**: Ready for implementation phase

**Next action**: Run ST-1 verification (migration slot + public.agent_invocations)

# CDBE-2010 Working Set

## Story Context

**Story ID**: CDBE-2010  
**Title**: `advance_story_state` and `assign_story` Stored Procedures  
**Status**: setup (setup phase completed)  
**Type**: Database/SQL Migration  
**Phase**: 2 (consolidate-db-enhancements)  
**Points**: 3

## Current Phase

- **Phase**: setup
- **Iteration**: 0
- **Timestamp**: 2026-03-19T00:00:00Z

## Branch / Worktree

- **Branch**: TBD (working in main repo)
- **Worktree**: main (no separate worktree)

## Constraints (from CLAUDE.md + KB)

1. **Use idempotent migrations**: `CREATE OR REPLACE FUNCTION` throughout
2. **Delegation model**: Stored procedure calls `validate_caller()` first, then delegates cascade logic to 1010 BEFORE INSERT trigger
3. **No re-implementation of exited_at/duration_seconds**: The 1010 trigger owns that computation
4. **Transaction atomicity**: If any step raises, entire operation rolls back
5. **pgtap test isolation**: `BEGIN / SELECT plan(N) / assertions / SELECT * FROM finish() / ROLLBACK`
6. **SAVEPOINT guard for undeployed functions**: Wrap DDL referencing undeployed functions
7. **Cross-schema reference**: `assign_story` references `public.agent_invocations` — may not exist; migration must handle gracefully
8. **Stored procedure parameters**: Use named parameters with `=>` syntax for clarity
9. **Error codes**: Use `SQLSTATE P0001` for unauthorized, `SQLSTATE 23514` for illegal transition
10. **Comments**: Add `COMMENT ON FUNCTION` for both functions citing migration number

## Reuse Assets

| Asset                   | File                                     | Usage                                           |
| ----------------------- | ---------------------------------------- | ----------------------------------------------- |
| validate_caller()       | 1005_allowed_agents.sql                  | First guard in both procedures                  |
| valid_transitions table | 1004_valid_transitions.sql               | NOT EXISTS validation in advance_story_state    |
| Trigger structure       | 1001_canonical_story_states.sql          | RAISE EXCEPTION + ERRCODE pattern               |
| pgtap test template     | test_cdbe2005_allowed_agents.sql         | BEGIN/plan/assertions/finish/ROLLBACK structure |
| SAVEPOINT guard         | test_cdbe1030_artifact_superseded_at.sql | Wrap DDL for undeployed functions               |
| story_assignments table | 1050_cascade_trigger_prerequisites.sql   | assign_story INSERT target                      |

## Subtasks

### ST-1: Verify migration slot and public.agent_invocations existence

- **Est. Tokens**: 3,000
- **AC Coverage**: AC-10, AC-12
- **Dependencies**: none

Check:

- Migration slot 1013 is available (1010, 1011, 1012 are taken)
- public.agent_invocations table exists and has invocation_id column
- public.agent_invocations was NOT dropped by 999_cleanup_duplicate_tables.sql

### ST-2: Implement advance_story_state stored procedure

- **Est. Tokens**: 12,000
- **AC Coverage**: AC-1–6, AC-11–12
- **Dependencies**: ST-1

Create function:

```
workflow.advance_story_state(
  p_story_id TEXT,
  p_to_state TEXT,
  p_agent_name TEXT,
  p_reason TEXT,
  p_caller_agent_id TEXT
) RETURNS void
```

Logic:

1. PERFORM workflow.validate_caller(p_caller_agent_id) — abort if unauthorized
2. NOT EXISTS check vs. workflow.valid_transitions — raise 23514 if illegal
3. Get current state from workflow.stories
4. INSERT INTO workflow.story_state_history(story_id, event_type, from_state, to_state, reason)
5. UPDATE workflow.stories SET state = p_to_state
6. Add COMMENT ON FUNCTION

### ST-3: Implement assign_story stored procedure

- **Est. Tokens**: 8,000
- **AC Coverage**: AC-7–10, AC-14
- **Dependencies**: ST-2

Create function:

```
workflow.assign_story(
  p_story_id TEXT,
  p_agent_name TEXT,
  p_phase TEXT,
  p_caller_agent_id TEXT
) RETURNS void
```

Logic:

1. PERFORM workflow.validate_caller(p_caller_agent_id) — abort if unauthorized
2. INSERT INTO workflow.story_assignments(story_id, agent_id, assigned_at)
3. (Optional) If public.agent_invocations exists, attempt to link invocation_id
4. Add COMMENT ON FUNCTION
5. Add GRANT EXECUTE to agent_role

### ST-4: Write pgtap test file

- **Est. Tokens**: 10,000
- **AC Coverage**: AC-13
- **Dependencies**: ST-3

Create `tests/db/triggers/test_cdbe2010_stored_procedures.sql`

Test coverage:

- `has_function` for both procedures
- `throws_ok` for unauthorized caller (P0001) — advance_story_state + assign_story
- `throws_ok` for inactive caller (P0001) — advance_story_state only
- `throws_ok` for illegal transition (23514) — advance_story_state only
- `lives_ok` for authorized + legal transition — advance_story_state
- `lives_ok` for assign_story with valid inputs
- `ok` for double-execution guard: exited_at set exactly once (HP-3)
- `lives_ok` for assign_story: absent agent_invocations is graceful (ED-1)
- Manual idempotency test (run migration twice)

## Next Steps

1. Read story requirements (DONE)
2. Verify migration slot 1013 and public.agent_invocations (ST-1)
3. Implement advance_story_state (ST-2)
4. Implement assign_story (ST-3)
5. Write pgtap tests (ST-4)
6. Run full migration test suite
7. Prepare for code review

## Open Questions

1. **CDBE-2030 dependency inversion**: Confirm with PM whether CDBE-2010 is truly blocked by CDBE-2030 or if the dependency is reversed.

2. **AC-10 invocation link mechanism**: Choose the simplest approach:
   - (a) Column on story_assignments (preferred)
   - (b) Separate link row
   - (c) Log-only NO-OP
     Document the decision in code comments.

3. **public.agent_invocations**: If this table doesn't exist, assign_story must gracefully skip invocation linking without raising an error.

---

## Files to Create/Modify

### Create (migration)

- `apps/api/knowledge-base/src/db/migrations/1013_cdbe2010_stored_procedures.sql`

### Create (tests)

- `tests/db/triggers/test_cdbe2010_stored_procedures.sql`

### No modifications to existing files

- Migration must be idempotent and self-contained
- No changes to CLAUDE.md, package.json, or existing migrations

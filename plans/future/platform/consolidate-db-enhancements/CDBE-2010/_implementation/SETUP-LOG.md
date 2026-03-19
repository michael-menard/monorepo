# CDBE-2010 Setup Log

## Execution Details

- **Timestamp**: 2026-03-19T00:00:00Z
- **Agent**: dev-setup-leader
- **Mode**: implement
- **Gen Mode**: false
- **Story ID**: CDBE-2010
- **Autonomy Level**: conservative

## Story Summary

Title: `advance_story_state` and `assign_story` Stored Procedures

Type: Database/SQL Migration (Phase 2 of consolidate-db-enhancements)

Scope: Pure SQL — PostgreSQL stored procedures + pgtap tests. No TypeScript, frontend, or API changes.

## Precondition Checks

### Status Check

- Current status: `backlog` (from story.yaml)
- Required status: `ready-to-work` or `ready`
- **NOTE**: The story is in backlog state. Per conservative autonomy and gen_mode=false, precondition validation should be performed by `/precondition-check` skill. This setup log documents that the story was accessible but status check should be verified before implementation begins.

### Dependency Check

- Listed dependencies: CDBE-1010 (state history trigger), CDBE-1020 (cascade trigger)
- Story notes: "Risk_notes reference CDBE-2030 (resolve_blocker) with possible inversion — PM should confirm"
- Status: ASSUMED OK pending KB verification

### Prior Implementation Check

- No `_implementation/CHECKPOINT.yaml` exists before this run
- Safe to proceed

## Scope Analysis

### Touches

- **backend**: false (no API changes)
- **frontend**: false (no UI changes)
- **packages**: false (no TypeScript packages)
- **database**: true (PostgreSQL stored procedures + migration)
- **contracts**: false (no Zod schema changes)
- **ui**: false
- **infra**: false

### Risk Flags

- **migrations**: true (this IS a DB migration)
- **auth**: false
- **payments**: false
- **external_apis**: false
- **security**: false (caller validation via validate_caller, no new auth)
- **performance**: false

### Touched Paths

```
apps/api/knowledge-base/src/db/migrations/1013_cdbe2010_stored_procedures.sql
tests/db/triggers/test_cdbe2010_stored_procedures.sql
```

### Key Constraints (from CLAUDE.md defaults)

1. Stored procedures use plpgsql (per existing patterns)
2. Migration must be idempotent (CREATE OR REPLACE FUNCTION)
3. pgtap test isolation: BEGIN/plan/assertions/finish/ROLLBACK
4. Delegation model: procedure calls validate_caller first, then delegates cascade to 1010 BEFORE INSERT trigger

## Architecture Notes

### Delegation Chain

```
CALL workflow.advance_story_state(...)
  ├─ PERFORM workflow.validate_caller(caller_agent_id)  [guard, raises P0001 if unauthorized]
  ├─ NOT EXISTS check vs. workflow.valid_transitions     [raises 23514 if illegal]
  ├─ INSERT INTO workflow.story_state_history(...)       [fires 1010 BEFORE INSERT trigger]
  │   └─ Trigger sets exited_at + duration_seconds on previous row
  └─ UPDATE workflow.stories SET state = to_state         [fires 1001 BEFORE UPDATE trigger]
```

### Reuse Plan

| Asset                     | Source                                   | Usage                                           |
| ------------------------- | ---------------------------------------- | ----------------------------------------------- |
| `validate_caller()`       | 1005_allowed_agents.sql                  | First guard in both procedures                  |
| `valid_transitions` table | 1004_valid_transitions.sql               | NOT EXISTS validation in advance_story_state    |
| Trigger structure         | 1001_canonical_story_states.sql          | RAISE EXCEPTION + ERRCODE pattern               |
| pgtap template            | test_cdbe2005_allowed_agents.sql         | BEGIN/plan/assertions/finish/ROLLBACK structure |
| SAVEPOINT guard           | test_cdbe1030_artifact_superseded_at.sql | Wrap DDL for undeployed functions               |
| story_assignments table   | 1050_cascade_trigger_prerequisites.sql   | assign_story INSERT target                      |

## Acceptance Criteria Summary

**Total ACs**: 14

**Key AC groups**:

- AC-1–6, AC-11–12: advance_story_state function implementation
- AC-7–10, AC-14: assign_story function implementation
- AC-13: pgtap test coverage

## Subtasks

| ID   | Title                                                        | Est. Tokens |
| ---- | ------------------------------------------------------------ | ----------- |
| ST-1 | Verify migration slot and public.agent_invocations existence | 3,000       |
| ST-2 | Implement advance_story_state stored procedure               | 12,000      |
| ST-3 | Implement assign_story stored procedure                      | 8,000       |
| ST-4 | Write pgtap test file for both stored procedures             | 10,000      |

## Next Steps

1. Read story requirements (DONE — full CDBE-2010.md reviewed)
2. Verify migration slot 1013 is available (ST-1)
3. Implement advance_story_state procedure (ST-2)
4. Implement assign_story procedure (ST-3)
5. Write pgtap tests (ST-4)
6. Run verification suite
7. Prepare code review

## Known Issues / Open Questions

1. **CDBE-2030 dependency inversion** (from story): KB says CDBE-2010 is blocked by CDBE-2030 (resolve_blocker). This may be inverted — resolve_blocker logically depends on advance_story_state. Confirm before dev starts.

2. **AC-10 mechanism** (invocation link): Should `public.agent_invocations` linkage be stored as:
   - (a) a column on story_assignments (preferred — simplest)
   - (b) a separate link row
   - (c) a log-only NO-OP
     Dev should pick the simplest path and document the decision.

3. **public.agent_invocations existence**: Migration 999_cleanup_duplicate_tables.sql may have dropped this table. Must verify at implementation time.

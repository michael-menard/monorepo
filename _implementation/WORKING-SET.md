# Working Set - CDBE-3020

**Story:** Roadmap Materialized View and Refresh Trigger  
**Phase:** Implementation  
**Worktree:** /Users/michaelmenard/Development/monorepo/tree/story/CDBE-3020  
**Branch:** TBD (set by implementation agent)

## Constraints

All constraints are from CLAUDE.md project standards and story-specific requirements:

1. **Use atomic migration pattern** — Transaction safety with safety preamble and idempotency guards (per CDBE-1030 pattern)
2. **pgTAP testing only** — Pure DDL + PL/pgSQL; no TypeScript changes per ACs
3. **Follow SQL naming conventions** — Lowercase, underscores, no reserved keywords
4. **Add COMMENT ON statements** — Document view columns and trigger function purpose
5. **Unique index required** — (plan_id, story_order) per AC5
6. **STATEMENT-level triggers** — Use pg_trigger_depth guard to prevent infinite loops (per CDBE-1010 pattern)
7. **GRANT pattern consistency** — Match existing database role structure (per CDBE-1005 pattern)
8. **Reuse existing CTEs** — story_counts from migration 999, safety preamble from CDBE-1030
9. **No TypeScript changes** — Per elaboration verdict; migration only
10. **CONCURRENT refresh** — REFRESH MATERIALIZED VIEW CONCURRENTLY (per story description)

## Implementation Paths

### Database Migration

- **File:** `packages/backend/db/migrations/1081_add_roadmap_materialized_view.sql`
- **Estimated Slot:** 1080 (verify at implementation time)
- **Contents:**
  - Safety preamble (CREATE OR REPLACE, idempotency)
  - workflow.roadmap materialized view DDL
  - Unique index creation
  - Trigger function with pg_trigger_depth guard
  - Statement-level triggers on plans and stories tables
  - GRANT statements
  - COMMENT ON documentation

### Test Suite

- **File:** `packages/backend/db/__tests__/1081_roadmap_matview.test.sql`
- **Framework:** pgTAP
- **Coverage:**
  - View DDL correctness
  - Column existence and types
  - story_counts CTE accuracy
  - next_unblocked_story_id selection logic
  - estimated_completion_pct calculation
  - Unique index behavior
  - Trigger idempotency (multiple refreshes)
  - Permission grants

## Reference Assets

### SQL Patterns to Reuse

1. **story_counts CTE** (migrations/999_add_plan_churn_tracking.sql, lines ~XX-XX)
   - Groups stories by state and counts them
   - Use this pattern for completed_count and story_count aggregation

2. **Safety Preamble** (CDBE-1030 migration)
   - CREATE OR REPLACE handles updates
   - BEGIN/ROLLBACK for transaction safety
   - Comment blocks for clarity

3. **Trigger Function Pattern** (CDBE-1010 migration)
   - pg_trigger_depth > 0 check prevents infinite loops
   - Uses NEW and OLD for row-level or STATEMENT context
   - EXECUTE IMMEDIATE pattern for dynamic SQL

4. **pgTAP Test Structure** (CDBE-1030_test)
   - plan(N) calls to declare test count
   - is() assertions for equality
   - ok() for boolean checks
   - diag() for diagnostic messages

### TypeScript Reference (Non-Implementation)

- **File:** packages/backend/orchestrator/src/services/planService.ts
- **Use Case:** Reference only for nextStory selection logic
- **Do NOT modify** — No TypeScript changes per ACs

## Next Phase: Implementation

### Step 1: Design Review

- [ ] Verify CDBE-3010 completion (dependency)
- [ ] Confirm migration slot number (currently estimated at 1080)
- [ ] Review elaboration verdict confirmation
- [ ] Check existing materialized view usage patterns in codebase

### Step 2: Migration Implementation

- [ ] Create migration file at correct slot
- [ ] Implement safety preamble
- [ ] Implement workflow.roadmap materialized view DDL
- [ ] Create unique index on (plan_id, story_order)
- [ ] Implement refresh trigger function with pg_trigger_depth guard
- [ ] Implement STATEMENT-level triggers
- [ ] Add GRANT statements
- [ ] Add COMMENT ON documentation

### Step 3: Test Implementation

- [ ] Create pgTAP test file
- [ ] Test view structure and columns
- [ ] Test story_counts aggregation
- [ ] Test next_unblocked_story selection
- [ ] Test estimated_completion_pct calculation
- [ ] Test unique index
- [ ] Test trigger idempotency
- [ ] Run test suite: pnpm test

### Step 4: Verification

- [ ] Type check: pnpm check-types
- [ ] Lint: /lint-fix
- [ ] Coverage report
- [ ] Migration dry-run if applicable
- [ ] Review all 14 ACs for completeness

### Step 5: Code Review Preparation

- [ ] Fill CODE-REVIEW-CHECKLIST.yaml with all changes
- [ ] Document decisions and trade-offs
- [ ] Flag performance considerations
- [ ] Verify dependency completion (CDBE-3010)

## Elaboration Summary (for reference)

**Verdict:** CONDITIONAL_PASS (ready_to_implement: true)

**Key Points:**

- All 14 ACs are specified and testable
- No ambiguities requiring further clarification
- Dependencies resolved (CDBE-3010 completed)
- Reusable assets identified and referenced
- Test strategy clear (pgTAP only)
- No TypeScript changes required

## Migration Information

**Type:** DDL + PL/pgSQL (pure database schema changes)  
**Downtime Required:** No  
**Rollback Strategy:** `DROP MATERIALIZED VIEW IF EXISTS workflow.roadmap CASCADE`  
**Dependencies:** CDBE-3010 (plan_story_links and story_state_transitions tables)

## Files to Create/Modify

| Path                                                                    | Type | Action | Notes         |
| ----------------------------------------------------------------------- | ---- | ------ | ------------- |
| `packages/backend/db/migrations/1081_add_roadmap_materialized_view.sql` | SQL  | Create | New migration |
| `packages/backend/db/__tests__/1081_roadmap_matview.test.sql`           | SQL  | Create | pgTAP tests   |

## Success Criteria

- [x] SETUP COMPLETE
- [ ] Migration implementation complete and passing tests
- [ ] All 14 ACs verified
- [ ] Code review passed
- [ ] QA verification passed
- [ ] Deployment ready

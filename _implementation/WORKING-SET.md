# CDBE-3010 Working Set

**Story ID**: CDBE-3010  
**Story Branch**: `tree/story/CDBE-3010`  
**Implementation Phase**: Development Setup Complete  
**Worktree**: `/Users/michaelmenard/Development/monorepo/tree/story/CDBE-3010`  

---

## Constraints

### From CLAUDE.md
- Use Zod schemas for all TypeScript types (NOT APPLICABLE — pure DDL)
- No barrel files (NOT APPLICABLE — pure DDL)
- Use @repo/logger, not console (NOT APPLICABLE — pure DDL)
- Minimum 45% test coverage (NOT APPLICABLE — test surface is pgtap only, coverage not measured)
- Named exports preferred (NOT APPLICABLE — pure DDL)

### Migration-Specific Constraints
1. **Safety Preamble**: All knowledgebase migrations must include `current_database() = 'knowledgebase'` verification (lesson from CDBN-1050)
2. **Idempotency**: `CREATE OR REPLACE VIEW` is idempotent; no DROP guard needed
3. **Column Exposure**: Use explicit column list (not `s.*`) to avoid schema change surprises
4. **RLS Inheritance**: View runs with SECURITY INVOKER (default); caller privileges inherited from underlying tables
5. **Index Dependency**: `idx_story_state_history_open_rows` (migration 1010) must exist before view creation
6. **No API Scope**: Pure DDL — no MCP tools, Lambda handlers, TypeScript services, or UI components

---

## Next Steps

### Phase: Implementation
1. Write `apps/api/knowledge-base/src/db/migrations/1030_cdbe3010_stories_current_view.sql`
   - Safety preamble DO block
   - CREATE OR REPLACE VIEW with explicit column list
   - LATERAL join for latest open row
   - COMMENT statements with migration number prefix

2. Write `apps/api/knowledge-base/src/db/migrations/pgtap/1030_cdbe3010_stories_current_view_test.sql`
   - View existence assertion
   - Three data scenarios: with history, without history, with closed + open rows
   - Idempotency tests

### Phase: Verification
- Run migration on KB database
- Run pgtap tests
- Verify idempotency (re-run migration, expect zero errors)
- Confirm LATERAL join uses partial index (EXPLAIN plan)

### Phase: Code Review
- AC compliance verification (AC-1 through AC-12)
- Non-goal validation (no API/TypeScript changes)
- Pattern conformance (vs. reference files)

### Phase: QA
- Production deployment readiness
- Rollback readiness
- RLS privilege verification across roles

---

## Reference Patterns

### LATERAL Join (from 1000_create_story_details_view.sql, lines 117–123)
```sql
LEFT JOIN LATERAL (
  SELECT *
  FROM workflow.story_outcomes o2
  WHERE o2.story_id = s.story_id
  ORDER BY o2.created_at DESC
  LIMIT 1
) o ON true
```

### CREATE OR REPLACE VIEW (from 999_add_plan_churn_tracking.sql, line 65)
```sql
CREATE OR REPLACE VIEW workflow.v_plan_churn_summary AS
WITH RECURSIVE ...
```

### pgtap Structure (from 1010_story_state_history_trigger_test.sql)
```sql
BEGIN;
SELECT plan(N);
-- Assertions
SELECT * FROM finish();
ROLLBACK;
```

### Safety Preamble (from CDBN-1050 lesson)
```sql
DO $$ BEGIN
  IF current_database() <> 'knowledgebase' THEN
    RAISE EXCEPTION 'Migration 1030: This migration must run against the ''knowledgebase'' database, not %', current_database();
  END IF;
END $$;
```

---

## Files to Create

| File | Purpose | Lines Est. |
|------|---------|-----------|
| `apps/api/knowledge-base/src/db/migrations/1030_cdbe3010_stories_current_view.sql` | Migration DDL | ~60 |
| `apps/api/knowledge-base/src/db/migrations/pgtap/1030_cdbe3010_stories_current_view_test.sql` | pgtap tests | ~80 |

---

## Files NOT in Scope

- No changes to `workflow.stories` table
- No changes to `workflow.story_details` view
- No changes to `workflow.story_state_history` table
- No new TypeScript types or services
- No new API endpoints
- No new MCP tools
- No UI components

---

## Summary

CDBE-3010 is a narrowly-scoped DDL migration story. The implementation requires two SQL files: a migration file creating the view with proper idempotency and safety guards, and a pgtap test file covering all acceptance criteria. No code outside the database layer is in scope.

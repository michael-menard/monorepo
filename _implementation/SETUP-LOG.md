# Setup Log - CDBE-3020

**Story:** Roadmap Materialized View and Refresh Trigger  
**Mode:** implement  
**Phase:** setup  
**Iteration:** 0  
**Timestamp:** 2026-03-19T18:30:00Z

## Status

SETUP COMPLETE

## Preconditions

- [x] Story exists in KB: CDBE-3020
- [x] Story status: in_progress (ready for implementation)
- [x] No prior implementation blocking: checkpoint found but iteration 0 starting fresh
- [x] Elaboration verdict: CONDITIONAL_PASS (ready_to_implement: true)
- [x] Dependencies resolved: CDBE-3010 completed

## Scope Analysis

### Story Title

Roadmap Materialized View and Refresh Trigger

### Story Description

Create workflow.roadmap as a materialized view joining plans with story counts, next unblocked stories, and estimated completion; implement trigger or function to REFRESH MATERIALIZED VIEW CONCURRENTLY on plan and story changes.

### Scope Touches

- **DB:** true - Materialized view DDL, index creation, trigger function, GRANT statements
- **Backend:** false - No TypeScript or API changes per ACs
- **Frontend:** false - No React changes
- **Packages:** false
- **Contracts:** false - No Zod schema changes
- **UI:** false
- **Infra:** false

### Risk Flags

- **Migrations:** true - DDL changes, index creation, trigger function deployment
- **Performance:** true - Materialized view refresh impact, CONCURRENT refresh overhead
- **External APIs:** false
- **Auth:** false
- **Payments:** false
- **Security:** false

### Touched Path Globs

- `packages/backend/db/migrations/` (new migration)
- `packages/backend/db/` (schema, tests)

### Reusable Assets Identified

Per elaboration summary:

1. story_counts CTE from migration 999_add_plan_churn_tracking.sql
2. Safety preamble from CDBE-1030 migration
3. Trigger pattern from CDBE-1010 migration
4. pgTAP test structure from CDBE-1030_test
5. GRANT pattern from CDBE-1005 migration
6. nextStory logic from planService.ts (reference for unblocked story selection)

## Constraints Applied

All from CLAUDE.md project standards:

1. **Migration Approach:** Use atomic migration pattern with safety preamble and idempotency guards
2. **Testing:** pgTAP only (pure DDL + PL/pgSQL, no TypeScript changes)
3. **Code Style:** Standard SQL conventions, clear comments, no hardcoded values
4. **Naming:** Follow existing schema naming conventions (lowercase, underscores)
5. **Permissions:** Apply GRANT statements matching existing database role structure
6. **Documentation:** Add COMMENT ON statements for view and trigger function
7. **Index:** Create unique index as per AC requirements
8. **Trigger:** STATEMENT-level, use pg_trigger_depth guard to prevent infinite loops

## Implementation Steps (Next Phase)

1. Read story requirements and ACs from KB
2. Review dependency story (CDBE-3010) completion
3. Design materialized view structure (columns, CTEs, joins)
4. Implement migration DDL:
   - workflow.roadmap materialized view
   - Unique index on (plan_id, story_order)
   - Refresh function with pg_trigger_depth guard
   - Trigger on plans and stories tables
   - GRANT statements
   - COMMENT ON documentation
5. Write pgTAP tests covering:
   - View DDL correctness
   - Column existence and types
   - Count accuracy
   - Next story selection
   - Estimated completion calculation
   - Index uniqueness
   - Trigger idempotency (multiple refreshes)
6. Verify: pnpm test, migration dry-run, coverage
7. Code review checklist
8. QA verification

## Branch Information

- **Worktree:** /Users/michaelmenard/Development/monorepo/tree/story/CDBE-3020
- **Feature Branch:** TBD (set by implementation agent)

## Notes

- Migration slot: ~1080 (verify at implementation time)
- AC count: 14 (comprehensive coverage)
- Test strategy: pgTAP only (no TypeScript test changes)
- Elaboration status: CONDITIONAL_PASS indicates all clarifications resolved and ready to implement
- Depends on CDBE-3010 (dependency work complete per context)

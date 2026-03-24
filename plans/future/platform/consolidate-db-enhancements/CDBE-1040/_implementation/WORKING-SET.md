# CDBE-1040 Working Set

**Story ID:** CDBE-1040  
**Phase:** implementation  
**Branch:** TBD  
**Worktree:** /Users/michaelmenard/Development/monorepo/tree/story/CDBE-1040  

## Scope

**Domain:** Database migrations - audit trail implementation  
**Epic:** CDBE (Consolidate Database Enhancements)  

### What Changes

1. **New Table: workflow.story_mutation_audit_log**
   - Records column-level changes to workflow.stories and workflow.plans
   - Tracks table_name, row_id, column_name, old_value, new_value, changed_at, changed_by
   - Sensitive columns masked as '[REDACTED]'

2. **AFTER UPDATE Trigger: tr_stories_audit**
   - Fires on UPDATE to workflow.stories
   - Logs each changed column with before/after values
   - Applies column masking for sensitive fields

3. **AFTER UPDATE Trigger: tr_plans_audit**
   - Fires on UPDATE to workflow.plans
   - Logs each changed column with before/after values
   - Applies column masking for sensitive fields

### Files to Create

- `/apps/api/knowledge-base/src/db/migrations/1040_audit_trigger.sql`
  - Migration script with table DDL and trigger definitions
  - Must be idempotent (use CREATE TABLE IF NOT EXISTS, etc.)

- `/apps/api/knowledge-base/src/db/migrations/pgtap/1040_audit_trigger_test.sql`
  - pgTAP test suite to verify audit behavior
  - Test cases for both tables, multiple column updates, sensitive column masking

## Constraints

1. Use Zod schemas for all runtime types
2. No barrel files - import directly from source
3. Use @repo/logger, not console
4. Minimum 45% test coverage (applied to TypeScript code if any)
5. Named exports preferred
6. SQL migrations must be idempotent
7. Audit table schema must match workflow.story_mutation_audit_log (not telemetry.workflow_audit_log)
8. Sensitive columns (api_key, secret, token, password) should be masked as '[REDACTED]'
9. Depends on CDBE-1010 (state enforcement triggers) - already completed

## Next Steps

1. **Implement Migration**
   - Create workflow.story_mutation_audit_log table
   - Create tr_stories_audit trigger
   - Create tr_plans_audit trigger

2. **Write Tests**
   - pgTAP tests for table creation
   - pgTAP tests for trigger behavior on UPDATE
   - Test sensitive column masking
   - Test multiple column updates

3. **Verify**
   - Run migration in test environment
   - Verify triggers fire correctly
   - Verify test suite passes
   - Check for errors in linting/formatting

## References

- Story: plans/future/platform/consolidate-db-enhancements/CDBE-1040/CDBE-1040.md
- Dependency: CDBE-1010 (completed)
- Related migrations: apps/api/knowledge-base/src/db/migrations/


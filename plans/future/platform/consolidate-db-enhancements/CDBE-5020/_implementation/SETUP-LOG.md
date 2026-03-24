# CDBE-5020 Setup Log

**Date**: 2026-03-19
**Agent**: dev-setup-leader (haiku)
**Mode**: implement
**Gen Mode**: false

## Preconditions

| Check | Status | Details |
|-------|--------|---------|
| Story exists in KB | ✓ | CDBE-5020 found |
| Story state valid | ✓ | state: in_progress |
| No prior checkpoint | ✓ | First-time setup |
| Blocking dependencies | ⚠ | CDBE-5010 is blocker (backlog state) |

**Note on CDBE-5010**: Story CDBE-5010 (Partition agent_invocations and token_usage) is a direct blocker and currently in `backlog` state. The story seed confirms that CDBE-5020 implementation can proceed (elaboration unblocked), but code implementation is blocked until CDBE-5010 is merged. Partition management job scope will cover all three tables together.

## Artifacts Written

### 1. Checkpoint (phase: setup, iteration 0)
- **File**: `_implementation/CHECKPOINT.yaml`
- **Schema**: 1
- **Current Phase**: setup
- **Last Successful Phase**: null
- **Iteration**: 0
- **Max Iterations**: 3
- **Blocked**: false
- **Gen Mode**: false

### 2. Scope (phase: setup, iteration 0)
- **File**: `_implementation/SCOPE.yaml`
- **Touches**: backend, packages, db
- **Touched Paths**: 
  - `packages/backend/db/**`
  - `packages/backend/orchestrator/src/cron/**`
- **Risk Flags**: migrations, security, performance
- **Summary**: Convert telemetry.workflow_events to monthly range-partitioned table and implement automated partition management via cron job

### 3. Working Set
- **File**: `_implementation/WORKING-SET.md`
- **Scope**: Full story scope, constraints, dependencies, and next steps
- **Constraints**: 12 items (5 from CLAUDE.md + 7 from story domain)

## Constraints Established

From CLAUDE.md:
1. Use Zod schemas for all types
2. No barrel files
3. Use @repo/logger, not console
4. Minimum 45% test coverage
5. Named exports preferred

From Story Domain (STORY-SEED.md):
6. Partition migration must use raw SQL (Drizzle ORM limitation)
7. Migration must include database safety preamble
8. Partition management job must follow pattern-miner.job.ts pattern
9. Must use advisory lock to prevent concurrent runs
10. CREATE TABLE IF NOT EXISTS for idempotent partition creation
11. Support DISABLE_CRON_JOB_PARTITION_MANAGER env var
12. Migration scope: only pre-create future partitions (no archival)

## Key Implementation Notes

**Database Targets**:
- Main lego_dev database (managed by `@repo/db` Drizzle schema)
- Migration should check `current_database() = 'lego_dev'` in preamble
- Do NOT use KB migration directory (that's for knowledgebase DB only)

**Technical Constraints**:
- Full table rewrite required (PostgreSQL doesn't support ALTER TABLE ... ADD PARTITION BY)
- Drizzle schema cannot express partitioned tables — DDL must be raw SQL
- No pnpm db:generate (known failure with sets.js)
- Foreign keys to partitioned tables must be validated before migration

**Cron Job Pattern**:
- Model: `packages/backend/orchestrator/src/cron/jobs/pattern-miner.job.ts`
- Use advisory lock via `packages/backend/orchestrator/src/cron/advisory-lock.ts`
- Support env-var job disabling: `DISABLE_CRON_JOB_PARTITION_MANAGER`
- Partition creation must be idempotent (CREATE TABLE IF NOT EXISTS)

**Scope Focus**:
- Pre-create next month's partitions only
- Archival of old partitions deferred (no retention policy confirmed)
- Partition management job to cover all three telemetry tables (agent_invocations, token_usage, workflow_events) after CDBE-5010 merge

## Next Phase

**Phase**: plan (will be executed by dev-plan-leader)
- Deep dive into CDBE-5010 merge status
- Finalize partition schedule and monthsAhead config
- Design migration strategy (rename → create partitioned parent → migrate data → drop old)
- Design cron job structure and error handling

**Ready for**: Code implementation after CDBE-5010 is merged

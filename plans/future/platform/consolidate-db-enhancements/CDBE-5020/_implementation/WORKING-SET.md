# CDBE-5020 Working Set

## Story
- **ID**: CDBE-5020
- **Title**: Partition telemetry.workflow_events Table and Partition Management Job
- **Feature**: consolidate-db-enhancements
- **Status**: in_progress
- **Phase**: setup (iteration 0)
- **Branch**: TBD
- **Worktree**: main

## Scope Summary
Convert the unpartitioned `telemetry.workflow_events` table to a monthly range-partitioned table on the `ts` column, and implement an automated partition management cron job that pre-creates future monthly partitions.

## Touches
- **Backend**: Yes (cron job in orchestrator)
- **Frontend**: No
- **Database**: Yes (migration, partitioning)
- **Packages**: Yes (db schema, orchestrator)
- **Infrastructure**: No

## Touched Files/Paths
- `packages/backend/db/src/schema.ts` — telemetry.workflow_events table definition
- `packages/backend/db/src/telemetry-sdk/` — insert SDK (must remain compatible)
- `packages/backend/db/migrations/` — new partition migration SQL
- `packages/backend/orchestrator/src/cron/` — partition management cron job
- `packages/backend/orchestrator/src/cron/jobs/partition-manager.job.ts` — new cron job definition

## Risk Flags
- **migrations**: true (full table rewrite required, potentially long-running operation)
- **security**: true (database schema change, FK constraints must be validated)
- **performance**: true (partitioning is for query optimization, must be correct)

## Constraints (from project defaults + domain)
1. **Use Zod schemas for all types** — Source: CLAUDE.md
2. **No barrel files** — Source: CLAUDE.md
3. **Use @repo/logger, not console** — Source: CLAUDE.md
4. **Minimum 45% test coverage** — Source: CLAUDE.md
5. **Named exports preferred** — Source: CLAUDE.md
6. **Partition migration must use raw SQL** — Source: STORY-SEED.md (Drizzle ORM does not support partitioning)
7. **Migration must include database safety preamble** — Source: KB migration patterns
8. **Partition management job must follow pattern-miner.job.ts pattern** — Source: STORY-SEED.md
9. **Must use advisory lock to prevent concurrent runs** — Source: STORY-SEED.md
10. **CREATE TABLE IF NOT EXISTS for idempotent partition creation** — Source: STORY-SEED.md
11. **Support DISABLE_CRON_JOB_PARTITION_MANAGER env var** — Source: STORY-SEED.md
12. **Migration scope: only pre-create future partitions (no archival)** — Source: STORY-SEED.md

## Blocking Dependencies
- **CDBE-5010** must be merged first before beginning implementation
  - CDBE-5010 partitions telemetry.agent_invocations and telemetry.token_usage
  - Both stories should be deployed in the same maintenance window
  - Partition management job in CDBE-5020 is expected to cover all three partitioned tables

## Next Steps
1. Read story requirements and elaboration
2. Implement partition migration for telemetry.workflow_events
3. Implement partition management cron job in orchestrator
4. Write comprehensive tests for both migration and cron job
5. Run verification and quality gates
6. Prepare for code review


---
generated: "2026-03-19"
baseline_used: null
baseline_date: null
lessons_loaded: true
adrs_loaded: false
conflicts_found: 4
blocking_conflicts: 1
---

# Story Seed: CDBE-5020

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No baseline file exists (`plans/baselines/` directory absent). Codebase scan performed directly for ground truth. CDBE-5010 (direct dependency) is in `backlog` state in KB and has no merged migrations yet.

### Relevant Existing Features

| Feature | Status | Relevance |
|---------|--------|-----------|
| `telemetry.workflow_events` table | Deployed | The target table for this story. Defined in `packages/backend/db/src/schema.ts` lines 551–579 using `telemetrySchema.table('workflow_events', ...)`. Columns: `event_id` (UUID PK), `event_type` (enum), `event_version` (int), `ts` (timestamptz, NOT NULL DEFAULT NOW()), `run_id`, `item_id`, `workflow_name`, `agent_role`, `status`, `payload` (jsonb), `correlation_id`, `source`, `emitted_by`. The `ts` column is the natural partition key. |
| `insertWorkflowEvent()` function | Deployed | In `packages/backend/db/src/telemetry-sdk/init.ts` (or adjacent file). Performs batch inserts into `telemetry.workflow_events`. Any insert code must remain compatible with the partitioned parent table — Drizzle insert syntax does not change, but the underlying routing to child partitions is transparent. |
| Telemetry SDK (`@repo/db/telemetry-sdk`) | Deployed | Wraps all writes to `telemetry.workflow_events`. Batched inserts via `batch-insert.ts`, flush timer via `utils/flush-timer.ts`, buffer via `utils/buffer.ts`. Partition migration must not break this SDK. |
| Cron scheduler infrastructure (APIP-3090) | Deployed | `packages/backend/orchestrator/src/cron/` — full cron job registry with `CronJobDefinitionSchema`, advisory lock pattern, `InMemoryCronAdapter`, `buildCronRegistry()`, `registerCronJobs()`. This is the primary reuse target for the partition management job. |
| Advisory lock pattern | Deployed | `packages/backend/orchestrator/src/cron/advisory-lock.ts` — `tryAcquireAdvisoryLock(lockKey)` using `pg_try_advisory_lock($1)`. Used by `pattern-miner.job.ts` to prevent concurrent runs. Partition management job must use the same pattern. |
| `patternMinerJob` cron job definition | Deployed | `packages/backend/orchestrator/src/cron/jobs/pattern-miner.job.ts` — canonical example of a `CronJobDefinition` with advisory lock, lazy import, structured logging. Partition management job must follow this pattern exactly. |
| KB migration infrastructure | Deployed | `apps/api/knowledge-base/src/db/migrations/` — highest numbered migration is `1080_plan_story_links_sort_order.sql`. All migrations include a DB safety preamble. Partition migration for `telemetry.workflow_events` belongs in the `@repo/db` package (main lego_dev database), NOT the knowledgebase DB migrations directory. |
| agent_invocations in `workflow.` schema | Deployed | `999_add_telemetry_tables.sql` shows `workflow.agent_invocations` and related telemetry tables. Note: this is distinct from `telemetry.workflow_events` (which is in the `telemetry` schema in the main lego_dev DB via `@repo/db`). CDBE-5010 targets `telemetry.agent_invocations` and `telemetry.token_usage`; CDBE-5020 targets `telemetry.workflow_events`. |
| CDBE-5010 (dependency) | backlog | Partitions `telemetry.agent_invocations` and `telemetry.token_usage`. CDBE-5020 depends on CDBE-5010 completing first so that all telemetry table partitioning is done in a single maintenance window and the partition management job can cover all three tables. |
| `DISABLE_CRON_JOB_*` env var filtering | Deployed | `packages/backend/orchestrator/src/cron/registry.ts` `buildCronRegistry()` — supports env-var-based job disabling. New partition management job must support `DISABLE_CRON_JOB_PARTITION_MANAGER=true`. |

### Active In-Progress Work

| Story | State | Risk of Overlap |
|-------|-------|-----------------|
| CDBE-5010 — Partition agent_invocations and token_usage | backlog | Direct blocker. CDBE-5020 depends on CDBE-5010 completing. The partition management job in CDBE-5020 is expected to cover all three partitioned tables (agent_invocations, token_usage, AND workflow_events). Cannot implement CDBE-5020 until CDBE-5010 is merged. |

### Constraints to Respect

- **Two separate database targets**: `telemetry.workflow_events` is in the main `lego_dev` database (managed by `@repo/db` Drizzle schema), NOT in the `knowledgebase` DB. The KB migration preamble checking `current_database() = 'knowledgebase'` does NOT apply here. A separate migration preamble checking `current_database() = 'lego_dev'` is needed.
- **No `pnpm db:generate`**: Known failure (`sets.js` module resolution error, WINT-0040). All migrations must be authored as raw SQL.
- **Drizzle schema cannot express partitioned tables**: Drizzle ORM does not natively support PostgreSQL table partitioning (PARTITION BY RANGE). The partitioned table DDL must be in raw SQL migration only. The Drizzle `workflowEvents` table definition in `schema.ts` references the parent table — insert/select queries remain unchanged.
- **Full table rewrite required**: PostgreSQL does not support `ALTER TABLE ... ADD PARTITION BY`. Converting an existing table to a partitioned table requires: rename existing → create new partitioned parent → migrate data → drop old. This is a locking, potentially long-running operation.
- **pg_cron on Aurora**: Aurora PostgreSQL does support pg_cron (via `cron` extension), but it must be pre-enabled on the cluster. If not enabled, the fallback is the Node.js cron job in the orchestrator. Both approaches should be documented; the implementation choice must be confirmed at elaboration time.
- **Partition management must be idempotent**: The job pre-creates the next month's partition. It must use `CREATE TABLE IF NOT EXISTS ... PARTITION OF ...` to be safe when run multiple times.
- **Data retention policy for old partitions is unspecified**: Detaching and archiving old partitions requires a business decision on retention period. CDBE-5020 scope should default to pre-creating future partitions only; archival is a non-goal unless a policy is explicitly confirmed.
- **Foreign keys to `telemetry.workflow_events`**: PostgreSQL does NOT support foreign keys that reference partitioned tables (the constraint can only reference the parent, but PostgreSQL 12+ does support FK to partitioned table parents). Check for any existing FKs pointing to `telemetry.workflow_events` before migration.
- **Do NOT use `wint.*` or `kbar.*` schemas** — these schemas are deprecated.

---

## Retrieved Context

### Related Endpoints

No new HTTP API endpoints. This story is purely:
1. A SQL migration to convert `telemetry.workflow_events` to a partitioned table, and
2. A cron job in `packages/backend/orchestrator/src/cron/jobs/` to pre-create future partitions.

No APIGW/Lambda surface area.

### Related Components

| Component | Path | Relevance |
|-----------|------|-----------|
| `workflowEvents` Drizzle table | `packages/backend/db/src/schema.ts` lines 551–579 | The Drizzle schema definition of the target table. After migration, parent table structure remains the same — no schema.ts changes required. |
| `insertWorkflowEvent()` | `packages/backend/db/src/telemetry-sdk/init.ts` | Primary write path to `telemetry.workflow_events`. Must continue to work identically after partition migration (Drizzle/pg driver handles transparent routing to child partitions). |
| `patternMinerJob` | `packages/backend/orchestrator/src/cron/jobs/pattern-miner.job.ts` | Canonical pattern for a cron job definition with advisory lock and structured logging. The partition management job must copy this structure. |
| `tryAcquireAdvisoryLock()` | `packages/backend/orchestrator/src/cron/advisory-lock.ts` | Advisory lock implementation. The partition management job uses this to prevent concurrent partition pre-creation. |
| `CronJobDefinitionSchema` | `packages/backend/orchestrator/src/cron/schemas.ts` | Zod schema for cron job definitions. New job must produce a valid `CronJobDefinition`. |
| `buildCronRegistry()` | `packages/backend/orchestrator/src/cron/registry.ts` | Job registration with env-var-based filtering. New job must be registered here. |
| Telemetry SDK batch insert | `packages/backend/db/src/telemetry-sdk/batch-insert.ts` | Write path for high-volume telemetry events. Must be verified to continue working post-partition. |
| `constants.ts` (cron lock keys) | `packages/backend/orchestrator/src/cron/constants.ts` | `LOCK_KEYS` object with integer advisory lock constants. A new `LOCK_KEYS.PARTITION_MANAGER` entry is required. |

### Reuse Candidates

- **`patternMinerJob` pattern** — the partition management job is a cron job definition. Copy the structure: advisory lock acquire, lazy import of implementation function, structured logging, advisory lock auto-release.
- **`LOCK_KEYS` constant** — add `PARTITION_MANAGER` with a new unique integer constant to `packages/backend/orchestrator/src/cron/constants.ts`.
- **`CronJobDefinitionSchema`** — all new cron job definitions must conform to this schema.
- **`InMemoryCronAdapter`** — use in tests for the new job definition (same pattern as cron tests).
- **`@repo/logger`** — all log calls in the partition management job must use `logger.info/warn/error`.

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Cron job definition with advisory lock | `packages/backend/orchestrator/src/cron/jobs/pattern-miner.job.ts` | Gold standard for partition management job structure: advisory lock, lazy import, structured logging, timeout-safe |
| Cron schemas and registry | `packages/backend/orchestrator/src/cron/schemas.ts` | Defines `CronJobDefinitionSchema` — new job must be a valid `CronJobDefinition` |
| Advisory lock pattern | `packages/backend/orchestrator/src/cron/advisory-lock.ts` | Idiomatic PostgreSQL advisory lock via `pg_try_advisory_lock()` — reuse for partition manager job to prevent concurrent runs |
| Cron job registration | `packages/backend/orchestrator/src/cron/registry.ts` | Shows how to register a job and support `DISABLE_CRON_JOB_*` env var filtering |

---

## Knowledge Context

### Lessons Learned

- **[CDBE-5010 risk_notes]** Full table rewrite in PostgreSQL is potentially long-running and locking. Must have a maintenance window or use `pg_repack`. (category: blocker)
  - *Applies because*: CDBE-5020 faces the same table-rewrite risk as CDBE-5010 for `telemetry.workflow_events`. The migration strategy must address how to perform the rewrite with minimal downtime.

- **[CDBE-5010 risk_notes]** Foreign keys from other tables must be dropped and recreated on the partitioned parent. (category: architecture)
  - *Applies because*: Any FKs referencing `telemetry.workflow_events` must be identified before migration. If FK references exist, they must be dropped, the table rewrite performed, then FKs recreated on the parent.

- **[WINT-0040]** `pnpm db:generate` fails with `sets.js` module resolution error — author all migrations as raw SQL manually. (category: blocker)
  - *Applies because*: CDBE-5020's partition migration must be raw SQL, not Drizzle-generated.

- **[APIP-3090 cron]** The advisory lock pattern (`pg_try_advisory_lock`) is established and tested. Partition management jobs that run concurrently on multiple instances must use this to avoid duplicate partition creation. (category: pattern)
  - *Applies because*: If the orchestrator runs multiple instances, the partition management cron job could fire concurrently. Advisory lock prevents duplicate `CREATE TABLE ... PARTITION OF` attempts.

- **[pg_cron vs Node.js cron]** pg_cron requires Aurora cluster configuration to enable the `cron` extension. The Node.js cron infrastructure (APIP-3090) is already fully built and tested. Unless pg_cron is confirmed enabled, the Node.js cron approach is lower risk. (category: architecture)
  - *Applies because*: The story description lists "pg_cron job or Lambda" as options. The cron infrastructure in the orchestrator package is a third option that is already implemented, tested, and does not require additional Aurora configuration.

- **[CDBE-5010]** Data retention policy for old partitions is unspecified in this phase. Detaching for archival is explicitly a non-goal pending a retention policy decision. (category: scope)
  - *Applies because*: CDBE-5020 risk_notes explicitly call out this gap. The seed must flag archival as a non-goal and require a product decision before any archival logic is scoped.

### Blockers to Avoid (from past stories)

- Attempting to `ALTER TABLE telemetry.workflow_events ADD PARTITION BY RANGE(ts)` — PostgreSQL does not support this; full table rewrite is required.
- Running the table rewrite migration in production without a maintenance window or `pg_repack` planning — the rewrite holds a lock for the entire duration.
- Assuming pg_cron is enabled on Aurora — verify with `SELECT * FROM pg_extension WHERE extname = 'pg_cron'` before using it.
- Making the partition management job stateful (storing last-run state in DB) — use the advisory lock for idempotency, not state tables.
- Forgetting to register the new cron job in the registry (`packages/backend/orchestrator/src/cron/registry.ts`) — the job will never fire if not registered.
- Implementing archival/detach logic without a confirmed data retention policy — this is explicitly out of scope.
- Referencing `wint.*` or `kbar.*` schema anywhere in new code or migrations.

### Architecture Decisions (ADRs)

ADR-LOG.md was not found at `plans/stories/ADR-LOG.md`. Architectural constraints below are inferred from codebase analysis.

| Constraint | Source | Description |
|-----------|--------|-------------|
| Cron jobs use Node.js cron adapter (not pg_cron) | APIP-3090 codebase | The orchestrator has a fully built cron infrastructure. Prefer this over pg_cron unless pg_cron is confirmed available. |
| Advisory lock for concurrent cron prevention | `pattern-miner.job.ts` pattern | All cron jobs that must not run concurrently use `pg_try_advisory_lock`. Add a unique `LOCK_KEYS.PARTITION_MANAGER` constant. |
| Zod schemas for all types | CLAUDE.md | No TypeScript interfaces — use `z.infer<>` for all config and parameter types in the partition management job. |
| `@repo/logger` for all logging | CLAUDE.md | No `console.log`. All partition management logging must use `logger.info/warn/error`. |
| No barrel files | CLAUDE.md | The partition management job file must export its `CronJobDefinition` directly — no re-export index file. |

### Patterns to Follow

- Model the partition management job after `patternMinerJob`: declare `async function run<JobName>()` with advisory lock → lazy import implementation → `pool.end()` in finally.
- Register the new job in `packages/backend/orchestrator/src/cron/registry.ts` alongside existing jobs.
- Add `LOCK_KEYS.PARTITION_MANAGER` as a new unique integer in `packages/backend/orchestrator/src/cron/constants.ts`.
- Use `CREATE TABLE IF NOT EXISTS <schema>.<table>_y<YYYY>m<MM> PARTITION OF <schema>.<table> FOR VALUES FROM ('<YYYY-MM-01>') TO ('<YYYY-MM+1-01>')` — idempotent partition pre-creation.
- Include a DB safety preamble in the partition migration checking `current_database() = 'lego_dev'` (not `knowledgebase`).
- Log all partition pre-creation attempts with partition name and date range via `@repo/logger`.
- Document the table rewrite strategy in the migration file header (rename → create partitioned parent → migrate → drop old → rename indexes).

### Patterns to Avoid

- Do NOT build pg_cron-based partition management without first confirming pg_cron is enabled on Aurora.
- Do NOT use `console.log` — use `@repo/logger`.
- Do NOT use TypeScript interfaces for type definitions — use Zod schemas with `z.infer<>`.
- Do NOT create barrel files.
- Do NOT implement partition archival/detach logic without a confirmed retention policy — flag as non-goal.
- Do NOT reference `wint.*` or `kbar.*` schemas in any new code or migration.
- Do NOT apply the knowledgebase DB migration safety preamble (`current_database() = 'knowledgebase'`) to this migration — the target DB is `lego_dev`.
- Do NOT attempt to change `packages/backend/db/src/schema.ts` `workflowEvents` definition to model partitioning — Drizzle does not support it and the definition should remain as-is.

---

## Conflict Analysis

### Conflict: blocking_dependency — CDBE-5010 not merged
- **Severity**: blocking
- **Description**: CDBE-5020 depends on CDBE-5010 (`depends_on: [CDBE-5010]`). CDBE-5010 (Partition agent_invocations and token_usage) is in `backlog` state with no merged migrations. The partition management job in CDBE-5020 is expected to cover all three partitioned telemetry tables. The table rewrite migrations for `agent_invocations` and `token_usage` (CDBE-5010) should ideally be performed in the same maintenance window as `workflow_events` (CDBE-5020) to minimize operational disruption.
- **Resolution Hint**: Do not begin CDBE-5020 implementation until CDBE-5010 is confirmed merged and its partitioned tables are live. The elaboration and test planning for CDBE-5020 are fully unblocked.

### Conflict: schema_location — telemetry schema is in lego_dev, NOT knowledgebase
- **Severity**: warning
- **Description**: The `telemetry.workflow_events` table is managed by `packages/backend/db/src/schema.ts` (the `@repo/db` package), which targets the main `lego_dev` database. This is architecturally distinct from the knowledgebase DB (port 5433) that CDBE-4xxx stories target. Any migration for this story must use a `lego_dev` safety preamble, and migration deployment must target the correct database connection string. There is no existing numbered migration sequence for the `@repo/db` package (it uses Drizzle-generated migrations, not hand-numbered ones like the KB).
- **Resolution Hint**: Confirm at elaboration time whether the partition migration for `telemetry.workflow_events` belongs: (a) in a Drizzle migration for `@repo/db`, or (b) in a standalone raw SQL script deployed separately. Given that `pnpm db:generate` is known-broken (WINT-0040) and Drizzle cannot express partitioned tables, a raw SQL approach is more practical. Determine the migration deployment path for `lego_dev` before implementation.

### Conflict: pg_cron vs orchestrator cron — implementation choice unresolved
- **Severity**: warning
- **Description**: The story description lists "pg_cron job or Lambda" as the partition management mechanism, but the codebase already has a fully built Node.js cron infrastructure in `packages/backend/orchestrator/src/cron/`. Using the existing cron infrastructure avoids any Aurora pg_cron configuration requirements and is already tested. The Lambda approach would require new SAM/serverless.yml configuration. The story description does not account for the existing Node.js cron option.
- **Resolution Hint**: Strongly recommend the orchestrator cron job approach (following `patternMinerJob` pattern) as the default. Document pg_cron as the Aurora-native alternative and Lambda as the serverless alternative. Confirm the implementation choice during elaboration. If pg_cron is chosen, a subtask must verify it is enabled on the Aurora cluster before any code is written.

### Conflict: data_retention_policy_gap — archival scope is undefined
- **Severity**: warning
- **Description**: The story description mentions "optionally detach/archive old partitions" but the `risk_notes` explicitly call out that "detaching old partitions for archival requires a data retention policy decision not yet specified." Without a policy, any archival logic would be unbounded and potentially destructive.
- **Resolution Hint**: Scope the story to pre-create future partitions only. Explicitly mark archival/detach as a non-goal pending a product-level retention policy decision. Create a follow-on story placeholder if needed.

---

## Story Seed

### Title
Partition `telemetry.workflow_events` Table and Add Partition Management Cron Job

### Description

**Context**: `telemetry.workflow_events` is the primary telemetry event table, written by the `insertWorkflowEvent()` telemetry SDK and used for pipeline observability. It lives in the `telemetry` schema of the main `lego_dev` database (managed by `packages/backend/db/src/schema.ts`). The table currently has no partitioning, meaning all historical events accumulate in a single heap table. The `ts` column (timestamptz, NOT NULL) is the natural partition key for monthly range partitioning.

CDBE-5010 (direct dependency, backlog) partitions `telemetry.agent_invocations` and `telemetry.token_usage` in the same maintenance window. CDBE-5020 completes the telemetry partitioning rollout by adding `workflow_events` partitioning and, critically, implementing automated partition management so that future monthly partitions are created without manual intervention.

The orchestrator package (`packages/backend/orchestrator/src/cron/`) already has a fully built cron job infrastructure (APIP-3090) with advisory lock support, timeout wrapping, env-var-based job disabling, and structured logging. This is the preferred mechanism for the partition management job (over pg_cron or Lambda) because it requires no new infrastructure configuration.

**Problem**: Without partitioning, `telemetry.workflow_events` will grow without bound and queries that filter by time range (the primary access pattern) will perform full table scans. Without automated partition management, the partitioned table will fail to accept writes when the current month's partition expires — this is a silent data loss scenario.

**Proposed Solution**:
1. A SQL migration converts `telemetry.workflow_events` to a `PARTITION BY RANGE (ts)` table: rename existing table, create partitioned parent with same schema, migrate data into initial month partition(s), create next-month partition, drop old table.
2. A new cron job `partition-manager.job.ts` is added to `packages/backend/orchestrator/src/cron/jobs/`, following the `patternMinerJob` pattern: uses advisory lock, runs on a monthly schedule (e.g., 1st of each month at 00:05 UTC), calls a pure function that executes `CREATE TABLE IF NOT EXISTS ... PARTITION OF telemetry.workflow_events FOR VALUES FROM (...) TO (...)` for the upcoming month.
3. The partition management cron job is registered in the cron registry and respects the `DISABLE_CRON_JOB_PARTITION_MANAGER=true` env var.
4. Archival/detach of old partitions is explicitly out of scope pending a retention policy decision.

### Initial Acceptance Criteria

- [ ] **AC-1**: A SQL migration exists that converts `telemetry.workflow_events` to a monthly range-partitioned table on `ts`. The migration: (a) includes a DB safety preamble checking `current_database() = 'lego_dev'` (or equivalent guard), (b) creates the partitioned parent with the identical column set as the current table, (c) migrates all existing rows into the appropriate initial partition(s), (d) creates partitions for the current month and at least the next two months, (e) re-creates any indexes from the original table on the partitioned parent, (f) is idempotent (safe to re-run).

- [ ] **AC-2**: The `insertWorkflowEvent()` function and telemetry SDK batch insert path continue to work correctly after the partition migration — inserts route transparently to the correct child partition without any application code changes.

- [ ] **AC-3**: A new cron job file `packages/backend/orchestrator/src/cron/jobs/partition-manager.job.ts` exports a `CronJobDefinition` (`partitionManagerJob`) that: (a) runs on a monthly schedule (e.g., `0 5 1 * *` — 5 minutes past midnight on the 1st of each month), (b) acquires an advisory lock using `tryAcquireAdvisoryLock(LOCK_KEYS.PARTITION_MANAGER)` before proceeding, (c) calls a lazy-imported `runPartitionManager()` implementation function, (d) releases the advisory lock (via pool.end()) in a finally block.

- [ ] **AC-4**: `LOCK_KEYS.PARTITION_MANAGER` is added as a unique integer constant to `packages/backend/orchestrator/src/cron/constants.ts`. The value must not conflict with existing lock keys.

- [ ] **AC-5**: A `runPartitionManager()` function (in a separate file, e.g., `partition-manager.ts`) accepts a database client parameter and: (a) determines the upcoming month's partition name (e.g., `workflow_events_y2026m04`), (b) executes `CREATE TABLE IF NOT EXISTS telemetry.<partition_name> PARTITION OF telemetry.workflow_events FOR VALUES FROM ('<month_start>') TO ('<month_end>')`, (c) logs success or skip (if already exists) via `@repo/logger`, (d) optionally pre-creates the month after that (two months ahead) for safety.

- [ ] **AC-6**: The partition management function handles errors gracefully: if the partition already exists, the `IF NOT EXISTS` guard prevents an error and the function logs a skip. Database errors are logged and do not crash the orchestrator.

- [ ] **AC-7**: The `partitionManagerJob` is registered in `packages/backend/orchestrator/src/cron/registry.ts` alongside existing cron jobs, and respects `DISABLE_CRON_JOB_PARTITION_MANAGER=true` env var filtering via the existing `buildCronRegistry()` mechanism.

- [ ] **AC-8**: All Zod schemas for the partition management job are defined using `z.object(...)` and `z.infer<>` — no TypeScript interfaces. At minimum: a config schema for partition window size (months ahead to pre-create, defaulting to 2).

- [ ] **AC-9**: Unit tests cover: (a) the cron job definition validates against `CronJobDefinitionSchema`, (b) advisory lock skip path (mock db returns false → job does not call `runPartitionManager`), (c) `runPartitionManager` generates correct partition names and date ranges for month boundary cases (e.g., December → January year rollover), (d) idempotency: `IF NOT EXISTS` guard means no error when run twice. Tests use `InMemoryCronAdapter` for the job definition tests and a mock DB client for the implementation function tests.

- [ ] **AC-10**: `pnpm check-types --filter @repo/orchestrator` exits 0 after all changes. No `interface` usage — all types via `z.infer<>`.

- [ ] **AC-11**: Startup log from the cron infrastructure records `partition-manager` as a registered job with its schedule, consistent with existing job registration logging.

- [ ] **AC-12**: The migration includes a rollback comment block documenting the inverse steps to restore the un-partitioned table structure if the migration must be reversed.

### Non-Goals

- Do NOT implement pg_cron as the partition management mechanism (unless pg_cron is confirmed enabled on Aurora during elaboration — document as a deferred alternative).
- Do NOT implement partition archival or detachment — this requires a confirmed data retention policy that has not been defined. Scope strictly to pre-creation.
- Do NOT modify `packages/backend/db/src/schema.ts` `workflowEvents` Drizzle table definition to model partitioning — Drizzle does not support it and the definition must remain unchanged.
- Do NOT implement partition management for `agent_invocations` or `token_usage` in this story — those are CDBE-5010's responsibility. The partition management job may optionally extend to cover all three tables (if CDBE-5010 is merged first), but the minimum scope is `workflow_events` only.
- Do NOT create new API endpoints or UI surfaces for triggering partition pre-creation — the cron job is the only trigger.
- Do NOT reference `wint.*` or `kbar.*` schemas in any new code or migration.
- Do NOT apply the knowledgebase DB migration preamble (`current_database() = 'knowledgebase'`) to this migration.

### Reuse Plan

- **Components**: `patternMinerJob` (structural template for `partitionManagerJob`), `tryAcquireAdvisoryLock()` from `advisory-lock.ts`, `InMemoryCronAdapter` for tests
- **Patterns**: Advisory lock → lazy import → finally pool.end() lifecycle; `buildCronRegistry()` registration with env var filtering; `CronJobDefinitionSchema` validation
- **Packages**: `packages/backend/orchestrator` (cron jobs), `@repo/logger` (all logging), `zod` (schemas), `pg` (DB client for advisory lock and partition DDL execution)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- The partition migration is the primary test target. Key test scenarios: (a) partitioned parent table exists with correct column set, (b) existing rows are accessible via the parent table after migration, (c) new inserts via `insertWorkflowEvent()` route to the correct child partition, (d) inserting a row with `ts` outside any partition boundary fails with a clear error (not silent data loss), (e) idempotency: running the migration twice produces no error.
- For the cron job: unit tests only (no real DB). Integration test: trigger the job via `InMemoryCronAdapter`, verify `runPartitionManager` is called, verify it executes the correct SQL against a test DB schema.
- Month boundary edge case is critical: test that December-to-January rollover produces correct partition name (`workflow_events_y2027m01`) and correct date range (`'2027-01-01'` to `'2027-02-01'`).
- Advisory lock skip path: mock `pg_try_advisory_lock` to return false — verify `runPartitionManager` is never called. This is the same pattern tested in `cron.test.ts` for `patternMinerJob`.
- No Playwright E2E tests — no UI surface area.
- Partition migration must be tested against the `lego_dev` DB (not knowledgebase). Confirm the test environment has the correct DB connection.

### For UI/UX Advisor

Not applicable. This is a pure backend story: a SQL migration and a cron job. No user-facing surface area exists.

### For Dev Feasibility

- **Critical pre-work**: Confirm whether the partition migration belongs in a `@repo/db` Drizzle migration (aligned with how the existing `lego_dev` schema is managed) or as a standalone raw SQL script. The distinction matters for deployment automation. Given `pnpm db:generate` is broken and Drizzle cannot express partitioning, a raw SQL script is the practical choice — but deployment must be documented.
- **Table rewrite strategy**: The idiomatic PostgreSQL approach for converting an existing table to partitioned is:
  1. `ALTER TABLE telemetry.workflow_events RENAME TO workflow_events_old`
  2. Create new `telemetry.workflow_events` as `PARTITION BY RANGE (ts)`
  3. Create initial child partitions
  4. `INSERT INTO telemetry.workflow_events SELECT * FROM telemetry.workflow_events_old`
  5. Drop `workflow_events_old` after verification
  6. Recreate indexes on parent
  This approach is simpler than `pg_repack` for a table that is append-only during a maintenance window.
- **Partition naming convention**: Use `workflow_events_y<YYYY>m<MM>` (e.g., `workflow_events_y2026m03`) for predictability. The partition management job generates names using this convention.
- **Subtask decomposition** (recommended minimum):
  - ST-1: SQL migration — table rewrite, initial partitions (current month + 2 ahead), index recreation, pgtap verification of structure (~12K tokens). Blocked until CDBE-5010 is merged (coordinate maintenance window).
  - ST-2: `runPartitionManager()` implementation function — date arithmetic, `CREATE TABLE IF NOT EXISTS ... PARTITION OF`, error handling, unit tests for month boundary cases (~8K tokens).
  - ST-3: `partitionManagerJob` cron job definition + registration in registry + advisory lock integration + cron unit tests (~6K tokens).
- **Aurora pg_cron verification**: Before any implementation begins, run `SELECT * FROM pg_extension WHERE extname = 'pg_cron'` against the Aurora instance to confirm availability. If enabled, document it as an alternative architecture but still prefer the Node.js cron approach for consistency.
- **Canonical references for implementation**:
  - `packages/backend/orchestrator/src/cron/jobs/pattern-miner.job.ts` — job structure
  - `packages/backend/orchestrator/src/cron/advisory-lock.ts` — lock pattern
  - `packages/backend/orchestrator/src/cron/registry.ts` — job registration
  - `packages/backend/orchestrator/src/cron/constants.ts` — lock key addition
  - `packages/backend/orchestrator/src/cron/__tests__/cron.test.ts` — test patterns for advisory lock skip + timeout + registry filtering

---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 3
blocking_conflicts: 0
---

# Story Seed: APIP-3020

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No `wint.model_affinity` table exists anywhere in the codebase (neither in `wint.ts` nor in any SQL migration). No Pattern Miner cron job exists. The ML Pipeline section in `wint.ts` covers training data, models, predictions, and metrics for a different ML workflow (quality prediction, WINT-0050) — it does not contain model affinity profile aggregation for the autonomous pipeline. APIP-3010 (the upstream dependency providing `wint.change_telemetry`) is also in backlog with no implementation yet. LangGraph cron job infrastructure does not yet exist (APIP-3090 is also backlog and itself depends on APIP-3020).

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| `wint` pgSchema namespace | `packages/backend/database-schema/src/schema/wint.ts` | All new APIP tables must use `wintSchema = pgSchema('wint')` — established pattern from existing WINT stories |
| `telemetry` pgSchema + `workflowEvents` table | `packages/backend/database-schema/src/schema/telemetry.ts` | Reference pattern: append-only table with indexed query columns; shows correct Drizzle ORM + Zod-first schema structure |
| Existing ML Pipeline tables (`trainingData`, `mlModels`, `modelPredictions`, `modelMetrics`) | `packages/backend/database-schema/src/schema/wint.ts` (lines 899+) | These tables track quality prediction ML models — they are NOT the same as model affinity profiles, but demonstrate the schema patterns to follow for ML-adjacent tables in the `wint` namespace |
| Drizzle ORM schema patterns | `packages/backend/database-schema/src/schema/` | `createInsertSchema`, `createSelectSchema` from `drizzle-zod`; `pgEnum`, `pgSchema`, `index`, `uniqueIndex`, `numeric`, `integer`, `text`, `timestamp`, `uuid` column types |
| SQL migration pattern | `apps/api/knowledge-base/src/db/migrations/015_artifact_type_tables.sql` | `BEGIN`/`COMMIT` transaction, sequential `CREATE TABLE` with `CREATE INDEX`, safe migration structure |
| Metrics collection LangGraph graph | `packages/backend/orchestrator/src/graphs/metrics.ts` | Only existing scheduled/aggregation LangGraph graph — shows `StateGraph`, `Annotation`, `createToolNode` patterns for a cron-style worker graph |
| `@repo/logger` | Used throughout orchestrator | Required for all log output; no `console.log` |
| APIP ADR-001 Decision 2 | `plans/future/platform/autonomous-pipeline/_epic-elab/ADR-001-architecture-decisions.md` | LangGraph reserved for worker graphs where checkpointing provides value; cron jobs are valid LangGraph use case (APIP-3090 confirms this pattern) |

### Active In-Progress Work

| Story | Status | Area | Potential Impact |
|-------|--------|------|-----------------|
| APIP-3010 | backlog | `wint.change_telemetry` table + implementation graph instrumentation | Hard upstream dependency — `wint.model_affinity` aggregation SQL joins against `change_telemetry`; the Schema for `change_telemetry` columns (`change_type`, `file_type`, `model`, `outcome`, `attempts`, `tokens`, `cost`, `duration`) must be confirmed from APIP-3010 before writing the Pattern Miner aggregation SQL |
| APIP-0030 | in-progress | LangGraph Platform Docker Deployment | Pattern Miner cron job runs on the LangGraph platform; APIP-3090 (cron infrastructure) depends on APIP-0030; APIP-3020 introduces the first cron job but APIP-3090 formalizes the scheduling infrastructure |
| APIP-3090 | backlog | Cron Job Infrastructure | APIP-3090 depends on APIP-3020 — the Pattern Miner is the first cron job; APIP-3020 must define the cron job in a way that APIP-3090 can generalize into a scheduling framework without rework |
| APIP-5007 | in-progress | Database Schema Versioning and Migration Strategy | Any new Aurora PostgreSQL migration for `wint.model_affinity` must follow the migration naming and versioning strategy being established by APIP-5007 |

### Constraints to Respect

- **`wint` schema namespace**: All new tables MUST live in `wintSchema = pgSchema('wint')` — not `public` schema. Consistent with all existing WINT pipeline tables.
- **Drizzle ORM + drizzle-zod**: New table definition goes in `packages/backend/database-schema/src/schema/` following the existing Drizzle ORM pattern. Zod schemas auto-generated via `createInsertSchema` / `createSelectSchema` from `drizzle-zod`.
- **Zod-first types (REQUIRED)**: No TypeScript interfaces. All types are `z.infer<typeof SomeZodSchema>`.
- **APIP ADR-001 Decision 4**: All pipeline components run on dedicated local server — no Lambda. Pattern Miner cron runs as a LangGraph graph scheduled via LangGraph Platform cron syntax (not AWS EventBridge).
- **Do NOT touch protected schemas**: `packages/backend/database-schema/` changes are additive only. Existing tables (`wint.trainingData`, `wint.mlModels`, etc.) must not be modified. `@repo/db` client API surface must not change.
- **APIP-3010 schema dependency**: Do not assume specific column names for `change_telemetry` without verifying against APIP-3010's story.yaml feature description (`change_type`, `file_type`, `model`, `outcome`, `attempts`, `escalated_to`, `tokens`, `cost`, `duration` per APIP-3010).
- **Cold-start defaults required (risk_notes)**: Day-1 cold start — no profiles exist. Downstream consumers (APIP-3040, APIP-3050) must have a default/fallback path. APIP-3020 must define what "no profile" means structurally (e.g., `sample_size = 0`, `confidence_level = 'none'`).
- **Aggregation SQL performance**: `change_telemetry` will grow large at scale. Aggregation query must use indexes. Pattern Miner should aggregate incrementally (e.g., since last run timestamp) rather than full-table scan every run.
- **No direct Aurora writes from LangGraph graph during implementation loop**: Pattern Miner is a cron job — it runs out-of-band and writes aggregate results. It does NOT block the change loop (which is APIP-3010's constraint).

---

## Retrieved Context

### Related Endpoints

None — APIP-3020 produces a database table and a cron job. No HTTP endpoints.

### Related Components

None — no UI components. Pattern Miner is a headless background job.

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|--------------|
| `wintSchema` pgSchema definition | `packages/backend/database-schema/src/schema/wint.ts` line 43 | Import `wintSchema` to define `model_affinity` table in the same namespace; do not redefine `pgSchema('wint')` |
| `createInsertSchema` / `createSelectSchema` | `drizzle-zod` (used in `wint.ts` and `telemetry.ts`) | Generate Zod insert/select schemas for `modelAffinity` table automatically |
| `numeric` column type | `packages/backend/database-schema/src/schema/wint.ts` | Use `numeric('success_rate', { precision: 5, scale: 4 })` for rate fields (0.0000–1.0000); consistent with existing `estimatedCostUsd` pattern in the same file |
| Metrics collection graph structure | `packages/backend/orchestrator/src/graphs/metrics.ts` | `StateGraph` + `Annotation` + node composition pattern for the Pattern Miner LangGraph cron graph |
| `createToolNode` | `packages/backend/orchestrator/src/runner/node-factory.ts` | Used in metrics.ts for composing LangGraph nodes with error handling; reuse for Pattern Miner nodes |
| `updateState` helper | `packages/backend/orchestrator/src/runner/state-helpers.ts` | Used in metrics.ts to propagate node results through graph state |
| `@repo/logger` | Throughout orchestrator | All Pattern Miner log output |
| SQL migration structure | `apps/api/knowledge-base/src/db/migrations/015_artifact_type_tables.sql` | `BEGIN`/`COMMIT` transaction wrapping all DDL; sequential `CREATE TABLE` + `CREATE INDEX` |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Drizzle ORM table in `wint` schema with numeric/index columns | `/Users/michaelmenard/Development/monorepo/packages/backend/database-schema/src/schema/telemetry.ts` | Clean example of `pgSchema` table with typed columns, multiple indexes, and drizzle-zod Zod schema generation — mirrors exactly what `wint.model_affinity` needs |
| LangGraph aggregation/cron graph | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/graphs/metrics.ts` | Only existing LangGraph graph that performs periodic aggregation; shows `StateGraph`, `Annotation`, node composition, and config schema patterns for a cron-style graph |
| SQL migration with multiple tables and indexes | `/Users/michaelmenard/Development/monorepo/apps/api/knowledge-base/src/db/migrations/015_artifact_type_tables.sql` | Correct `BEGIN`/`COMMIT` migration structure, `CREATE TABLE` + `CREATE INDEX` pattern, safe to run against Aurora PostgreSQL |
| Zod-first artifact schema | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/artifacts/story.ts` | Canonical Zod-first type pattern for any new schema types (e.g., `AffinityProfileSchema`, `PatternMinerConfigSchema`) — no TypeScript interfaces |

---

## Knowledge Context

### Lessons Learned

Knowledge base search was unavailable during seed generation. The following lessons are inferred from APIP ADR-001, the architecture review, and patterns observed from existing APIP story seeds (APIP-0020, APIP-0030):

- **[APIP-0020 seed pattern]** Structure implementation in discrete, testable layers rather than one monolithic module. For APIP-3020: (1) Drizzle schema + migration — standalone and testable; (2) aggregation SQL logic — unit-testable with fixtures; (3) LangGraph cron graph wiring — integration-testable with a real database. (*category: pattern*)
  - *Applies because*: The Pattern Miner has three distinct concerns. Separating them allows each layer to be verified independently before APIP-3090 wires up scheduling.

- **[APIP epic architecture review]** Aggregation queries over append-only tables at scale must be incremental, not full-table. (*category: performance*)
  - *Applies because*: `change_telemetry` is append-only and will grow unboundedly. The Pattern Miner must track a `last_aggregated_at` watermark or similar mechanism to avoid full-table scans on every cron run.

- **[APIP-3010 risk note pattern]** Telemetry writes must not block the change loop. By extension, Pattern Miner reads of telemetry must also be non-blocking to the live pipeline. (*category: constraint*)
  - *Applies because*: The cron job runs out-of-band but shares the Aurora instance. Aggregation queries should avoid full-table locks; use `SELECT` with appropriate index hints and avoid `LOCK TABLE`.

### Blockers to Avoid (from past stories)

- **Assuming `change_telemetry` schema before APIP-3010 is done**: The Pattern Miner's aggregation SQL is `GROUP BY (model, change_type, file_type)`. The exact column names and types come from APIP-3010. Writing migration SQL before confirming the upstream schema risks a breaking mismatch. Verify APIP-3010 story.yaml feature field for canonical column names before writing the `model_affinity` aggregation query.
- **Full-table aggregation on every run**: Without an incremental watermark or materialized view approach, the Pattern Miner will scan the entire `change_telemetry` table every cron execution. This becomes a performance blocker as the table grows. Design the aggregation to be incremental from day one.
- **Missing cold-start defaults structure**: If `model_affinity` has no rows on day 1, downstream consumers (APIP-3040 model router, APIP-3050 structurer) will need fallback logic. The table schema must express "no data yet" unambiguously — use `sample_size = 0` and `confidence_level = 'none'` or equivalent. Document the fallback contract as part of this story's deliverables.
- **Defining confidence thresholds as magic numbers**: The `85% success rate threshold` referenced in APIP-3040 and `low confidence (sample_size < 20)` in the same story will be meaningless if `confidence_level` is not a structured enum stored in the table. Define `confidence_level` as an enum column (`'none' | 'low' | 'medium' | 'high'`) with documented thresholds, not a raw float that consumers re-interpret.
- **Cron job structure incompatible with APIP-3090**: APIP-3090 (Cron Job Infrastructure) depends on APIP-3020 and must be able to generalize the Pattern Miner cron into a scheduling framework. If the Pattern Miner is implemented as a one-off script rather than a proper LangGraph cron graph, APIP-3090 will require rework. Follow the LangGraph cron graph pattern from `metrics.ts` to ensure APIP-3090 can reuse the structure.
- **Placing the cron graph in the wrong package**: The Pattern Miner cron graph should live in `packages/backend/orchestrator/src/graphs/` (alongside the existing `metrics.ts`) — not in a new location that APIP-3090 cannot discover. Confirm location during dev feasibility.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| APIP ADR-001 Decision 1 | BullMQ + Redis for Queue | Pattern Miner is not a queue job — it is a scheduled cron. It does not use BullMQ. It reads from Aurora (`change_telemetry`) and writes to Aurora (`model_affinity`) directly. |
| APIP ADR-001 Decision 2 | Plain TypeScript Supervisor | Supervisor is for dispatch — Pattern Miner is a cron worker graph, NOT the supervisor. LangGraph is appropriate here per APIP-3090 pattern. |
| APIP ADR-001 Decision 4 | Local Dedicated Server | Pattern Miner cron runs on the dedicated local server via LangGraph Platform cron scheduling, not AWS Lambda or EventBridge. |
| ADR-002 | Infrastructure-as-Code Strategy | Aurora migration for `wint.model_affinity` is a standalone SQL migration — not a CloudFormation stack. The migration file naming must follow the pattern being established in APIP-5007. |
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Integration tests for the Pattern Miner must run against a real test database with real `change_telemetry` fixture rows — no in-memory database fakes for aggregation SQL testing. |

### Patterns to Follow

- Drizzle ORM table definition inside `wintSchema.table(...)` with all columns explicitly typed using drizzle column types
- `createInsertSchema` / `createSelectSchema` from `drizzle-zod` for auto-generated Zod schemas
- `numeric` type for rate fields (e.g., `success_rate`, `avg_tokens`, `avg_cost`) with explicit `precision` and `scale`
- `pgEnum` for `confidence_level` to enforce structured values downstream
- `StateGraph` + `Annotation` + node composition for the LangGraph cron graph (see `metrics.ts`)
- Incremental aggregation using a watermark (last processed `telemetry.created_at`) rather than full-table scan
- `@repo/logger` for all logging with structured fields (`model`, `change_type`, `file_type`, `rows_aggregated`, `durationMs`)
- `BEGIN`/`COMMIT` transaction in SQL migration file
- `z.infer<typeof Schema>` for all TypeScript types — no interfaces

### Patterns to Avoid

- Defining `model_affinity` outside the `wint` pgSchema namespace (do not use `public` schema)
- TypeScript interfaces for table types — use Zod schemas with `z.infer<>`
- Full-table aggregation without a watermark or incremental strategy
- Magic number confidence thresholds — encode as `pgEnum` in the table schema
- Implementing Pattern Miner as a standalone script instead of a LangGraph cron graph (breaks APIP-3090 generalization)
- Importing `@repo/db` main-app database connection for the cron graph — the pipeline uses its own Aurora connection
- Placing migration file outside the established migration directory (confirm with APIP-5007 naming convention)
- `console.log` — use `@repo/logger` only

---

## Conflict Analysis

### Conflict: Hard dependency on APIP-3010 schema (change_telemetry not yet built)
- **Severity**: warning
- **Description**: The Pattern Miner's core aggregation SQL is `SELECT model, change_type, file_type, COUNT(*), AVG(attempts), SUM(CASE WHEN outcome = 'success' THEN 1 END) / COUNT(*) FROM wint.change_telemetry GROUP BY (model, change_type, file_type)`. This SQL requires `wint.change_telemetry` to exist with the correct column names. APIP-3010 is in backlog — no implementation exists. The APIP-3010 story.yaml feature field specifies: `change_type, file_type, model, outcome, attempts, escalated_to, tokens, cost, duration` — use these as the authoritative column reference until APIP-3010 is implemented.
- **Resolution Hint**: Write the `model_affinity` schema and aggregation SQL against the APIP-3010 feature spec column list. Add a migration pre-check comment noting that `wint.change_telemetry` must exist before this migration runs. Structure APIP-3020 implementation so the aggregation query is defined as a constant/function that can be updated if APIP-3010 column names differ slightly in implementation.

### Conflict: APIP-3090 cron infrastructure depends on APIP-3020 but does not yet exist
- **Severity**: warning
- **Description**: APIP-3020 introduces the first LangGraph cron job (Pattern Miner), but APIP-3090 (the general cron infrastructure story) depends on APIP-3020. If the Pattern Miner is not structured as a proper LangGraph cron graph, APIP-3090 will need to refactor it. The risk is that APIP-3020 defines a one-off execution path incompatible with APIP-3090's scheduling generalization.
- **Resolution Hint**: Follow the `metrics.ts` LangGraph graph pattern (StateGraph + exported run function). Place the graph in `packages/backend/orchestrator/src/graphs/pattern-miner.ts`. APIP-3090 will register it as a cron task without needing to modify the graph itself. Document the expected cron entry point signature in this story.

### Conflict: Knowledge base unavailable for lesson retrieval
- **Severity**: warning
- **Description**: The KB search service returned errors during seed generation (`INTERNAL_ERROR`). Lessons from past stories could not be retrieved. The Knowledge Context section is based on inferences from codebase patterns and ADR documents rather than explicit KB entries.
- **Resolution Hint**: Before elaboration begins, retry KB search for queries: "database migration schema aggregation", "LangGraph cron job", "model affinity telemetry learning system". Supplement this seed with any relevant entries found.

---

## Story Seed

### Title

Model Affinity Profiles Table and Pattern Miner Cron

### Description

The autonomous pipeline's learning system requires a continuously maintained record of each LLM model's empirical strengths and weaknesses per change type and file type. After APIP-3010 instruments the implementation loop to record raw change attempt telemetry into `wint.change_telemetry`, APIP-3020 is responsible for two things:

1. **`wint.model_affinity` Aurora PostgreSQL table**: A new Drizzle ORM schema definition in the `wint` namespace that stores aggregated per-`(model, change_type, file_type)` success rates, average attempt counts, average token usage, confidence levels, and trend data. This table is the source of truth for smart routing (APIP-3040), affinity-guided structuring (APIP-3050), and the bake-off engine (APIP-3060).

2. **Pattern Miner LangGraph cron graph**: A LangGraph graph (following the `metrics.ts` pattern) that runs on a schedule and aggregates `change_telemetry` rows into updated `model_affinity` profiles. The aggregation is incremental (watermark-based), computes confidence levels as a structured enum, and handles the cold-start day-1 state (no profiles yet) by producing rows with `sample_size = 0` and `confidence_level = 'none'`.

No existing `wint.model_affinity` table or Pattern Miner implementation exists in the codebase. The existing wint.ts ML Pipeline tables (`trainingData`, `mlModels`) serve a different purpose (quality prediction, WINT-0050) and must not be conflated with this story's deliverables.

The critical upstream dependency is APIP-3010. The Pattern Miner's aggregation SQL is written against the `change_telemetry` schema specified in APIP-3010's feature description. Both stories are in backlog — APIP-3020 must be sequenced after APIP-3010 completes.

### Initial Acceptance Criteria

- [ ] AC-1: A new `model_affinity` table is defined in `packages/backend/database-schema/src/schema/` using Drizzle ORM within `wintSchema = pgSchema('wint')`; it contains at minimum: `id` (UUID PK), `model` (text), `change_type` (text), `file_type` (text), `sample_size` (integer), `success_rate` (numeric, precision 5 scale 4), `avg_attempts` (numeric), `avg_tokens` (numeric), `avg_cost_usd` (numeric), `confidence_level` (pgEnum: `'none' | 'low' | 'medium' | 'high'`), `trend` (text or jsonb), `last_aggregated_at` (timestamp), `created_at` (timestamp), `updated_at` (timestamp)
- [ ] AC-2: A unique index exists on `(model, change_type, file_type)` — no duplicate profile rows per combination; additional indexes on `confidence_level` and `last_aggregated_at` for query performance
- [ ] AC-3: Drizzle-Zod auto-generated `ModelAffinityInsertSchema` and `ModelAffinitySelectSchema` are exported from the schema file; all types are `z.infer<typeof ...>` — no TypeScript interfaces
- [ ] AC-4: A SQL migration file exists in the established migration directory (per APIP-5007 naming convention) that creates `wint.model_affinity` with all columns and indexes inside a `BEGIN`/`COMMIT` transaction; migration runs cleanly on a fresh `wint` schema and is idempotent via `CREATE TABLE IF NOT EXISTS`
- [ ] AC-5: A `PatternMiner` LangGraph cron graph exists in `packages/backend/orchestrator/src/graphs/pattern-miner.ts`; it exports a `createPatternMinerGraph()` factory function and a `runPatternMiner(config)` entry point following the `metrics.ts` pattern
- [ ] AC-6: The Pattern Miner aggregation logic reads from `wint.change_telemetry` using a watermark (last `created_at` processed) to perform incremental aggregation rather than a full-table scan; the watermark is persisted between runs (either in `model_affinity.last_aggregated_at` or a separate state row)
- [ ] AC-7: The Pattern Miner upserts aggregated results into `wint.model_affinity` using `INSERT ... ON CONFLICT (model, change_type, file_type) DO UPDATE SET ...`; each upsert recalculates `success_rate`, `avg_attempts`, `avg_tokens`, `avg_cost_usd`, `confidence_level`, `last_aggregated_at`, `updated_at`
- [ ] AC-8: Confidence level assignment follows documented thresholds: `sample_size = 0` → `'none'`; `1–19` → `'low'`; `20–49` → `'medium'`; `50+` → `'high'`; thresholds are defined as named constants (not magic numbers) in the Pattern Miner module
- [ ] AC-9: Trend detection is implemented: each run computes whether `success_rate` increased, decreased, or was stable compared to the previous run for each `(model, change_type, file_type)` combination; stored in `trend` column as structured data (e.g., `{ direction: 'up' | 'down' | 'stable', delta: number }`)
- [ ] AC-10: Cold-start behavior is verified: when `change_telemetry` has zero rows, Pattern Miner runs successfully (no error), produces no `model_affinity` rows, and logs `rows_aggregated: 0` with `@repo/logger`
- [ ] AC-11: Unit tests cover: (a) confidence level assignment for all four threshold bands, (b) upsert SQL produces correct aggregated values given a set of fixture telemetry rows, (c) watermark advancement after a run, (d) cold-start (empty telemetry table) produces no error and no upsert
- [ ] AC-12: Integration test runs against a real test database (not in-memory): inserts fixture rows into `wint.change_telemetry`, runs Pattern Miner, and verifies that `wint.model_affinity` contains the expected aggregated profile with correct `success_rate` and `confidence_level`
- [ ] AC-13: All existing schema tests in `packages/backend/database-schema/src/schema/__tests__/` continue to pass; Pattern Miner does not modify any existing table definitions

### Non-Goals

- Implementing the change telemetry writer or instrumenting the implementation loop — that is APIP-3010
- Implementing model routing that reads from `model_affinity` — that is APIP-3040
- Implementing affinity-guided diff planning or story structuring — APIP-3030 and APIP-3050
- Implementing the bake-off engine for model experiments — APIP-3060
- Implementing the cold-start exploration budget mechanism — APIP-3070 (this story only defines the cold-start data state; the routing fallback logic is APIP-3070)
- Implementing the general cron job scheduling infrastructure — APIP-3090 (this story delivers the first cron graph; the scheduling registration framework is APIP-3090)
- Adding operator UI or dashboard visibility for affinity profiles — APIP-2020 / future
- Modifying any existing WINT ML pipeline tables (`trainingData`, `mlModels`, `modelPredictions`, `modelMetrics`) — those are for quality prediction (WINT-0050), not model affinity routing
- Modifying `@repo/db` client API surface — protected
- Adding any HTTP endpoints — this story has no API surface

### Reuse Plan

- **Components**: None (no UI)
- **Patterns**: `wintSchema.table(...)` Drizzle ORM pattern; `createInsertSchema`/`createSelectSchema` from drizzle-zod; `StateGraph` + `Annotation` + `createToolNode` LangGraph graph pattern (from `metrics.ts`); incremental watermark aggregation; `INSERT ... ON CONFLICT DO UPDATE` for upsert; `@repo/logger` structured logging
- **Packages**: `packages/backend/database-schema` (add `model_affinity` table); `packages/backend/orchestrator` (add `pattern-miner.ts` graph alongside `metrics.ts`); `drizzle-zod` for Zod schema generation; `@repo/logger` for all logging

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- **No UI impact**: ADR-006 E2E Playwright requirement does not apply. Skip Playwright entirely.
- **Two test tiers required**:
  - *Unit tests* (Vitest): Mock the database layer. Test confidence level assignment for all four bands with boundary values (0, 1, 19, 20, 49, 50). Test aggregation SQL logic with in-memory fixture data (construct SQL query parameters, verify result shape). Test watermark advancement. Test cold-start path. These run in CI without a real database.
  - *Integration tests* (Vitest + real test database): Require a test Aurora/PostgreSQL instance with `wint.change_telemetry` pre-populated with fixture rows. Run Pattern Miner and assert `wint.model_affinity` contains expected aggregated rows. Verify upsert behavior (run twice with same data → same result). Verify incremental behavior (add new rows → only new rows aggregated). Mark with `@integration` tag or separate Vitest config.
- **Migration test**: Verify migration file runs cleanly on a blank `wint` schema (idempotency check: run migration twice, second run must not error). This is testable without any telemetry data.
- **Schema test**: Add test to `packages/backend/database-schema/src/schema/__tests__/` verifying `ModelAffinityInsertSchema` and `ModelAffinitySelectSchema` have the expected shape (following the pattern in `wint-schema.test.ts`).
- **Regression guard**: AC-13 — run the full existing schema test suite as part of this story's CI gate.
- **Do not mock the database in integration tests**: Per ADR-005, integration tests for aggregation SQL must use a real PostgreSQL instance. An in-memory SQLite database will not correctly validate `wint` schema isolation or `ON CONFLICT` PostgreSQL syntax.

### For UI/UX Advisor

- No UI impact. Pattern Miner is invisible to end users.
- The only operator-visible output is structured log lines from `@repo/logger`. Field names (`model`, `change_type`, `file_type`, `rows_aggregated`, `confidence_level`, `durationMs`) should be consistent and human-readable for the minimal operator CLI (APIP-5005) to surface later.

### For Dev Feasibility

- **Schema column alignment with APIP-3010**: Before writing any SQL, confirm the exact column names for `wint.change_telemetry` against APIP-3010's story.yaml feature field. The authoritative list is: `change_type`, `file_type`, `model`, `outcome`, `attempts`, `escalated_to`, `tokens`, `cost`, `duration`. If APIP-3010 is not yet implemented, use these names as a contract and note the dependency explicitly.
- **Aggregation SQL structure**: The core upsert query is:
  ```sql
  INSERT INTO wint.model_affinity (model, change_type, file_type, sample_size, success_rate, avg_attempts, avg_tokens, avg_cost_usd, last_aggregated_at, updated_at)
  SELECT
    model,
    change_type,
    file_type,
    COUNT(*) AS sample_size,
    SUM(CASE WHEN outcome = 'success' THEN 1.0 ELSE 0.0 END) / COUNT(*) AS success_rate,
    AVG(attempts) AS avg_attempts,
    AVG(tokens) AS avg_tokens,
    AVG(cost) AS avg_cost_usd,
    NOW() AS last_aggregated_at,
    NOW() AS updated_at
  FROM wint.change_telemetry
  WHERE created_at > $1  -- watermark
  GROUP BY model, change_type, file_type
  ON CONFLICT (model, change_type, file_type) DO UPDATE SET
    sample_size = model_affinity.sample_size + EXCLUDED.sample_size,
    success_rate = (model_affinity.success_rate * model_affinity.sample_size + EXCLUDED.success_rate * EXCLUDED.sample_size)
                  / (model_affinity.sample_size + EXCLUDED.sample_size),
    -- ... etc
  ```
  Note: Weighted average for `success_rate` on upsert requires care — simple `EXCLUDED.success_rate` would discard historical data. Use the weighted average formula shown above.
- **File location**: Place `pattern-miner.ts` in `packages/backend/orchestrator/src/graphs/` alongside `metrics.ts` and `elaboration.ts`. Place `model_affinity` Drizzle schema in `packages/backend/database-schema/src/schema/` following the `telemetry.ts` file structure.
- **Migration file naming**: Confirm with APIP-5007 the correct naming convention for the next migration file. The current KB migrations use `015_artifact_type_tables.sql` format. Follow whatever convention APIP-5007 establishes for Aurora WINT schema migrations.
- **Trend detection implementation**: Store trend as `jsonb` column with shape `{ direction: 'up' | 'down' | 'stable', delta: number, computed_at: string }`. The Pattern Miner reads the current `success_rate` before upsert and computes delta against the new value.
- **Confidence level as pgEnum**: Define `confidenceLevelEnum = wintSchema.enum('confidence_level', ['none', 'low', 'medium', 'high'])` before the table definition. This ensures PostgreSQL enforces valid values and Drizzle generates the correct Zod enum type.
- **Canonical references for subtask decomposition**:
  - Drizzle `wint` schema table pattern: `packages/backend/database-schema/src/schema/telemetry.ts`
  - LangGraph cron/aggregation graph pattern: `packages/backend/orchestrator/src/graphs/metrics.ts`
  - SQL migration structure: `apps/api/knowledge-base/src/db/migrations/015_artifact_type_tables.sql`
  - Zod-first schema pattern: `packages/backend/orchestrator/src/artifacts/story.ts`
- **Risk: APIP-3010 not complete**: If `wint.change_telemetry` does not exist when APIP-3020 implementation begins, the Pattern Miner integration tests cannot run. Structure APIP-3020 so the Drizzle schema, migration file, and Pattern Miner unit tests (mocked DB) can be completed independently, with integration tests blocked behind APIP-3010 completion. Do not block the schema and cron graph code from merging — gate the integration test suite separately.

---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: APIP-3060

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No active in-progress stories at baseline time; platform stories index was freshly bootstrapped

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| `wint` schema namespace (pgSchema) | `packages/backend/database-schema/src/schema/wint.ts` | All new experiment tables must live in `wintSchema = pgSchema('wint')` |
| Drizzle ORM + drizzle-zod pattern | `packages/backend/database-schema/src/schema/` | Established pattern for table definitions and auto-generated Zod schemas |
| `@repo/db` connection pooling | `packages/backend/db/src/` | Protected API surface; must not modify; use as-is for DB access |
| LangGraph `StateGraph` + `Annotation` | `packages/backend/orchestrator/src/graphs/metrics.ts` | The only existing cron-style aggregation graph; bake-off engine follows this pattern |
| Orchestrator YAML artifacts (Zod-validated) | `packages/backend/orchestrator/src/artifacts/` | Pattern for Zod-first config schemas (no TypeScript interfaces) |
| KB migrations directory | `apps/api/knowledge-base/src/db/migrations/` | Current migration home; APIP-5007 is defining the authoritative migration runner location |
| `wint.model_assignments` table | In DB via APIP-0040 migration 016 | Model routing table; separate from affinity profiles — do not conflate |
| `wint.model_affinity` table | Planned by APIP-3020 (backlog) | **Critical upstream**: APIP-3060 reads from and writes winner back to `model_affinity` profiles |
| `wint.change_telemetry` table | Planned by APIP-3010 (elaboration) | Raw telemetry consumed by APIP-3020; experiment results are filtered sub-aggregations of telemetry |
| Feature flags system | `featureFlags`, `featureFlagUserOverrides`, `featureFlagSchedules` | Established experiment gating mechanism; may be reusable for per-change-type experiment gating |

### Active In-Progress Work

| Story | Status | Overlap |
|-------|--------|---------|
| APIP-3010 | elaboration | Provides `wint.change_telemetry` schema — APIP-3060 depends on telemetry columns (`model`, `change_type`, `outcome`, etc.) |
| APIP-3020 | backlog | Provides `wint.model_affinity` table and `confidenceLevelEnum` — APIP-3060 directly reads affinity profiles and must write winner back |
| APIP-1010 | in-progress | Structurer node; upstream of APIP-1030 which seeds change_telemetry |
| APIP-5004 | ready-to-work | Secrets Engine — no direct overlap but APIP-3060 may reference model API keys |
| APIP-5007 | created | Migration runner strategy — APIP-3060 migration numbering depends on APIP-5007 sequence |

### Constraints to Respect

- All new tables in `wintSchema = pgSchema('wint')` — never `public` schema
- `@repo/db` client API surface is **protected** — no modifications
- `wint.trainingData`, `wint.mlModels`, `wint.modelPredictions`, `wint.modelMetrics` are for quality prediction (WINT-0050) — do NOT modify or conflate with model experiments
- Production DB schemas in `packages/backend/database-schema/` are protected
- Zod-first types required throughout — no TypeScript interfaces
- `@repo/logger` required for all log output — no `console.log`
- No Lambda, no HTTP API surface for this story (internal cron only)
- Pattern Miner cron runs on dedicated local server via LangGraph Platform (APIP ADR-001 Decision 4) — not AWS EventBridge

---

## Retrieved Context

### Related Endpoints

None — this is a pure backend/database/cron story with no HTTP API surface.

### Related Components

| Component | Location | Relationship |
|-----------|----------|--------------|
| `createMetricsGraph()` / `runMetricsCollection()` | `packages/backend/orchestrator/src/graphs/metrics.ts` | Direct pattern for bake-off LangGraph cron graph — follows same `StateGraph` + `Annotation` + node composition structure |
| `MetricsGraphConfigSchema` | `packages/backend/orchestrator/src/graphs/metrics.ts` | Pattern for `BakeOffConfigSchema` (Zod, no interfaces) |
| `PatternMinerConfigSchema` (planned by APIP-3020) | `packages/backend/orchestrator/src/graphs/pattern-miner.ts` | Sibling cron graph; bake-off engine is a complementary cron job |
| `confidenceLevelEnum` (planned by APIP-3020) | `packages/backend/database-schema/src/schema/wint.ts` | Bake-off engine reads confidence levels to gate winner promotion |
| `createToolNode` | `packages/backend/orchestrator/src/runner/node-factory.ts` | Node factory pattern used across all graphs |
| `updateState` | `packages/backend/orchestrator/src/runner/state-helpers.ts` | State propagation helper |
| `EvidenceSchema` | `packages/backend/orchestrator/src/artifacts/evidence.ts` | Canonical Zod-first schema pattern |
| `telemetry.ts` schema | `packages/backend/database-schema/src/schema/telemetry.ts` | Reference for multi-column indexed Drizzle table with numeric columns |

### Reuse Candidates

- **`wintSchema`** from `packages/backend/database-schema/src/schema/wint.ts` — reuse existing pgSchema instance for new `model_experiments` table
- **`confidenceLevelEnum`** from APIP-3020's `wint.ts` — reuse for experiment readiness gating
- **`StateGraph` + `Annotation`** pattern from `metrics.ts` — direct reuse for `createBakeOffGraph()` factory
- **`createToolNode`** / `updateState` from orchestrator runner — standard node wrappers
- **SQL migration structure** from `apps/api/knowledge-base/src/db/migrations/015_artifact_type_tables.sql` — `BEGIN`/`COMMIT` transaction template
- **`@repo/logger`** — structured log output for experiment lifecycle events

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| LangGraph cron/aggregation graph | `packages/backend/orchestrator/src/graphs/metrics.ts` | Sole existing cron-style LangGraph graph with `StateGraph` + `Annotation` + node composition + `run*()` entry point — bake-off engine directly follows this structure |
| Drizzle ORM table in `wint` schema with numeric columns and indexes | `packages/backend/database-schema/src/schema/telemetry.ts` | Shows `pgSchema` table definition with typed columns, multiple indexes, drizzle-zod schema generation — mirrors what `wint.model_experiments` needs |
| SQL migration with `BEGIN`/`COMMIT`, `CREATE TABLE`, `CREATE INDEX` | `apps/api/knowledge-base/src/db/migrations/015_artifact_type_tables.sql` | Authoritative migration structure for Aurora PostgreSQL — `CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS` inside transaction |
| Zod-first artifact schema (no interfaces) | `packages/backend/orchestrator/src/artifacts/story.ts` | Canonical Zod-first pattern for config and result schemas — `z.object()` with `z.infer<>` type alias only |

---

## Knowledge Context

### Lessons Learned

- **[LangGraph graph tests]** Test `graph.compile()` success and routing paths rather than dynamic lens imports. Unit tests should target compiled graph routing, not full execution. (category: testing)
  - *Applies because*: Bake-off engine is a LangGraph StateGraph; tests must verify `createBakeOffGraph()` compiles and routing paths (active experiment check, significance gate, winner promotion) work correctly without executing real DB writes or LLM calls

- **[ARCH-001: wint schema database location]** The `wint` schema lives in `lego_dev` (port 5432), not the KB database (port 5433). Integration tests targeting `wint.*` tables must use `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lego_dev`. (category: architecture)
  - *Applies because*: `wint.model_experiments` and all bake-off integration tests must target port 5432

- **[Migration filename drift]** EVIDENCE.yaml references to migration filenames can drift from actual generated filenames if migration numbering shifts. During implementation, glob/search for correct migration file path before recording in evidence. (category: testing)
  - *Applies because*: Bake-off migration sequence number depends on APIP-5007 convention and all prior migrations; confirm sequence number before writing the file

- **[Drizzle self-referencing FKs]** Self-referencing foreign keys require forward refs and `relationName`. (category: architecture)
  - *Applies because*: `model_experiments` references `model_affinity` — the FK definition order matters in Drizzle ORM

- **[APIP-5007 seed-era field drift]** story.yaml `feature` and `infrastructure` fields from seed era can become stale as the elaborated story scope evolves. Update after elaboration. (category: metadata)
  - *Applies because*: APIP-3060 story.yaml will need metadata update after elaboration

### Blockers to Avoid (from past stories)

- Do not begin integration tests until `wint.change_telemetry` (APIP-3010) and `wint.model_affinity` (APIP-3020) tables exist in the test DB
- Do not conflate `wint.model_assignments` (Phase 0 static routing rules) with `wint.model_affinity` (Phase 3 learned affinity profiles) — they are separate tables with separate purposes
- Do not define pgEnum types after the table that uses them in migration SQL — `CREATE TYPE wint.experiment_status AS ENUM (...)` must precede `CREATE TABLE wint.model_experiments`
- Do not import `db` directly into the graph nodes — inject via `config.configurable` to maintain testability
- Do not run statistical significance decisions in the same LangGraph execution that is collecting telemetry — the bake-off engine is an out-of-band cron job

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-002 | Infrastructure-as-Code Strategy | CloudFormation templates survive framework migrations; no Lambda-based cron (bake-off runs on dedicated LangGraph Platform server) |
| ADR-005 | Testing Strategy | UAT must use real services; integration tests require real PostgreSQL test DB — no in-memory substitutes |
| ADR-006 | E2E Tests Required in Dev Phase | E2E not applicable here (`frontend_impacted: false`; no UI surface) — skip condition applies |

### Patterns to Follow

- Zod-first types everywhere: `z.object()` schemas with `z.infer<typeof ...>` type aliases — no TypeScript interfaces
- `wintSchema.table()` for all new DB tables — not `public` schema
- `createInsertSchema`/`createSelectSchema` from `drizzle-zod` for auto-generated Zod schemas
- `StateGraph` + `Annotation.Root()` + `createToolNode` factory + `updateState` helper for LangGraph graph structure
- `@repo/logger` structured fields for all log output
- Named constants for all threshold values (e.g. `MIN_SAMPLE_SIZE`, `SIGNIFICANCE_THRESHOLD`) — no magic numbers
- `BEGIN`/`COMMIT` transaction wrapping all migration SQL
- `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` for idempotent migrations
- Incremental/watermark-based cron logic (established by APIP-3020 Pattern Miner) — bake-off engine queries only rows within experiment windows

### Patterns to Avoid

- Do NOT use TypeScript interfaces — use Zod schemas with `z.infer<>`
- Do NOT use `console.log` — use `@repo/logger`
- Do NOT run full-table scans on `wint.change_telemetry` — use indexed queries with experiment window constraints
- Do NOT store raw code-gen output in experiment results — record outcome metrics only
- Do NOT create barrel files (index.ts re-exports)
- Do NOT import from individual `@repo/ui` component paths

---

## Conflict Analysis

### Conflict: Dependency Chain Length (warning)

- **Severity**: warning
- **Description**: APIP-3060 depends on APIP-3020, which depends on APIP-3010, which depends on APIP-1030, which depends on APIP-1020, which depends on APIP-1010. That is a 5-story deep dependency chain. None of APIP-1020, APIP-1030, APIP-3010, or APIP-3020 are complete at baseline. Schema/migration/unit test work for APIP-3060 can begin independently, but integration tests are gated behind the entire chain.
- **Resolution Hint**: Structure subtasks so that DB schema, migration, and Zod type work are completable immediately. Gate integration tests behind APIP-3010 + APIP-3020 completion. Clearly document the implementation gate in story ACs.

### Conflict: Statistical Significance Volume Risk (warning)

- **Severity**: warning
- **Description**: The story's own `risk_notes` flag that statistical significance requires sufficient sample volume. The autonomous pipeline may have low change throughput in early phases, making it difficult to reach the minimum sample size needed for significance within a reasonable experiment window.
- **Resolution Hint**: Define a minimum sample threshold (e.g. `MIN_EXPERIMENT_SAMPLE = 50` per arm) and a maximum experiment window duration (e.g. 7 days or 500 telemetry rows per arm). If the window closes without reaching significance, the experiment should expire gracefully with no winner promotion rather than promoting based on insufficient data. Document this as AC-level behavior.

---

## Story Seed

### Title

Bake-Off Engine for Model Experiments

### Description

**Context**: The autonomous pipeline's learning system (Phase 3) accumulates per-`(model, change_type, file_type)` success rate data in `wint.model_affinity` via the Pattern Miner cron job (APIP-3020). While the Pattern Miner tracks historical performance of models already in use, there is no mechanism to introduce a new model or variant and objectively determine whether it outperforms the current winner for a given change type.

**Problem**: Without a controlled experiment framework, model changes are ad-hoc — a new model is either adopted globally (high risk) or never adopted (no improvement). The system cannot determine statistically whether a proposed model variant is genuinely better, or whether observed differences are noise.

**Proposed Solution**: Implement a `wint.model_experiments` Aurora PostgreSQL table and a Bake-Off Engine LangGraph cron graph. The bake-off engine:

1. **Records experiments** in `wint.model_experiments` — each experiment splits a `(change_type, file_type)` combination across two models (control and challenger), with a defined window (sample count or duration)
2. **Assigns telemetry to experiments** — change telemetry rows written by APIP-3010 are tagged with `experiment_id` when they fall within an active experiment's assignment window
3. **Runs significance checks** — on each cron execution, the engine queries accumulated telemetry for each active experiment, computes per-arm success rates, and applies a configurable significance threshold (e.g. minimum samples per arm, minimum absolute delta)
4. **Promotes winners** — when significance is reached, the engine writes the winning model back to `wint.model_affinity` for the winning `(change_type, file_type)` combination and marks the experiment as `concluded`
5. **Expires inconclusive experiments** — experiments that close their window without reaching significance are marked `expired`; no affinity update is made

This gives the pipeline a data-driven, cost-aware mechanism to safely validate model improvements and automatically incorporate them into learned routing decisions.

### Initial Acceptance Criteria

- [ ] **AC-1**: A `wint.model_experiments` table is defined in `packages/backend/database-schema/src/schema/wint.ts` using `wintSchema.table()`; it contains at minimum: `id` (UUID PK), `change_type` (text), `file_type` (text), `control_model` (text), `challenger_model` (text), `status` (pgEnum: `'active' | 'concluded' | 'expired'`), `winner` (text, nullable — null if expired without winner), `control_sample_size` (integer), `challenger_sample_size` (integer), `control_success_rate` (numeric, precision 5 scale 4), `challenger_success_rate` (numeric, precision 5 scale 4), `min_sample_per_arm` (integer), `max_window_rows` (integer, nullable), `max_window_days` (integer, nullable), `started_at` (timestamp), `concluded_at` (timestamp, nullable), `created_at` (timestamp), `updated_at` (timestamp)

- [ ] **AC-2**: An `experiment_id` foreign key column (nullable UUID referencing `wint.model_experiments.id`) is added to `wint.change_telemetry` (via a separate additive migration) so that telemetry rows written during an active experiment are tagged for isolation; `experiment_id` is null for rows outside any experiment

- [ ] **AC-3**: `ModelExperimentInsertSchema` and `ModelExperimentSelectSchema` are exported from the schema file using drizzle-zod `createInsertSchema`/`createSelectSchema`; all types are `z.infer<typeof ...>` — no TypeScript interfaces

- [ ] **AC-4**: A SQL migration file creates `wint.model_experiments` with all columns and indexes inside a `BEGIN`/`COMMIT` transaction; includes: `CREATE TYPE wint.experiment_status AS ENUM (...)` (before the table), `CREATE TABLE IF NOT EXISTS wint.model_experiments`, `CREATE UNIQUE INDEX` on `(change_type, file_type)` WHERE `status = 'active'` (only one active experiment per combination at a time), `CREATE INDEX` on `status` and `started_at`; migration is idempotent

- [ ] **AC-5**: A separate additive SQL migration adds `experiment_id UUID REFERENCES wint.model_experiments(id)` to `wint.change_telemetry` (if the table exists); migration is safe to run on a fresh schema where `change_telemetry` may not yet exist (guarded with `ALTER TABLE IF EXISTS`)

- [ ] **AC-6**: A `BakeOffEngine` LangGraph cron graph exists in `packages/backend/orchestrator/src/graphs/bake-off-engine.ts`; it exports `createBakeOffGraph()` factory and `runBakeOff(config)` entry point following the `metrics.ts` / `pattern-miner.ts` pattern

- [ ] **AC-7**: The Bake-Off Engine queries `wint.model_experiments WHERE status = 'active'` on each run; for each active experiment it aggregates `wint.change_telemetry` rows tagged with `experiment_id` per arm (control vs challenger), computing `sample_size` and `success_rate` per arm

- [ ] **AC-8**: Significance decision uses configurable named-constant thresholds: `MIN_SAMPLE_PER_ARM` (default: 50), `MIN_ABSOLUTE_DELTA` (default: 0.05 i.e. 5 percentage points); an experiment is considered significant when both arms have `>= MIN_SAMPLE_PER_ARM` rows AND `|challenger_success_rate - control_success_rate| >= MIN_ABSOLUTE_DELTA`

- [ ] **AC-9**: When significance is reached, the engine promotes the winning model: it upserts `wint.model_affinity` for the `(change_type, file_type)` combination with the winner's observed `success_rate` as the new ground truth, marks the experiment `status = 'concluded'`, sets `winner` and `concluded_at`, and logs the promotion with structured fields: `experimentId`, `changeType`, `fileType`, `winner`, `controlSuccessRate`, `challengerSuccessRate`, `durationMs`

- [ ] **AC-10**: When an experiment's `max_window_rows` or `max_window_days` is exceeded without reaching significance, the engine marks the experiment `status = 'expired'`, sets `concluded_at`, leaves `winner = null`, and does NOT modify `wint.model_affinity`; logs with `status: 'expired'`, `reason: 'window_exceeded'`

- [ ] **AC-11**: If no active experiments exist, the Bake-Off Engine runs successfully with no DB writes and logs `{ active_experiments: 0, durationMs: <N> }`

- [ ] **AC-12**: Unit tests cover: (a) significance threshold logic — both arms at minimum, winner determination (challenger wins / control wins / tie defaults to control), (b) expiry logic — window exceeded without significance, (c) no-op behavior when no active experiments, (d) `BakeOffConfigSchema` Zod validation

- [ ] **AC-13**: Integration tests (tagged `@integration`) against a real test PostgreSQL DB: insert experiment row and fixture telemetry rows; run `runBakeOff()`; assert `model_affinity` updated to winner; assert experiment marked concluded; verify expiry path with window-exceeded fixture; verify no-op with zero active experiments

- [ ] **AC-14**: All existing schema tests in `packages/backend/database-schema/src/schema/__tests__/` continue to pass; Bake-Off Engine does not modify existing WINT ML pipeline tables (`trainingData`, `mlModels`, `modelPredictions`, `modelMetrics`)

### Non-Goals

- Implementing the A/B split assignment of incoming change loop requests to experiment arms — that is the responsibility of APIP-3040 (Learning-Aware Model Router), which will read active experiments and route accordingly
- Implementing any HTTP API or operator UI for creating or viewing experiments — that is APIP-2020 / APIP-5005
- Implementing multi-arm (N > 2) experiments — bake-off is strictly two-arm (control vs challenger) in this story
- Bayesian significance testing or complex statistical methods — simple frequentist threshold (minimum samples + minimum delta) is sufficient for Phase 3
- Implementing the cron job scheduling infrastructure — that is APIP-3090; this story delivers the graph entry point only
- Modifying `wint.model_assignments` (Phase 0 static routing rules) — protected and separate
- Modifying `@repo/db` client API surface — protected
- Implementing cold-start bootstrapping or exploration budgets — that is APIP-3070
- Adding experiment telemetry to the existing change loop directly — this story adds the `experiment_id` FK column to `change_telemetry`; APIP-3040 is responsible for populating it during routing

### Reuse Plan

- **Components**: `StateGraph`, `Annotation`, `END`, `START` from `@langchain/langgraph`; `createToolNode` from `node-factory.ts`; `updateState` from `state-helpers.ts`
- **Patterns**: `metrics.ts` graph factory pattern for `createBakeOffGraph()` and `runBakeOff()`; Pattern Miner's incremental query pattern for querying by experiment window; Drizzle ORM upsert (`INSERT ... ON CONFLICT DO UPDATE`) pattern from APIP-3020
- **Packages**: `@repo/logger` (structured log output), `@repo/db` (Aurora PostgreSQL via Drizzle), `drizzle-zod` (`createInsertSchema`/`createSelectSchema`), `packages/backend/database-schema` (schema definitions)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- **No E2E or Playwright tests** — `frontend_impacted: false`, no UI surface; skip condition from ADR-006 applies
- **Test strategy**: unit + integration (same as APIP-3020 Pattern Miner)
- **Integration test gate**: APIP-3010 (`wint.change_telemetry`) and APIP-3020 (`wint.model_affinity`) must be complete before integration tests can run; unit tests are independent
- **Critical unit test cases**: significance threshold boundary testing (exactly at MIN_SAMPLE, exactly at MIN_DELTA), winner determination when both arms are equal (tie-break must default to control), expiry by rows vs expiry by days, multiple simultaneous active experiments processed independently
- **Integration DB target**: `postgresql://postgres:postgres@localhost:5432/lego_dev` (port 5432, not 5433) per ARCH-001 lesson
- **Migration idempotency test**: run both migrations twice; verify no errors
- **Regression guard**: existing `packages/backend/database-schema/src/schema/__tests__/` must all pass after new schema additions

### For UI/UX Advisor

- No UI surface for APIP-3060 — this is a pure backend/cron story
- Future UI (APIP-2020 Monitor Dashboard) will need to display experiment status; flag the `wint.model_experiments` data shape as a future query target
- Operator-facing concerns are deferred to APIP-5005 (Minimal Operator Visibility CLI)

### For Dev Feasibility

- **Critical path risk**: APIP-3060 cannot run meaningful integration tests until APIP-3010 + APIP-3020 are both complete. Scope the story so schema/migration/unit-test subtasks are completable independently.
- **AC-2 complexity**: Adding `experiment_id` FK to `wint.change_telemetry` is an additive migration — it is safe only if `change_telemetry` already exists. The migration must use `ALTER TABLE IF EXISTS` or include a guard. Coordinate with APIP-3010 implementation to confirm the column can be added after the fact.
- **Unique partial index on active experiments**: `CREATE UNIQUE INDEX ... WHERE status = 'active'` enforces the single-experiment-per-combination constraint at the DB level. Verify Aurora PostgreSQL 15 supports partial unique indexes (it does — but confirm in test DB).
- **Significance threshold tuning**: `MIN_SAMPLE_PER_ARM = 50` and `MIN_ABSOLUTE_DELTA = 0.05` are proposed defaults. These should be defined as named constants in the graph config and overridable via `BakeOffConfigSchema`. Do not hardcode.
- **No concurrent execution guard**: Like the Pattern Miner, the Bake-Off Engine must be safe to run concurrently (idempotent winner promotion via `ON CONFLICT DO UPDATE`) but APIP-3090 should ensure single-instance scheduling to prevent race conditions on experiment status transitions.
- **Canonical references for subtask decomposition**:
  - ST-1: DB schema — `packages/backend/database-schema/src/schema/telemetry.ts` (Drizzle table pattern) + `wint.ts` (pgSchema namespace)
  - ST-2: SQL migrations — `apps/api/knowledge-base/src/db/migrations/015_artifact_type_tables.sql` (BEGIN/COMMIT template)
  - ST-3: Graph skeleton — `packages/backend/orchestrator/src/graphs/metrics.ts` (StateGraph factory pattern)
  - ST-4: Significance logic — pure TypeScript functions, testable without DB; unit tests only
  - ST-5: Winner promotion + expiry — Drizzle upsert + status update; follows Pattern Miner's ON CONFLICT pattern
  - ST-6: Unit + integration tests — follows `pattern-miner.test.ts` and `pattern-miner.integration.test.ts` (once written by APIP-3020)
- **Sizing concern**: The story as specified is medium-to-large (1 new table, 1 additive migration, 1 LangGraph graph with 4+ nodes, significance logic, promotion logic, comprehensive tests). Consider splitting ST-1/ST-2 (schema+migration) into a separate subtask group completable before APIP-3020 finishes, and ST-3 through ST-6 (graph implementation + tests) into a second group gated on APIP-3020.

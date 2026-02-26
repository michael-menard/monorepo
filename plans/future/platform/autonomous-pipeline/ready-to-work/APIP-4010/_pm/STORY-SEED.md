---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: false
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: APIP-4010

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No ADR-LOG.md found at `plans/stories/ADR-LOG.md`; ADR context derived from KB and elaborated stories only.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| `wint` PostgreSQL schema namespace | `packages/backend/database-schema/src/schema/wint.ts` | All APIP pipeline tables live in the `wint` pgSchema; `wint.codebase_health` follows this established pattern |
| Drizzle ORM v0.44.3 + drizzle-zod | `packages/backend/database-schema/src/schema/` | Table definitions must follow the wint.ts pattern: `wintSchema.table(...)` with `createInsertSchema`/`createSelectSchema` |
| `wint.change_telemetry` table (APIP-3010) | `plans/future/platform/autonomous-pipeline/ready-to-work/APIP-3010/APIP-3010.md` | Closest precedent — numeric metric columns, insert helper with fire-and-forget semantics, Zod-validated schema, SQL migration via APIP-5007 runner |
| LangGraph cron infrastructure (APIP-3090) | `plans/future/platform/autonomous-pipeline/backlog/APIP-3090/story.yaml` | The health check cron after every 5th merge is the runtime trigger; APIP-3090 provides the scheduling mechanism; APIP-4010 registers a new cron task within it |
| Merge Graph with Learnings Extraction (APIP-1070) | `plans/future/platform/autonomous-pipeline/elaboration/APIP-1070/APIP-1070.md` | Every 5th merge triggers the health snapshot; APIP-1070 is where merge-count tracking or post-merge hooks must be instrumented |
| Orchestrator YAML artifact schemas | `packages/backend/orchestrator/src/artifacts/` | Story auto-generation for CLEANUP stories must produce a valid story YAML artifact consistent with `StoryArtifactSchema`/`story-v2-compatible.ts` |
| Knowledge Base (`kb_add_*` tools) | `apps/api/knowledge-base/` | Lessons learned and findings should be written to KB; CLEANUP stories may also be KB-indexed |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| APIP-1070 — Merge Graph with Learnings Extraction | In Elaboration | High — APIP-4010 trigger fires after every 5th merge; merge-count instrumentation must be added to APIP-1070 or a post-merge hook; coordination needed to avoid scope creep in APIP-1070 |
| APIP-3090 — Cron Job Infrastructure | backlog (depends on APIP-0030 + APIP-3020) | High — APIP-4010's health check cron is a consumer of APIP-3090 infrastructure; implementation is blocked until APIP-3090 is stable |
| APIP-1010 — Structurer Node in Elaboration Graph | In Progress | Low — no direct overlap, but any TypeScript files touched may intersect with orchestrator package |
| APIP-1040 — Documentation Graph (Post-Merge) | In Progress | Low — post-merge hooks area may overlap with merge-count instrumentation |

### Constraints to Respect

- All new database tables MUST live in the `wint` pgSchema namespace (established pattern in `wint.ts`).
- Drizzle ORM is the ORM for all wint-schema tables; no raw pg queries for schema definition.
- Migration SQL must follow APIP-5007 migration runner naming convention (sequential numbering, e.g. `017_codebase_health.sql`).
- `@repo/logger` for all logging; no `console.log`.
- Zod-first types — no TypeScript interfaces; all schemas via `z.object()` or `drizzle-zod`.
- The threshold calibration problem noted in `risk_notes` is empirical; initial thresholds must be configurable (not hardcoded constants), with documented calibration guidance.
- CLEANUP story auto-generation must produce valid story YAML parseable by `StoryArtifactSchema` (backward-compatible format per existing lessons).
- Protected: do NOT modify existing wint table schemas already in production; only ADD the new `wint.codebase_health` table.

---

## Retrieved Context

### Related Endpoints
- None — this is a backend-only, no-Lambda, no-API-Gateway story. All health gate logic runs in the LangGraph/orchestrator process on the dedicated server.

### Related Components
- None — no UI components. This is a headless cron worker + DB table.

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|--------------|
| `wintSchema.table(...)` pattern | `packages/backend/database-schema/src/schema/wint.ts` | Template for `wint.codebase_health` table definition; copy the `integer`, `numeric`, `timestamp`, `varchar`, `index` import pattern |
| `createInsertSchema` / `createSelectSchema` from `drizzle-zod` | `packages/backend/database-schema/src/schema/wint.ts` | Auto-generate Zod insert/select schemas from the Drizzle table definition |
| `writeTelemetry()` fire-and-forget insert helper pattern (APIP-3010) | `plans/future/platform/autonomous-pipeline/ready-to-work/APIP-3010/APIP-3010.md` | Health snapshot insert should follow the same fire-and-forget pattern: resolves without throwing, logs warning on failure, never blocks the main pipeline flow |
| `StoryArtifactSchema` / `story-v2-compatible.ts` | `packages/backend/orchestrator/src/artifacts/story-v2-compatible.ts` | CLEANUP story auto-generation must produce YAML conforming to this schema |
| LangGraph cron task definition pattern (APIP-3090) | `plans/future/platform/autonomous-pipeline/backlog/APIP-3090/story.yaml` | Health gate cron is a new cron task definition; follow the pattern APIP-3090 establishes for registration |
| Merge-count tracking hook in APIP-1070 | `plans/future/platform/autonomous-pipeline/elaboration/APIP-1070/APIP-1070.md` | The "every 5th merge" trigger requires a merge counter; coordinate with APIP-1070 to add a `mergeCount` field to the Merge Graph state or persist it in a wint table |
| `persist-learnings` node | `packages/backend/orchestrator/src/nodes/completion/persist-learnings.ts` | Reuse the KB write-back pattern for persisting CLEANUP story creation events |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Drizzle table in wint schema with indexes and drizzle-zod | `packages/backend/database-schema/src/schema/wint.ts` | Authoritative pattern for all wint.* table definitions: `wintSchema.table(...)`, typed columns, multi-column indexes, `createInsertSchema`/`createSelectSchema` |
| Fire-and-forget DB insert helper with error swallowing | `plans/future/platform/autonomous-pipeline/ready-to-work/APIP-3010/APIP-3010.md` | `writeTelemetry()` pattern: resolves without throwing, `logger.warn` on failure, injectable `db` for testability |
| Story YAML artifact schema for auto-generated stories | `packages/backend/orchestrator/src/artifacts/story-v2-compatible.ts` | CLEANUP story generation output must parse through this schema; backward-compat Zod with optional fields |
| LangGraph graph routing test pattern | `packages/backend/orchestrator/src/graphs/__tests__/elaboration.test.ts` | How to test compiled LangGraph routing without executing real AI nodes; directly test routing functions with mock state |

---

## Knowledge Context

### Lessons Learned

- **[ARCH-001]** The `wint` schema lives in `lego_dev` (port 5432), NOT the KB database (port 5433). (category: architecture)
  - *Applies because*: `wint.codebase_health` is a wint-schema table; integration tests must target `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lego_dev`.

- **[Zod backward-compat]** Zod schemas with `.optional()` + `.passthrough()` allow adding fields to existing story YAML schemas without migration. (category: architecture)
  - *Applies because*: CLEANUP story auto-generation writes story YAML files; if the schema evolves, backward compatibility must be maintained.

- **[Graph testing pattern]** Test LangGraph graph compilation and routing by targeting `routeAfter*` functions directly with mock state, not by running real AI nodes. (category: testing)
  - *Applies because*: The health gate cron task is a LangGraph node/graph; tests should validate routing (threshold check → generate CLEANUP story vs. no-op) without real lint/type-check execution.

- **[Infrastructure story coverage]** For stories delivering only schemas, migrations, and configuration (no Lambda handlers), the 45% coverage threshold applies to the helper functions and schema parse tests only — coverage waiver may apply for pure infra portions. (category: testing)
  - *Applies because*: This story adds a DB migration + Zod schema + cron task definition; coverage must be on the helper functions (snapshot writer, threshold comparator, story generator).

- **[drizzle-kit check CI gate]** Adding `drizzle-kit check` to CI pipeline is recommended for any story adding a new DB table but not yet automated. (category: workflow)
  - *Applies because*: The `wint.codebase_health` migration should be verified with `drizzle-kit check` before merge.

- **[APIP-3020 concurrency guard]** Pattern Miner (APIP-3020) recommends `pg_try_advisory_lock` as defense-in-depth against concurrent cron runs. (category: architecture)
  - *Applies because*: The health check cron shares the same risk if APIP-3090 scheduling guarantee ever lapses; an advisory lock on the health gate cron is worth including.

### Blockers to Avoid

- Running health gate cron without coordination with APIP-3090 — the cron task registration must use APIP-3090's mechanism, not a standalone setInterval or ad-hoc cron.
- Hardcoding thresholds as constants — calibration is empirical; thresholds must be in a config object or environment-variable-backed config, not magic numbers in source.
- Generating CLEANUP stories with YAML that fails `StoryArtifactSchema.parse()` — test the generated YAML against the schema before writing to disk.
- Blocking the merge pipeline on health snapshot write failure — the snapshot write must be fire-and-forget, same as `writeTelemetry()` in APIP-3010.
- Targeting port 5433 in integration tests for `wint.codebase_health` — use port 5432 (`lego_dev`).

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 (inferred from APIP-5007/APIP-0020) | Pipeline runs on single dedicated server (Phase 0-4) | No Lambda; cron tasks run in the LangGraph server process on the dedicated server; no distributed cron |
| APIP-5007 migration convention | Sequential SQL migration naming | Migration file: `0NN_codebase_health.sql` in APIP-5007's migration runner sequence |

### Patterns to Follow

- `wintSchema.table(...)` with drizzle-zod for all new wint tables.
- `createInsertSchema` / `createSelectSchema` for Zod type generation; do not hand-write Zod schemas duplicating Drizzle column definitions.
- Fire-and-forget insert helper (injectable `db`, `try/catch` with `logger.warn`, never throws).
- LangGraph routing tested via compiled graph + mock state, not real tool execution.
- Configurable thresholds in a typed Zod config object (not magic numbers).
- CLEANUP story YAML validated against `StoryArtifactSchema` before writing.

### Patterns to Avoid

- Hand-writing TypeScript interfaces for DB row types — use `z.infer<typeof InsertCodebaseHealthSchema>`.
- Inline `console.log` — always `@repo/logger`.
- Blocking pipeline execution on health gate failures — health gate is advisory/async.
- Generating story YAML with fields not matching `StoryArtifactSchema` (will cause parse failures in orchestrator).

---

## Conflict Analysis

### Conflict: Merge-Count Tracking Scope Overlap with APIP-1070
- **Severity**: warning
- **Description**: APIP-4010 triggers the health snapshot "after every 5th merge." APIP-1070 (Merge Graph with Learnings Extraction) is currently In Elaboration and does not include merge-count instrumentation in its story scope. Adding a merge counter to the Merge Graph state or to a wint table is required for APIP-4010, but it touches the APIP-1070 deliverable area. If APIP-1070 finalizes its schema without a merge counter, APIP-4010 will need to either add a separate `wint.merge_counter` table or require a patch to APIP-1070's Merge Graph state.
- **Resolution Hint**: During APIP-4010 elaboration, coordinate with APIP-1070's elaboration to agree on where the merge count is tracked. Prefer adding an optional `mergeCount` field to the Merge Graph state artifact (MergeArtifactSchema), or a lightweight `wint.merge_runs` table. Do not block APIP-1070's implementation on this — design it so APIP-4010 can add the counter independently if needed.

### Conflict: APIP-3090 Cron Infrastructure Not Yet Available
- **Severity**: warning
- **Description**: APIP-4010 depends on APIP-3090 (Cron Job Infrastructure) for registering the health check cron. APIP-3090 is in `backlog` status and itself depends on APIP-0030 (LangGraph Docker Deployment) and APIP-3020 (Model Affinity Profiles). APIP-4010 cannot be implemented before APIP-3090 is at least in a stable draft state. The story's `depends_on` correctly lists this, but it means APIP-4010 is a Phase 4 story with a long dependency chain.
- **Resolution Hint**: Document a clear stub/interface that APIP-4010's cron task must implement, so when APIP-3090 is ready, the health gate can plug in without rework. Alternatively, the health gate DB migration and helper functions can be implemented early (decoupled from the cron registration), with the cron wiring deferred to a follow-up subtask.

---

## Story Seed

### Title
Codebase Health Gate — Snapshot, Drift Detection, and CLEANUP Story Auto-Generation

### Description

**Context**: As the autonomous pipeline merges stories continuously, there is no automated mechanism to detect gradual degradation of codebase quality metrics (lint warnings accumulating, type errors creeping in, test coverage dropping, dead exports growing). Without a health gate, the pipeline's output could silently degrade the codebase over time.

**Problem**: After every 5th merge, the pipeline needs to (a) capture a health snapshot of the current codebase state across 8 metrics, (b) compare those metrics against a stored baseline, and (c) automatically generate a prioritized CLEANUP story if any metric has drifted beyond its configured threshold. No such snapshot mechanism, baseline table, drift detector, or cleanup story generator exists today.

**Proposed Solution**: Build the Codebase Health Gate as three integrated components:

1. **`wint.codebase_health` table** — Aurora PostgreSQL table (via APIP-5007 migration runner) storing one snapshot row per health check run, with columns for each of the 8 metrics: `lint_warnings`, `type_errors`, `any_count`, `test_coverage`, `circular_deps`, `bundle_size`, `dead_exports`, `eslint_disable_count`. Each row includes `merge_number` (the triggering merge count), `captured_at` timestamp, and a `baseline_id` FK to a `wint.health_baselines` table (or a simpler `is_baseline` boolean flag on the row itself).

2. **`captureHealthSnapshot()` helper** — A TypeScript function (in `packages/backend/orchestrator/src/nodes/health/`) that shells out to the appropriate CLI tools to measure each metric, inserts a row into `wint.codebase_health`, and returns the snapshot for comparison. Follows fire-and-forget semantics relative to the merge pipeline (non-blocking on failure).

3. **`detectDriftAndGenerateCleanup()` function** — Compares the new snapshot against the most recent baseline row. For any metric exceeding its configured threshold delta, generates a CLEANUP story YAML artifact (conforming to `StoryArtifactSchema`) and writes it to the appropriate backlog directory. Returns a list of generated story IDs (or empty array if no drift detected).

4. **LangGraph cron task registration** — Registers the health gate as a cron job in APIP-3090's infrastructure, triggered after every 5th merge (via merge-count tracking coordinated with APIP-1070).

### Initial Acceptance Criteria

- [ ] AC-1: `wint.codebase_health` table exists in the database after running the APIP-5007-compatible SQL migration. Table has columns: `id` (UUID PK), `merge_number` (integer), `captured_at` (timestamp), `is_baseline` (boolean, default false), `lint_warnings` (integer), `type_errors` (integer), `any_count` (integer), `test_coverage` (numeric 5,2), `circular_deps` (integer), `bundle_size` (integer, bytes), `dead_exports` (integer), `eslint_disable_count` (integer). Indexes on `captured_at`, `merge_number`, `is_baseline`.
- [ ] AC-2: `drizzle-kit check` passes with no schema drift after the migration and Drizzle schema definition are both applied.
- [ ] AC-3: A Zod schema (`CodebaseHealthSnapshotSchema`) is exported from the orchestrator artifacts package, auto-generated from the Drizzle table definition via `drizzle-zod`. `CodebaseHealthSnapshotSchema.parse()` succeeds for a valid snapshot row.
- [ ] AC-4: `captureHealthSnapshot(config, db)` captures all 8 metrics by executing the appropriate CLI tool per metric (e.g., `pnpm check-types:all` for type errors, `pnpm lint` for lint warnings) and inserts a row into `wint.codebase_health`. Returns the inserted snapshot.
- [ ] AC-5: `captureHealthSnapshot()` is fire-and-forget with respect to the merge pipeline — on DB insert failure, it logs a warning via `@repo/logger` and resolves without throwing.
- [ ] AC-6: `HealthGateThresholdsSchema` defines configurable delta thresholds for each metric (e.g., `lint_warnings_delta: number`, `type_errors_delta: number`). Thresholds are NOT hardcoded; they are loaded from a config object with documented defaults.
- [ ] AC-7: `detectDriftAndGenerateCleanup(snapshot, baseline, thresholds)` returns a non-empty array of CLEANUP story IDs when any metric exceeds its threshold delta, and an empty array when all metrics are within tolerance.
- [ ] AC-8: Each auto-generated CLEANUP story artifact (a) has a unique `id` in the `APIP-CLEANUP-NNNN` format, (b) is written to `plans/future/platform/autonomous-pipeline/backlog/APIP-CLEANUP-NNNN/story.yaml`, and (c) passes `StoryArtifactSchema.parse()` without errors.
- [ ] AC-9: The CLEANUP story YAML includes: which metrics drifted (and by how much), the merge number that triggered the cleanup, and a human-readable description of the remediation goal.
- [ ] AC-10: The health gate cron task is registered with APIP-3090's cron infrastructure and fires after every 5th merge (merge-count tracking mechanism agreed with APIP-1070 team).
- [ ] AC-11: Unit tests cover: `captureHealthSnapshot()` happy path (all 8 metrics captured, insert called once), `captureHealthSnapshot()` error path (DB failure → warn logged, no throw), `detectDriftAndGenerateCleanup()` with all-within-threshold (empty array), `detectDriftAndGenerateCleanup()` with one-metric-over-threshold (one CLEANUP story generated), `detectDriftAndGenerateCleanup()` with multiple-metrics-over-threshold (multiple CLEANUP stories or one combined story).
- [ ] AC-12: Integration test: migration applies cleanly to the APIP-5001 test database; insert + read-back of a snapshot row confirms all columns round-trip correctly and `CodebaseHealthSnapshotSchema.parse()` succeeds.
- [ ] AC-13: `pnpm check-types` and `pnpm lint` pass with no errors or warnings introduced by this story's TypeScript files.

### Non-Goals

- Building a UI dashboard for health metrics (deferred to APIP-4070 Weekly Pipeline Health Report or APIP-2020 Monitor UI).
- Auto-remediating detected issues (CLEANUP stories are generated for human/pipeline review, not auto-executed).
- Supporting distributed/multi-process cron execution — single-server assumption per ADR-001 (Phase 4 constraint).
- Defining or implementing the CLEANUP story workflow (how the pipeline works the generated story) — that is the existing pipeline flow.
- Implementing metric collection for platforms other than the local dev server (e.g., CI-only metrics).
- Modifying any existing wint tables or production DB schemas.
- Implementing automatic baseline promotion logic (when to promote a new snapshot to baseline) beyond documenting the manual process.

### Reuse Plan

- **Tables**: Follow `wintSchema.table(...)` pattern from `packages/backend/database-schema/src/schema/wint.ts` for `wint.codebase_health`.
- **Zod schemas**: Use `createInsertSchema` / `createSelectSchema` from `drizzle-zod`; do not hand-write.
- **Insert helper pattern**: Follow `writeTelemetry()` from APIP-3010 — injectable `db`, try/catch, `logger.warn` on failure, never throws.
- **Story artifact schema**: Use `StoryArtifactSchema` from `packages/backend/orchestrator/src/artifacts/story-v2-compatible.ts` for CLEANUP story validation.
- **Cron registration**: Plug into APIP-3090's cron task registration mechanism (interface TBD by APIP-3090).
- **Testing**: Follow `elaboration.test.ts` graph routing test pattern for any LangGraph routing logic.

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- The 8-metric capture functions each shell out to a CLI tool — these must be injectable (accept a `toolRunner` or `execFn` parameter) so unit tests can mock them without running real lint/type-check.
- The "every 5th merge" trigger is the most complex coordination point — test the merge-count gate logic independently of the full cron infrastructure.
- `detectDriftAndGenerateCleanup()` is pure logic (no I/O) and should have 100% branch coverage: all-within-threshold, exactly-one-over, multiple-over, threshold-at-exact-boundary (no-drift vs drift), and null/missing baseline cases.
- Integration tests require the APIP-5001 test database with the `wint.codebase_health` migration applied. Tag these tests to avoid running in unit-only mode.
- The CLEANUP story YAML file write is an I/O side effect — mock the file system (`vi.mock('fs/promises')`) in unit tests; use a temp directory in integration tests.
- Coverage waiver may apply to the SQL migration file itself (not testable via Vitest coverage); focus coverage on `captureHealthSnapshot()`, `detectDriftAndGenerateCleanup()`, and the Zod schemas.

### For UI/UX Advisor

- No UI surfaces in this story. The only human-visible output is the generated CLEANUP story YAML in the backlog directory and the `logger.info` / `logger.warn` log lines emitted during the cron run.
- If a summary log message is emitted after each health gate run (e.g., "Health gate: 3/8 metrics within threshold; 2 CLEANUP stories generated"), ensure the format is operator-friendly and parseable by the planned APIP-4070 weekly report.

### For Dev Feasibility

- **Metric capture complexity**: The 8 metrics vary widely in capture method. `lint_warnings` and `type_errors` require parsing CLI output (stdout line counts or JSON). `test_coverage` requires parsing the Vitest coverage JSON report. `bundle_size` requires reading the build output. `circular_deps` requires running a circular dependency checker (e.g., `madge`). `dead_exports` requires running `ts-prune` or similar. Each metric capture is an independent function — decompose into 8 small subtasks.
- **Baseline management subtlety**: The story notes "baseline management logic (when to update the baseline) is subtle." Recommend: the initial implementation treats the first snapshot as the baseline and does NOT auto-promote. Baseline updates are manual (an operator marks a row as `is_baseline = true`). This avoids the silent-drift-accepted problem.
- **Merge-count tracking dependency**: This is the highest-risk coordination point. If APIP-1070 does not add merge-count tracking to its MergeArtifactSchema, APIP-4010 must implement it independently (e.g., a `wint.merge_runs` counter table). Include both options in dev feasibility.
- **File output for CLEANUP stories**: Writing YAML files to `plans/future/platform/autonomous-pipeline/backlog/` requires the orchestrator process to have write access to the plans directory. On the dedicated server, this should be satisfied, but verify during APIP-5006 server provisioning review.
- **Canonical references for subtask decomposition**:
  - DB table: `packages/backend/database-schema/src/schema/wint.ts` (table definition pattern)
  - Insert helper: APIP-3010 `writeTelemetry()` pattern (fire-and-forget, injectable db)
  - Story YAML generation: `packages/backend/orchestrator/src/artifacts/story-v2-compatible.ts` (schema to conform to)
  - LangGraph test pattern: `packages/backend/orchestrator/src/graphs/__tests__/elaboration.test.ts` (graph compilation + routing tests)

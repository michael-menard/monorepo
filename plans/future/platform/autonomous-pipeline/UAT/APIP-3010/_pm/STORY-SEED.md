---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 1
---

# Story Seed: APIP-3010

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No `wint.change_telemetry` table exists. No telemetry instrumentation exists in the change loop (which itself does not exist yet — APIP-1030 is a prerequisite). The `apip` schema namespace is being established by APIP-5007 (in-progress); the migration strategy for APIP pipeline tables will be defined there. The Aurora PostgreSQL database at port 5432 is the target store; the `wint` schema namespace is established and proven (worktrees table, stories table, workflow artifacts, capabilities feature FK — all confirmed in `packages/backend/database-schema/src/migrations/app/`).

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| `wint` schema namespace (PostgreSQL) | `packages/backend/database-schema/src/migrations/app/` | Established namespace for autonomous pipeline DB objects. All APIP pipeline tables follow the `wint.` prefix convention as shown by `wint.worktrees`, `wint.stories`, `wint.workflow_artifacts`. New `wint.change_telemetry` table must follow this convention. |
| Worktrees migration pattern | `packages/backend/database-schema/src/migrations/app/0026_wint_1130_worktree_tracking.sql` | Exemplary SQL migration: CREATE TYPE ... AS ENUM, CREATE TABLE with FK, partial unique index, regular indexes, rollback script. The `change_telemetry` migration must follow this same pattern. |
| APIP schema migration strategy | `plans/future/platform/autonomous-pipeline/in-progress/APIP-5007/` | APIP-5007 (in-progress) is establishing the migration runner and `apip.schema_migrations` versioning table. APIP-3010 migration must be registered through that mechanism. Do not create a parallel migration strategy — coordinate with APIP-5007 output. |
| EvidenceSchema (source data) | `packages/backend/orchestrator/src/artifacts/evidence.ts` | `commands_run`, `touched_files`, `token_summary` are the primary raw data that the change loop produces. The `change_telemetry` schema captures a per-ChangeSpec slice of this data for learning purposes. |
| `@repo/logger` structured logging | Used throughout `packages/backend/orchestrator` | All telemetry write events must log with structured fields. Failed writes must log a warning and allow the change loop to continue — telemetry must not block the change loop. |
| Drizzle ORM pattern | `packages/backend/database-schema/src/schema/` + `packages/backend/db/src/generated-schemas.ts` | Auto-generated Zod schemas via `drizzle-zod`. Drizzle schema definition for `change_telemetry` table should be added to `packages/backend/database-schema/src/schema/` following the established Drizzle pattern. |

### Active In-Progress Work

| Story | Area | Potential Impact |
|-------|------|-----------------|
| APIP-1030 (elaboration, HARD BLOCKER) | Implementation Graph with Atomic Change Loop | APIP-3010 instruments the change loop built in APIP-1030. The `change_loop` node, `IModelDispatch` interface, and ChangeSpec schema are the direct instrumentation targets. APIP-1030 must ship first. |
| APIP-5007 (in-progress) | Database Schema Versioning and Migration Strategy | Defines the `apip` schema namespace, migration runner, and `apip.schema_migrations` versioning table. APIP-3010's SQL migration must be registered through the runner pattern APIP-5007 establishes. Tight coordination required to avoid migration numbering conflicts or parallel tooling. |
| APIP-1020 (backlog, upstream gate) | ChangeSpec Schema Design and Validation Spike | The ChangeSpec schema fields (`change_type`, `file_type`, `touchedPackages`) are part of the telemetry record. The `change_telemetry` table schema must be consistent with the final ChangeSpec Zod schema output from APIP-1020. |
| APIP-3020 (backlog, downstream consumer) | Model Affinity Profiles Table and Pattern Miner Cron | APIP-3020 reads `wint.change_telemetry` to mine model affinity patterns. The schema designed in APIP-3010 is the contract APIP-3020 depends on — it must capture all fields the Pattern Miner needs. |

### Constraints to Respect

- **APIP-1030 is a HARD GATE**: No `change_loop` instrumentation code can be written until APIP-1030 ships. The change loop node file that APIP-3010 modifies does not exist yet.
- **APIP-5007 migration coordination**: The SQL migration for `wint.change_telemetry` must be registered through the migration runner established by APIP-5007. Do not bypass the versioning mechanism.
- **Telemetry must never block the change loop (risk_notes)**: Write failures to `wint.change_telemetry` must be caught, logged as warnings, and allow the change loop to continue. The DB write is fire-and-continue, not fire-and-wait. The telemetry writer should be wrapped in try/catch with `@repo/logger.warn` on error.
- **APIP ADR-001 Decision 4 (local dedicated server)**: Aurora PostgreSQL at the local server. No Lambda, no S3. Direct DB connection from the change loop process.
- **Protected areas**: `packages/backend/orchestrator/src/models/` must not be modified. `packages/backend/database-schema/` schema changes must go through Drizzle migrations — no ad-hoc schema edits.
- **Zod-first types (REQUIRED)**: The `ChangeTelemetrySchema` and all related types in the orchestrator must be `z.object()` schemas with `z.infer<>` type aliases. No TypeScript interfaces.
- **High write volume at scale**: At scale, every ChangeSpec attempt generates one row. The table must have a partial index on `(story_id, created_at)` for the Pattern Miner's per-story queries and a composite index on `(model, change_type, outcome)` for affinity mining. Avoid wide scans.

---

## Retrieved Context

### Related Endpoints

None — `change_telemetry` writes are internal to the change loop process. No HTTP API endpoints.

### Related Components

None — no UI components. The telemetry writer is a server-side utility called from within the LangGraph change loop node.

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|--------------|
| Drizzle ORM schema pattern | `packages/backend/database-schema/src/schema/` | Follow existing table schema definitions. Add `changeTelemetry` table schema here in a new file following the Drizzle column API pattern. |
| `drizzle-zod` auto-generation | `packages/backend/db/src/generated-schemas.ts` | Run `drizzle-kit generate` to auto-generate Zod insert/select schemas for `changeTelemetry`. Do not hand-write these schemas. |
| `@repo/db` client | `packages/backend/db/src/` — `db`, `getPool()`, `closePool()` | The existing `@repo/db` client provides the connection pool. Import `db` from `@repo/db` for Drizzle queries. |
| Worktrees migration as template | `packages/backend/database-schema/src/migrations/app/0026_wint_1130_worktree_tracking.sql` | Structural template: CREATE TYPE AS ENUM, CREATE TABLE with CHECK constraints, indexes, rollback script. Copy structure for the `change_telemetry` migration. |
| `EvidenceSchema` / `CommandRunSchema` | `packages/backend/orchestrator/src/artifacts/evidence.ts` | `CommandRunSchema` captures `command`, `result`, `duration_ms`, `output`. The telemetry record captures a similar field set per ChangeSpec attempt — avoid duplication by deriving from or referencing the same fields. |
| `@repo/logger` | Used throughout orchestrator | `logger.warn({ storyId, changeSpecId, error }, 'change_telemetry write failed')` for non-blocking failure logging pattern. |
| Change loop node (post-APIP-1030) | `packages/backend/orchestrator/src/nodes/change-loop.ts` (new in APIP-1030) | Primary instrumentation target. The telemetry write call is inserted after each ChangeSpec attempt outcome is determined (pass/fail/abort/escalate). |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Drizzle migration SQL pattern | `/Users/michaelmenard/Development/monorepo/packages/backend/database-schema/src/migrations/app/0026_wint_1130_worktree_tracking.sql` | Canonical structure for APIP pipeline SQL migrations: `wint.` schema prefix, `CREATE TYPE ... AS ENUM`, `CREATE TABLE` with FK and CHECK constraints, partial index, regular indexes, rollback script companion. The `change_telemetry` migration must follow this exact structure. |
| Zod-first artifact schema | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/artifacts/evidence.ts` | `CommandRunSchema` and `EvidenceSchema` show how to define Zod schemas for telemetry-like data with `z.enum()`, `z.number().int()`, `z.string().datetime()`. The `ChangeTelemetrySchema` must follow this same pattern. |
| Evidence helpers (fire-and-continue pattern) | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/artifacts/evidence.ts` | Shows how `addCommandRun()`, `addTouchedFile()` are pure functions that accumulate data without throwing on missing state — model the telemetry writer as a similar non-blocking utility. |
| Drizzle schema definition (wint namespace) | `/Users/michaelmenard/Development/monorepo/packages/backend/database-schema/src/migrations/app/0027_wint_0131_capabilities_feature_fk.sql` | Shows the FK relationship pattern within `wint` schema. Reference for validating FKs from `change_telemetry` back to story records if needed. |

---

## Knowledge Context

### Lessons Learned

- **[WINT-9090]** TypeScript interfaces in LangGraph node files must be converted to Zod schemas before code review. (*category: other*)
  - *Applies because*: The `ChangeTelemetrySchema` Zod schema is the typed contract between the change loop node and the telemetry writer. If it starts as a TypeScript interface, it will require a fix cycle at review. Define it as `z.object()` with `z.infer<>` from the start.

- **[WKFL-pattern]** DB-write nodes in LangGraph graphs that can fail must not propagate failures to the graph's happy path. (*category: architecture*)
  - *Applies because*: The `risk_notes` field explicitly states "telemetry must not block the change loop on write failure." This is a fire-and-continue pattern: catch all DB errors, log a warning, and let the loop advance regardless. Do not let telemetry writes affect graph routing.

- **[AUDT-0010]** Schema field coverage must be validated end-to-end from the write site to the read site before closing a telemetry story. (*category: testing*)
  - *Applies because*: APIP-3020 (Pattern Miner Cron) reads `wint.change_telemetry` — all fields needed for affinity mining (`model`, `change_type`, `file_type`, `outcome`, `attempts`, `escalated_to`, `tokens`, `cost`, `duration_ms`) must be present and populated in the rows written by APIP-3010. Schema-coverage test should verify a round-trip: write a mock telemetry row, read it back, and validate all affinity-relevant fields are non-null.

- **[WINT-9020]** High-write tables benefit from partial indexes keyed to the most common query patterns used by downstream consumers. (*category: architecture*)
  - *Applies because*: At scale, the change loop may write thousands of rows per day. APIP-3020's Pattern Miner queries by `(model, change_type, outcome)` and `(story_id, created_at)`. These index shapes must be defined at migration time — retrofitting indexes post-scale is a risky operation on Aurora.

### Blockers to Avoid (from past stories)

- **Instrumenting a node that does not exist yet**: APIP-3010 modifies `packages/backend/orchestrator/src/nodes/change-loop.ts` — a file that APIP-1030 creates. Starting APIP-3010 before APIP-1030 ships means writing code against a non-existent file. This is a hard ordering constraint; do not begin implementation until APIP-1030 is merged.
- **Schema mismatch with APIP-1020 ChangeSpec fields**: The `change_type` and `file_type` columns in `change_telemetry` must map to ChangeSpec schema fields. If the ChangeSpec ADR (APIP-1020) uses different field names, APIP-3010's schema will need retrofitting before APIP-3020 can use it. Confirm ChangeSpec schema field names with the APIP-1020 ADR before writing the migration.
- **Telemetry write blocking the change loop**: Synchronous DB writes in the hot path of the change loop would degrade pipeline throughput. The write must be either: (a) fire-and-continue (don't await, or await with timeout), or (b) non-blocking with error handling. Never propagate a telemetry DB error to a `BudgetExhaustedError` or change loop abort path.
- **Missing escalation chain field**: The `escalated_to` column (which provider the model escalated to, e.g., Ollama → OpenRouter → Claude) is critical for APIP-3020's affinity learning. Omitting it means the Pattern Miner cannot determine whether a success came from the cheap model or the expensive fallback. Include this column in the initial schema.
- **Drizzle schema and raw SQL migration out of sync**: The Drizzle schema definition in `packages/backend/database-schema/src/schema/` and the raw SQL migration must define the same columns and types. A mismatch causes Drizzle to generate incorrect queries. Keep them in sync and run `drizzle-kit check` as part of the story's CI gate.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| APIP ADR-001 Decision 4 | Local Dedicated Server | Aurora PostgreSQL at local server. DB writes from the change loop process run directly against Aurora — no Lambda intermediary. |
| APIP ADR-001 Decision 2 | Plain TypeScript Supervisor | The telemetry writer is invoked from inside the LangGraph change loop node, not from the supervisor. The supervisor is a BullMQ dispatch layer; telemetry belongs to the graph execution layer. |
| APIP-5007 Migration Strategy | APIP Schema Versioning | All SQL migrations for the APIP pipeline must be registered through the migration runner and `apip.schema_migrations` table established by APIP-5007. The `wint.change_telemetry` migration must use the APIP-5007 versioning mechanism. |

### Patterns to Follow

- Zod-first `ChangeTelemetrySchema` with `z.object()` — no TypeScript interfaces anywhere in the telemetry writer or change loop instrumentation
- Fire-and-continue telemetry write: wrap DB insert in `try/catch`; `logger.warn` on error; do not rethrow; do not affect graph routing
- Drizzle ORM: define table schema in `packages/backend/database-schema/src/schema/`, generate Zod schemas via `drizzle-zod`, import generated types via `@repo/db`
- SQL migration structure: `wint.` schema prefix, `CREATE TYPE ... AS ENUM` for `change_type`, `file_type`, `outcome`, rollback companion script, pre-migration check comments
- Partial index on `(story_id, created_at)` for Pattern Miner's per-story time-series queries
- Composite index on `(model, change_type, outcome)` for affinity mining aggregations
- Structured logging: `logger.info({ storyId, changeSpecId, model, outcome, durationMs }, 'change_telemetry written')` on success

### Patterns to Avoid

- TypeScript interfaces for telemetry schema types — use Zod schemas only
- Synchronous blocking DB writes in the change loop hot path — use fire-and-continue
- Omitting the `escalated_to` column — the Pattern Miner requires it to distinguish primary model success from escalation success
- Creating a separate migration mechanism that bypasses APIP-5007's versioning table
- Writing to `wint.change_telemetry` from the supervisor layer — the write belongs in the change loop node, not the BullMQ job processor
- Adding a FK from `change_telemetry` to `wint.stories` without confirming the stories table primary key type (UUID vs TEXT story_id) — use `story_id TEXT NOT NULL` to match the ChangeSpec schema convention

---

## Conflict Analysis

### Conflict: Hard dependency on APIP-1030 (change loop not yet built)
- **Severity**: blocking
- **Description**: APIP-3010 instruments `packages/backend/orchestrator/src/nodes/change-loop.ts`, the atomic change loop node that APIP-1030 builds. APIP-1030 is currently in elaboration (status: `elaboration`). Until APIP-1030 ships, the file to be instrumented does not exist. Writing instrumentation code against a non-existent module creates a dead branch in the codebase. The dependency chain is: APIP-1010 → APIP-1020 → APIP-1030 → APIP-3010.
- **Resolution Hint**: APIP-3010 can be fully specified (schema design, Zod types, SQL migration, telemetry writer interface) before APIP-1030 ships, but implementation of the change loop instrumentation cannot begin until APIP-1030 is merged. The SQL migration and `ChangeTelemetrySchema` Zod type can be prepared in parallel. Mark implementation as gated on APIP-1030 merge.

### Conflict: Schema field dependency on APIP-1020 ChangeSpec ADR (not yet published)
- **Severity**: warning
- **Description**: The `change_type` and `file_type` columns in `wint.change_telemetry` must be typed to match the ChangeSpec schema fields defined by APIP-1020's spike ADR. If the ChangeSpec uses different field names or a different taxonomy for change/file types, the telemetry migration will require a follow-up ALTER TABLE. APIP-1020 is in backlog.
- **Resolution Hint**: Use placeholder enum values in the `change_type` and `file_type` columns (e.g., `'unknown'` as the initial enum member) and document that the full enum is pending the APIP-1020 ChangeSpec ADR. Add a story note: "Enum values must be updated once APIP-1020 publishes its ChangeSpec schema ADR." This allows the migration to be written and reviewed without blocking on APIP-1020.

---

## Story Seed

### Title

Change Telemetry Table and Instrumentation

### Description

The autonomous pipeline's learning system (Phase 3) depends on a granular per-ChangeSpec-attempt telemetry record to mine model affinity patterns and train the routing system. Without it, the system cannot learn which model performs best for which type of file change.

This story delivers two coupled deliverables:

1. **A `wint.change_telemetry` Aurora PostgreSQL table** (via Drizzle migration) that captures every ChangeSpec attempt made by the implementation graph change loop — recording `change_type`, `file_type`, `model`, `outcome`, `attempts`, `escalated_to`, `tokens`, `cost`, and `duration_ms` per attempt.

2. **Instrumentation of the change loop node** (`packages/backend/orchestrator/src/nodes/change-loop.ts`, built by APIP-1030) to write one telemetry row after every ChangeSpec attempt outcome is determined (pass, fail, abort, or escalation). The write is fire-and-continue: a DB write failure logs a warning but never blocks or aborts the change loop.

The telemetry table is the raw data input for APIP-3020 (Model Affinity Profiles Table and Pattern Miner Cron), which reads this table to identify which model-change_type-file_type combinations produce successful outcomes most efficiently. The schema must capture all fields the Pattern Miner requires — gaps in the schema here propagate as gaps in the learning signal downstream.

**Prerequisite gates**:
- APIP-1030 must be merged (provides the `change-loop.ts` node to instrument)
- APIP-5007 must establish the migration runner (provides the `apip.schema_migrations` versioning mechanism)
- APIP-1020 ChangeSpec ADR should be reviewed to confirm `change_type` and `file_type` enum values before the migration is finalized

### Initial Acceptance Criteria

- [ ] **AC-1**: A SQL migration file `{sequence}_apip_3010_change_telemetry.sql` exists in the APIP-5007-established migration directory, creates the `wint.change_telemetry` table with the following columns: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `story_id TEXT NOT NULL`, `change_spec_id TEXT NOT NULL`, `change_type TEXT NOT NULL`, `file_type TEXT NOT NULL`, `model TEXT NOT NULL`, `outcome TEXT NOT NULL`, `attempts INTEGER NOT NULL`, `escalated_to TEXT`, `tokens_input INTEGER`, `tokens_output INTEGER`, `cost_usd NUMERIC(10,6)`, `duration_ms INTEGER NOT NULL`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`. A rollback companion script exists.

- [ ] **AC-2**: `change_type` and `file_type` columns are constrained with CHECK constraints (or ENUM types) matching the values defined in the APIP-1020 ChangeSpec ADR. A placeholder `'unknown'` value is included to handle pre-ADR or unmapped cases.

- [ ] **AC-3**: `outcome` column is constrained to `('pass', 'fail', 'abort', 'budget_exhausted')` values only. These correspond to the four terminal outcomes of a single ChangeSpec attempt in the change loop.

- [ ] **AC-4**: The migration creates the following indexes: (a) `idx_change_telemetry_story_id` on `(story_id, created_at DESC)` for per-story time-series queries; (b) `idx_change_telemetry_affinity` on `(model, change_type, outcome)` for affinity mining aggregations; (c) `idx_change_telemetry_created_at` on `(created_at)` for retention/pruning queries. All indexes use `CREATE INDEX IF NOT EXISTS`.

- [ ] **AC-5**: A `ChangeTelemetrySchema` Zod schema is defined in `packages/backend/orchestrator/src/telemetry/change-telemetry.ts` (new file) using `z.object()` with `z.infer<>` type alias. The schema matches the table columns exactly. No TypeScript interfaces are used.

- [ ] **AC-6**: A `writeTelemetry(record: ChangeTelemetry, db: Db): Promise<void>` function is exported from `packages/backend/orchestrator/src/telemetry/change-telemetry.ts`. It inserts one row into `wint.change_telemetry` using the Drizzle ORM `db.insert(changeTelemetry).values(record)` pattern. The function is wrapped in try/catch: on error it calls `logger.warn({ storyId, changeSpecId, error }, 'change_telemetry write failed')` and returns without throwing.

- [ ] **AC-7**: The `change-loop` node in `packages/backend/orchestrator/src/nodes/change-loop.ts` is instrumented to call `writeTelemetry()` after each ChangeSpec attempt is resolved (pass, fail, retry-exceeded, or budget-exhausted). The call receives the full telemetry record including `model`, `outcome`, `attempts`, `escalated_to` (if applicable), `tokens_input`, `tokens_output`, `cost_usd`, `duration_ms`. The DB instance is injected into the node via the graph config (not imported directly in the node).

- [ ] **AC-8**: A Vitest unit test verifies that a `writeTelemetry()` DB insert failure does NOT throw or cause the change loop node to abort or retry. The mock DB insert throws; the test asserts the node returns a valid result and `logger.warn` was called once.

- [ ] **AC-9**: A Vitest unit test verifies that `writeTelemetry()` constructs a valid `ChangeTelemetrySchema`-conformant record for each of the four outcome types: `pass`, `fail`, `abort`, `budget_exhausted`. Each test case covers required fields and nullable fields (`escalated_to` is null for non-escalated outcomes).

- [ ] **AC-10**: A Vitest integration test (against the APIP-5001 test database) verifies: (a) the migration applies cleanly to a fresh schema; (b) a telemetry row with all required fields can be inserted and read back; (c) a row with `outcome: 'budget_exhausted'` and `escalated_to: 'claude'` round-trips correctly.

- [ ] **AC-11**: The Drizzle schema definition for `changeTelemetry` is added to `packages/backend/database-schema/src/schema/` and `drizzle-kit check` passes without drift between the Drizzle schema and the SQL migration.

- [ ] **AC-12**: Existing orchestrator test suites (`pnpm test --filter @repo/orchestrator`) pass unchanged. The instrumentation does not modify any file in `packages/backend/orchestrator/src/models/`.

### Non-Goals

- Implementing the Pattern Miner or reading the telemetry table for affinity analysis (APIP-3020)
- Creating a retention/pruning policy for the telemetry table (can be deferred — table will grow; policy documented as follow-up)
- Exposing telemetry data via HTTP API or operator UI (APIP-2020, APIP-5005)
- Aggregating telemetry data into affinity scores (APIP-3020, APIP-3040)
- Storing full code-gen output or diff content in the telemetry record (raw code is in the git commit; telemetry captures outcome metrics only)
- Implementing the change loop itself (APIP-1030 — prerequisite)
- Implementing the ChangeSpec schema (APIP-1020 — prerequisite for enum finalization)
- Modifying `packages/backend/orchestrator/src/models/` (protected)
- Modifying `packages/backend/database-schema/` production app schema tables (only adding a new `wint.change_telemetry` table)

### Reuse Plan

- **Components**: None (no UI)
- **Patterns**: Drizzle ORM table schema definition pattern from `packages/backend/database-schema/src/schema/`; `wint.` SQL migration structure from `0026_wint_1130_worktree_tracking.sql`; Zod-first schema from `artifacts/evidence.ts` (`CommandRunSchema` field conventions); fire-and-continue error handling with `@repo/logger.warn`; DB injection pattern from APIP-1030 `IModelDispatch` interface (inject `db` via graph config, not import)
- **Packages**: `packages/backend/database-schema` (new Drizzle table schema); `packages/backend/db` (`@repo/db` client for Drizzle queries); `packages/backend/orchestrator` (new telemetry file + change-loop instrumentation); `@repo/logger`

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- **Two test tiers required**:
  - *Unit tests* (Vitest): Mock the `db` instance (Drizzle `db.insert(...).values(...)` chain). Test: (a) `writeTelemetry()` on DB error → logs warn, does not throw; (b) `writeTelemetry()` constructs valid `ChangeTelemetrySchema` records for all 4 outcome types; (c) change loop node continues normally when `writeTelemetry()` is injected with a failing mock.
  - *Integration tests* (Vitest + APIP-5001 test DB): Apply migration to test schema, insert a telemetry row for each outcome type, read back and validate all fields. Verify migration idempotency (re-run without error). Verify `drizzle-kit check` reports no drift.
- **No E2E/Playwright**: Backend-only. ADR-006 Playwright requirement does not apply.
- **Regression guard (AC-12)**: `pnpm test --filter @repo/orchestrator` must pass unchanged. The change-loop instrumentation is additive only — no existing behavior should change.
- **Schema coverage test**: The highest-value integration test is a round-trip for a row with `outcome: 'budget_exhausted'` and `escalated_to` populated — this is the field combination APIP-3020 most needs to read correctly.

### For UI/UX Advisor

- No UI impact. The telemetry table is invisible to end users and the operator UI (APIP-2020). The only operator-visible artifact is the `@repo/logger` structured log entry at telemetry write time.
- When APIP-2020 (Monitor Dashboard) is elaborated, it may want to surface per-story telemetry aggregates. The `idx_change_telemetry_story_id` index supports that query pattern. Note this for APIP-2020 elaboration context.

### For Dev Feasibility

- **Hard ordering constraint**: Do not begin change-loop instrumentation (AC-7) until APIP-1030 is merged. The SQL migration (AC-1 through AC-4) and the `ChangeTelemetrySchema` Zod type (AC-5) and `writeTelemetry()` function (AC-6) can be built before APIP-1030 ships, since they do not depend on the change loop file existing. This allows parallel progress.
- **ChangeSpec field name confirmation**: Before finalizing the enum values for `change_type` and `file_type` in the SQL migration, read the APIP-1020 ChangeSpec ADR output (once published). If APIP-1020 uses different field names, update the migration before applying. Use `'unknown'` as a placeholder enum value until the ADR is confirmed.
- **DB injection pattern**: The `change-loop.ts` node receives the DB instance via graph config injection (not a direct import). Follow the same `IModelDispatch` injection pattern established in APIP-1030: define an interface, inject at graph initialization, use in the node. This decouples unit tests from the real DB.
- **Fire-and-continue implementation**: Use `Promise.resolve(writeTelemetry(...)).catch(err => logger.warn(...))` or equivalent to ensure the telemetry write never blocks the change loop's `await`. A slow DB write should not add wall-clock time to the change loop's hot path — consider whether to `await` at all or fire-and-forget (document the tradeoff: awaiting ensures the row is committed before advancing, but adds latency; not awaiting risks row loss on crash).
- **Canonical references for subtask decomposition**:
  - SQL migration template: `/Users/michaelmenard/Development/monorepo/packages/backend/database-schema/src/migrations/app/0026_wint_1130_worktree_tracking.sql`
  - Zod-first schema pattern: `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/artifacts/evidence.ts`
  - Change loop target (post-APIP-1030): `packages/backend/orchestrator/src/nodes/change-loop.ts` (new file from APIP-1030)
  - DB client: `packages/backend/db/src/` — `db`, `getPool()`, `closePool()`

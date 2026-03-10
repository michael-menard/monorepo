---
generated: "2026-03-07"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 1
---

# Story Seed: WINT-4030

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates Phase 4 work; no mention of graph population scripts. Active stories section shows none in-progress at baseline date, though progress has advanced significantly since.

### Relevant Existing Features

| Feature | Location | Status | Notes |
|---------|----------|--------|-------|
| `graph.features` table | `packages/backend/database-schema/src/schema/wint.ts` | Deployed (WINT-0060 UAT pass) | `featureName`, `featureType`, `packageName`, `filePath`, `description`, `tags`, `metadata`, `isActive` columns present |
| `graph.capabilities` table | `packages/backend/database-schema/src/schema/wint.ts` | Deployed (WINT-0060 + WINT-0131 UAT pass) | Has `featureId` FK (nullable) added in WINT-0131 |
| `graph.feature_relationships` table | `packages/backend/database-schema/src/schema/wint.ts` | Deployed (WINT-0060) | Supports `depends_on`, `enhances`, `conflicts_with`, `related_to`, `supersedes` |
| `graph.cohesion_rules` table | `packages/backend/database-schema/src/schema/wint.ts` | Deployed (WINT-0060) | Active rules basis for cohesion checks |
| Graph query MCP tools | `packages/backend/mcp-tools/src/graph-query/` | Deployed (WINT-0130 UAT pass) | `graph_check_cohesion`, `graph_get_franken_features`, `graph_get_capability_coverage`, `graph_apply_rules` |
| Codebase population scripts | `packages/backend/mcp-tools/src/scripts/` | Deployed | `populate-domain-kb.ts`, `populate-project-context.ts`, `populate-library-cache.ts` — established pattern for scan+insert scripts |

### CRITICAL SCHEMA GAP: graph.epics Table Does Not Exist

The story index entry references populating `graph.epics` and `graph.features` tables. A thorough scan of `packages/backend/database-schema/src/schema/wint.ts` confirms:

- **`graph.features`** table EXISTS (created in WINT-0060)
- **`graph.epics`** table does NOT EXIST in the current schema

This is a blocking conflict (see Conflict Analysis). The implementation must either:
1. Add `graph.epics` as a new table via a new DB migration as part of this story's scope, OR
2. Re-interpret "epics" as the KB `kbar.stories.epic` text field (a string column, not a separate table) used to group features

The `kbar` schema has an `epic` text column on the `stories` table (e.g., 'WINT', 'KBAR') — this is a classification field, not a relational entity. There is no standalone `epics` table anywhere in the codebase.

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| WINT-4010 (Cohesion Sidecar) | needs-code-review | Uses `graph.features` via `graph_check_cohesion` — inserting new rows should not conflict |
| WINT-4020 (Rules Registry Sidecar) | ready-to-work | Uses `graph.cohesion_rules` — no conflict with feature/epic population |
| WINT-0131 | uat | Completed — `featureId` FK on capabilities is available for use |

### Constraints to Respect

- `packages/backend/database-schema/` is a protected feature — all schema changes require a new numbered migration file (`0035_*` pattern based on latest migration)
- `@repo/db` client API surface must not be broken
- Drizzle ORM v0.44.3 patterns mandatory for all schema definitions
- Zod-first types required — no TypeScript interfaces
- `@repo/logger` for all logging — no `console.log`
- No barrel files — import directly from source

---

## Retrieved Context

### Related Endpoints

No HTTP endpoints applicable — this story creates a script (CLI-runnable), not an API endpoint.

### Related Components

No frontend UI components applicable — this is a backend data population script.

### Reuse Candidates

| Item | Location | How to Reuse |
|------|----------|--------------|
| Population script pattern | `packages/backend/mcp-tools/src/scripts/populate-domain-kb.ts` | Identical structure: Zod schemas, injectable deps for testability, `attempted/succeeded/failed` result shape, `@repo/logger`, monorepo root resolution |
| `@repo/db` client | `packages/backend/db/` | `db` import for Drizzle queries; `getPool()`, `closePool()` for lifecycle |
| `features` Drizzle schema | `packages/backend/database-schema/src/schema/wint.ts` | `features` table export — use for insert/upsert queries |
| `@repo/database-schema` package | `packages/backend/database-schema/` | Import `features` and any new `epics` table from here |
| Glob/fs scanning pattern | Node.js `node:fs`, `node:path` | Already used in population scripts for file traversal |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Population script structure | `packages/backend/mcp-tools/src/scripts/populate-domain-kb.ts` | Canonical example: Zod schemas for result types, injectable `kbQueryFn` for testability, `attempted/succeeded/failed` result shape, monorepo root resolution, per-pack error isolation, `@repo/logger` throughout |
| DB query with Drizzle insert | `packages/backend/mcp-tools/src/graph-query/graph-check-cohesion.ts` | Drizzle select with `eq`/`or`, Zod validation at entry, resilient error handling pattern, `@repo/database-schema` import |
| Drizzle schema definition | `packages/backend/database-schema/src/schema/wint.ts` (lines 1257–1302) | Canonical `features` table: `pgEnum`, `wintSchema.table()`, index definitions, `uuid().primaryKey().defaultRandom()`, timestamp columns with timezone |

---

## Knowledge Context

### Lessons Learned

KB query skipped (no live KB connection in seed phase). The following lessons are inferred from codebase patterns and WINT story history:

- **[WINT-0131]** Schema gaps discovered late in implementation caused CONDITIONAL PASS and rework. WINT-0131 was a surprise fix story for a gap in WINT-0060's original design.
  - *Applies because*: This story references `graph.epics` which does not exist — if not addressed upfront, implementation will stall when the INSERT fails.

- **[WINT-0060]** Materialized views (`feature_cohesion`, `franken_features`) required performance monitoring as data grows.
  - *Applies because*: Populating `graph.features` with 100+ entries will immediately stress the views that WINT-4060 (graph-checker agent) depends on.

- **Population scripts pattern** (inferred from `populate-domain-kb.ts`, `populate-project-context.ts`): Injectable dependencies (functions passed as params) are the established pattern for testability — do not use real DB/file connections directly in the function under test.

### Blockers to Avoid (from past stories)

- Assuming a database table exists without verifying the schema first — `graph.epics` does not exist, do not proceed without addressing this
- Writing a script without injectable dependencies, then being unable to unit test it in CI (no live DB at port 5432 in CI)
- Inserting duplicate `featureName` values without an upsert strategy — `features_feature_name_idx` is a unique index
- Scanning `apps/` and `packages/` without a clearly defined extraction heuristic — "feature extraction may need manual validation" (Risk Note from index)

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Endpoint Path Schema | N/A — this story has no HTTP endpoints |
| ADR-002 | Infrastructure-as-Code Strategy | N/A — no new infra stacks |
| ADR-005 | Testing Strategy | UAT must use real services, not mocks — the population script must be tested with a real DB for UAT validation |
| ADR-006 | E2E Tests Required in Dev Phase | N/A — no UI-facing ACs; E2E not applicable for a CLI script |

### Patterns to Follow

- Injectable dependency pattern for testability: pass `dbInsertFn` or equivalent as optional param (matches `kbQueryFn` pattern in `populate-domain-kb.ts`)
- `PopulateResult` Zod schema with `attempted/succeeded/failed` shape — reuse this exact structure
- `MONOREPO_ROOT = resolve(import.meta.dirname ?? __dirname, '../../../../../')` for path resolution from `packages/backend/mcp-tools/src/scripts/`
- Isolate per-item failures with try/catch per insert — never abort the full run on a single failure
- `drizzle-orm`'s `onConflictDoUpdate` or `onConflictDoNothing` for idempotent inserts (the script must be re-runnable)
- Log at `logger.info` for success, `logger.warn` for skips, `logger.error` for failures

### Patterns to Avoid

- Hard-coding feature lists — the script should scan the codebase dynamically (or accept a manifest)
- Importing Drizzle schema types directly in test files (causes DB init side effects) — use mocks/fakes
- Using `console.log` instead of `@repo/logger`
- Creating barrel files (no `index.ts` re-exports)
- Using TypeScript interfaces — use Zod schemas with `z.infer<>`

---

## Conflict Analysis

### Conflict: Missing schema table (graph.epics)
- **Severity**: blocking
- **Description**: The story index specifies populating `graph.epics` and `graph.features`. The `graph.features` table exists (WINT-0060). The `graph.epics` table does NOT exist anywhere in the schema (`wint.ts`, `unified-wint.ts`, `kbar.ts`, or any migration file). Before any population script can be written, the team must decide: (a) create a new `graph.epics` table via a new DB migration, or (b) treat "epics" as a logical grouping using the existing `kbar.stories.epic` text field and scope the `graph.epics` reference out of this story.
- **Resolution Hint**: The dev feasibility agent must resolve this before elaboration. Recommended path: add a lightweight `epics` table to the wint schema (columns: `id`, `epicName`, `epicPrefix` e.g. 'WINT', `description`, `isActive`, timestamps) and include its creation in this story's scope. This mirrors the `features` table design and keeps the graph schema self-contained. A new migration file `0036_wint_4030_graph_epics.sql` (or similar) would be needed.

---

## Story Seed

### Title

Populate Graph with Existing Features and Epics

### Description

The WINT graph relational schema (created in WINT-0060) has tables for `features`, `capabilities`, and `cohesion_rules`, but they are empty. The graph-checker agent (WINT-4060) and cohesion-prosecutor agent (WINT-4070) depend on this graph being populated before they can function. This story creates a one-time (idempotent, re-runnable) population script that scans the existing codebase — apps, packages, and the stories index — to discover current features and epics, then inserts them into `graph.features` and a new `graph.epics` table.

The story also requires creating the `graph.epics` table (a schema gap relative to the story description), which must be addressed via a new Drizzle schema addition and DB migration before the population script can be written.

**Problem**: The graph is empty. Agents that query `graph.features` will find no data, making cohesion checks vacuously pass and providing no insight into the real feature landscape.

**Proposed solution direction**:
1. Add `epics` table to the wint schema (Drizzle definition + migration)
2. Write a runnable script at `packages/backend/mcp-tools/src/scripts/populate-graph-features.ts` that:
   - Scans `apps/api/*/`, `apps/web/*/`, `packages/backend/*/`, `packages/core/*/` to discover features (API handlers, UI components, services, utilities)
   - Reads `plans/future/platform/wint/stories.index.md` (or KB) to extract the current set of epics (WINT prefix groups)
   - Inserts epics with `onConflictDoNothing` into `graph.epics`
   - Inserts features with `onConflictDoNothing` into `graph.features`
3. The script must be idempotent (safe to re-run) and injectable (testable without a live DB in CI)

### Initial Acceptance Criteria

- [ ] AC-1: A `graph.epics` table is defined in `packages/backend/database-schema/src/schema/wint.ts` within the `wintSchema` pg schema, with columns: `id` (uuid PK), `epicName` (text, unique, not null), `epicPrefix` (text, unique, not null — e.g. 'WINT', 'KBAR'), `description` (text, nullable), `isActive` (boolean, not null, default true), `createdAt`, `updatedAt`
- [ ] AC-2: A Drizzle migration file is created and applied to the local dev database, adding the `epics` table to the `wint` pg schema
- [ ] AC-3: A population script exists at `packages/backend/mcp-tools/src/scripts/populate-graph-features.ts` that can be run via `pnpm tsx packages/backend/mcp-tools/src/scripts/populate-graph-features.ts` from the monorepo root
- [ ] AC-4: The script accepts injectable `dbInsertFn` (or equivalent) for testability — no direct DB connection in the function under test
- [ ] AC-5: The script scans the monorepo directory structure to identify feature candidates (at minimum: API handler directories in `apps/api/*/src/handlers/`, UI component directories in `apps/web/*/src/`, package directories in `packages/backend/*/src/` and `packages/core/*/src/`)
- [ ] AC-6: Each discovered feature is inserted into `graph.features` with appropriate `featureName`, `featureType` (one of: `'api_endpoint'`, `'ui_component'`, `'service'`, `'utility'`), `packageName`, and `filePath`; duplicates are silently skipped (upsert with `onConflictDoNothing` on `featureName`)
- [ ] AC-7: Known epics (at minimum: WINT, KBAR, WISH, BUGF) are inserted into `graph.epics`; duplicates are silently skipped
- [ ] AC-8: The script returns a result of shape `{ attempted, succeeded, failed }` for both epics and features inserts
- [ ] AC-9: The script has unit tests in `packages/backend/mcp-tools/src/scripts/__tests__/populate-graph-features.test.ts` with mocked DB calls — no live DB required in CI
- [ ] AC-10: Running the script twice on a clean DB produces identical results (idempotency)
- [ ] AC-11: TypeScript compiles with zero errors (`pnpm check-types`)
- [ ] AC-12: ESLint passes with zero errors on new/changed files

### Non-Goals

- This story does NOT infer capabilities for features (that is WINT-4040's scope)
- This story does NOT create cohesion rules (that is WINT-4050's scope)
- This story does NOT create the graph-checker agent (that is WINT-4060's scope)
- This story does NOT modify `packages/backend/database-schema/src/schema/unified-wint.ts` (deferred per WINT-0131 precedent — unified-wint.ts changes are a separate concern)
- This story does NOT add an HTTP endpoint or MCP tool wrapper — the script is CLI-only
- Feature extraction does NOT need to be exhaustive or perfectly accurate — "may need manual validation" (Risk Note); the goal is a reasonable baseline graph from automated scanning
- This story does NOT touch production DB schemas outside the `wint` pg schema

### Reuse Plan

- **Components**: None (no UI)
- **Patterns**: `populate-domain-kb.ts` structure — Zod result schema, injectable fn, monorepo root resolution, try/catch per item, `logger.*` for all output
- **Packages**: `@repo/db` (Drizzle client), `@repo/database-schema` (wint schema exports), `@repo/logger`, `node:fs`, `node:path`, `drizzle-orm` (`onConflictDoNothing`)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- This story has NO frontend UI and NO HTTP API endpoints — E2E tests (ADR-006) are not applicable; mark `e2e: not_applicable` in SCOPE.yaml
- Testing focus: unit tests for the population script with 100% mocked DB calls; integration test with a real local DB for the "runs twice, same result" idempotency AC
- The `__tests__/populate-graph-features.test.ts` should mirror the pattern in `packages/backend/mcp-tools/src/scripts/__tests__/populate-domain-kb.test.ts`
- The `graph.epics` table schema should have a unit test in `packages/backend/database-schema/src/schema/__tests__/wint-graph-schema.test.ts` (follows WINT-0060 test precedent in that file)
- UAT verification: run the script against the dev DB, then query `graph.features` and `graph.epics` via `@repo/db` or `psql` to confirm rows were inserted

### For UI/UX Advisor

Not applicable. This story has no user-facing UI component. The "interface" is a CLI script run by a developer or CI pipeline.

### For Dev Feasibility

- **Critical first step**: Confirm the `graph.epics` table design with the team before writing any code. The proposed schema (see AC-1) is intentionally minimal — if more columns are needed to support WINT-4060 (graph-checker) or WINT-4070 (cohesion-prosecutor), add them now rather than in a follow-up migration.
- **Migration numbering**: Check the latest migration file in `packages/backend/database-schema/src/migrations/app/` — the most recent is `0035_wint_4020_rules_registry.sql`. The new epics table migration should be `0036_wint_4030_graph_epics.sql`.
- **Feature extraction heuristic**: The biggest open question is what constitutes a "feature" for scanning purposes. Recommend starting with: (1) each directory under `apps/api/*/src/handlers/` = `api_endpoint`, (2) each directory under `apps/web/*/src/components/` = `ui_component`, (3) each `src/` directory in `packages/backend/*/` = `service` or `utility`, (4) each `src/` directory in `packages/core/*/` = `utility`. Validate against WINT-0131 Risk Note ("Feature extraction may need manual validation").
- **Canonical references for subtask decomposition**:
  - Schema addition: `packages/backend/database-schema/src/schema/wint.ts` lines 1257–1302 (features table definition)
  - Migration: `packages/backend/database-schema/src/migrations/app/0035_wint_4020_rules_registry.sql` (latest migration for numbering reference)
  - Script pattern: `packages/backend/mcp-tools/src/scripts/populate-domain-kb.ts` (full script)
  - Test pattern: `packages/backend/mcp-tools/src/scripts/__tests__/populate-domain-kb.test.ts`

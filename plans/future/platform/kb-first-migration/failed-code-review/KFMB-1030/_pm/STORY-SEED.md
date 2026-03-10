---
generated: "2026-02-26"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: KFMB-1030

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline does not describe the PM pipeline artifact filesystem format in detail; content field structure for each PM artifact type must be inferred from existing YAML files on disk

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| KB jump table (story_artifacts) | `apps/api/knowledge-base/src/db/schema.ts` lines 758-808 | KFMB-1030 adds 4 new rows to `artifact_type` text column (no enum constraint exists — it's a plain `text` column) |
| 13 type-specific artifact detail tables | `apps/api/knowledge-base/src/db/migrations/015_artifact_type_tables.sql` | Pattern to follow: each type gets its own table with `target_id`, typed summary columns, and `data JSONB` |
| `ArtifactTypeSchema` Zod enum | `apps/api/knowledge-base/src/__types__/index.ts` lines 824-839 | Must be extended with 4 new values: `test_plan`, `dev_feasibility`, `uiux_notes`, `story_seed` |
| `ARTIFACT_TYPES` constant + `ARTIFACT_TYPE_TO_TABLE` map | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` lines 44-90 | Must be extended with 4 new entries each |
| `mapContentToTypedColumns()` switch | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` lines 232-396 | Must add 4 new `case` blocks |
| `getDetailTableRef()` tableMap | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` lines 414-430 | Must add 4 new entries |
| `generateArtifactName()` typeNames map | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` lines 447-464 | Must add 4 new display name entries |
| PM artifact YAML files (filesystem) | `plans/future/platform/*/backlog/*/\_pm/` | Source of truth for PM artifact content structure; existing `test-plan.yaml`, `dev-feasibility.yaml`, `uiux-notes.yaml`, `STORY-SEED.md` define the shape of `data` JSONB |
| Next migration sequence | `apps/api/knowledge-base/src/db/migrations/016_unique_story_prefix.sql` | Next migration will be `017_pm_artifact_types.sql` |

### Active In-Progress Work

| Story | Status | Overlap |
|-------|--------|---------|
| KFMB-1010 | Elaboration | Direct dependency — KFMB-1030 depends on KFMB-1010 completing first. KFMB-1010 extends the `stories` table with content columns; KFMB-1030 extends the `story_artifacts` jump table with new artifact types. No overlap on files touched. |

### Constraints to Respect

- `artifact_type` column in `story_artifacts` is `text` (not a PostgreSQL enum), so no `ALTER TYPE` is needed — the constraint is purely at the Zod/application layer
- The `storyArtifacts` table and all 13 existing detail tables are protected production assets — add new tables, do not modify existing ones
- Drizzle ORM v0.44.3 patterns apply — use same column/index conventions as migration 015
- Zod-first types are required — no TypeScript interfaces
- No barrel files — all imports from source paths
- Migration must be numbered `017_` (016 is `016_unique_story_prefix.sql`)
- KFMB-1010 must be complete before this story begins (adds content columns to `stories`, unrelated but ordered as Phase 1 prerequisites)

---

## Retrieved Context

### Related Endpoints

None — KFMB-1030 is a DB and CRUD layer story with no new HTTP endpoints. The existing `kb_write_artifact`, `kb_read_artifact`, `kb_list_artifacts`, and `kb_delete_artifact` MCP tools transparently support new artifact types once the type-specific tables and CRUD mappings are added.

### Related Components

| Component | File | Relationship |
|-----------|------|--------------|
| `artifact-operations.ts` | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` | Primary file to modify — CRUD routing, typed column mapping, table dispatch |
| `schema.ts` (KB DB) | `apps/api/knowledge-base/src/db/schema.ts` | Add 4 new Drizzle table definitions; add Drizzle relations |
| `__types__/index.ts` | `apps/api/knowledge-base/src/__types__/index.ts` | Extend `ArtifactTypeSchema` Zod enum with 4 new values |
| Migration 015 | `apps/api/knowledge-base/src/db/migrations/015_artifact_type_tables.sql` | Canonical pattern for new SQL migration |

### Reuse Candidates

- **Pattern**: Migration 015 (`015_artifact_type_tables.sql`) — exact table structure pattern (id UUID PK, target_id TEXT NOT NULL, typed summary columns, data JSONB, timestamps, indexes)
- **Pattern**: `mapContentToTypedColumns()` switch cases — add new `case 'test_plan':`, `case 'dev_feasibility':`, etc. blocks following the same structure as existing cases
- **Pattern**: `getDetailTableRef()` tableMap — add 4 entries mapping `artifact_test_plans`, `artifact_dev_feasibility`, `artifact_uiux_notes`, `artifact_story_seeds` to their Drizzle table refs
- **Pattern**: `generateArtifactName()` — add display name strings
- **Existing tests**: `apps/api/knowledge-base/src/crud-operations/__tests__/` — add coverage for the 4 new types using existing test patterns

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Type-specific detail table (Drizzle) | `apps/api/knowledge-base/src/db/schema.ts` (lines 868-888, `artifactReviews`) | Clean example of a type-specific table with typed summary columns + `data JSONB`; shows correct index patterns |
| SQL migration for type-specific tables | `apps/api/knowledge-base/src/db/migrations/015_artifact_type_tables.sql` | Complete canonical pattern for CREATE TABLE + indexes; next migration must follow this exactly |
| CRUD content routing | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` (lines 232-396, `mapContentToTypedColumns`) | Shows how each artifact type extracts typed columns from generic content JSONB; new cases follow the same structure |
| PM artifact YAML example | `plans/future/platform/kb-artifact-migration/needs-code-review/KBAR-0200/_pm/dev-feasibility.yaml` | Representative sample of PM artifact field shape, directly informs what typed columns to extract for each new type |

---

## Knowledge Context

### Lessons Learned

- **[Zod backward-compat]** Use `z.enum([...existing, 'test_plan', 'dev_feasibility', 'uiux_notes', 'story_seed'])` pattern; the Zod enum extension is additive and does not break existing artifact reads or writes.
  - *Applies because*: `ArtifactTypeSchema` is consumed by MCP tools and CRUD layer; adding new enum values must not break existing callers passing current types.

- **[Zod-first requirement]** TypeScript interfaces are prohibited — all new type definitions must use `z.object()` with `z.infer<>`.
  - *Applies because*: CLAUDE.md and multiple past code-review lessons (e.g., WINT-9090) confirm interface usage triggers a mandatory fix cycle.

- **[Migration naming]** Use sequential SQL naming (`017_pm_artifact_types.sql`) following established project pattern.
  - *Applies because*: All 15 existing KB migrations use `NNN_description.sql`; KB entry `17adef0d` confirms sequential numbering is the project standard.

### Blockers to Avoid (from past stories)

- Modifying existing artifact type tables (protected) — only ADD new tables
- Adding a PostgreSQL CHECK constraint on `artifact_type` text column — the column is plain `text`, constraint enforcement is at the Zod layer only; introducing a DB-level CHECK would break any existing inserts not updated first
- Forgetting to add the new types to ALL four locations in `artifact-operations.ts` (ARTIFACT_TYPES, ARTIFACT_TYPE_TO_TABLE, mapContentToTypedColumns, getDetailTableRef, generateArtifactName) — missing any one causes a runtime `Unknown artifact type` error

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | If UAT is performed, it must use real KB DB (port 5433), not mocks |

ADR-001 (API paths), ADR-002 (IaC), ADR-003 (CDN), ADR-004 (Auth), ADR-006 (E2E) do not apply — this is a pure DB/CRUD layer story with no endpoints or frontend.

### Patterns to Follow

- Type-specific detail table with typed summary columns + `data JSONB` for full content (migration 015 pattern)
- `mapContentToTypedColumns()` returns `{ typedColumns, data }` — all content stored in `data`, typed fields extracted for queryability
- Drizzle schema: define table, create `drizzle-zod` insert/select schemas, export `type Insert* = z.infer<...>` and `type Select* = z.infer<...>`
- Each detail table needs a Drizzle `relations()` entry added to the jump table's relation set (see `storiesRelations` in schema.ts is absent from KB schema — relations are defined in `packages/backend/database-schema/` not KB schema; check if KB schema uses relations or just direct queries)

### Patterns to Avoid

- Do not add `CHECK (artifact_type IN (...))` to the `story_artifacts` table — the column is plain text; enforcement is at the Zod enum layer
- Do not skip any of the 5 code-layer locations that need updating per new artifact type
- Do not use TypeScript `interface` for any new types

---

## Conflict Analysis

### Conflict: Dependency Not Complete
- **Severity**: warning (non-blocking for seeding; blocking for implementation)
- **Description**: KFMB-1010 (Stories Table Content Columns Migration) is currently in `elaboration` status. KFMB-1030 depends on KFMB-1010 being in `completed` state before implementation begins. The dependency is on the `stories` table migration (separate table, separate file) — there is no code-level overlap, but the stories.index.md specifies KFMB-1010 as a prerequisite.
- **Resolution Hint**: Do not begin KFMB-1030 implementation until KFMB-1010 reaches `completed`. This seed can be fully elaborated in parallel.

---

## Story Seed

### Title

PM Artifact Types and Detail Tables

### Description

The KB database currently supports 13 artifact types for storing implementation workflow artifacts (checkpoint, scope, plan, evidence, etc.) via a jump table (`story_artifacts`) that routes each artifact to a type-specific detail table. The PM pipeline — which generates `test-plan.yaml`, `dev-feasibility.yaml`, `uiux-notes.yaml`, and `STORY-SEED.md` for each story — currently writes these outputs to the filesystem. The kb-first migration plan (KFMB) aims to replace filesystem persistence with direct KB writes.

Before PM agents can write their artifacts to the KB (covered in KFMB-5040), the database and CRUD layer must be extended to support the 4 new PM artifact types. This story adds those DB structures: one new detail table per artifact type, the corresponding Zod enum and Drizzle schema definitions, and the CRUD routing logic in `artifact-operations.ts`.

The risk noted in `story.yaml` — "CHECK constraint on artifact_type must be extended without breaking existing artifact inserts" — is largely a non-issue in practice: the `artifact_type` column is `text`, not a PostgreSQL enum, so no `ALTER TYPE` is needed. The extension is purely additive in SQL (new tables) and additive in TypeScript (extended Zod enum + new CRUD cases).

### Initial Acceptance Criteria

- [ ] AC-1: A SQL migration `017_pm_artifact_types.sql` is added that creates 4 new detail tables: `artifact_test_plans`, `artifact_dev_feasibility`, `artifact_uiux_notes`, `artifact_story_seeds`. Each table follows the migration 015 pattern: `id UUID PK`, `target_id TEXT NOT NULL`, typed summary columns relevant to the artifact type, `data JSONB`, `created_at`, `updated_at`, and appropriate indexes.
- [ ] AC-2: `ArtifactTypeSchema` in `apps/api/knowledge-base/src/__types__/index.ts` is extended with 4 new values: `test_plan`, `dev_feasibility`, `uiux_notes`, `story_seed`. Existing enum values are unchanged.
- [ ] AC-3: 4 new Drizzle table definitions are added to `apps/api/knowledge-base/src/db/schema.ts`, one per PM artifact type. Each follows the same structural pattern as existing type-specific tables (`artifactReviews`, `artifactPlans`, etc.).
- [ ] AC-4: `ARTIFACT_TYPES` constant in `artifact-operations.ts` is extended with the 4 new type strings.
- [ ] AC-5: `ARTIFACT_TYPE_TO_TABLE` map in `artifact-operations.ts` is extended with entries mapping each new type string to its detail table name.
- [ ] AC-6: `mapContentToTypedColumns()` switch in `artifact-operations.ts` includes a new `case` block for each PM artifact type that extracts relevant typed summary columns from the generic content object.
- [ ] AC-7: `getDetailTableRef()` tableMap in `artifact-operations.ts` includes 4 new entries mapping the new table name strings to their Drizzle table references.
- [ ] AC-8: `generateArtifactName()` typeNames map includes display names for the 4 new types (e.g., `TEST-PLAN`, `DEV-FEASIBILITY`, `UIUX-NOTES`, `STORY-SEED`).
- [ ] AC-9: `kb_write_artifact` called with any of the 4 new artifact types successfully creates a row in the jump table and in the corresponding detail table (no "Unknown artifact type" error).
- [ ] AC-10: `kb_read_artifact` called with any of the 4 new artifact types returns the full content stored in the corresponding detail table.
- [ ] AC-11: `kb_list_artifacts` with `artifact_type` filter set to any of the 4 new types returns matching artifacts.
- [ ] AC-12: Existing artifact types (`checkpoint`, `scope`, `plan`, `evidence`, etc.) continue to work without regression — existing KB write/read/list operations are unaffected by this change.
- [ ] AC-13: `pnpm check-types --filter @repo/knowledge-base` (or equivalent) passes with zero errors after all changes.
- [ ] AC-14: Unit tests cover the 4 new artifact type paths in `artifact-operations.ts` (write, read, delete round-trip for at least one PM type; verify content is stored in the correct detail table).

### Non-Goals

- Writing PM artifacts to the KB from agents — that is KFMB-5040 (Migrate _pm/ Writer Agents to kb_write_artifact)
- Adding PM artifact types to `packages/backend/database-schema/src/schema/artifacts.ts` — that is a separate schema file for the main Lego app DB; KFMB-1030 concerns the Knowledge Base DB only
- Modifying any existing artifact type tables or changing existing artifact type Zod values
- Adding HTTP endpoints or MCP tool handler registrations — the existing `kb_write_artifact` / `kb_read_artifact` / `kb_list_artifacts` tools automatically support new types once the CRUD routing is updated
- Migrating existing PM YAML files from the filesystem to the KB — that is a later migration story
- Any frontend or app changes
- Adding a PostgreSQL CHECK constraint on `artifact_type` — enforcement is at the Zod layer

### Reuse Plan

- **Components**: `artifact-operations.ts` (extend, not replace); `schema.ts` (extend with 4 table defs); `__types__/index.ts` (extend Zod enum)
- **Patterns**: Migration 015 SQL table structure; `mapContentToTypedColumns()` case block pattern; `getDetailTableRef()` tableMap pattern
- **Packages**: `drizzle-orm/pg-core` (same imports as existing tables); `drizzle-zod` (`createInsertSchema`, `createSelectSchema`); `zod`

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- This story has no HTTP endpoints and no frontend — test strategy is `unit+manual` (similar to KBAR-0200 pattern)
- Happy path tests: `kb_write_artifact` + `kb_read_artifact` round-trip for each of the 4 new types via unit test with in-memory/mock DB, or direct DB integration test against KB (port 5433)
- Error case: calling `kb_write_artifact` with an unknown type string still returns a "Unknown artifact type" error (regression guard for ARTIFACT_TYPE_TO_TABLE dispatch)
- Edge case: calling `kb_list_artifacts` with the new `artifact_type` filter values returns correct results without SQL errors
- Regression guard: verify all 13 existing artifact types still function after enum extension
- No E2E tests needed (no UI-facing ACs)
- Tooling evidence: `pnpm check-types` and `pnpm test --filter @repo/knowledge-base` are the primary gates

### For UI/UX Advisor

No UI/UX work in this story. All changes are DB schema, SQL migrations, and TypeScript CRUD logic. Skip UX phase or provide a brief "not applicable" note.

### For Dev Feasibility

- **Change surface**: 4 files to modify + 1 SQL migration to create
  1. `apps/api/knowledge-base/src/db/migrations/017_pm_artifact_types.sql` (new)
  2. `apps/api/knowledge-base/src/db/schema.ts` (extend — add 4 table defs)
  3. `apps/api/knowledge-base/src/__types__/index.ts` (extend — add 4 enum values)
  4. `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` (extend — 5 locations)
  5. `apps/api/knowledge-base/src/crud-operations/__tests__/artifact-operations.test.ts` (extend — new test cases)
- **Key risk**: The `artifact_type` column in `story_artifacts` is plain `text` — confirm no hidden DB-level check constraint exists before writing the migration (run `\d story_artifacts` against local KB DB). If one exists, the migration must extend it.
- **Typed summary columns per PM artifact type**: Review existing YAML files in `plans/future/platform/*/\_pm/` to determine which fields to promote to typed columns vs. leave in `data JSONB`. Recommended minimums:
  - `artifact_test_plans`: `strategy TEXT`, `scope_ui_touched BOOLEAN`, `scope_data_touched BOOLEAN`
  - `artifact_dev_feasibility`: `feasible BOOLEAN`, `confidence TEXT`, `complexity TEXT`
  - `artifact_uiux_notes`: `has_ui_changes BOOLEAN`, `component_count INTEGER`
  - `artifact_story_seeds`: `conflicts_found INTEGER`, `blocking_conflicts INTEGER`, `baseline_loaded BOOLEAN`
- **Complexity estimate**: Low-Medium. All changes are mechanical extensions of an established pattern. The pattern is well-documented in migration 015 and `artifact-operations.ts`. Primary risk is forgetting to update one of the 5 code-layer locations.
- **Canonical references for subtask decomposition**:
  - ST-1: Read current state of target files (establish baseline; confirm no CHECK constraint exists)
  - ST-2: Write SQL migration `017_pm_artifact_types.sql` (4 CREATE TABLE + indexes)
  - ST-3: Extend Drizzle schema (`schema.ts`) with 4 new table definitions + `createInsertSchema`/`createSelectSchema` exports
  - ST-4: Extend `ArtifactTypeSchema` in `__types__/index.ts`
  - ST-5: Extend `artifact-operations.ts` — all 5 locations (ARTIFACT_TYPES, ARTIFACT_TYPE_TO_TABLE, mapContentToTypedColumns, getDetailTableRef, generateArtifactName)
  - ST-6: Write unit tests for 4 new PM artifact types
  - ST-7: Run `pnpm check-types` and `pnpm test`; verify no regressions

---
generated: "2026-03-18"
baseline_used: null
baseline_date: null
lessons_loaded: true
adrs_loaded: false
conflicts_found: 3
blocking_conflicts: 1
---

# Story Seed: CDBN-2024

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No baseline file provided (null baseline_path). Codebase scanning used as primary reality source.

### Relevant Existing Features

| Feature | Location | Notes |
|---------|----------|-------|
| `public.stories` (old table) | `apps/api/knowledge-base/backups/pre_drizzle_migration_20260222_173205.sql` lines 695–726 | **Historical only.** The original `public.stories` table with columns `id uuid`, `story_id text`, `feature`, `epic`, `title`, `story_dir`, `story_file`, `state`, `phase`, `iteration`, `blocked`, `touches_*`, etc. This table was the original story store before the workflow schema migration. |
| `workflow.stories` (current table) | `apps/api/knowledge-base/src/db/schema/workflow.ts` lines 33–58 | **Live canonical table.** Drizzle schema with `storyId`, `feature`, `title`, `description`, `state`, `priority`, `tags`, `acceptanceCriteria`, `nonGoals`, `packages`, etc. This is the authoritative stories table post-CDBN migration. |
| `999_full_schema_baseline.sql` | `apps/api/knowledge-base/src/db/migrations/999_full_schema_baseline.sql` line 1239 | **No `public.stories` table present.** The baseline snapshot only contains `workflow.stories`. This confirms `public.stories` has already been dropped or never created in the current DB instance — it is only in the pre-drizzle backup. |
| `story-similarity.ts` | `apps/api/knowledge-base/src/search/story-similarity.ts` line 51 | **Active code referencing `public.stories`.** The `findSimilarStories` function queries `FROM public.stories WHERE deleted_at IS NULL AND embedding IS NOT NULL`. This is the primary live code blocker — it queries a table that no longer exists in the canonical schema. |
| `storyDetails` Drizzle table | `apps/api/knowledge-base/src/db/schema/legacy.ts` lines 84–109 | **Legacy Drizzle definition still present.** The `legacy.ts` schema file still defines `storyDetails` (`story_details` in public schema), `storyAuditLog`, `storyKnowledgeLinks`, and `workStateHistory`. These reference `workflow.stories` via FK. The `storyDetails` table mirrors columns that were merged into `workflow.stories` in migration `999_consolidate_story_tables.sql`. |
| `999_consolidate_story_tables.sql` | `apps/api/knowledge-base/src/db/migrations/999_consolidate_story_tables.sql` | **Already executed.** Migrated `story_details` columns into `workflow.stories`, dropped `workflow.story_details`. However, `legacy.ts` still defines `storyDetails` as a Drizzle table — a Drizzle schema / DB state divergence. |
| pgtap test harness | `apps/api/knowledge-base/src/db/migrations/pgtap/` | **Already set up.** CDBE-0010 delivered pgtap infrastructure. Existing tests in `pgtap/` subdirectory. Available for any migration tests in this story. |

### Active In-Progress Work

| Story | Title | State | Relevance |
|-------|-------|-------|-----------|
| CDBN-2021 | Migrate data from public.stories to workflow.stories | in_progress | **Direct predecessor.** Performs the data migration from `public.stories` to `workflow.stories`. CDBN-2024 cannot run cleanup until CDBN-2021's migration is confirmed complete and verified. |
| CDBN-2022 | Migrate related tables to workflow schema | backlog | Migrates tables related to `public.stories` (FKs, dependent tables). Must complete before CDBN-2023 and CDBN-2024. |
| CDBN-2023 | Verify migration and update FK references | backlog | Validates data integrity and updates all FK references from `public.stories` to `workflow.stories`. **CDBN-2024 is blocked on this completing.** |

### Constraints to Respect

- CDBN-2024 is the **terminal story in a 4-story dependency chain** (2021 → 2022 → 2023 → 2024). It cannot begin until CDBN-2023 is complete and verified.
- The `public.stories` table **no longer appears in `999_full_schema_baseline.sql`** — which means either (a) it was dropped as part of the CDBN-2021 migration in a prior DB instance, or (b) the current live DB may not have a `public.stories` table at all. The cleanup migration must use `DROP TABLE IF EXISTS` to be idempotent.
- The `story-similarity.ts` file still queries `FROM public.stories` — this is a **live code bug** that must be resolved as part of this story. The query must be redirected to `workflow.stories`.
- `workflow.stories` in the current Drizzle schema does NOT have `deleted_at` or `embedding` columns (they are commented out as "not yet needed" in `workflow.ts` line 53). The `story-similarity.ts` query filters `WHERE deleted_at IS NULL AND embedding IS NOT NULL`. After the redirect, either: (a) those columns need to be added to `workflow.stories`, or (b) the query must be adjusted to remove those filters.
- The `legacy.ts` Drizzle schema still defines `storyDetails` pointing at `public.story_details`. After `999_consolidate_story_tables.sql` dropped `workflow.story_details`, this Drizzle definition is stale and potentially points at a non-existent table. CDBN-2024 should address this or scope it explicitly as a non-goal.
- Migration must be idempotent: `DROP TABLE IF EXISTS`, `DROP VIEW IF EXISTS`, no hard fails if objects already absent.

---

## Retrieved Context

### Related Endpoints

None — this is a pure database migration and code cleanup story. No new API endpoints are created.

### Related Components

| Component | File | Notes |
|-----------|------|-------|
| `findSimilarStories` | `apps/api/knowledge-base/src/search/story-similarity.ts` | Queries `FROM public.stories` with `deleted_at IS NULL` and `embedding IS NOT NULL`. Must be updated to `workflow.stories`. |
| `buildStoryEmbeddingText` | `apps/api/knowledge-base/src/search/story-similarity.ts` | No schema dependency — safe to leave unchanged. |
| `story-context.ts` (consumer) | `apps/api/knowledge-base/src/crud-operations/story-context.ts` | Imports and calls `findSimilarStories`. Will benefit from the fix but requires no changes of its own if the function signature is preserved. |
| MCP tool handlers | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | Imports `findSimilarStories` and `buildStoryEmbeddingText`. No direct schema dependency. |
| `legacy.ts` Drizzle schema | `apps/api/knowledge-base/src/db/schema/legacy.ts` | Defines `storyDetails`, `storyAuditLog`, `storyKnowledgeLinks`, `workStateHistory`, `deferredWrites` in the public schema. Some of these tables may no longer exist. Scope clarification needed. |

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|--------------|
| `999_cleanup_duplicate_tables.sql` pattern | `apps/api/knowledge-base/src/db/migrations/999_cleanup_duplicate_tables.sql` | Shows the exact `DROP TABLE IF EXISTS … CASCADE` pattern used to remove duplicate tables. Follow this exactly for the `public.stories` drop. |
| `workflow.stories` Drizzle schema | `apps/api/knowledge-base/src/db/schema/workflow.ts` lines 33–58 | The target table for `story-similarity.ts` redirect. Check what columns are available (notably `embedding` is absent — see conflict section). |
| pgtap test pattern | `apps/api/knowledge-base/src/db/migrations/pgtap/1004_valid_transitions_test.sql` | File structure for any pgtap tests verifying the table removal. |
| `story-similarity.ts` existing query | `apps/api/knowledge-base/src/search/story-similarity.ts` lines 44–57 | The raw SQL query block to update. The `sql` tagged template from Drizzle is already in use — the table reference change is surgical. |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| DROP TABLE cleanup migration | `apps/api/knowledge-base/src/db/migrations/999_cleanup_duplicate_tables.sql` | Exact pattern for `DROP TABLE IF EXISTS … CASCADE` within a `BEGIN/COMMIT` transaction. This story's migration should follow the same structure. |
| Drizzle raw SQL table query | `apps/api/knowledge-base/src/search/story-similarity.ts` | The `db.execute(sql\`…\`)` pattern used to query stories by embedding. The fix is to replace the `FROM public.stories` reference with `FROM workflow.stories`. Use this file as the canonical implementation to update. |
| Drizzle workflow schema definition | `apps/api/knowledge-base/src/db/schema/workflow.ts` lines 33–58 | Canonical definition of `workflow.stories` columns. Use to confirm what columns exist (and what does not — `embedding`, `deleted_at`) before updating the `story-similarity.ts` query. |

---

## Knowledge Context

### Lessons Learned

- **[CDBE-1006]** The story description referenced `telemetry.workflow_audit_log`. No `telemetry` schema exists — verify schema names against `999_full_schema_baseline.sql` before writing migration SQL. (*category: blocker*)
  - *Applies because*: CDBN-2024 references `public.stories`. Verify the table's current state in the live DB vs. baseline before writing any DROP statements. If the table was already dropped by CDBN-2021's migration, the drop must be `IF EXISTS`.

- **[General DB migration pattern]** Column presence in Drizzle schema does not guarantee column presence in the actual DB. `workflow.stories` in `workflow.ts` lacks `embedding` and `deleted_at` columns (explicitly removed per comment on line 53), but `story-similarity.ts` queries those columns. This mismatch will cause a runtime error the moment `public.stories` is dropped and the query is redirected. (*category: blocker*)
  - *Applies because*: Fixing `story-similarity.ts` to point at `workflow.stories` without also adding `embedding` support will break similarity search entirely.

- **[CDBE-1005/1006 pattern]** Migration slot numbering must be verified at implementation time — check current directory listing before choosing a slot number. (*category: time_sink*)
  - *Applies because*: The CDBN migration slot (likely in the 1008+ range) needs to be confirmed against the current migration directory.

- **[General]** `DROP TABLE … CASCADE` silently drops dependent views, triggers, and FKs. Always document what dependent objects will be cascade-dropped, and verify no live code other than `story-similarity.ts` references `public.stories`. (*category: blocker*)
  - *Applies because*: The old `public.stories` table had triggers (`story_audit_trigger` calling `audit_story_changes()`), indexes, and potentially cross-schema FKs. A CASCADE drop will silently remove all of these.

### Blockers to Avoid (from past stories)

- Do not redirect `story-similarity.ts` to `workflow.stories` without first confirming that `workflow.stories` has an `embedding` vector column. Currently it does NOT — the column is explicitly absent from the Drizzle schema. The embedding column must be added (or the query rewritten to not require it) before the redirect is safe.
- Do not `DROP TABLE public.stories` without `IF EXISTS` — the baseline snapshot does not show this table, so it may already be absent.
- Do not assume `story_audit_trigger` and `audit_story_changes()` are still needed after the drop — investigate and document whether those functions should be dropped or repurposed for `workflow.stories`.
- Do not update `story-similarity.ts` using `interface` types — the project mandates Zod schemas with `z.infer<>` for all types (see `SimilarStoryResult` interface on line 18, which violates project standards and should be fixed in this story).

### Architecture Decisions (ADRs)

No ADR-LOG.md found at `plans/stories/ADR-LOG.md`. ADR constraints derived from CLAUDE.md and codebase patterns.

| Constraint | Source | Detail |
|------------|--------|--------|
| Zod-first types | CLAUDE.md | `SimilarStoryResult` in `story-similarity.ts` line 18 is defined as an `interface` — a CLAUDE.md violation. Fix it to a Zod schema with `z.infer<>` as part of this story's code cleanup. |
| No barrel files | CLAUDE.md | `story-similarity.ts` is imported directly (not through a barrel) — this is correct and should be maintained. |
| Migration idempotency | Team pattern | All migrations must be safe to re-run. Use `DROP TABLE IF EXISTS`, `DROP VIEW IF EXISTS`, `DROP FUNCTION IF EXISTS`. |
| Use `@repo/logger` not `console` | CLAUDE.md | `story-similarity.ts` already uses `logger.debug` — maintain this pattern in any new code. |

### Patterns to Follow

- `DROP TABLE IF EXISTS … CASCADE` within a `BEGIN/COMMIT` transaction (see `999_cleanup_duplicate_tables.sql`).
- Drizzle `db.execute(sql\`…\`)` pattern for raw SQL queries (already used in `story-similarity.ts`).
- Zod schemas with `z.infer<>` for all result types — fix the `SimilarStoryResult` interface.
- `COMMENT ON TABLE … IS '…'` and `COMMENT ON FUNCTION … IS '…'` on any created or modified objects.
- Idempotent DDL for any new column additions (`ADD COLUMN IF NOT EXISTS`).

### Patterns to Avoid

- Do not use TypeScript `interface` — use `const SimilarStoryResultSchema = z.object({…})` and `type SimilarStoryResult = z.infer<typeof SimilarStoryResultSchema>`.
- Do not `DROP TABLE` without `IF EXISTS`.
- Do not hardcode column names that may not exist — verify against the live Drizzle schema before writing SQL queries.
- Do not rename `public.stories` to a backup view without verifying that no live code depends on the view name.

---

## Conflict Analysis

### Conflict: `story-similarity.ts` queries `public.stories` which no longer exists in canonical schema (blocking)
- **Severity**: blocking
- **Description**: `apps/api/knowledge-base/src/search/story-similarity.ts` line 51 contains `FROM public.stories WHERE deleted_at IS NULL AND embedding IS NOT NULL`. The current `workflow.stories` Drizzle schema (`workflow.ts` line 53) explicitly excludes `embedding` and `deletedAt` columns ("not yet needed"). This means redirecting the query to `workflow.stories` without also adding these columns will produce a runtime SQL error. The story cannot simply "update the table name" — it must also resolve the missing column dependency.
- **Resolution Hint**: Either (1) add `embedding vector(1536)` and `deleted_at timestamptz` columns to `workflow.stories` as part of this story (or as a prerequisite migration in CDBN-2023), or (2) rewrite `findSimilarStories` to use a different approach that does not require those columns on `workflow.stories`. Option 1 is the cleaner path. Note that `workflow.plans` already has an `embedding vector(1536)` column (line 161 of `workflow.ts`) demonstrating the pattern exists.

### Conflict: Drizzle `legacy.ts` still defines `storyDetails` after `999_consolidate_story_tables.sql` dropped `workflow.story_details` (warning)
- **Severity**: warning
- **Description**: `apps/api/knowledge-base/src/db/schema/legacy.ts` lines 84–109 define a `storyDetails` Drizzle table for `story_details` in the public schema. The migration `999_consolidate_story_tables.sql` dropped `workflow.story_details`. This means the Drizzle schema has a definition for a table that no longer exists in the DB. Any Drizzle query against `storyDetails` will fail at runtime with "relation does not exist".
- **Resolution Hint**: CDBN-2024 should either (a) remove the `storyDetails` definition from `legacy.ts` and fix any imports, or (b) explicitly scope this as a non-goal with a comment noting the table is absent from the DB. Investigate whether any active code queries `storyDetails` before removing it.

### Conflict: `public.stories` CASCADE drop may silently remove functions and triggers (warning)
- **Severity**: warning
- **Description**: The pre-drizzle backup shows `public.stories` had `story_audit_trigger` calling `public.audit_story_changes()`, and indexes including `idx_stories_blocked`, `idx_stories_state`, etc. A `DROP TABLE public.stories CASCADE` will silently drop all dependent triggers and indexes. The `audit_story_changes()` function (visible in `999_full_schema_baseline.sql` line 129) references story columns — after the drop, this function may be orphaned or erroring. Additionally, if a view was created as a "backup" (the story description mentions renaming to "backup view"), the view strategy must be carefully planned.
- **Resolution Hint**: Before writing the DROP migration, audit all objects that depend on `public.stories` using `SELECT * FROM pg_depend WHERE refobjid = 'public.stories'::regclass`. Document what will be cascade-dropped. Decide whether `audit_story_changes()` and `set_story_completed_at()`, `set_story_started_at()` functions should be dropped alongside the table.

---

## Story Seed

### Title

Cleanup: Drop/deprecate `public.stories`, redirect `story-similarity.ts` to `workflow.stories`, update Drizzle ERD

### Description

The four-story CDBN migration sequence (2021–2024) culminates here: CDBN-2021 migrated story data from `public.stories` to `workflow.stories`; CDBN-2022 migrated related tables; CDBN-2023 verified data integrity and updated FK references. CDBN-2024 is the final cleanup — formally removing or deprecating `public.stories` and ensuring all code references are updated.

The current `public.stories` table (documented in the pre-drizzle backup from 2026-02-22) is no longer the canonical stories table. The canonical table is `workflow.stories` in the Drizzle schema. However, one live code reference remains: `apps/api/knowledge-base/src/search/story-similarity.ts` line 51 queries `FROM public.stories` with `deleted_at` and `embedding` column filters. These columns do not yet exist on `workflow.stories` — resolving this is the key technical challenge of this story.

The `999_full_schema_baseline.sql` does not include a `public.stories` table, which suggests the table was already removed in a prior migration on the live DB instance. The cleanup migration must be idempotent (`DROP TABLE IF EXISTS`).

Additionally, the story description calls for updating the ERD and Drizzle schema to reflect the completed migration state — removing legacy Drizzle definitions (`storyDetails` in `legacy.ts`) that reference tables no longer in the DB.

### Initial Acceptance Criteria

- [ ] AC-1: A SQL migration is written (slot to be verified at implementation time) that executes `DROP TABLE IF EXISTS public.stories CASCADE` within a `BEGIN/COMMIT` transaction, and is idempotent on repeated runs.
- [ ] AC-2: The migration documents all objects that will be cascade-dropped (triggers, indexes, functions) with inline SQL comments.
- [ ] AC-3: `workflow.stories` has an `embedding vector(1536)` column available (either added in this migration or confirmed added in CDBN-2022/2023) so that `findSimilarStories` can be redirected to it.
- [ ] AC-4: `apps/api/knowledge-base/src/search/story-similarity.ts` is updated to query `FROM workflow.stories` (using the `workflow` Drizzle schema) instead of `FROM public.stories`.
- [ ] AC-5: The `deleted_at` and `embedding IS NOT NULL` filters in `findSimilarStories` are updated to match the actual columns available on `workflow.stories`. If `deleted_at` is absent, the filter is removed or replaced with an appropriate guard.
- [ ] AC-6: `SimilarStoryResult` in `story-similarity.ts` line 18 is converted from a TypeScript `interface` to a Zod schema (`SimilarStoryResultSchema = z.object({…})`) with `type SimilarStoryResult = z.infer<typeof SimilarStoryResultSchema>`.
- [ ] AC-7: All tests that reference `story-similarity.ts` continue to pass after the Zod conversion. Run `pnpm test` in `apps/api/knowledge-base` to verify.
- [ ] AC-8: The `storyDetails` Drizzle table definition in `apps/api/knowledge-base/src/db/schema/legacy.ts` is either removed (if no code imports it) or annotated with a `// DEPRECATED: table dropped in 999_consolidate_story_tables.sql` comment. If removed, verify no remaining imports produce type errors (`pnpm check-types`).
- [ ] AC-9: The `docs/architecture/databases.md` file is updated to reflect the four-schema layout post-CDBN migration, removing any references to `public.stories` and confirming `workflow.stories` as canonical.
- [ ] AC-10: A pgtap test (optional but recommended) confirms `public.stories` does not exist: `hasnt_table('public', 'stories', 'public.stories should be dropped by CDBN-2024')`.
- [ ] AC-11: TypeScript compilation passes (`pnpm check-types`) with no new errors after all code changes.
- [ ] AC-12: ESLint passes (`/lint-fix`) with no new errors on changed files.

### Non-Goals

- Do NOT modify `workflow.stories` table structure beyond adding `embedding` and `deleted_at` if confirmed absent — no other schema changes in scope.
- Do NOT migrate story data — data migration was the scope of CDBN-2021.
- Do NOT update FK references from other tables to `public.stories` — that was CDBN-2022 and CDBN-2023 scope.
- Do NOT modify `audit_story_changes()`, `set_story_completed_at()`, or `set_story_started_at()` PostgreSQL functions beyond dropping them if they are only referenced by `public.stories`. Do not rewrite them.
- Do NOT update any frontend or API-gateway code — this story is backend DB + TypeScript source only.
- Do NOT create a backup view of `public.stories` unless CDBN-2023 explicitly confirmed data integrity and the team decides a view is needed for transition — the default is a clean drop.
- Do NOT modify `packages/backend/orchestrator/src/scripts/migrate-langgraph-data.ts` — that script references `public.stories` in a different DB context (LangGraph → WINT migration, not KB DB) and is out of scope.

### Reuse Plan

- **Patterns**: `DROP TABLE IF EXISTS … CASCADE` within `BEGIN/COMMIT` from `999_cleanup_duplicate_tables.sql`.
- **Query pattern**: `db.execute(sql\`SELECT … FROM workflow.stories …\`)` — `workflow.ts` table definition already uses `pgSchema('workflow')` prefix.
- **Zod conversion pattern**: `z.object({…})` with `z.infer<>` — follow all other Zod types in the codebase.
- **Packages**: No new packages required. `drizzle-orm`, `zod`, `@repo/logger` are already imported in `story-similarity.ts`.

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This story has two distinct testing surfaces:

1. **SQL/DB layer (pgtap)**: Verify that `public.stories` does not exist after migration. Use `hasnt_table('public', 'stories', …)`. Verify the migration is idempotent (run twice without error). If `embedding` column is added to `workflow.stories`, write a test confirming column existence.

2. **TypeScript unit tests**: The existing tests for `story-similarity.ts` and `story-context.ts` must still pass after the `workflow.stories` redirect and Zod conversion. Focus on:
   - `findSimilarStories` returns correctly shaped results (`SimilarStoryResult[]` validated by Zod).
   - The function handles the case where `embedding IS NULL` gracefully (if the filter changes).
   - No TypeScript type errors in consumers (`mcp-server/tool-handlers.ts`, `crud-operations/story-context.ts`).

There is no UAT surface for this story — it is infrastructure cleanup with no user-visible behavior change (assuming `story-similarity.ts` was non-functional anyway while pointing at `public.stories`).

### For UI/UX Advisor

Not applicable. This story has no user interface component. The only observable behavior change is that story similarity search will function correctly (it was likely broken, querying a dropped table).

### For Dev Feasibility

Key implementation questions to resolve before writing code:

1. **Does `public.stories` actually exist in the live DB?** The `999_full_schema_baseline.sql` does not contain it, suggesting it was already dropped. Confirm with `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='stories')`. If it does not exist, the migration is trivially `DROP TABLE IF EXISTS public.stories CASCADE` (a no-op on the live DB) and the focus shifts entirely to the TypeScript code fix.

2. **Does `workflow.stories` have an `embedding` column?** The Drizzle schema (`workflow.ts` line 53) explicitly excludes it. If the live DB also lacks it, `findSimilarStories` cannot be redirected until the column is added. The CDBN-2021/2022 stories may have added it — confirm with `SELECT column_name FROM information_schema.columns WHERE table_schema='workflow' AND table_name='stories' AND column_name='embedding'`. If absent, add `embedding vector(1536)` and an ivfflat index in this migration (or request CDBN-2023 adds it).

3. **What code references `storyDetails` from `legacy.ts`?** Run `grep -rn "storyDetails" apps/api/knowledge-base/src/ --include="*.ts"` to find all import sites. If none, the definition can be safely removed. If some exist, trace them to understand impact.

4. **Migration slot**: Current highest confirmed slot in the migration directory is `1008_kfmb1020_story_content_columns.sql`. The next available slot is `1009` or higher. Verify at implementation time. The CDBN story ID does not suggest a specific slot number (unlike CDBE stories).

5. **Cascade dependency audit**: Before writing the DROP migration, run:
   ```sql
   SELECT dependent_ns.nspname || '.' || dependent_view.relname AS dependent_object,
          dependent_view.relkind
   FROM pg_depend
   JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
   JOIN pg_class AS dependent_view ON pg_rewrite.ev_class = dependent_view.oid
   JOIN pg_class AS source_table ON pg_depend.refobjid = source_table.oid
   JOIN pg_namespace dependent_ns ON dependent_view.relnamespace = dependent_ns.oid
   WHERE source_table.relname = 'stories'
   AND source_table.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
   ```
   And check `pg_trigger` for triggers on `public.stories`.

6. **Canonical reference files for implementation**:
   - `apps/api/knowledge-base/src/db/migrations/999_cleanup_duplicate_tables.sql` — DROP TABLE migration template.
   - `apps/api/knowledge-base/src/search/story-similarity.ts` — primary file to update.
   - `apps/api/knowledge-base/src/db/schema/workflow.ts` lines 33–58 — column list for `workflow.stories`.
   - `apps/api/knowledge-base/src/db/schema/legacy.ts` — storyDetails definition to remove.

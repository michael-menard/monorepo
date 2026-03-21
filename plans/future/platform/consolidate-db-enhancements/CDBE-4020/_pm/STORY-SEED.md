---
generated: "2026-03-18"
baseline_used: null
baseline_date: null
lessons_loaded: true
adrs_loaded: false
conflicts_found: 3
blocking_conflicts: 1
---

# Story Seed: CDBE-4020

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No baseline reality file was provided (`baseline_path: null`). Codebase was scanned directly and KB story context was used as the source of truth.

### Relevant Existing Features

| Feature | Status | Notes |
|---------|--------|-------|
| `public.knowledge_entries` with `embedding vector(1536)` | Deployed | Has an ivfflat index `knowledge_entries_embedding_idx` with `lists='100'`. This is the canonical source table for semantic KB search today. |
| `public.adrs`, `public.code_standards`, `public.cohesion_rules`, `public.lessons_learned`, `public.rules` | Deployed | Five knowledge specialty tables. None currently have embedding columns. Defined in `kb.ts` Drizzle schema. |
| `public.embedding_cache` | Deployed | Caches embedding vectors by content hash; already has `vector(1536) NOT NULL`. Used to avoid re-calling OpenAI. |
| `vector` customType in `kb.ts` | Deployed | Lines 24–39 of `apps/api/knowledge-base/src/db/schema/kb.ts` define the shared Drizzle `vector` customType — reusable for all new columns. |
| `workflow.plans.embedding vector(1536)` | Deployed | Baseline line 2869, ivfflat index. Grandfathered ivfflat pattern — CDBE-4010/4020 introduce HNSW for new tables. |
| `EmbeddingClient` | Deployed | Production-ready, generating embeddings for `knowledge_entries`. No direct file reference confirmed but referenced in CDBE-4010 context. |
| Migration safety preamble pattern | Deployed | Canonical pattern in `1007_pipe_0020_ghost_state_audit.sql` lines 28–35. |
| Migration slot 1009 | In-progress (CDBE-4010) | CDBE-4010 plans to occupy slot 1009. Last confirmed numbered migration is `1010_story_state_history_trigger.sql`. **CDBE-4020 must verify free slot at implementation time — 1011 is the expected next free slot as of 2026-03-18.** |

### Active In-Progress Work

| Story | State | Overlap Risk |
|-------|-------|-------------|
| CDBE-4010 | elab | Direct upstream dependency — creates `workflow.story_embeddings`, `workflow.plan_embeddings`, and `workflow.embedding_section_lookup`. CDBE-4020 must not start implementation until CDBE-4010 is merged. |
| CDBE-4030 | backlog | Downstream dependent — the embedding worker process. CDBE-4030 depends on CDBE-4020 completing. No overlap risk. |

### Constraints to Respect

- pgvector extension is installed in the `public` schema on the `knowledgebase` DB (port 5433). All `vector_cosine_ops` references must use the `public.` prefix.
- Embedding dimension is `vector(1536)` throughout the codebase. New columns must match.
- HNSW was chosen for CDBE-4010's new tables (CDBE-4010 architecture note). CDBE-4020 must use the same index type for consistency across the embedding subsystem.
- The migration must target only the `knowledgebase` DB. The DB safety preamble DO block (checking `current_database() = 'knowledgebase'`) is required.
- The five target tables (`lessons_learned`, `adrs`, `code_standards`, `rules`, `cohesion_rules`) live in the `public` schema, not `workflow`.
- `wint.*` and `kbar.*` references are dead schemas per project policy — do not create or reference them.
- `db:generate` Drizzle tooling has a known `sets.js` module resolution failure (lesson from WINT-0040). Migration SQL must be authored manually.

---

## Retrieved Context

### Related Endpoints

None identified — this is a pure DB schema migration story. No Lambda handlers or API Gateway routes are touched.

### Related Components

None — no UI components. Backend-only migration.

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|-------------|
| `vector` customType | `apps/api/knowledge-base/src/db/schema/kb.ts` lines 24–39 | Import directly for all five new Drizzle column definitions — do not redefine |
| Migration safety preamble DO block | `apps/api/knowledge-base/src/db/migrations/1007_pipe_0020_ghost_state_audit.sql` lines 28–35 | Copy `current_database() != 'knowledgebase'` check verbatim |
| `CREATE INDEX CONCURRENTLY IF NOT EXISTS` pattern | `apps/api/knowledge-base/src/db/migrations/1002_artifact_precondition_index.sql` | Safe pattern for all five HNSW index creations |
| ivfflat reference for comparison | `apps/api/knowledge-base/src/db/migrations/999_full_schema_baseline.sql` line 2725 (lists='100') | Cross-reference to confirm HNSW is the right choice at expected data volumes |
| pgtap test structure | `apps/api/knowledge-base/src/db/migrations/pgtap/1007_pipe_0020_ghost_state_audit_test.sql` | Gold standard for KB pgtap assertion file layout |
| `kb.ts` table definitions (5 tables) | `apps/api/knowledge-base/src/db/schema/kb.ts` | The Drizzle schema to modify — add `embedding: vector('embedding', { dimensions: 1536 })` column to each of the 5 tables |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| SQL migration with DB safety preamble + idempotent DDL + RAISE NOTICE progress | `apps/api/knowledge-base/src/db/migrations/1007_pipe_0020_ghost_state_audit.sql` | Gold standard KB migration: safety check, idempotent guards, structured sections |
| Drizzle table with `vector(1536)` column — `public` schema | `apps/api/knowledge-base/src/db/schema/kb.ts` lines 41–60 (`knowledgeEntries`) | Direct pattern: `embedding: vector('embedding', { dimensions: 1536 })` in a public-schema Drizzle table — same schema as the five target tables |
| `CREATE INDEX CONCURRENTLY IF NOT EXISTS` | `apps/api/knowledge-base/src/db/migrations/1002_artifact_precondition_index.sql` | Pattern for safe concurrent index creation |
| pgtap test structure | `apps/api/knowledge-base/src/db/migrations/pgtap/1007_pipe_0020_ghost_state_audit_test.sql` | Authoritative structure for KB pgtap assertions |

---

## Knowledge Context

### Lessons Learned

- **[WINT-0040]** pgvector is not installed in the local dev postgres container. Migration uses conditional DO blocks (`CREATE EXTENSION IF EXISTS` guard). HNSW index creation must also be conditional. (*Applies because*: same pattern needed for any migration that touches vector index creation — CDBE-4020 must guard HNSW index creation in case local env is missing pgvector.)

- **[WINT-0040]** `db:generate` fails with `sets.js` module resolution error. Migration SQL must be authored manually following existing migration format. (*Applies because*: CDBE-4020 is a migration-only story — the implementing agent must not attempt `pnpm db:generate` and must hand-author the SQL.)

- **[WINT-4030 / concurrent]** Migration sequence numbers can be claimed by concurrent stories between planning and implementation. Slot 1009 is claimed by CDBE-4010; slot 1010 is claimed by `1010_story_state_history_trigger.sql`. **Verify the next free slot at implementation time** — expected: 1011. (*Applies because*: CDBE-4020 must claim its migration slot at implementation time, not planning time.)

- **[General]** For small datasets (< 1000 rows), HNSW outperforms ivfflat: no manual `lists` tuning required and higher recall at low row counts. (*Applies because*: knowledge tables (lessons_learned, adrs, code_standards, rules, cohesion_rules) are expected to stay well under 1000 rows at launch.)

- **[WINT-0060]** Migration filename in EVIDENCE.yaml can drift from actual generated filename if slots shift. During QA, verify migration content by searching for expected SQL statements, not exact filename. (*Applies because*: migration slot must be confirmed fresh at implementation time.)

- **[General]** Drizzle functional indexes cannot be expressed in the Drizzle table definition — they must be enforced in migration SQL only. (*Applies because*: HNSW indexes on the five knowledge tables must be created in migration SQL, not in Drizzle table definitions.)

### Blockers to Avoid (from past stories)

- Do NOT attempt `pnpm db:generate` for this migration — it will fail. Author migration SQL manually.
- Do NOT use ivfflat for the new knowledge-table indexes — HNSW is the chosen type for all new embedding indexes in CDBE-4010/4020/4030. Document the rationale in a migration SQL comment.
- Do NOT hardcode migration slot number 1009 or 1010 in this story's artifacts — those are taken. Verify the free slot at implementation time.
- Do NOT start implementation before CDBE-4010 is merged (BLOCKING dependency — the pgvector extension is confirmed installed, but the Drizzle `vector` customType import must be verified post-4010).
- Do NOT skip the `current_database() = 'knowledgebase'` safety preamble — accidentally running against `lego_dev` (port 5432) would modify the wrong database.
- Do NOT create or reference `wint.*` or `kbar.*` — these are dead schemas.

### Architecture Decisions (ADRs)

No formal ADR-LOG.md was found at `plans/stories/ADR-LOG.md`. Architecture constraints extracted from codebase scanning:

| Constraint | Source |
|------------|--------|
| pgvector extension in `public` schema; all `vector_cosine_ops` refs must use `public.` prefix | `999_full_schema_baseline.sql` line 2725 |
| All embedding columns use `vector(1536)` (text-embedding-3-small dimensions) | `kb.ts` line 44, `workflow.ts` line 161 |
| HNSW chosen for all new embedding indexes in CDBE-4xxx series (vs. ivfflat which is grandfathered) | CDBE-4010.md architecture notes |
| Knowledgebase DB is at port 5433; lego_dev at port 5432 — migration must target knowledgebase | CDBE-4010.md infrastructure notes |
| `CREATE INDEX CONCURRENTLY IF NOT EXISTS` required for all new indexes | `1002_artifact_precondition_index.sql` pattern |

### Patterns to Follow

- Safety preamble DO block checking `current_database() = 'knowledgebase'` before any DDL.
- All DDL uses `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` guards.
- HNSW index creation with `CONCURRENTLY IF NOT EXISTS` and SQL comment documenting `m` and `ef_construction` rationale.
- `COMMENT ON TABLE` with migration number prefix (e.g., `'1011: ...'`) for each modified table.
- Drizzle `vector` column pattern: `embedding: vector('embedding', { dimensions: 1536 })` (nullable — `NULL` = not yet computed by CDBE-4030 worker).
- Manual SQL migration authoring (no `db:generate`).
- Export `type LessonsLearned = typeof lessonsLearned.$inferSelect` etc. for each modified table in `kb.ts`.

### Patterns to Avoid

- Do NOT use ivfflat for the five new knowledge-table indexes (grandfathered only on pre-existing `knowledge_entries` and `plans` tables).
- Do NOT add NOT NULL constraint to the `embedding` column — it must be nullable so rows can exist pre-embedding-generation.
- Do NOT create a separate embedding table (like CDBE-4010's `story_embeddings` approach) — the story description specifies **inline columns** on the five target tables.
- Do NOT reference `public.stories` in any query — that bug was fixed in CDBE-4010.

---

## Conflict Analysis

### Conflict: Blocking Dependency on CDBE-4010

- **Severity**: blocking
- **Description**: CDBE-4020 can only begin implementation after CDBE-4010 is merged and deployed. CDBE-4010 (currently in "elab" state) establishes the pgvector-on-knowledgebase foundation and confirms the `vector` customType pattern in `workflow.ts`. While pgvector is already installed, the Drizzle vector column pattern on the knowledge-base schema must be verified against CDBE-4010's final implementation before CDBE-4020 proceeds.
- **Resolution Hint**: Monitor CDBE-4010 state transition to `UAT` or `completed`. Do not transition CDBE-4020 to `in_progress` until CDBE-4010 is complete. Elaboration can proceed now.

### Conflict: Migration Slot Unknown at Planning Time

- **Severity**: warning
- **Description**: Slots 1009 (reserved for CDBE-4010) and 1010 (taken by `1010_story_state_history_trigger.sql`) are both occupied. The expected free slot is 1011, but concurrent CDBE-series stories (CDBE-1010, CDBE-1020, etc.) may claim earlier slots. The correct migration number cannot be confirmed until implementation time.
- **Resolution Hint**: At implementation time, run `ls apps/api/knowledge-base/src/db/migrations/ | grep -v 999 | sort | tail -5` to find the latest slot and add 1. Do not hardcode 1011 in story documentation. Update all references (migration filename, pgtap test filename, COMMENT ON TABLE prefix) after slot confirmation.

### Conflict: Five Tables in One Migration — Long-Migration Risk

- **Severity**: warning
- **Description**: Adding `embedding vector(1536)` columns and HNSW indexes to five tables in a single migration creates risk: (1) if any table has unexpected volume, `CREATE INDEX CONCURRENTLY` may take longer than expected; (2) a partial failure mid-migration leaves the schema in an inconsistent state. The knowledge tables are expected to be small (< 1000 rows), but this should be verified.
- **Resolution Hint**: Pre-flight each table with a row count check (RAISE NOTICE with `SELECT COUNT(*) FROM public.<table>`). If any table has > 10,000 rows at implementation time, consider splitting into separate migrations. Use `BEGIN`/`COMMIT` with careful transaction boundaries — note that `CREATE INDEX CONCURRENTLY` cannot run inside a transaction block in PostgreSQL, so each HNSW index must be created outside a transaction.

---

## Story Seed

### Title

Embedding Columns on Knowledge Tables (CDBE-4020)

### Description

The knowledgebase database has five knowledge specialty tables — `public.lessons_learned`, `public.adrs`, `public.code_standards`, `public.rules`, and `public.cohesion_rules` — none of which have `embedding` columns today. The `EmbeddingClient` already generates embeddings for `public.knowledge_entries`, and the `public.embedding_cache` table handles deduplication. CDBE-4010 (upstream dependency) establishes the HNSW index pattern and confirms the `vector` customType is reusable.

This story adds `embedding vector(1536)` columns (nullable) and HNSW indexes to all five knowledge tables, enabling the CDBE-4030 embedding worker to backfill and maintain these indexes, and enabling semantic similarity search across all KB entity types for retrieval-augmented generation and agent context lookup.

The implementation is a single SQL migration (manual authoring — `db:generate` has a known failure), a Drizzle schema update to `kb.ts` (add `embedding` column to five table definitions), and a pgtap test file verifying schema correctness.

### Initial Acceptance Criteria

- [ ] **AC-1**: A migration file `1011_cdbe4020_embedding_columns_knowledge_tables.sql` (or next free slot — verify at implementation time) exists in `apps/api/knowledge-base/src/db/migrations/` and includes a DB safety preamble DO block verifying `current_database() = 'knowledgebase'` before executing any DDL.

- [ ] **AC-2**: Each of the five target tables has an `embedding vector(1536)` column added via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS embedding public.vector(1536)` (nullable — `NULL` = not yet computed by CDBE-4030 worker):
  - `public.lessons_learned`
  - `public.adrs`
  - `public.code_standards`
  - `public.rules`
  - `public.cohesion_rules`

- [ ] **AC-3**: HNSW indexes exist on `embedding` for all five tables, created with `CREATE INDEX CONCURRENTLY IF NOT EXISTS ... USING hnsw (embedding public.vector_cosine_ops)`. Each index creation includes a SQL comment documenting the chosen `m` and `ef_construction` parameters with rationale (recommended: `m=16, ef_construction=64` for tables with < 1,000 rows — consistent with CDBE-4010).

- [ ] **AC-4**: The migration is fully idempotent. Running twice produces zero errors and no duplicate objects. `ADD COLUMN IF NOT EXISTS` guards prevent duplicate columns; `CREATE INDEX CONCURRENTLY IF NOT EXISTS` prevents duplicate indexes.

- [ ] **AC-5**: `COMMENT ON COLUMN` (or `COMMENT ON TABLE`) statements with migration number prefix (e.g., `'1011: embedding column added for CDBE-4020 — vector(1536) for semantic search'`) exist for all five new columns.

- [ ] **AC-6**: All five knowledge table definitions in `apps/api/knowledge-base/src/db/schema/kb.ts` are updated with the `embedding` column using the shared `vector` customType (`embedding: vector('embedding', { dimensions: 1536 })`). TypeScript inferred types are re-exported from the file (or new ones added). `pnpm check-types --filter @repo/knowledge-base` exits 0.

- [ ] **AC-7**: A pgtap test file `apps/api/knowledge-base/src/db/migrations/pgtap/1011_cdbe4020_embedding_columns_knowledge_tables_test.sql` (matching migration slot) verifies:
  - (a) `embedding` column exists on all five tables with type `USER-DEFINED` (vector) (`col_type_is`)
  - (b) HNSW indexes exist on all five tables and `pg_indexes.indexdef` contains `USING hnsw`
  - (c) `embedding` column is nullable on all five tables

- [ ] **AC-8**: Pre-flight row count RAISE NOTICE for each table appears in migration SQL, so operators can observe volume at run time without separate queries.

- [ ] **AC-9**: pgvector version guard — migration includes a pre-flight check that `SELECT extversion FROM pg_extension WHERE extname = 'vector'` returns >= `0.5.0` (HNSW was added in 0.5.0). If version check fails, migration raises a clear EXCEPTION rather than silently using ivfflat or failing with a cryptic error.

### Non-Goals

- Do NOT create separate embedding tables (like CDBE-4010's normalized `story_embeddings` / `plan_embeddings` approach) — this story adds **inline columns** to the five existing tables.
- Do NOT implement embedding generation triggers, NOTIFY/LISTEN patterns, or OpenAI API calls — that is CDBE-4030's scope.
- Do NOT backfill existing rows with embeddings — that is CDBE-4030's scope.
- Do NOT change the existing ivfflat index on `public.knowledge_entries` — grandfathered, out of scope.
- Do NOT modify the `workflow.*` schema — all five target tables are in the `public` schema.
- Do NOT create or reference `wint.*` or `kbar.*` schemas.
- Do NOT modify `workflow.ts` — only `kb.ts` needs Drizzle schema updates.

### Reuse Plan

- **Migration Patterns**: Copy safety preamble from `1007_pipe_0020_ghost_state_audit.sql` lines 28–35. Use `1002_artifact_precondition_index.sql` for `CREATE INDEX CONCURRENTLY IF NOT EXISTS` syntax.
- **Drizzle Schema**: Import `vector` from `'./kb.js'` (already exported from `kb.ts` — no redefinition needed). Follow the `knowledgeEntries.embedding` column definition (line 44) as the exact pattern.
- **pgtap Structure**: Copy and adapt from `pgtap/1007_pipe_0020_ghost_state_audit_test.sql`.
- **Packages**: `apps/api/knowledge-base` only. No shared packages modified.

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- This story requires two test tiers: pgtap integration (schema assertions) and TypeScript compile check (`pnpm check-types`).
- No Vitest unit tests are strictly required unless a query function is added for semantic search on the knowledge tables (not in scope for this story).
- Key pgtap assertions: `col_type_is` with `USER-DEFINED` for vector columns, `has_index` + `indexdef LIKE '%hnsw%'` for HNSW confirmation, nullable column assertions.
- Idempotency test: run migration twice; assert no errors and no duplicated indexes (check `pg_indexes` count per table).
- pgvector version guard test: if possible, mock `extversion` < `0.5.0` and verify exception is raised.
- Critical edge case: `CREATE INDEX CONCURRENTLY` cannot run inside a transaction block in PostgreSQL. The pgtap test must run against a DB where the migration has already been applied — it should NOT attempt to apply the migration inline.
- Verify all five tables affected — a common QA miss is checking only the first 2–3 tables and assuming the rest are symmetric.

### For UI/UX Advisor

Not applicable — this is a pure database migration story. No UI components or user-facing changes.

### For Dev Feasibility

- **Migration slot**: Expected 1011. Confirm with `ls apps/api/knowledge-base/src/db/migrations/ | grep -v 999 | sort | tail -5` at implementation time. Update filename and all references.
- **Transaction boundary caveat**: `CREATE INDEX CONCURRENTLY` cannot run inside a transaction block. Structure the migration SQL so each `ALTER TABLE ADD COLUMN` can be in a transaction, but each `CREATE INDEX CONCURRENTLY` runs outside a transaction (or use a separate DO block / direct statement).
- **pgvector >= 0.5.0 check**: Add `DO $$ BEGIN IF (SELECT extversion FROM pg_extension WHERE extname = 'vector') < '0.5.0' THEN RAISE EXCEPTION '...'; END IF; END $$;` as part of the safety preamble section.
- **Five tables, one migration**: At implementation time, run `SELECT COUNT(*) FROM public.<table>` for each table and log with RAISE NOTICE. If any table exceeds 10,000 rows, recommend splitting into per-table migrations to limit HNSW index build time.
- **Drizzle schema**: No `db:generate` — author manually. Update `kb.ts` by adding `embedding: vector('embedding', { dimensions: 1536 })` to `adrs`, `codeStandards`, `cohesionRules`, `lessonsLearned`, and `rules` table definitions. Re-run `pnpm check-types --filter @repo/knowledge-base` to verify.
- **Blocking dependency**: Do not begin ST-1 (write migration) until CDBE-4010 is merged and `vector` customType import path is confirmed. Elaboration is unblocked.
- **Canonical references for subtask decomposition**:
  - `apps/api/knowledge-base/src/db/migrations/1007_pipe_0020_ghost_state_audit.sql` — SQL migration structure
  - `apps/api/knowledge-base/src/db/schema/kb.ts` — Drizzle schema to modify (all five target tables are here)
  - `apps/api/knowledge-base/src/db/migrations/pgtap/1007_pipe_0020_ghost_state_audit_test.sql` — pgtap test structure
  - `apps/api/knowledge-base/src/db/migrations/1002_artifact_precondition_index.sql` — `CREATE INDEX CONCURRENTLY IF NOT EXISTS` pattern

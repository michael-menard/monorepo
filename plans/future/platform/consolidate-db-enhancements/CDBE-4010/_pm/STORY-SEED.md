---
generated: '2026-03-18'
baseline_used: null
baseline_date: null
lessons_loaded: true
adrs_loaded: false
conflicts_found: 3
blocking_conflicts: 0
---

# Story Seed: CDBE-4010

## Reality Context

### Baseline Status

- Loaded: no
- Date: N/A
- Gaps: No baseline file provided (null baseline_path). Codebase scanning used as primary reality source.

### Relevant Existing Features

| Feature | Location | Notes |
|---------|----------|-------|
| `vector` customType (Drizzle) | `apps/api/knowledge-base/src/db/schema/kb.ts` lines 24–38 | Custom Drizzle type wrapping `vector(N)` SQL; serializes/deserializes `number[]`. Shared across both `public` and `workflow` schemas. |
| `public.vector` extension already installed | `apps/api/knowledge-base/src/db/migrations/999_full_schema_baseline.sql` line 74 | `CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;` — pgvector is already active in the knowledgebase database. HNSW and ivfflat access methods are available. |
| `public.knowledge_entries.embedding` | `apps/api/knowledge-base/src/db/schema/kb.ts` line 44 | `vector('embedding', { dimensions: 1536 })` — ivfflat index on this column in the full schema baseline. |
| `public.embedding_cache` table | `apps/api/knowledge-base/src/db/schema/kb.ts` lines 62–68 | Caches OpenAI embeddings by `content_hash + model`; column is `vector(1536) NOT NULL`. Model default is `text-embedding-3-small`. |
| `workflow.plans.embedding` | `apps/api/knowledge-base/src/db/schema/workflow.ts` line 161 | `vector('embedding', { dimensions: 1536 })` — ivfflat index `idx_plans_embedding` exists in the full schema baseline. |
| `workflow.hitl_decisions.embedding` | `apps/api/knowledge-base/src/db/schema/workflow.ts` line 391 | Existing embedding column — demonstrates the pattern is already in use in the workflow schema. |
| `EmbeddingClient` | `apps/api/knowledge-base/src/embedding-client/index.ts` | Production-ready OpenAI embedding client with PostgreSQL caching, batch processing, retry logic. Default model: `text-embedding-3-small`. |
| `findSimilarStories()` / `findSimilarPlans()` | `apps/api/knowledge-base/src/search/story-similarity.ts`, `plan-similarity.ts` | Cosine similarity searches using `<=>` operator over embedding columns. NOTE: `story-similarity.ts` queries `FROM public.stories` — this will break if stories table remains only in `workflow.stories`. |
| Migration numbering | `apps/api/knowledge-base/src/db/migrations/` | Highest numbered migration is `1008_kfmb1020_story_content_columns.sql`. Next available slot is `1009`. |
| `workflow.stories` Drizzle schema comment | `apps/api/knowledge-base/src/db/schema/workflow.ts` line 53 | `// Removed: embedding, deletedAt (not yet needed)` — embedding was explicitly removed from the stories table. CDBE-4010 targets `story_embeddings` and `plan_embeddings` as separate tables, not direct columns on the primary tables. |

### Active In-Progress Work

| Story | Title | Relevance |
|-------|-------|-----------|
| CDBE-4020 | Embedding Columns on Knowledge Tables | Direct downstream consumer — depends on CDBE-4010 pgvector foundation |
| CDBE-4030 | Embedding Worker Process and Backfill | Depends on CDBE-4020 which depends on CDBE-4010 |
| PIPE-0020 (merged) | Ghost State Data Migration | Migration 1007 is merged; migration slot accounting is now at 1009+ |
| KFMB-1020 (merged) | Story Content Columns | Migration 1008 is merged |

### Constraints to Respect

- pgvector extension (`CREATE EXTENSION vector`) is already installed in the knowledgebase DB (baseline SQL line 74). CDBE-4010 must NOT attempt to re-install it; use `CREATE EXTENSION IF NOT EXISTS` if referenced at all.
- Existing embedding usage on `workflow.plans` and `workflow.hitl_decisions` uses `ivfflat` indexes. The story description calls for HNSW — this is a forward-looking choice. Both methods are available; the migration should document the rationale for choosing HNSW over ivfflat for the new tables.
- The `vector` customType is defined in `kb.ts` and imported into `workflow.ts` — it must not be redefined. New Drizzle table registrations must import it from `'./kb.js'` (same pattern as `workflow.ts` line 29).
- Migration slot 1009 is the next available as of 2026-03-18. Verify at implementation time that no intervening story has consumed this slot.
- All KB migrations include a database safety preamble checking `current_database() = 'knowledgebase'` (established pattern from migrations 1007+).
- Drizzle schema registration is required for any new `workflow.*` table — without it, TypeScript types and query builder will not reflect the new tables.
- The story description targets `workflow.story_embeddings` and `workflow.plan_embeddings` as separate tables. Confirm this is the intended architecture (vs. adding columns directly to `workflow.stories` and `workflow.plans`). The comment in `workflow.ts` line 53 "Removed: embedding, deletedAt (not yet needed)" suggests the design intent is to keep embeddings separate.
- The "embedding section lookup" mentioned in the story description has no existing analog in the codebase. Its exact schema must be defined during elaboration.

---

## Retrieved Context

### Related Endpoints

None — this is a pure database schema/migration story. No API endpoints are created or modified.

### Related Components

None — no UI components are involved.

### Reuse Candidates

| Candidate | Path | Why |
|-----------|------|-----|
| `vector` customType | `apps/api/knowledge-base/src/db/schema/kb.ts` lines 24–38 | Must be reused (not redefined) for Drizzle schema registration of new tables |
| `workflow.plans` embedding pattern | `apps/api/knowledge-base/src/db/schema/workflow.ts` line 161 + baseline migration | Exact model for adding `vector(1536)` column to a workflow table with Drizzle schema registration |
| ivfflat index on `knowledge_entries.embedding` | `999_full_schema_baseline.sql` line 2725 | Shows the `USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100')` pattern for knowledge tables |
| ivfflat index on `workflow.plans` | `999_full_schema_baseline.sql` line 2872 | `WITH (lists='20')` — scaled-down parameter for smaller workflow tables |
| Migration 1007 safety preamble | `apps/api/knowledge-base/src/db/migrations/1007_pipe_0020_ghost_state_audit.sql` lines 28–35 | Standard `current_database()` safety check DO block |
| `EmbeddingClient` | `apps/api/knowledge-base/src/embedding-client/index.ts` | Already wired and caching; the worker story (CDBE-4030) will use this — CDBE-4010 does not call it but should document the dependency |
| `findSimilarStories()` | `apps/api/knowledge-base/src/search/story-similarity.ts` | Currently queries `public.stories` (which may not exist) — if new `story_embeddings` table is separate, this search function will need updating in a follow-on story |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| SQL migration with DB safety preamble + sectioned DO blocks | `apps/api/knowledge-base/src/db/migrations/1007_pipe_0020_ghost_state_audit.sql` | Gold standard KB migration structure: safety check, idempotent DDL, RAISE NOTICE progress logging |
| Drizzle table definition with `vector` column in `workflow` schema | `apps/api/knowledge-base/src/db/schema/workflow.ts` (plans table, lines 140–166) | Direct pattern for registering `vector(1536)` column in a workflow-schema Drizzle table using the shared `vector` customType |
| Index creation for embedding columns | `apps/api/knowledge-base/src/db/migrations/999_full_schema_baseline.sql` lines 2722–2725 and 2869–2872 | Shows both high-list and low-list ivfflat index configurations for different table sizes |
| Migration with `CREATE INDEX CONCURRENTLY IF NOT EXISTS` | `apps/api/knowledge-base/src/db/migrations/1002_artifact_precondition_index.sql` | HNSW/ivfflat index builds on large tables should use CONCURRENTLY to avoid table locks |

---

## Knowledge Context

### Lessons Learned

- **[WINT-0040]** pgvector extension is not installed in the local development postgres:16 container. (category: edge-cases)
  - *Applies because*: CDBE-4010 will add HNSW indexes requiring the pgvector extension. The migration must guard against environments where pgvector is absent using `CREATE EXTENSION IF NOT EXISTS`. However, for the knowledgebase DB specifically, the baseline snapshot confirms pgvector IS installed — this is only a local dev concern if developers run against non-baseline containers.

- **[WINT-4030 / CDBE-1005]** Migration sequence numbers can be consumed by concurrent stories. (category: architecture)
  - *Applies because*: Slot 1009 is the expected next slot, but must be verified at implementation time. Any concurrent story in the CDBE, PIPE, or KFMB tracks could consume 1009 before this story is implemented.

- **[CDBN-1050]** Migration safety preambles prevent wrong-database execution. (category: architecture)
  - *Applies because*: The knowledgebase DB (port 5433) is distinct from lego_dev (port 5432). Any accidental migration run against the wrong DB without a safety preamble could silently corrupt schema. This must be included.

- **[WINT-0060]** Migration filename in EVIDENCE.yaml can drift from actual generated filename. (category: testing)
  - *Applies because*: If migration slot shifts at implementation time, any pre-authored evidence or test plan referencing the filename `1009_cdbe4010_*.sql` must be updated to match the actual file created.

### Blockers to Avoid (from past stories)

- Do not attempt `CREATE EXTENSION vector` without `IF NOT EXISTS` — the extension is already installed in the knowledgebase DB and a duplicate install without the guard will error.
- Do not redefine the `vector` customType in `workflow.ts` or in a new schema file — import it from `'./kb.js'` as the existing workflow tables already do.
- Do not build HNSW or ivfflat indexes without `CONCURRENTLY IF NOT EXISTS` — these index types lock the table during build if not concurrent, which is unsafe on a live database.
- Do not assume migration slot 1009 is free at implementation time — verify before writing the filename.
- Do not leave new `workflow.*` tables unregistered in the Drizzle schema file — this causes type drift.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| N/A | No ADR-LOG found | No ADR file at `plans/stories/ADR-LOG.md` — ADRs loaded: false |

*Informal architectural constraints derived from codebase analysis:*

- **Separate embedding tables vs. inline columns**: The `workflow.stories` schema comment explicitly notes that `embedding` was removed as "not yet needed." The story description specifies `workflow.story_embeddings` and `workflow.plan_embeddings` as named tables. This is the intended architecture — do not add `embedding` directly to `workflow.stories`.
- **Migration idempotency**: All KB migrations use `IF NOT EXISTS`, `CREATE OR REPLACE`, and guarded DO blocks. HNSW index creation must use `IF NOT EXISTS`.
- **Public schema for pgvector extension**: The extension is installed in `public` schema (not `workflow`). References to `vector_cosine_ops` must use the `public.` prefix (e.g., `embedding public.vector_cosine_ops`).
- **OpenAI ada-002 / text-embedding-3-small at 1536 dimensions**: The existing `EmbeddingClient` defaults to `text-embedding-3-small`. All existing embedding columns are `vector(1536)`. New tables must match this dimension. If a different model is intended, it must be documented as a conscious decision.

### Patterns to Follow

- Sectioned migration file: `-- ── N. Section title ───` header comments matching the style in migrations 1001 and 1007.
- `COMMENT ON TABLE` with migration number prefix (e.g., `'1009: ...'`).
- All `CREATE INDEX` operations must use `CONCURRENTLY IF NOT EXISTS` for embedding-type indexes.
- HNSW parameters: document choice of `m` and `ef_construction` in a SQL comment. For comparison, existing ivfflat indexes use `lists=100` (knowledge_entries, ~large) and `lists=20` (plans, ~small).
- Drizzle registration: import `vector` from `'./kb.js'`; define new tables using `workflow.table(...)` pattern.

### Patterns to Avoid

- Do not use `ivfflat` for the new tables if HNSW is the stated requirement — but document the choice, because existing tables all use ivfflat.
- Do not skip the "embedding section lookup" table. The story description includes it as a deliverable. Its schema must be elaborated — it is likely a reference table mapping section names to integer IDs for structured embedding lookup, but this must be confirmed with the product owner.
- Do not create the extension in the `workflow` schema — it must stay in `public`.

---

## Conflict Analysis

### Conflict: story-similarity.ts queries wrong table (warning)

- **Severity**: warning
- **Description**: `apps/api/knowledge-base/src/search/story-similarity.ts` line 51 queries `FROM public.stories`, but the stories table lives in `workflow.stories` (not `public`). This pre-existing bug means story similarity search is currently broken or targeting a non-existent `public.stories` table. If CDBE-4010 creates `workflow.story_embeddings` as a separate table (not `workflow.stories` directly), the similarity search implementation in `story-similarity.ts` will need to be updated to JOIN `workflow.story_embeddings` for the vector lookup. This is a related repair but out of scope for CDBE-4010 itself.
- **Resolution Hint**: Note in the story that fixing `story-similarity.ts` to query `workflow.story_embeddings` is a dependent change. Either include it in CDBE-4010's scope or create a follow-on task. Flag during implementation.

### Conflict: "Embedding section lookup" is undefined (warning)

- **Severity**: warning
- **Description**: The story description includes "create the embedding section lookup" but there is no existing table, schema, or code reference for what this means. No analogous pattern exists in the codebase. This is an undefined deliverable that must be scoped during elaboration.
- **Resolution Hint**: During elaboration, confirm with the product owner: (a) what entity "section" refers to (story section? document section?), (b) the expected schema (`id`, `section_name`, `embedding` vector?), and (c) which tables it relates to. Block implementation if this remains undefined.

### Conflict: HNSW vs ivfflat architecture decision unresolved (warning)

- **Severity**: warning
- **Description**: The story specifies HNSW indexes for the new tables, but all existing embedding indexes in the codebase use `ivfflat`. This is not necessarily wrong — HNSW is generally preferred for accuracy — but it represents a deliberate architectural divergence. The migration must document the rationale, and CDBE-4020 must follow the same choice to maintain consistency.
- **Resolution Hint**: Document in the migration file header why HNSW was chosen for new tables (e.g., "HNSW preferred for sub-linear search time and higher recall; existing ivfflat indexes on older tables are grandfathered"). Ensure CDBE-4020 and CDBE-4030 follow the same index type.

---

## Story Seed

### Title

pgvector Foundation: `story_embeddings` and `plan_embeddings` Tables with HNSW Indexes

### Description

**Context**: The knowledgebase database already has the pgvector extension installed (confirmed in the full schema baseline) and uses `vector(1536)` columns on `workflow.plans`, `workflow.hitl_decisions`, and `public.knowledge_entries`. The `EmbeddingClient` is production-ready and generating embeddings for knowledge entries. However, `workflow.stories` has no embedding column (it was explicitly removed as "not yet needed"), and no dedicated embedding tables exist for stories or plans in a normalized form.

**Problem**: CDBE-4020 (embedding columns on knowledge tables) and CDBE-4030 (embedding worker process) both depend on a foundational embedding infrastructure for workflow entities. Before those stories can proceed, the database needs: (1) dedicated `story_embeddings` and `plan_embeddings` tables with vector columns and HNSW indexes, and (2) a section lookup reference table to support structured embedding retrieval. The `findSimilarStories()` function in `story-similarity.ts` currently queries a non-existent `public.stories` table — this infrastructure gap is the root cause.

**Proposed solution**: Create a migration that adds `workflow.story_embeddings` and `workflow.plan_embeddings` tables (or confirms they already exist via `CREATE TABLE IF NOT EXISTS`) with `embedding vector(1536)` columns, HNSW indexes, and appropriate foreign keys. Create the "embedding section lookup" reference table (scope to be confirmed in elaboration). Register all new tables in the Drizzle schema. The pgvector extension does not need re-installation.

### Initial Acceptance Criteria

- [ ] AC-1: A migration file `1009_cdbe4010_pgvector_embedding_tables.sql` (or next free slot) exists in `apps/api/knowledge-base/src/db/migrations/` and includes a DB safety preamble verifying `current_database() = 'knowledgebase'`.
- [ ] AC-2: `workflow.story_embeddings` table exists with columns: `id UUID PK DEFAULT gen_random_uuid()`, `story_id TEXT NOT NULL REFERENCES workflow.stories(story_id) ON DELETE CASCADE`, `embedding vector(1536)`, `model TEXT NOT NULL DEFAULT 'text-embedding-3-small'`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`. Table has a UNIQUE constraint on `story_id` (one embedding row per story).
- [ ] AC-3: `workflow.plan_embeddings` table exists with columns: `id UUID PK DEFAULT gen_random_uuid()`, `plan_id UUID NOT NULL REFERENCES workflow.plans(id) ON DELETE CASCADE`, `embedding vector(1536)`, `model TEXT NOT NULL DEFAULT 'text-embedding-3-small'`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`. Table has a UNIQUE constraint on `plan_id`.
- [ ] AC-4: HNSW indexes exist on `workflow.story_embeddings(embedding)` and `workflow.plan_embeddings(embedding)` using `public.vector_cosine_ops`, created with `CONCURRENTLY IF NOT EXISTS`. Parameters (`m`, `ef_construction`) are documented in a SQL comment with rationale.
- [ ] AC-5: The "embedding section lookup" table is created with a schema confirmed during elaboration. At minimum: `id SERIAL PK`, `section_name TEXT NOT NULL UNIQUE`, `display_order INT`. (Schema subject to elaboration — see Non-Goals for the undefined-scope warning.)
- [ ] AC-6: The migration is idempotent: `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, re-running produces no errors.
- [ ] AC-7: `workflow.story_embeddings`, `workflow.plan_embeddings`, and the section lookup table are registered in `apps/api/knowledge-base/src/db/schema/workflow.ts` using the `vector` customType imported from `'./kb.js'`.
- [ ] AC-8: `COMMENT ON TABLE` statements with migration number prefix exist for all new tables.
- [ ] AC-9: A pgtap test file verifies: (a) all three tables exist in the `workflow` schema, (b) the `embedding` column has type `vector(1536)`, (c) HNSW indexes exist on both embedding tables, (d) FK constraints reference parent tables correctly.
- [ ] AC-10: `findSimilarStories()` in `apps/api/knowledge-base/src/search/story-similarity.ts` is updated to query `workflow.story_embeddings` (or an explicit decision is documented to defer this fix to a follow-on story).

### Non-Goals

- Do not re-install or alter the pgvector extension — it is already installed.
- Do not add an `embedding` column directly to `workflow.stories` or `workflow.plans` — the normalized separate-table pattern is the stated design.
- Do not implement the embedding generation worker (NOTIFY/LISTEN triggers, OpenAI calls) — that is CDBE-4030's scope.
- Do not backfill existing stories or plans with embeddings — that is CDBE-4030's scope.
- Do not change existing `ivfflat` indexes on `workflow.plans` or `public.knowledge_entries` — grandfathered patterns, not in scope.
- Do not fix the schema-level `wint.*` or `kbar.*` references if encountered — those are dead schemas per project policy (MEMORY.md).
- The "embedding section lookup" schema is subject to elaboration confirmation — do not invent its final form without sign-off.

### Reuse Plan

- **Components**: none (DB-only story, no UI or API handler changes)
- **Patterns**: Safety preamble from migration 1007; `CREATE TABLE IF NOT EXISTS` + `COMMENT ON TABLE` from migrations 1001–1008; `CONCURRENTLY IF NOT EXISTS` index creation from migration 1002; Drizzle `pgSchema` table definition with `vector` import from `workflow.ts`
- **Packages**: `apps/api/knowledge-base` (migration files + `src/db/schema/workflow.ts`); `apps/api/knowledge-base/scripts/run-migrations.sh` to verify migration applies cleanly

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- The primary test vector is schema existence and structural correctness: table exists, columns have correct types (`vector(1536)`), FK constraints point to the right parent tables, HNSW indexes are present.
- Use pgtap for DB-layer assertions — follow the pattern established in `apps/api/knowledge-base/src/db/migrations/pgtap/1007_pipe_0020_ghost_state_audit_test.sql`.
- Test HNSW index existence by querying `pg_indexes WHERE indexname LIKE 'idx_%_embedding%'` and confirming `indexdef` contains `USING hnsw`.
- Test idempotency: run the migration twice and assert no error and no duplicate table/index creation.
- NOTE: AC-10 (`findSimilarStories` update) will require a Vitest unit test update if the query target changes.
- Aurora PostgreSQL pgvector support: the baseline confirms the extension runs in the dev container. If a separate Aurora test environment exists, verify pgvector is available there too before committing to HNSW — Aurora 15.2+ is required for pgvector, and HNSW was added in pgvector 0.5.0.

### For UI/UX Advisor

Not applicable — this is a pure database schema migration story with no user-facing surface.

### For Dev Feasibility

- **Critical pre-work**: Confirm the "embedding section lookup" table schema with the product owner before implementation. Without a clear schema, AC-5 cannot be implemented.
- **Migration slot**: Verify slot 1009 is free at implementation time. Check `ls apps/api/knowledge-base/src/db/migrations/` sorted — if 1009 is taken, use the next available slot and update the filename in the pgtap test and any documentation.
- **HNSW parameter selection**: For `workflow.story_embeddings` and `workflow.plan_embeddings`, select HNSW `m` and `ef_construction` based on expected table size. Recommended starting point: `m=16, ef_construction=64` for tables with fewer than 10,000 rows. Document in a migration comment.
- **Index creation timing**: HNSW index builds are memory-intensive. Use `CONCURRENTLY` to avoid locking. Set `maintenance_work_mem` appropriately if building on a large table. For new empty tables, `CONCURRENTLY` overhead is negligible but keeps the pattern consistent.
- **Drizzle registration**: Import `vector` from `'./kb.js'` and add `storyEmbeddings`, `planEmbeddings`, and the section lookup table to `workflow.ts`. Export TypeScript types (`type StoryEmbedding = typeof storyEmbeddings.$inferSelect` etc.). No Drizzle migration generation required — raw SQL migration handles DDL directly.
- **`findSimilarStories` fix**: The pre-existing bug querying `public.stories` (which is in `workflow.stories`) needs to be resolved. The simplest approach is to update the query to JOIN `workflow.story_embeddings` for the vector and `workflow.stories` for metadata. This should be included in CDBE-4010's scope to unblock CDBE-4020.
- **Canonical references for subtask decomposition**:
  1. Migration structure: `apps/api/knowledge-base/src/db/migrations/1007_pipe_0020_ghost_state_audit.sql`
  2. Drizzle schema registration with vector column: `apps/api/knowledge-base/src/db/schema/workflow.ts` lines 140–166 (plans table)
  3. Embedding index SQL patterns: `apps/api/knowledge-base/src/db/migrations/999_full_schema_baseline.sql` lines 2722–2725 and 2869–2872
  4. Concurrent index creation pattern: `apps/api/knowledge-base/src/db/migrations/1002_artifact_precondition_index.sql`

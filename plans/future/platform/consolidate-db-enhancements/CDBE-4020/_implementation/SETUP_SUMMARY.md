# CDBE-4020 Setup Complete - Implementation Ready

**Date**: 2026-03-18
**Story**: CDBE-4020 - Embedding Columns on Knowledge Tables
**Mode**: implement (fresh implementation)
**Phase**: setup
**Status**: COMPLETE

## Story Overview

Add nullable `embedding vector(1536)` columns and HNSW cosine-similarity indexes to five knowledge tables:
- `public.lessons_learned`
- `public.adrs`
- `public.code_standards`
- `public.rules`
- `public.cohesion_rules`

This enables the CDBE-4030 embedding worker to backfill and maintain these indexes for semantic search across all KB entity types.

## Scope Analysis

### What Changes
- **Backend**: Database schema migration + Drizzle ORM schema update
- **Database**: Five knowledge tables gain `embedding` columns + HNSW indexes
- **Packages**: `@repo/knowledge-base` (Drizzle schema updates only)

### What Stays the Same
- No frontend changes
- No API endpoints modified
- No shared package modifications
- No infrastructure changes
- No authentication logic changes
- No payment logic changes

### Risk Flags
- **migrations**: true — new columns and indexes
- **security**: true — pgvector version guard required
- **performance**: true — HNSW tuning needed for small tables

## Critical Constraints

### 1. Blocking Dependency: CDBE-4010
**Status**: Currently in "elab" state
**Why it matters**: CDBE-4010 establishes the pgvector foundation and confirms the `vector` customType pattern. CDBE-4020 must NOT begin implementation until CDBE-4010 is merged.

### 2. Manual SQL Authoring Required
`db:generate` has a known failure (sets.js module resolution). Migration SQL must be hand-authored following the pattern from `1007_pipe_0020_ghost_state_audit.sql`.

### 3. Migration Slot TBD
- **Expected**: 1011 (last confirmed: 1010_story_state_history_trigger.sql)
- **How to verify**: `ls apps/api/knowledge-base/src/db/migrations/ | grep -v 999 | sort | tail -5`
- **Update all references**: Migration filename, pgtap test filename, COMMENT ON TABLE prefix

### 4. CREATE INDEX CONCURRENTLY Outside Transactions
PostgreSQL does not allow `CREATE INDEX CONCURRENTLY` inside transaction blocks. Migration must structure index creation as separate statements outside BEGIN/COMMIT blocks.

### 5. pgvector >= 0.5.0 Required
HNSW was added in pgvector 0.5.0. Migration must include a version guard:
```sql
DO $$ BEGIN
  IF (SELECT extversion FROM pg_extension WHERE extname = 'vector') < '0.5.0' THEN
    RAISE EXCEPTION 'pgvector 0.5.0+ required for HNSW indexes';
  END IF;
END $$;
```

### 6. DB Safety Preamble
Migration must verify `current_database() = 'knowledgebase'` before executing any DDL. This prevents accidental modification of the wrong database (lego_dev on port 5432 vs. knowledgebase on port 5433).

### 7. All Tables in Public Schema
All five target tables are in the `public` schema, not `workflow`. Do not confuse with CDBE-4010's workflow tables.

### 8. Embedding Columns Are Nullable
Rows can exist with `embedding = NULL` until the CDBE-4030 worker backfills them. No NOT NULL constraint.

## Canonical Reference Files

Reference these files when authoring the migration and Drizzle schema updates:

| Pattern | File | Usage |
|---------|------|-------|
| Safety preamble + idempotent DDL | `apps/api/knowledge-base/src/db/migrations/1007_pipe_0020_ghost_state_audit.sql` (lines 28-35) | Copy DO block structure + RAISE NOTICE pattern |
| Vector customType definition | `apps/api/knowledge-base/src/db/schema/kb.ts` (lines 24-39) | Already defined — import and reuse |
| Example vector column (Drizzle) | `apps/api/knowledge-base/src/db/schema/kb.ts` (lines 41-60, knowledgeEntries table) | Pattern for adding `embedding: vector('embedding', { dimensions: 1536 })` |
| CREATE INDEX CONCURRENTLY syntax | `apps/api/knowledge-base/src/db/migrations/1002_artifact_precondition_index.sql` | Safe pattern for HNSW index creation |
| pgtap test structure | `apps/api/knowledge-base/src/db/migrations/pgtap/1007_pipe_0020_ghost_state_audit_test.sql` | Test file layout for schema assertions |

## Acceptance Criteria

All 9 criteria from story seed must be satisfied:

1. **AC-1**: Migration file exists with DB safety preamble DO block
2. **AC-2**: Each table has `embedding vector(1536)` column added
3. **AC-3**: HNSW indexes exist with documented m/ef_construction parameters
4. **AC-4**: Migration is fully idempotent (can run twice without error)
5. **AC-5**: COMMENT ON statements with migration number prefix document columns
6. **AC-6**: kb.ts updated with `embedding` column on all five tables, pnpm check-types succeeds
7. **AC-7**: pgtap test file verifies column types, HNSW indexes, and nullability
8. **AC-8**: Pre-flight row count RAISE NOTICE for each table
9. **AC-9**: pgvector version guard (>= 0.5.0) in migration

## Tables Affected

| Table | Location | Column to Add |
|-------|----------|---------------|
| `public.lessons_learned` | `kb.ts` line ~70 | `embedding: vector('embedding', { dimensions: 1536 })` |
| `public.adrs` | `kb.ts` line ~50 | `embedding: vector('embedding', { dimensions: 1536 })` |
| `public.code_standards` | `kb.ts` line ~88 | `embedding: vector('embedding', { dimensions: 1536 })` |
| `public.rules` | `kb.ts` line ~130 | `embedding: vector('embedding', { dimensions: 1536 })` |
| `public.cohesion_rules` | `kb.ts` line ~110 | `embedding: vector('embedding', { dimensions: 1536 })` |

(Line numbers are approximate — search for table definitions in kb.ts)

## Next Steps (Development Phase)

1. Verify CDBE-4010 is merged and vector customType import path is confirmed
2. Determine actual migration slot number (expected 1011)
3. Author migration SQL with:
   - DB safety preamble
   - pgvector version guard
   - ALTER TABLE ADD COLUMN IF NOT EXISTS for all five tables
   - CREATE INDEX CONCURRENTLY IF NOT EXISTS for all five HNSW indexes
   - COMMENT ON COLUMN statements
   - Pre-flight row count checks (RAISE NOTICE)
4. Update kb.ts Drizzle schema with embedding column definitions
5. Create pgtap test file verifying schema correctness
6. Run TypeScript check: `pnpm check-types --filter @repo/knowledge-base`
7. Test migration idempotency against test database
8. Verify all nine acceptance criteria

## Non-Goals (Out of Scope)

- No embedding generation triggers
- No NOTIFY/LISTEN patterns
- No OpenAI API calls (CDBE-4030 scope)
- No existing row backfill (CDBE-4030 scope)
- No changes to existing ivfflat index on public.knowledge_entries
- No workflow.ts modifications
- No wint.* or kbar.* schema references

## Implementation Blockers

This story **cannot begin implementation** until:
- [ ] CDBE-4010 is merged and deployed
- [ ] Vector customType import path is verified in deployed code

Elaboration is **unblocked now**.

## Lesson References

Knowledge base entries cited in story seed (apply to implementation):
- **[WINT-0040]**: pgvector not in local dev container — use conditional DO blocks
- **[WINT-0040]**: db:generate fails with sets.js error — hand-author migration SQL
- **[WINT-4030/concurrent]**: Migration slot numbers can shift — verify at implementation time
- **[General]**: HNSW outperforms ivfflat for small tables (< 1000 rows) — no manual tuning
- **[WINT-0060]**: Migration filename can drift — verify by SQL content, not filename
- **[General]**: Drizzle functional indexes cannot be in table definitions — must be in migration SQL

---

**Setup artifacts created**:
- CHECKPOINT.yaml (phase: setup, iteration: 0)
- SCOPE.yaml (phase: setup, iteration: 0)
- WORKING_SET.yaml (constraints, next steps, references)
- SETUP_SUMMARY.md (this document)

**Status**: Ready for development phase

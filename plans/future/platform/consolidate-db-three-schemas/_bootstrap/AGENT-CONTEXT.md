# Bootstrap Context: CDTS

## Plan
- **Slug**: consolidate-db-three-schemas
- **Title**: Consolidate Database Architecture: Two-Schema Graph Database
- **Type**: migration
- **Priority**: P1
- **Prefix**: CDTS
- **Feature Dir**: plans/future/platform/consolidate-db-three-schemas

## Summary

Rework the KB database (port 5433) into a two-schema architecture optimized for graph traversal. The KB has evolved from a knowledge store into a **workflow management brain** — stories act like a graph DB where agents traverse from a story to related lessons, constraints, decisions, and similar past stories.

**Key insight**: Schema boundaries hurt graph traversal. All traversable data stays in `public`. Only append-only analytics data moves to `analytics`.

## Schema Assignment

### `public` schema — the graph (everything agents traverse)

All existing tables stay in `public`:
- `knowledge_entries` - Core KB entries with embeddings (vector 1536)
- `embedding_cache` - Cached embeddings by content hash
- `audit_log` - KB entry audit trail
- `plans` - Plan headers (slug, title, status, priority)
- `plan_details` - Plan detail (1:1 split, raw_content, phases, dependencies) **[NEW]**
- `plan_story_links` - Links plans to stories
- `plan_dependencies` - Plan-to-plan dependencies
- `stories` - Story headers (story_id, title, state, priority, embedding) **[UPDATED: +embedding]**
- `story_details` - Story detail (1:1 split, story_dir, touches_*, blocked_reason) **[NEW]**
- `story_dependencies` - Story-to-story dependencies
- `story_artifacts` - Workflow artifacts (checkpoint, evidence, etc.)
- `story_audit_log` - Story change audit trail
- `story_knowledge_links` - Graph edges: story <-> KB entry with typed relationships **[NEW]**
- `tasks` - Task tracking
- `task_audit_log` - Task change audit trail
- `work_state` - Current work state per story
- `work_state_history` - Archived work state snapshots
- `schema_migrations` - Migration tracking **[NEW]**
- 13 artifact type tables (artifact_checkpoints, artifact_reviews, etc.)

### `analytics` schema — append-only telemetry (agents never traverse into this)

- `story_token_usage` - Token usage per story phase (moved from public)
- `model_experiments` - Model A/B experiment definitions (moved from wint)
- `model_assignments` - Per-story model assignments (moved from wint)
- `change_telemetry` - Experiment result telemetry (moved from wint)

### Dropped schemas
- `wint` - Tables moved to analytics, schema dropped
- `kbar` - Empty, dropped
- `artifacts` - Empty, dropped
- `telemetry` - Empty, dropped
- `umami` - Empty, dropped

## New Infrastructure

### Header/Detail Split
- **plans** split into `plans` (hot header) + `plan_details` (cold detail, 1:1 FK)
- **stories** split into `stories` (hot header) + `story_details` (cold detail, 1:1 FK)
- List queries hit headers only; get-by-id queries JOIN details

### Soft Delete
- `deleted_at TIMESTAMPTZ` + `deleted_by TEXT` on plans, stories, tasks, knowledge_entries
- All queries filter `WHERE deleted_at IS NULL` by default
- No physical deletes — app layer sets deleted_at

### Graph Edges
- `story_knowledge_links` table: typed relationships (produced_lesson, applied_constraint, referenced_decision, similar_pattern, blocked_by) with confidence scores
- Story embeddings (vector 1536) for semantic similarity search
- `kb_find_similar_stories` tool for discovering related stories
- `kb_get_story_context` composite tool for full graph traversal in one call

### FK Integrity
- All new FKs use ON DELETE RESTRICT
- Cross-schema FK: analytics.story_token_usage.story_id -> public.stories.story_id

### Migration Runner
- Manual psql: `psql -h localhost -p 5433 -U kbuser -d knowledgebase -f migrations/NNN.sql`
- Safety preamble: `DO $$ IF current_database() != 'knowledgebase' THEN RAISE EXCEPTION; END $$`
- schema_migrations tracking table
- All migrations hand-authored (Drizzle db:generate has known sets.js bug)

## Phases

### Phase 0: Infrastructure Foundation
- CDTS-0010: Migration runner + safety preamble
- CDTS-0020: Live table inventory + migration manifest + test strategy template

### Phase 1: Schema DDL, Drizzle, and Code
- CDTS-1010: Create analytics schema, move wint tables
- CDTS-1020: Structural DDL (splits, soft-delete, FKs, graph edges)
- CDTS-1030: Update Drizzle schema.ts
- CDTS-1040: Update MCP tool SQL
- CDTS-1050: Apply migrations and verify

### Phase 2: Graph Infrastructure (parallel with Phase 3 after CDTS-1050)
- CDTS-2010: Story embeddings + kb_find_similar_stories
- CDTS-2020: Composite story context tool (kb_get_story_context)

### Phase 3: Aurora Cleanup (parallel with Phase 2 after CDTS-1050)
- CDTS-3010: Audit consumers of empty schemas
- CDTS-3020: Drop empty schemas + final verification

## Technical Constraints
- PostgreSQL supports cross-schema FKs within the same database
- Drizzle ORM supports schema-qualified tables via `pgSchema('analytics')`
- Public schema tables don't need pgSchema — they use default search_path
- All MCP tool raw SQL queries need explicit `public.` prefix for clarity
- Migration must be reversible (rollback scripts required)
- Zero downtime not required (dev-only database)
- The main app database (port 5432, lego_dev) is NOT affected
- Drizzle db:generate has a known sets.js issue — write migrations manually
- Migration numbering starts at 020 (last existing is 019)
- Code deploys before migration runs (Drizzle must match target schema)

## Stories (11)

| ID | Title | Phase | Depends On | Resolves |
|----|-------|-------|------------|----------|
| CDTS-0010 | Establish Migration Runner and Safety Preamble | 0 | - | PLAT-001, PLAT-002 |
| CDTS-0020 | Audit Actual Table Locations and Produce Migration Manifest | 0 | CDTS-0010 | ENG-001, QA-001 |
| CDTS-1010 | Create analytics Schema and Move wint Tables into Drizzle | 1 | CDTS-0020 | ENG-002 |
| CDTS-1020 | Write Structural DDL Migrations | 1 | CDTS-1010 | QA-002 |
| CDTS-1030 | Update Drizzle schema.ts | 1 | CDTS-1020 | ENG-003 |
| CDTS-1040 | Update MCP Tool SQL | 1 | CDTS-1030 | ENG-003 |
| CDTS-1050 | Apply Phase 1 Migrations and Verify | 1 | CDTS-1040 | ENG-003, QA-001, QA-002, PLAT-001, PLAT-002 |
| CDTS-2010 | Add Story Embeddings for Similarity Search | 2 | CDTS-1050 | - |
| CDTS-2020 | Implement Composite Story Context Tool | 2 | CDTS-2010 | - |
| CDTS-3010 | Audit Consumers of Empty Aurora Schemas | 3 | CDTS-1050 | - |
| CDTS-3020 | Drop Empty Aurora Schemas and Final Verification | 3 | CDTS-3010 | - |

## Key Design Decisions

1. **No `workflow` schema.** Graph traversal is the primary query pattern. Schema boundaries in the middle of the graph add friction for zero benefit.
2. **`story_knowledge_links` coexists with `knowledge_entries.story_id`.** The existing text field is a weak "produced during" link. The new edge table has typed relationships with confidence scores.
3. **No backward-compatibility views.** Nothing moves out of `public` except `story_token_usage`. Drizzle handles schema qualification automatically.
4. **Analytics is write-heavy, read-rarely.** Token usage and experiment data are append-only — agents never traverse edges into analytics tables.

## Risks & Mitigations

- **HIGH**: Wrong database targeted (KB port 5433 vs main app port 5432) → Safety preamble (CDTS-0010)
- **HIGH**: Aurora 'wint' schema name collides with live wint schema in lego_dev → CDTS-3010 boundary documentation
- **MEDIUM**: Undetected FK edges cause ALTER TABLE SET SCHEMA failures → CDTS-0020 FK edge map
- **MEDIUM**: Drizzle db:generate sets.js bug → hand-author all migrations
- **MEDIUM**: MCP queries silently resolve via search_path=public → explicit schema prefix in CDTS-1040

## Critical Files

- `apps/api/knowledge-base/src/db/schema.ts` — Primary schema file (~1400 lines)
- `apps/api/knowledge-base/src/db/migrations/` — Migration SQL files (020-024)
- `apps/api/knowledge-base/src/search/semantic.ts` — Raw SQL needing schema qualification
- `apps/api/knowledge-base/src/search/keyword.ts` — Raw SQL needing schema qualification
- `apps/api/knowledge-base/src/search/kb-get-related.ts` — Raw SQL needing schema qualification
- `apps/api/knowledge-base/src/crud-operations/token-operations.ts` — analytics.story_token_usage references
- `apps/api/knowledge-base/src/crud-operations/analytics-operations.ts` — analytics query operations
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` — 67+ tool dispatch, new tools added here
- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` — Tool JSON schemas
- `apps/api/knowledge-base/drizzle.config.ts` — Drizzle DB configuration

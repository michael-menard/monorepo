# Consolidate DB Two Schemas - Stories Index

**Plan**: consolidate-db-three-schemas
**Feature Directory**: plans/future/platform/consolidate-db-three-schemas
**Story Prefix**: CDTS
**Project Name**: consolidate-db-three-schemas
**Generated**: 2026-03-07T22:16:29Z
**Updated**: 2026-03-07
**Architecture**: Two schemas (public + analytics)

## Progress Summary

| Phase | Status | Stories | Progress |
|-------|--------|---------|----------|
| 0: Infrastructure Foundation | Needs Code Review | 2 | 2/2 (100%) |
| 1: Schema DDL, Drizzle, and Code | Backlog | 5 | 0/5 (0%) |
| 2: Graph Infrastructure | Backlog | 2 | 0/2 (0%) |
| 3: Aurora Cleanup | Backlog | 2 | 0/2 (0%) |
| **Total** | **Needs Code Review** | **11** | **2/11 (18%)** |

## Schema Assignment

**`public` schema (the graph — everything agents traverse):**
All existing tables stay in `public`: knowledge_entries, embedding_cache, audit_log, plans, plan_story_links, plan_dependencies, stories, story_dependencies, story_artifacts, story_audit_log, tasks, task_audit_log, work_state, work_state_history, schema_migrations, plus all 13 artifact type tables.
New tables: plan_details, story_details, story_knowledge_links.

**`analytics` schema (append-only telemetry):**
story_token_usage (from public), model_experiments (from wint), model_assignments (from wint), change_telemetry (from wint).

**Dropped:** 5 empty Aurora schemas (wint, kbar, artifacts, telemetry, umami).

## Phase 0: Infrastructure Foundation

Establish migration runner, safety guardrails, ground-truth table inventory, and test strategy template.

### Stories

| ID | Title | Dependencies | Status | Resolves |
|----|-------|--------------|--------|----------|
| CDTS-0010 | Establish Migration Runner and Safety Preamble | None | 👀 Needs Code Review | PLAT-001, PLAT-002 |
| CDTS-0020 | Audit Actual Table Locations and Produce Migration Manifest | CDTS-0010 | 👀 Needs Code Review | ENG-001, QA-001 |

## Phase 1: Schema DDL, Drizzle, and Code

Create analytics schema, move wint tables, write structural DDL (header/detail splits, soft-delete, FKs, graph edges), update Drizzle and MCP tool SQL, apply and verify.

### Stories

| ID | Title | Dependencies | Status | Resolves |
|----|-------|--------------|--------|----------|
| CDTS-1010 | Create analytics Schema and Move wint Tables into Drizzle | CDTS-0020 | In Progress | ENG-002 |
| CDTS-1020 | Write Structural DDL Migrations | CDTS-1010 | Backlog | QA-002 |
| CDTS-1030 | Update Drizzle schema.ts | CDTS-1020 | Backlog | ENG-003 |
| CDTS-1040 | Update MCP Tool SQL | CDTS-1030 | Backlog | ENG-003 |
| CDTS-1050 | Apply Phase 1 Migrations and Verify | CDTS-1040 | Backlog | ENG-003, QA-001, QA-002, PLAT-001, PLAT-002 |

## Phase 2: Graph Infrastructure

Add story embeddings for similarity search and build composite story context tool for graph traversal.

### Stories

| ID | Title | Dependencies | Status |
|----|-------|--------------|--------|
| CDTS-2010 | Add Story Embeddings for Similarity Search | CDTS-1050 | Backlog |
| CDTS-2020 | Implement Composite Story Context Tool | CDTS-2010 | Backlog |

## Phase 3: Aurora Cleanup

Audit consumers of empty schemas, drop them, run final verification, document rollback.

### Stories

| ID | Title | Dependencies | Status |
|----|-------|--------------|--------|
| CDTS-3010 | Audit Consumers of Empty Aurora Schemas | CDTS-1050 | Backlog |
| CDTS-3020 | Drop Empty Aurora Schemas and Final Verification | CDTS-3010 | Backlog |

## Dependency Graph

```
CDTS-0010 (runner + safety)
  └─> CDTS-0020 (audit + manifest)
        └─> CDTS-1010 (analytics schema + wint moves)
              └─> CDTS-1020 (structural DDL)
                    └─> CDTS-1030 (Drizzle schema.ts)
                          └─> CDTS-1040 (MCP tool SQL)
                                └─> CDTS-1050 (apply + verify)
                                      ├─> CDTS-2010 (story embeddings)
                                      │     └─> CDTS-2020 (composite context tool)
                                      └─> CDTS-3010 (audit Aurora consumers)
                                            └─> CDTS-3020 (drop + final verify)
```

Phase 2 and Phase 3 can run in parallel after CDTS-1050.

## Blocker Resolution Map

| Blocker | Severity | Resolved By |
|---------|----------|-------------|
| PLAT-001: No migration runner | CRITICAL | CDTS-0010 |
| PLAT-002: No safety guardrails | CRITICAL | CDTS-0010, enforced in all subsequent ACs |
| ENG-001: Wrong table locations in bootstrap | HIGH | CDTS-0020 |
| ENG-002: wint FK dependency unmapped | HIGH | CDTS-1010 |
| ENG-003: Atomic deployment required | HIGH | CDTS-1040/1050 deployment sequence |
| QA-001: No test strategy | HIGH | CDTS-0020 template, CDTS-1050 execution |
| QA-002: No FK verification AC | MEDIUM | CDTS-1020 + CDTS-1050 before/after counts |

## Key Design Decisions

1. **No `workflow` schema.** Graph traversal is the primary query pattern. Schema boundaries in the middle of the graph add friction for zero benefit.
2. **`story_knowledge_links` coexists with `knowledge_entries.story_id`.** The existing text field is a weak "produced during" link. The new edge table has typed relationships with confidence scores.
3. **No backward-compatibility views.** Nothing moves out of `public` except `story_token_usage` (to analytics). Drizzle ORM handles schema qualification automatically.
4. **CDTS-3030 collapsed into CDTS-3020.** End-to-end verification is part of the DROP story.

## Metrics

| Metric | Value |
|--------|-------|
| Total Stories | 11 |
| Phases | 4 (0, 1, 2, 3) |
| Max Parallel | 2 (Phase 2 + Phase 3 after CDTS-1050) |
| Critical Path Length | 9 (0010 → 0020 → 1010 → 1020 → 1030 → 1040 → 1050 → 2010 → 2020) |
| Ready to Start | 1 (CDTS-0010) |

## Risks & Constraints

### High Severity

- **RISK-001**: Wrong database targeted during migration — KB (port 5433) vs main app (port 5432)
  - *Mitigated by*: Safety preamble in CDTS-0010, enforced in all migrations

- **RISK-002**: Aurora 'wint' empty schema name collides with live wint schema in lego_dev
  - *Mitigated by*: CDTS-3010 database boundary documentation

### Medium Severity

- **RISK-003**: Undetected FK edges between tables may cause ALTER TABLE SET SCHEMA to fail
  - *Mitigated by*: CDTS-0020 FK edge map from information_schema

- **RISK-004**: Drizzle db:generate has a known sets.js module resolution failure — hand-author all migrations
  - *Mitigated by*: All migrations hand-authored (documented in RUNNER.md)

- **RISK-005**: MCP tool queries silently resolving via search_path=public after table moves
  - *Mitigated by*: Explicit schema qualification in CDTS-1040

## Next Steps

Start with **CDTS-0010: Establish Migration Runner and Safety Preamble**.

Once complete, proceed through the critical path:
CDTS-0010 → CDTS-0020 → CDTS-1010 → CDTS-1020 → CDTS-1030 → CDTS-1040 → CDTS-1050 → {CDTS-2010, CDTS-3010} (parallel) → CDTS-2020 / CDTS-3020

# CDTS MVP Blocker Impact Matrix

**Generated**: 2026-03-07
**Updated**: 2026-03-07 (redesigned to two-schema graph DB architecture)
**Purpose**: Story-level blocker impact and resolution analysis

## Impact Matrix: Blockers x Stories

```
               CDTS- CDTS- CDTS- CDTS- CDTS- CDTS- CDTS- CDTS- CDTS- CDTS- CDTS-
               0010  0020  1010  1020  1030  1040  1050  2010  2020  3010  3020
               ----  ----  ----  ----  ----  ----  ----  ----  ----  ----  ----
PLAT-001       [R]                                  [V]
PLAT-002       [R]                                  [V]
ENG-001              [R]
ENG-002                    [R]
ENG-003                                [R]   [R]   [V]
QA-001               [R]                            [V]
QA-002                          [R]                 [V]

Legend: [R] = Resolves blocker, [V] = Verifies resolution
Blocker Count: 2     2     1     1     1     1     5     0     0     0     0
```

## Blocker Resolution Flow

### CDTS-0010 (Phase 0) — Resolves 2 Blockers
1. **PLAT-001** (CRITICAL): Creates migration runner, RUNNER.md, schema_migrations table
2. **PLAT-002** (CRITICAL): Creates safety preamble pattern for all migrations

### CDTS-0020 (Phase 0) — Resolves 2 Blockers
1. **ENG-001** (HIGH): Live information_schema query produces ground-truth inventory
2. **QA-001** (HIGH): Defines test strategy template for all migration stories

### CDTS-1010 (Phase 1) — Resolves 1 Blocker
1. **ENG-002** (HIGH): Moves wint tables to analytics, re-creates FKs

### CDTS-1020 (Phase 1) — Resolves 1 Blocker
1. **QA-002** (MEDIUM): Defines FK count verification acceptance criteria

### CDTS-1030 + CDTS-1040 (Phase 1) — Resolves 1 Blocker
1. **ENG-003** (HIGH): Drizzle schema + MCP tool SQL ready before migration runs

### CDTS-1050 (Phase 1) — Verifies 5 Blocker Resolutions
1. **PLAT-001**: Migration runner proven (all 3 migrations run successfully)
2. **PLAT-002**: Safety preamble works (tested against wrong DB)
3. **ENG-003**: Atomic deployment verified (code first, then migration)
4. **QA-001**: Test strategy executed (idempotency, FK count, smoke tests)
5. **QA-002**: FK count delta matches expected additions

## Story-by-Story Release Criteria

### Phase 0: Infrastructure Foundation

**CDTS-0010**: schema_migrations exists, safety preamble verified, RUNNER.md produced, 020 migration applied
**CDTS-0020**: Live inventory captured, MANIFEST.md produced, test template defined, discrepancies documented

### Phase 1: Schema DDL, Drizzle, and Code

**CDTS-1010**: analytics schema has 4 tables, wint has 0 tables, Drizzle compiles
**CDTS-1020**: DDL migration written with rollback, FK count AC defined, data migration preserves all rows
**CDTS-1030**: schema.ts matches DDL, pnpm check-types passes
**CDTS-1040**: All raw SQL schema-qualified, list queries header-only, soft-delete filtering, pnpm test:all passes
**CDTS-1050**: All migrations applied, FK count delta exact, row counts preserved, MCP server healthy, all tests pass

### Phase 2: Graph Infrastructure

**CDTS-2010**: Embedding column + index on stories, kb_find_similar_stories tool registered and working
**CDTS-2020**: kb_get_story_context tool returns full graph traversal in <500ms

### Phase 3: Aurora Cleanup

**CDTS-3010**: All schema references classified, database boundary documented, 5 schemas confirmed empty
**CDTS-3020**: 5 schemas dropped, full test suite green, rollback runbook in KB

## Critical Path

```
CDTS-0010 -> CDTS-0020 -> CDTS-1010 -> CDTS-1020 -> CDTS-1030 -> CDTS-1040 -> CDTS-1050
                                                                                    |
                                                                          +---------+---------+
                                                                          |                   |
                                                                     CDTS-2010           CDTS-3010
                                                                          |                   |
                                                                     CDTS-2020           CDTS-3020
```

**Critical path length**: 9 stories (through Phase 2)
**Parallel tracks after CDTS-1050**: Phase 2 (graph) + Phase 3 (cleanup)

## Stories at Risk

1. **CDTS-1050** (5 verification points): Most integration-heavy story
   - Must prove all Phase 0 + Phase 1 blockers are resolved
   - Highest test complexity (FK verification + deployment sequence)

2. **CDTS-1020** (structural DDL): Largest single migration
   - Header/detail splits with data migration
   - New graph edge table (story_knowledge_links)
   - All new FK constraints
   - Rollback script required

3. **CDTS-3020** (destructive operation): DROP SCHEMA
   - Highest operational risk
   - Requires CDTS-3010 audit to be thorough
   - Safety preamble + RESTRICT mode provide defense in depth

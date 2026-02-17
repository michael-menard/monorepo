---
generated: "2026-02-16"
baseline_used: null
baseline_date: null
lessons_loaded: true
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-0131

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No active baseline file exists. Context gathered entirely from codebase scanning and WINT-0130 implementation artifacts.

### Relevant Existing Features

| Feature | Status | Relevance |
|---------|--------|-----------|
| WINT-0060: Create Graph Relational Tables | pending (dependency) | Created capabilities, features, featureRelationships, cohesionRules tables. Migration 0020 added lifecycle_stage but NO featureId FK to capabilities. |
| WINT-0130: Create Graph Query MCP Tools | uat | Implemented 4 MCP tools. 2 (graph_check_cohesion, graph_apply_rules) fully functional. 2 (graph_get_franken_features, graph_get_capability_coverage) return empty/null stubs due to missing schema column. |
| WINT-1080: Reconcile WINT Schema with LangGraph | pending (phase 1) | unified-wint.ts created as spike deliverable. capabilities table in unified-wint.ts is missing lifecycleStage field (schema drift from wint.ts) and also missing featureId FK. |
| WINT-0080: Seed Initial Workflow Data | uat (PASS) | Graph schema tables seeded with phases, agents, commands, skills. |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| WINT-0130 | uat | This story is a direct continuation; the 2 limited tools from WINT-0130 will be updated. No implementation conflict if WINT-0130 reaches done before WINT-0131 starts. |
| WINT-1080 (unified-wint.ts) | pending | The unified-wint.ts spike introduced schema drift (capabilities missing lifecycleStage vs wint.ts). WINT-0131 must target wint.ts as source of truth per WINT-0130 decision_002. |

### Constraints to Respect

- Migration numbering: Current last migration is **0026** (`0026_wint_1130_worktree_tracking`). Next migration must be **0027**.
- Schema source of truth: WINT-0130 decision_002 establishes wint.ts (not unified-wint.ts) as the authoritative schema for `@repo/database-schema` imports.
- Parameterized queries are mandatory (AC-2 from WINT-0130 security pattern).
- Zod validation at entry is mandatory (AC-10 from WINT-0130 security pattern).
- No barrel files (CLAUDE.md).
- All new code must pass linting, TypeScript, and tests before commit.
- Capabilities table currently has: capabilityName, capabilityType, description, owner, maturityLevel (wint.ts also has lifecycleStage).
- The unified-wint.ts uses `maturityLevel` while wint.ts uses both `maturityLevel` and `lifecycleStage`. This drift must not be worsened.

---

## Retrieved Context

### Related Endpoints

None (MCP tools, not HTTP endpoints).

### Related Components

| File | Role |
|------|------|
| `packages/backend/database-schema/src/schema/wint.ts` | Schema source of truth for capabilities table |
| `packages/backend/database-schema/src/schema/unified-wint.ts` | Secondary schema (spike, has drift) |
| `packages/backend/database-schema/src/migrations/app/` | Migration files; next is 0027 |
| `packages/backend/mcp-tools/src/graph-query/graph-get-franken-features.ts` | Target for full implementation |
| `packages/backend/mcp-tools/src/graph-query/graph-get-capability-coverage.ts` | Target for full implementation |
| `packages/backend/mcp-tools/src/graph-query/__types__/index.ts` | Existing Zod schemas (no changes needed) |
| `packages/backend/mcp-tools/src/graph-query/graph-check-cohesion.ts` | Reference implementation (fully functional) |

### Reuse Candidates

- **Drizzle ORM pattern**: `graph_check_cohesion.ts` uses `db.select().from().where(or(eq(), eq()))` — reuse for feature lookup
- **Dual ID support**: `FeatureIdSchema` already handles UUID or feature name string — no changes needed
- **Input validation schemas**: All 4 Zod input/output schemas in `__types__/index.ts` are complete; `FrankenFeatureItemSchema` and `CapabilityCoverageOutputSchema` already define the expected output shapes
- **Error handling pattern**: Resilient try/catch with `logger.warn()` (never throws) established in all WINT-0130 tools
- **Migration pattern**: Follow migration 0020 (`0020_wint_0060_graph_columns.sql`) structure for ALTER TABLE
- **Feature lookup**: `graph_check_cohesion.ts` line 51-55 shows dual ID feature query pattern to reuse

---

## Knowledge Context

### Lessons Learned

- **[WINT-0130]** Schema assumptions without verification caused 2 of 4 tools to be stubs (blocker)
  - *Applies because*: WINT-0131 must verify schema column exists in the actual database BEFORE writing implementation. Run `SELECT column_name FROM information_schema.columns WHERE table_schema = 'wint' AND table_name = 'capabilities'` to confirm migration applied.

- **[WINT-0130]** Schema drift between wint.ts and unified-wint.ts caused confusion about source of truth (time_sink)
  - *Applies because*: The featureId column must be added to wint.ts (source of truth). unified-wint.ts should be updated in a follow-up (WINT-1100) not in this story to avoid scope creep.

- **[WINT-0060]** Migration 0020 added lifecycle_stage to capabilities but not featureId (pattern)
  - *Applies because*: The migration for WINT-0131 is a simple ALTER TABLE ADD COLUMN with FK constraint pattern matching migration 0020 exactly.

### Blockers to Avoid (from past stories)

- Do not assume schema migration has been applied — verify column existence before writing tool implementation
- Do not modify unified-wint.ts in this story (schema drift issue, leave for WINT-1100)
- Do not change the existing Zod output schemas in `__types__/index.ts` — they are already correct
- Do not attempt to add the feature_capabilities join table (separate story WINT-4040); this story only adds a direct featureId FK on capabilities

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real PostgreSQL database, no in-memory mocks |
| ADR-006 | E2E Tests Required | Minimum one happy-path integration test per story during dev phase |

*ADR-001 (API paths), ADR-002 (infrastructure), ADR-003 (CDN), ADR-004 (auth) do not apply to this backend-only schema/MCP story.*

### Patterns to Follow

- Drizzle ORM query builder with parameterized queries (no raw SQL strings)
- Zod validation at function entry point (parse input before any DB access)
- Resilient error handling: catch → logger.warn → return empty/null (never re-throw DB errors)
- Migration file format: SQL with `-->` statement-breakpoint comments
- Drizzle schema: add column to `capabilities` table definition in wint.ts with `.references(() => features.id, { onDelete: 'set null' })`
- featureId should be nullable (many capabilities may not have a feature linkage initially)

### Patterns to Avoid

- Do not use raw SQL string interpolation for featureId values
- Do not modify `__types__/index.ts` Zod schemas (already correct)
- Do not add feature_capabilities junction table in this story (separate concern)
- Do not update unified-wint.ts (deferred to WINT-1100)

---

## Conflict Analysis

### Conflict: schema_drift_risk (warning)
- **Severity**: warning
- **Description**: unified-wint.ts is a spike deliverable (WINT-1080) that currently diverges from wint.ts. If WINT-0131 adds featureId to wint.ts only, the drift between the two schema files increases. However, unified-wint.ts is explicitly noted as a spike with a TODO for WINT-1100, and WINT-0130 decision_002 confirms wint.ts is the source of truth. Adding to wint.ts is correct and the drift is an accepted known state.
- **Resolution Hint**: Add featureId only to wint.ts. Add a `// TODO: WINT-1100 - sync featureId to unified-wint.ts` comment in unified-wint.ts capabilities table if desired for traceability.

---

## Story Seed

### Title
Add Feature-Capability Linkage to WINT Schema (Fix for graph_get_franken_features and graph_get_capability_coverage)

### Description

**Context**: WINT-0130 implemented 4 graph query MCP tools but discovered the WINT schema is missing a `featureId` foreign key on the `capabilities` table. This caused 2 of the 4 tools to operate as stubs — `graph_get_franken_features` returns an empty array and `graph_get_capability_coverage` returns null.

**Problem**: The `wint.capabilities` table has no FK to `wint.features`, so it is impossible to query which capabilities belong to a feature. The CRUD-completeness check (Franken-feature detection) and per-feature capability coverage breakdown cannot be computed.

**Proposed Solution**:
1. Add `feature_id uuid REFERENCES wint.features(id) ON DELETE SET NULL` column to the `wint.capabilities` table via a new Drizzle migration (0027).
2. Update the Drizzle schema definition in `wint.ts` to include the `featureId` nullable FK column.
3. Rewrite `graph_get_franken_features.ts` to perform the actual DB query joining capabilities to features via featureId, returning features with fewer than 4 CRUD capabilities.
4. Rewrite `graph_get_capability_coverage.ts` to query capabilities by featureId, returning CRUD counts and maturity level breakdown.

### Initial Acceptance Criteria

- [ ] AC-1: Migration 0027 created — adds `feature_id uuid NULL REFERENCES wint.features(id) ON DELETE SET NULL` to `wint.capabilities` table with an index on `feature_id`.
- [ ] AC-2: Migration 0027 applies cleanly against the live database without errors and without dropping any existing data.
- [ ] AC-3: Rollback SQL script provided for migration 0027 (drops the feature_id column).
- [ ] AC-4: `wint.ts` Drizzle schema updated — `capabilities` table definition includes `featureId` nullable FK column referencing `features.id`.
- [ ] AC-5: `graph_get_franken_features` replaces stub implementation with full DB query: joins capabilities to features via featureId, groups by feature, filters features with fewer than 4 of the 4 CRUD capability types (create, read, update, delete), returns `FrankenFeatureItem[]`.
- [ ] AC-6: `graph_get_capability_coverage` replaces stub implementation with full DB query: looks up feature by UUID or name, queries capabilities by featureId, returns `CapabilityCoverageOutput` with counts by CRUD type and maturity level distribution.
- [ ] AC-7: Parameterized queries mandatory — both updated tools use Drizzle ORM query builder exclusively (no raw SQL string concatenation).
- [ ] AC-8: Zod input validation maintained — both tools still call `.parse(input)` at entry, fail fast on invalid input.
- [ ] AC-9: Resilient error handling maintained — both tools return empty array / null on DB errors (no re-throws), log via `logger.warn`.
- [ ] AC-10: Unit tests added for both `graph_get_franken_features` and `graph_get_capability_coverage` covering: happy path with data, empty result (no franken features / no capabilities), feature not found, and DB error resilience.
- [ ] AC-11: TypeScript compilation passes with zero errors across `packages/backend/database-schema` and `packages/backend/mcp-tools`.
- [ ] AC-12: ESLint passes with zero errors on all new/changed files.
- [ ] AC-13: `graph_check_cohesion` and `graph_apply_rules` remain fully functional and unmodified (no regression).

### Non-Goals

- Do NOT add the `feature_capabilities` junction table (many-to-many). This story adds a direct `featureId` FK on capabilities (one capability belongs to one feature). The full many-to-many relationship is deferred to WINT-4040.
- Do NOT update `unified-wint.ts` — that schema drift is deferred to WINT-1100.
- Do NOT implement graph visualization or UI (separate future story).
- Do NOT add query result caching or pagination (non-blocking deferred items from WINT-0130).
- Do NOT modify `__types__/index.ts` Zod schemas — `FrankenFeatureItemSchema` and `CapabilityCoverageOutputSchema` already define the correct output shapes.
- Do NOT populate seed data for capabilities with featureId values — that is WINT-4040 (infer existing capabilities).
- Do NOT modify WINT-0060's existing tables (features, featureRelationships, cohesionRules) — only capabilities is in scope.

### Reuse Plan

- **Components**: `graph-check-cohesion.ts` as reference for dual-ID feature lookup pattern (lines 50-59), resilient error handling pattern, and Drizzle query structure
- **Patterns**: Migration 0020 SQL format for `ALTER TABLE wint.capabilities ADD COLUMN`; Drizzle ORM `.select().from().where(eq())` with `.groupBy()` for aggregation
- **Packages**: `@repo/db` (db instance), `@repo/database-schema` (features, capabilities tables), `@repo/logger` (resilient logging), `drizzle-orm` (eq, and, or, count, sql operators)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- Tests must connect to real PostgreSQL (ADR-005); no in-memory DB or Drizzle mock
- Key test scenarios: (1) feature with 0-3 CRUD capabilities appears in franken list, (2) feature with all 4 CRUD capabilities does NOT appear, (3) capability coverage returns correct CRUD counts per feature, (4) feature not found returns null/empty, (5) DB error returns graceful empty/null
- The `__tests__` directory pattern is established in `mcp-tools/src/story-management/__tests__/` and `mcp-tools/src/context-cache/__tests__/` — follow the same structure under `graph-query/__tests__/`
- Integration test (similar to `story-management/__tests__/integration.test.ts`) should cover the full feature-capability query flow against a test-seeded database
- CRUD capability types are defined by the `capabilityType` field on capabilities — the tool should check for capabilities with capabilityType in `['create', 'read', 'update', 'delete']`

### For UI/UX Advisor

Not applicable — this is a pure backend schema + MCP tool story with no UI surface. Skip UI/UX review phase.

### For Dev Feasibility

- **Migration**: Simple ALTER TABLE — low risk. The featureId column is nullable so no existing rows are affected. FK ON DELETE SET NULL prevents orphan cascade issues.
- **Schema**: Only one file changes (`wint.ts`). The capabilities table definition currently ends at line ~1175; the featureId column must be added and a corresponding Drizzle relation must be added to both `capabilitiesRelations` and `featuresRelations`.
- **Tool rewrites**: Both tools currently have minimal implementation (just validation + stub return). The full implementation will need Drizzle joins or subqueries. For `graph_get_franken_features`, a GROUP BY with HAVING or application-level filtering is needed. For `graph_get_capability_coverage`, a simple `.where(eq(capabilities.featureId, resolvedFeatureId))` then aggregate in application code.
- **Breaking change risk**: LOW — the 2 tools currently return empty/null stubs. Any consumer treating empty/null as "no data" will now receive real data (a non-breaking behavioral improvement).
- **Test isolation**: Tests that seed capabilities with featureId need to clean up after themselves (use transactions or truncate in afterEach).
- **Verify pre-condition**: Before writing tool implementation, confirm migration 0027 has been applied by checking `information_schema.columns`.

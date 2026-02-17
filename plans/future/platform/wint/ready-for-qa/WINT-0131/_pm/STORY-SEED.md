---
generated: "2026-02-16"
baseline_used: null
baseline_date: null
lessons_loaded: true
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
seed_revision: 2
seed_revision_reason: "Enriched with full test scope for all 4 tools, SQL injection test requirement, and corrected schema source-of-truth (wint.ts confirmed via index.ts scan)"
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
- Schema source of truth: **Confirmed** — `packages/backend/database-schema/src/schema/index.ts` re-exports `features`, `capabilities`, `featureRelationships`, and `cohesionRules` from `./wint` (line 903-906, line 1051). The `unified-wint.ts` capabilities table is NOT exported from the package index. Therefore `wint.ts` is the definitive target for schema changes.
- The `unified-wint.ts` exports only: `worktrees` + workflow metadata tables (phases, agents, commands, skills). Do not add `featureId` to `unified-wint.ts` in this story.
- Parameterized queries are mandatory (AC-2 from WINT-0130 security pattern).
- Zod validation at entry is mandatory (AC-10 from WINT-0130 security pattern).
- No barrel files (CLAUDE.md).
- All new code must pass linting, TypeScript, and tests before commit.
- Capabilities table currently has: capabilityName, capabilityType, description, owner, maturityLevel (wint.ts also has lifecycleStage).
- The unified-wint.ts uses `maturityLevel` while wint.ts uses both `maturityLevel` and `lifecycleStage`. This drift must not be worsened.
- Test scope: Tests were deferred for ALL 4 tools in WINT-0130, not just the 2 schema-blocked tools. The comprehensive test suite must cover all 4: graph_check_cohesion, graph_get_franken_features, graph_get_capability_coverage, and graph_apply_rules.

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
  - *Applies because*: The featureId column must be added to wint.ts (confirmed source of truth via index.ts scan). `unified-wint.ts` capabilities table is NOT exported from `@repo/database-schema` — only wint.ts exports are. unified-wint.ts should receive the column only in WINT-1100.

- **[WINT-0060]** Migration 0020 added lifecycle_stage to capabilities but not featureId (pattern)
  - *Applies because*: The migration for WINT-0131 is a simple ALTER TABLE ADD COLUMN with FK constraint pattern matching migration 0020 exactly.

- **[WINT-0130]** Testing deferred for ALL 4 tools (not just 2), plus SQL injection tests (AC-3) — unit_tests.status: "NOT IMPLEMENTED", integration_tests.status: "NOT IMPLEMENTED", coverage.actual: "0%" (blocker)
  - *Applies because*: The test suite must cover all 4 tools. The schema gap was used as the reason to defer all tests, but graph_check_cohesion and graph_apply_rules are fully functional and had no blocking reason beyond time-boxing. WINT-0131 must deliver tests for all 4.

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
Add Feature-Capability Linkage to WINT Schema and Complete Graph Query MCP Tools Test Suite

### Description

**Context**: WINT-0130 (currently in UAT) implemented 4 graph query MCP tools but left 2 as stubs due to a schema gap and deferred all 4 tools' tests due to time-boxing. `graph_get_franken_features` returns an empty array and `graph_get_capability_coverage` returns null because `wint.capabilities` lacks a `featureId` foreign key. Additionally, 0% test coverage exists for all 4 tools — `graph_check_cohesion` and `graph_apply_rules` are fully functional but also untested.

**Problem**:
1. The `wint.capabilities` table has no FK to `wint.features`, making it impossible to determine which capabilities belong to which feature. Two tools are non-functional stubs.
2. Zero tests exist for all 4 graph query MCP tools. The 80%+ coverage target from WINT-0130 AC-14 is unmet. SQL injection tests (WINT-0130 AC-3) were deferred.

**Proposed Solution**:
1. Add `feature_id uuid REFERENCES wint.features(id) ON DELETE SET NULL` column to the `wint.capabilities` table in `wint.ts` (confirmed source of truth) via Drizzle migration 0027.
2. Rewrite `graph_get_franken_features.ts` to query capabilities by featureId and return features missing CRUD types.
3. Rewrite `graph_get_capability_coverage.ts` to query capabilities by featureId and return CRUD/maturity counts.
4. Write unit tests for all 4 tools using Vitest mocks (following session-management test patterns), covering happy path, error resilience, Zod validation, and SQL injection resistance.
5. Achieve 80%+ line coverage for `packages/backend/mcp-tools/src/graph-query/`.

### Initial Acceptance Criteria

**Schema & Migration (AC-1 through AC-4)**

- [ ] AC-1: Migration 0027 created — adds `feature_id uuid NULL REFERENCES wint.features(id) ON DELETE SET NULL` to `wint.capabilities` table with an index on `feature_id`. Target file is `packages/backend/database-schema/src/schema/wint.ts` (confirmed source of truth via package index).
- [ ] AC-2: Migration 0027 applies cleanly against the live database without errors and without dropping any existing data.
- [ ] AC-3: Rollback SQL script provided for migration 0027 (drops the feature_id column and its index).
- [ ] AC-4: `wint.ts` Drizzle schema updated — `capabilities` table definition includes `featureId` nullable FK column referencing `features.id`, plus a corresponding entry in `capabilitiesRelations` and `featuresRelations`.

**Tool Implementation (AC-5 through AC-9)**

- [ ] AC-5: `graph_get_franken_features` replaces stub implementation with full DB query: joins capabilities to features via featureId, groups by feature, filters features with fewer than 4 of the 4 CRUD capability types (create, read, update, delete), returns `FrankenFeatureItem[]` with `missingCapabilities` populated.
- [ ] AC-6: `graph_get_capability_coverage` replaces stub implementation with full DB query: looks up feature by UUID or name (dual ID support), queries capabilities by featureId, returns `CapabilityCoverageOutput` with counts by CRUD type and maturity level distribution.
- [ ] AC-7: Both updated tools use Drizzle ORM query builder exclusively (no raw SQL string concatenation) — parameterized queries maintained per WINT-0130 AC-2.
- [ ] AC-8: Both updated tools retain Zod input validation at entry (`.parse(input)` before any DB access) — fail fast maintained per WINT-0130 AC-10.
- [ ] AC-9: Both updated tools retain resilient error handling — return empty array / null on DB errors (no re-throws), log via `logger.warn` per WINT-0130 AC-12.

**Tests: graph_check_cohesion (AC-10)**

- [ ] AC-10: Unit test file `packages/backend/mcp-tools/src/graph-query/__tests__/graph-check-cohesion.test.ts` covering: (a) happy path — feature found, active rules evaluated, violations returned; (b) feature not found — returns `{ status: 'unknown' }`; (c) no active rules — returns `{ status: 'complete' }`; (d) DB error — returns `{ status: 'unknown' }`, logs warn; (e) invalid featureId input — Zod rejects; (f) malformed JSONB in rule — skips rule, logs warn; (g) SQL injection attempt in featureId handled by Drizzle parameterization.

**Tests: graph_get_franken_features (AC-11)**

- [ ] AC-11: Unit test file `packages/backend/mcp-tools/src/graph-query/__tests__/graph-get-franken-features.test.ts` covering: (a) happy path — returns features with < 4 CRUD capability types, missingCapabilities populated; (b) all features complete — returns `[]`; (c) packageName filter applied; (d) DB error — returns `[]`, logs warn; (e) packageName exceeds 255 chars — Zod rejects; (f) SQL injection attempt in packageName treated as literal string by Drizzle.

**Tests: graph_get_capability_coverage (AC-12)**

- [ ] AC-12: Unit test file `packages/backend/mcp-tools/src/graph-query/__tests__/graph-get-capability-coverage.test.ts` covering: (a) happy path — returns CapabilityCoverageOutput with correct CRUD counts; (b) feature not found — returns null; (c) feature has no linked capabilities — returns output with all counts = 0; (d) DB error — returns null, logs warn; (e) invalid featureId format — Zod rejects.

**Tests: graph_apply_rules (AC-13)**

- [ ] AC-13: Unit test file `packages/backend/mcp-tools/src/graph-query/__tests__/graph-apply-rules.test.ts` covering: (a) happy path — returns violations for features matched by active rules; (b) no active rules — returns `[]`; (c) ruleType filter — only rules of specified type evaluated; (d) DB error — returns `[]`, logs warn; (e) invalid ruleType enum value — Zod rejects; (f) malformed JSONB conditions — skips rule, logs warn.

**Build & Coverage (AC-14 through AC-16)**

- [ ] AC-14: TypeScript compilation passes with zero errors across `packages/backend/database-schema` and `packages/backend/mcp-tools` after all changes.
- [ ] AC-15: ESLint passes with zero errors on all new/changed files.
- [ ] AC-16: Line coverage for `packages/backend/mcp-tools/src/graph-query/` reaches 80% or higher as reported by Vitest coverage (matching the target from WINT-0130 AC-14).

### Non-Goals

- Do NOT add the `feature_capabilities` junction table (many-to-many). This story adds a direct `featureId` FK on capabilities (one capability belongs to one feature). The full many-to-many relationship is deferred to WINT-4040.
- Do NOT update `unified-wint.ts` capabilities table — the package index exports capabilities from `wint.ts` only; `unified-wint.ts` capabilities is not exported and schema drift is deferred to WINT-1100.
- Do NOT implement graph visualization or UI (separate future story, Phase 4+).
- Do NOT add query result caching or pagination (non-blocking deferred items from WINT-0130 DECISIONS.yaml gaps #2, #8).
- Do NOT modify `__types__/index.ts` Zod schemas — `FrankenFeatureItemSchema` and `CapabilityCoverageOutputSchema` already define the correct output shapes.
- Do NOT populate seed data for capabilities with featureId values — that is WINT-4040 (infer existing capabilities from codebase).
- Do NOT modify WINT-0060's existing tables (features, featureRelationships, cohesionRules) — only the capabilities table receives the new column.
- Do NOT add advanced regex/wildcard JSONB pattern matching — deferred per DECISIONS.yaml gap #1.
- Do NOT add integration tests using a real database in this story if they require schema setup not yet available — unit tests with mocks are sufficient for 80% coverage; integration tests are AC-grade if the test infrastructure is already available in the package.

### Reuse Plan

- **Components**: `graph-check-cohesion.ts` as reference for dual-ID feature lookup pattern (lines 50-59), resilient error handling pattern, and Drizzle query structure
- **Patterns**: Migration 0020 SQL format for `ALTER TABLE wint.capabilities ADD COLUMN`; Drizzle ORM `.select().from().where(eq())` with `.groupBy()` for aggregation
- **Packages**: `@repo/db` (db instance), `@repo/database-schema` (features, capabilities tables), `@repo/logger` (resilient logging), `drizzle-orm` (eq, and, or, count, sql operators)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- ADR-005 states UAT must use real services, but unit tests use mocks. For this story: use Vitest mocks for unit tests (mock `@repo/db` and `@repo/logger`). Integration tests, if included, would require a real PostgreSQL with migration 0027 applied.
- Unit test mock structure: follow `session-create.test.ts` exactly. The `vi.hoisted()` pattern is required. Mock `@repo/db` as `{ db: { select: mockSelect, insert: mockInsert, ... } }`. Mock the table schema shapes as column name strings (see session-create test lines 15-35 for reference).
- For `graph_check_cohesion` and `graph_apply_rules` (SELECT queries), the Drizzle mock chain is: `mockSelect → mockFrom → mockWhere → mockLimit` (or without limit). Mock each as returning the next chained method.
- For `graph_get_franken_features`, the query needs a join or subquery — mock should return appropriate grouped data.
- SQL injection test approach: pass `"'; DROP TABLE features; --"` as `featureId` or `packageName`. Zod will reject inputs that fail UUID/string validation. For inputs that pass Zod (valid strings), Drizzle ORM parameterizes them so the DB never interprets injected SQL — assert this by verifying the mock DB was called with the literal string as a parameter, not as raw SQL.
- Coverage scope: all 4 tools in `packages/backend/mcp-tools/src/graph-query/`. Each tool needs happy path + error path + Zod rejection = minimum 3 tests per tool = 12 tests minimum to reach 80%.
- CRUD capability types for franken-feature detection: defined by `capabilityType` field values `'create'`, `'read'`, `'update'`, `'delete'` on capabilities linked via featureId. A franken-feature has < 4 distinct capabilityType values linked.

### For UI/UX Advisor

Not applicable — this is a pure backend schema + MCP tool story with no UI surface. Skip UI/UX review phase.

### For Dev Feasibility

- **Schema change target confirmed**: `packages/backend/database-schema/src/schema/wint.ts`. The package index (`index.ts`) re-exports `capabilities` from `./wint` at line 904. `unified-wint.ts` capabilities table is NOT in the export list and must NOT be touched.
- **Migration**: Simple ALTER TABLE — low risk. featureId column is nullable so no existing rows are affected. FK ON DELETE SET NULL prevents cascade issues. Run `pnpm --filter @repo/database-schema db:generate` after editing wint.ts, then rename/review the generated file to `0027_wint_0131_capability_feature_linkage.sql`.
- **Relations update**: After adding `featureId` to capabilities in wint.ts, add `featureId` FK reference in the Drizzle table definition AND update both `capabilitiesRelations` and `featuresRelations` in wint.ts to reflect the one-feature-to-many-capabilities relationship.
- **Tool rewrites**: Both stub tools have only validation + immediate return. For `graph_get_franken_features`: query all features, for each feature query its linked capabilities by featureId, check if all 4 CRUD types are present, collect missing ones. For `graph_get_capability_coverage`: lookup feature by UUID or name (dual ID), query capabilities by featureId, group counts by capabilityType and maturityLevel.
- **Breaking change risk**: LOW — both tools currently return safe stubs. Any consumer receiving `[]` or `null` will now receive real data (behavioral improvement only).
- **Estimate**: Schema + migration: ~1 hour. Tool rewrites (2): ~2 hours. Unit tests (4 tools, 3+ cases each): ~4 hours. Review/fix: ~1 hour. Total: ~8 hours.
- **Pre-condition check**: Before writing tool logic, verify migration 0027 has run: `SELECT column_name FROM information_schema.columns WHERE table_schema = 'wint' AND table_name = 'capabilities' AND column_name = 'feature_id'`.

# DEV-FEASIBILITY: WINT-0131
# Add Feature-Capability Linkage to WINT Schema

Generated: 2026-02-16
Story: WINT-0131
Worker: pm-dev-feasibility-review

---

# Feasibility Summary

- **Feasible for MVP:** Yes
- **Confidence:** High
- **Why:** This story is a surgical fix to an already-implemented system. The scope is tightly bounded: (1) one nullable column addition via a migration, (2) one schema file update, (3) two stub-to-real rewrites of tools that already have correct type definitions. All reuse patterns (Drizzle query builder, error handling, dual-ID lookup) are established in `graph-check-cohesion.ts`. The risk of breaking existing functionality is LOW because the 2 target tools currently return empty/null stubs — any real data returned is a non-breaking improvement.

---

# Likely Change Surface (Core Only)

## Packages

| Package | File | Change Type |
|---------|------|-------------|
| `packages/backend/database-schema` | `src/schema/wint.ts` | Add `featureId` nullable FK column to capabilities table; update `capabilitiesRelations` and `featuresRelations` |
| `packages/backend/database-schema` | `src/migrations/app/0027_*.sql` | New migration: ALTER TABLE wint.capabilities ADD COLUMN feature_id |
| `packages/backend/database-schema` | `src/migrations/app/0027_*_rollback.sql` | New rollback: DROP COLUMN feature_id |
| `packages/backend/mcp-tools` | `src/graph-query/graph-get-franken-features.ts` | Replace stub with Drizzle query: join capabilities to features via featureId, group by feature, filter < 4 CRUD types |
| `packages/backend/mcp-tools` | `src/graph-query/graph-get-capability-coverage.ts` | Replace stub with Drizzle query: lookup feature by UUID or name, query capabilities by featureId, aggregate counts |
| `packages/backend/mcp-tools` | `src/graph-query/__tests__/graph-get-franken-features.test.ts` | New test file |
| `packages/backend/mcp-tools` | `src/graph-query/__tests__/graph-get-capability-coverage.test.ts` | New test file |

## Critical Deploy Touchpoints

1. Migration 0027 must be applied to the target database before deploying updated tool implementations
2. If the `@repo/database-schema` package is built before migration is applied, the Drizzle client will have a schema/DB mismatch — deploy migration first

---

# MVP-Critical Risks (Max 5)

## Risk 1: Migration number collision

- **Risk**: Another story or developer concurrently creates a migration numbered 0027, causing a collision
- **Why it blocks MVP**: Drizzle migration journal requires sequential numbering; a collision prevents migration from applying cleanly
- **Required mitigation**: Verify the last applied migration is 0026 (`0026_wint_1130_worktree_tracking`) immediately before creating the migration file. If any 0027 migration already exists, coordinate with the owner before proceeding.

## Risk 2: Drizzle relations not updated — TypeScript compilation failure

- **Risk**: Adding `featureId` to the `capabilities` table definition without updating both `capabilitiesRelations` (add `feature` relation) and `featuresRelations` (add `capabilities` relation) will cause Drizzle type inference issues
- **Why it blocks MVP**: `pnpm check-types:all` will fail, blocking CI/commit
- **Required mitigation**: After adding the column to `capabilities`, add the bidirectional Drizzle `.relations()` entries. Use `graph-check-cohesion.ts` (which already imports `features`) as a reference for the import pattern.

## Risk 3: `graph_get_franken_features` aggregation complexity

- **Risk**: Drizzle ORM may not support a clean GROUP BY + HAVING < 4 CRUD types query without raw SQL. Application-level filtering (fetch all, group in JS) may be necessary.
- **Why it blocks MVP**: If the query approach is wrong, the implementation will be incorrect or require SQL injection-risk raw strings
- **Required mitigation**: Use application-level aggregation (fetch capabilities with featureId, group by featureId in TypeScript, count distinct capabilityType values, filter features with < 4 CRUD types). This is safe, parameterized, and avoids raw SQL.

## Risk 4: Pre-condition verification before implementation

- **Risk**: WINT-0130 lesson: writing tool implementation before verifying migration is applied caused the stub problem in the first place
- **Why it blocks MVP**: Tool query referencing `capabilities.featureId` will fail at runtime if migration has not been applied
- **Required mitigation**: Developer MUST run `SELECT column_name FROM information_schema.columns WHERE table_schema = 'wint' AND table_name = 'capabilities' AND column_name = 'feature_id'` and confirm the column exists before writing or testing tool implementation.

## Risk 5: Test database seeding requires featureId linkage

- **Setup**: Tests for the new tools need to INSERT capabilities with `featureId` set. The test setup must reference actual feature UUIDs (inserted in the same test setup), not hardcoded UUIDs.
- **Why it blocks MVP**: Tests with hardcoded or non-existent UUIDs will fail FK constraint checks when inserting capabilities
- **Required mitigation**: Test `beforeEach`/`beforeAll` must insert a `wint.features` row first, capture the UUID, then insert `wint.capabilities` rows with `featureId = <captured-uuid>`. Use `afterEach`/`afterAll` to clean up.

---

# Missing Requirements for MVP

None. The story scope is fully specified. All required information is available:
- Migration number (0027)
- Schema source of truth (wint.ts, not unified-wint.ts)
- Column spec (`feature_id uuid NULL REFERENCES wint.features(id) ON DELETE SET NULL`)
- Reference implementations (`graph-check-cohesion.ts` for patterns)
- Output type definitions (already correct in `__types__/index.ts`)

---

# MVP Evidence Expectations

1. **Migration applied**: SQL query confirms `feature_id` column exists on `wint.capabilities`
2. **TypeScript clean**: `pnpm check-types:all` exits 0
3. **ESLint clean**: `pnpm lint:all` exits 0 on all new/changed files
4. **Tests green**: All new unit tests pass; existing graph-query tests pass (no regression)
5. **Tools return real data**: Manual test with seeded feature+capabilities confirms non-empty/non-null responses from both tools
6. **Rollback tested**: Rollback SQL applied and re-applied migration both work correctly

---

# FUTURE-RISKS (Non-MVP Concerns)

## Non-MVP Risk 1: unified-wint.ts schema drift worsens

- **Risk**: Adding `featureId` to wint.ts only increases the drift between wint.ts and unified-wint.ts
- **Impact if not addressed**: Developers working on WINT-1080/WINT-1100 will encounter a capabilities table that is even further out of sync between the two files
- **Recommended timeline**: Address in WINT-1100 (Create Shared TypeScript Types), which is explicitly scoped for this reconciliation

## Non-MVP Risk 2: Direct featureId FK limits future many-to-many capability sharing

- **Risk**: Adding a direct `featureId` FK (one capability = one feature) limits future scenarios where a capability may belong to multiple features
- **Impact if not addressed**: WINT-4040 (feature_capabilities junction table for many-to-many) will require migrating away from the direct FK
- **Recommended timeline**: Acceptable trade-off per story scope; WINT-4040 is already planned as the follow-up for many-to-many

## Non-MVP Risk 3: No seed data for existing capabilities

- **Risk**: After migration 0027, existing capabilities (seeded by WINT-0080) will have `featureId = NULL`. The Franken-feature tool will not return any of these as Franken-features because they are unlinked.
- **Impact if not addressed**: Tools return no useful data until capabilities are linked to features (WINT-4040 infers existing capabilities)
- **Recommended timeline**: WINT-4040 is the explicit next step for populating capability-feature linkage

## Non-MVP Risk 4: Performance at scale

- **Risk**: Application-level aggregation for Franken-feature detection (fetch all capabilities, group in JS) will become slow as the capabilities table grows beyond thousands of rows
- **Impact if not addressed**: Query latency increases linearly with capabilities table size
- **Recommended timeline**: Add server-side GROUP BY aggregation or materialized view when capabilities table exceeds ~10K rows (deferred from WINT-0130)

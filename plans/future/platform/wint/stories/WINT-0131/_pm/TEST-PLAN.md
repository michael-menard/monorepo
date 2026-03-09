# TEST-PLAN: WINT-0131
# Add Feature-Capability Linkage to WINT Schema

Generated: 2026-02-16
Story: WINT-0131
Worker: pm-draft-test-plan

---

# Scope Summary

- Endpoints touched: None (MCP tools, not HTTP endpoints)
- UI touched: No
- Data/storage touched: Yes — `wint.capabilities` table (migration adds `feature_id` column), Drizzle schema `wint.ts`
- Code touched:
  - `packages/backend/database-schema/src/schema/wint.ts`
  - `packages/backend/database-schema/src/migrations/app/0027_*.sql`
  - `packages/backend/mcp-tools/src/graph-query/graph-get-franken-features.ts`
  - `packages/backend/mcp-tools/src/graph-query/graph-get-capability-coverage.ts`
  - `packages/backend/mcp-tools/src/graph-query/__tests__/` (new test files)

---

# Happy Path Tests

## Test 1: Migration 0027 applies cleanly

- **Setup**: Database at migration 0026 state; no `feature_id` column on `wint.capabilities`
- **Action**: Run `pnpm drizzle-kit migrate` (or equivalent migration runner)
- **Expected outcome**: Migration applies without errors; `wint.capabilities` now has `feature_id uuid NULL` column with FK to `wint.features(id)` and an index on `feature_id`
- **Evidence**: `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'wint' AND table_name = 'capabilities' AND column_name = 'feature_id'` returns one row with `data_type = 'uuid'` and `is_nullable = 'YES'`

## Test 2: Drizzle schema reflects featureId column

- **Setup**: wint.ts updated with `featureId` column definition
- **Action**: TypeScript compilation (`pnpm check-types` or `tsc --noEmit`)
- **Expected outcome**: Zero TypeScript errors across `packages/backend/database-schema` and `packages/backend/mcp-tools`
- **Evidence**: `pnpm check-types:all` exits with code 0

## Test 3: graph_get_franken_features — feature with < 4 CRUD types is a Franken-feature

- **Setup**: Insert a `wint.features` row (e.g., `featureName = 'incomplete-feature'`). Insert 2 `wint.capabilities` rows: `capabilityType = 'create'` and `capabilityType = 'read'`, both linked to the feature via `featureId`. No 'update' or 'delete' capabilities for this feature.
- **Action**: Call `graph_get_franken_features({})`
- **Expected outcome**: Returns array containing `{ featureId: '<uuid>', featureName: 'incomplete-feature', missingCapabilities: ['update', 'delete'] }`
- **Evidence**: Result array length >= 1; the item's `missingCapabilities` array contains exactly `['update', 'delete']` (or equivalent missing types)

## Test 4: graph_get_franken_features — feature with all 4 CRUD types is NOT a Franken-feature

- **Setup**: Insert a `wint.features` row (e.g., `featureName = 'complete-feature'`). Insert 4 `wint.capabilities` rows: `capabilityType` in `['create', 'read', 'update', 'delete']`, all linked via `featureId`.
- **Action**: Call `graph_get_franken_features({})`
- **Expected outcome**: The complete-feature does NOT appear in the returned array
- **Evidence**: No item in result array has `featureName = 'complete-feature'`

## Test 5: graph_get_franken_features — optional packageName filter works

- **Setup**: Two features: `feature-pkg-a` (linked to `packageName = '@repo/ui'`) with 2 capabilities, and `feature-pkg-b` (linked to `packageName = '@repo/api'`) with 2 capabilities.
- **Action**: Call `graph_get_franken_features({ packageName: '@repo/ui' })`
- **Expected outcome**: Only `feature-pkg-a` appears in result; `feature-pkg-b` is excluded
- **Evidence**: Result array length == 1 and item has `featureName = 'feature-pkg-a'`

## Test 6: graph_get_capability_coverage — returns correct CRUD counts

- **Setup**: Insert a `wint.features` row. Insert 5 capabilities linked to it: 2 `create`, 1 `read`, 1 `update`, 1 `delete`, with mixed maturity levels (`stable`, `beta`).
- **Action**: Call `graph_get_capability_coverage({ featureId: '<uuid>' })` using the feature UUID
- **Expected outcome**: Returns `{ featureId: '<uuid>', capabilities: { create: 2, read: 1, update: 1, delete: 1 }, maturityLevels: { stable: N, beta: M }, totalCount: 5 }`
- **Evidence**: All field values match seeded data exactly

## Test 7: graph_get_capability_coverage — dual ID support (feature name lookup)

- **Setup**: Feature with `featureName = 'test-feature'` and 2 capabilities linked by `featureId`
- **Action**: Call `graph_get_capability_coverage({ featureId: 'test-feature' })` (using name, not UUID)
- **Expected outcome**: Returns non-null `CapabilityCoverageOutput` with correct counts
- **Evidence**: `featureId` in result matches the UUID of the feature named `'test-feature'`

## Test 8: No regression — graph_check_cohesion still functional

- **Setup**: Feature exists in `wint.features`, active cohesion rules in `wint.cohesionRules`
- **Action**: Call `graph_check_cohesion({ featureId: '<feature-name>' })`
- **Expected outcome**: Returns `{ status: 'complete' | 'incomplete' | 'unknown' }` — same behavior as before WINT-0131
- **Evidence**: Test passes without modification (existing tests remain green)

## Test 9: No regression — graph_apply_rules still functional

- **Setup**: Active cohesion rules exist
- **Action**: Call `graph_apply_rules({})` (no filter) and `graph_apply_rules({ ruleType: 'package_cohesion' })` (filtered)
- **Expected outcome**: Returns array of violations — same behavior as before WINT-0131
- **Evidence**: Existing tests pass without modification

---

# Error Cases

## Error Case 1: graph_get_capability_coverage — feature not found (UUID)

- **Setup**: No row in `wint.features` for the given UUID
- **Action**: Call `graph_get_capability_coverage({ featureId: '00000000-0000-0000-0000-000000000001' })`
- **Expected outcome**: Returns `null`
- **Evidence**: Return value is strictly `null`

## Error Case 2: graph_get_capability_coverage — feature not found (name)

- **Setup**: No row in `wint.features` with `featureName = 'nonexistent-feature'`
- **Action**: Call `graph_get_capability_coverage({ featureId: 'nonexistent-feature' })`
- **Expected outcome**: Returns `null`
- **Evidence**: Return value is strictly `null`

## Error Case 3: graph_get_franken_features — DB error resilience

- **Setup**: Simulate DB error (e.g., close DB connection or mock db to throw)
- **Action**: Call `graph_get_franken_features({})`
- **Expected outcome**: Returns `[]` (empty array), does NOT throw
- **Evidence**: No exception propagated; `logger.warn` called once with error message

## Error Case 4: graph_get_capability_coverage — DB error resilience

- **Setup**: Simulate DB error
- **Action**: Call `graph_get_capability_coverage({ featureId: 'some-feature' })`
- **Expected outcome**: Returns `null`, does NOT throw
- **Evidence**: No exception propagated; `logger.warn` called once with error message

## Error Case 5: Invalid input — empty featureId

- **Setup**: None
- **Action**: Call `graph_get_capability_coverage({ featureId: '' })`
- **Expected outcome**: Zod validation throws `ZodError` (fail-fast at entry)
- **Evidence**: `ZodError` thrown with message referencing `featureId`

## Error Case 6: Invalid input — packageName exceeds 255 chars

- **Setup**: None
- **Action**: Call `graph_get_franken_features({ packageName: 'a'.repeat(256) })`
- **Expected outcome**: Zod validation throws `ZodError`
- **Evidence**: `ZodError` thrown with message referencing `packageName`

---

# Edge Cases

## Edge Case 1: Feature with 0 capabilities (no capabilities at all)

- **Setup**: Insert a feature with no capabilities linked (no rows in `wint.capabilities` where `featureId = <feature-uuid>`)
- **Action**: Call `graph_get_franken_features({})`
- **Expected outcome**: Feature appears in Franken-feature list with `missingCapabilities: ['create', 'read', 'update', 'delete']`
- **Evidence**: Item in result with all 4 CRUD types listed as missing

## Edge Case 2: graph_get_capability_coverage — feature exists but has 0 capabilities

- **Setup**: Feature row exists, no capability rows with that `featureId`
- **Action**: Call `graph_get_capability_coverage({ featureId: '<uuid>' })`
- **Expected outcome**: Returns `{ featureId: '<uuid>', capabilities: { create: 0, read: 0, update: 0, delete: 0 }, maturityLevels: {}, totalCount: 0 }`
- **Evidence**: All counts are 0; `maturityLevels` is empty object

## Edge Case 3: Capabilities with NULL featureId are excluded

- **Setup**: Insert capabilities with `featureId = NULL` (unlinked capabilities)
- **Action**: Call `graph_get_franken_features({})` and `graph_get_capability_coverage` for an unrelated feature
- **Expected outcome**: Unlinked (NULL featureId) capabilities do not appear in any feature's coverage or Franken-feature calculation
- **Evidence**: Feature with only unlinked capabilities is not counted; counts are 0 for features that only have NULL-featureId capabilities

## Edge Case 4: feature_id FK ON DELETE SET NULL — delete feature, capabilities still exist

- **Setup**: Insert feature + capabilities linked via `featureId`. Delete the feature row.
- **Action**: Query `wint.capabilities` where `feature_id IS NULL` (after deletion)
- **Expected outcome**: Previously-linked capabilities now have `feature_id = NULL` (no cascade delete of capabilities)
- **Evidence**: Capabilities count unchanged; `feature_id` column is NULL on previously-linked rows

## Edge Case 5: No Franken-features in database

- **Setup**: Only features with all 4 CRUD capabilities, or no features at all
- **Action**: Call `graph_get_franken_features({})`
- **Expected outcome**: Returns `[]` (empty array)
- **Evidence**: Return value is empty array, no error thrown

## Edge Case 6: Test isolation — transactions/cleanup

- **Setup**: Each test that seeds capabilities with featureId uses `beforeEach`/`afterEach` to truncate or use transactions
- **Action**: Run full test suite multiple times in sequence
- **Expected outcome**: Tests are idempotent — no data leakage between tests
- **Evidence**: Test suite passes consistently on 3 consecutive runs

---

# Required Tooling Evidence

## Backend

- Vitest unit tests in `packages/backend/mcp-tools/src/graph-query/__tests__/`
  - `graph-get-franken-features.test.ts` — all happy paths + error cases above
  - `graph-get-capability-coverage.test.ts` — all happy paths + error cases above
  - Integration test file covering feature-capability full flow against real PostgreSQL (ADR-005)
- TypeScript compilation check: `pnpm check-types:all` — zero errors
- ESLint: `pnpm lint:all` — zero errors on new/changed files
- Migration verification: `SELECT column_name FROM information_schema.columns WHERE table_schema = 'wint' AND table_name = 'capabilities'` includes `feature_id`
- Rollback script: `0027_*_rollback.sql` must exist and be tested

## Tooling Stack

- ADR-005: Tests use real PostgreSQL database — no in-memory mocks, no Drizzle mocks
- Follow test structure from `mcp-tools/src/story-management/__tests__/` and `mcp-tools/src/context-cache/__tests__/`
- Integration test pattern: `mcp-tools/src/story-management/__tests__/integration.test.ts`

---

# Risks to Call Out

1. **Migration pre-condition verification**: The tool implementations must not be written until after confirming migration 0027 has been applied. The pre-condition check `SELECT column_name FROM information_schema.columns WHERE table_schema = 'wint' AND table_name = 'capabilities' AND column_name = 'feature_id'` must return a row before tool code executes DB queries using `featureId`.

2. **Test cleanup isolation**: Tests that seed capabilities with `featureId` must use transactions or explicit truncation in `afterEach`. Failure to isolate leaves test data that causes false positives or count mismatches in subsequent tests.

3. **Drizzle relation registration**: When `featureId` is added to `wint.ts`, the Drizzle `capabilitiesRelations` and `featuresRelations` must be updated. Missing relation registration causes TypeScript errors in query builders — verify `drizzle-zod` schema generation still works.

4. **Ambiguity: capabilityType values**: The CRUD types checked by `graph_get_franken_features` are assumed to be exactly `['create', 'read', 'update', 'delete']`. Confirm with existing seed data (WINT-0080 seeded capabilities) that these are the exact enum values stored in `capabilityType`. If different (e.g., 'view' instead of 'read'), the filter logic and test data must match.

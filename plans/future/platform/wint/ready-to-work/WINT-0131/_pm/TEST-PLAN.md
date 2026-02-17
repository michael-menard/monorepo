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
  - `packages/backend/mcp-tools/src/graph-query/__tests__/` (4 new test files)

---

# Test Framework

- **Unit Tests**: Vitest with `vi.hoisted()` mock pattern (follow `session-management/__tests__/session-create.test.ts`)
- **Mocks**: `@repo/db` (mock `db` object with Drizzle chain), `@repo/logger` (mock `logger.warn`)
- **ADR-005**: UAT integration tests use real PostgreSQL. Unit tests use mocks — this is acceptable for the development phase.
- **Coverage target**: 80%+ line coverage for `packages/backend/mcp-tools/src/graph-query/`

---

# Happy Path Tests

## Test 1: Migration 0027 applies cleanly

- **Setup**: Database at migration 0026 state; no `feature_id` column on `wint.capabilities`
- **Action**: Run migration runner (or equivalent)
- **Expected outcome**: Migration applies without errors; `wint.capabilities` now has `feature_id uuid NULL` column with FK to `wint.features(id)` and an index on `feature_id`
- **Evidence**: `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'wint' AND table_name = 'capabilities' AND column_name = 'feature_id'` returns one row with `data_type = 'uuid'` and `is_nullable = 'YES'`

## Test 2: TypeScript compilation clean

- **Setup**: wint.ts updated with `featureId` column definition and updated relations
- **Action**: `pnpm check-types:all`
- **Expected outcome**: Zero TypeScript errors across `packages/backend/database-schema` and `packages/backend/mcp-tools`
- **Evidence**: Command exits with code 0

## Test 3: graph_get_franken_features — feature with < 4 CRUD types is Franken-feature

- **Setup**: Mock db returns capabilities for a feature with only `['create', 'read']` capability types
- **Action**: Call `graph_get_franken_features({})`
- **Expected outcome**: Returns array containing `{ featureId: '<uuid>', featureName: 'incomplete-feature', missingCapabilities: ['update', 'delete'] }`
- **Evidence**: Result array length >= 1; item's `missingCapabilities` contains exactly `['update', 'delete']`

## Test 4: graph_get_franken_features — complete feature NOT returned

- **Setup**: Mock db returns capabilities for a feature with all 4 types: `['create', 'read', 'update', 'delete']`
- **Action**: Call `graph_get_franken_features({})`
- **Expected outcome**: Feature does NOT appear in returned array
- **Evidence**: No item in result with `featureName = 'complete-feature'`

## Test 5: graph_get_franken_features — packageName filter works

- **Setup**: Mock db returns features from multiple packages; one matching `@repo/ui` and one `@repo/api`
- **Action**: Call `graph_get_franken_features({ packageName: '@repo/ui' })`
- **Expected outcome**: Only `@repo/ui` feature returned; `@repo/api` excluded
- **Evidence**: Result array length == 1

## Test 6: graph_get_capability_coverage — correct CRUD counts returned

- **Setup**: Mock db returns feature row + 5 capabilities: 2 create, 1 read, 1 update, 1 delete with mixed maturity levels
- **Action**: Call `graph_get_capability_coverage({ featureId: '<uuid>' })`
- **Expected outcome**: `{ featureId: '<uuid>', capabilities: { create: 2, read: 1, update: 1, delete: 1 }, maturityLevels: { stable: N, beta: M }, totalCount: 5 }`
- **Evidence**: All field values match seeded data exactly

## Test 7: graph_get_capability_coverage — dual ID support (feature name lookup)

- **Setup**: Mock db returns feature row when queried by name `'test-feature'`
- **Action**: Call `graph_get_capability_coverage({ featureId: 'test-feature' })`
- **Expected outcome**: Returns non-null `CapabilityCoverageOutput`
- **Evidence**: `featureId` in result matches the UUID of the feature named `'test-feature'`

## Test 8: graph_check_cohesion — happy path (feature found, rules evaluated)

- **Setup**: Mock db returns a feature and active cohesion rules
- **Action**: Call `graph_check_cohesion({ featureId: 'my-feature' })`
- **Expected outcome**: Returns `{ status: 'complete' | 'incomplete', violations: [...] }`
- **Evidence**: Status is one of the expected enum values; no exceptions thrown

## Test 9: graph_apply_rules — happy path (active rules applied)

- **Setup**: Mock db returns 3 active rules; no violations matched
- **Action**: Call `graph_apply_rules({})`
- **Expected outcome**: Returns array (may be empty if no violations); no exceptions thrown
- **Evidence**: Return value is an array

---

# Error Cases

## Error Case 1: graph_get_capability_coverage — feature not found (UUID)

- **Action**: Call with UUID not in mock db result
- **Expected outcome**: Returns `null`
- **Evidence**: Return value is strictly `null`

## Error Case 2: graph_get_capability_coverage — feature not found (name)

- **Action**: Call with `featureId: 'nonexistent-feature'`
- **Expected outcome**: Returns `null`
- **Evidence**: Return value is strictly `null`

## Error Case 3: graph_get_franken_features — DB error resilience

- **Setup**: Mock `db.select` to throw `new Error('connection refused')`
- **Action**: Call `graph_get_franken_features({})`
- **Expected outcome**: Returns `[]`, does NOT throw; `logger.warn` called once
- **Evidence**: No exception propagated; mock `mockWarn` called with error context

## Error Case 4: graph_get_capability_coverage — DB error resilience

- **Setup**: Mock `db.select` to throw
- **Action**: Call `graph_get_capability_coverage({ featureId: 'some-feature' })`
- **Expected outcome**: Returns `null`, does NOT throw; `logger.warn` called once
- **Evidence**: No exception propagated; `mockWarn` called

## Error Case 5: graph_check_cohesion — DB error returns unknown status

- **Setup**: Mock `db.select` to throw
- **Action**: Call `graph_check_cohesion({ featureId: 'some-feature' })`
- **Expected outcome**: Returns `{ status: 'unknown' }`, does NOT throw; `logger.warn` called
- **Evidence**: Return value has `status === 'unknown'`

## Error Case 6: graph_apply_rules — DB error returns empty array

- **Setup**: Mock `db.select` to throw
- **Action**: Call `graph_apply_rules({})`
- **Expected outcome**: Returns `[]`, does NOT throw; `logger.warn` called
- **Evidence**: Return value is empty array

## Error Case 7: Zod rejection — empty featureId

- **Action**: Call `graph_get_capability_coverage({ featureId: '' })`
- **Expected outcome**: `ZodError` thrown before any DB access
- **Evidence**: Error is instance of `ZodError`; mock `mockSelect` never called

## Error Case 8: Zod rejection — packageName exceeds 255 chars

- **Action**: Call `graph_get_franken_features({ packageName: 'a'.repeat(256) })`
- **Expected outcome**: `ZodError` thrown
- **Evidence**: Error references `packageName` validation constraint

## Error Case 9: Zod rejection — invalid ruleType enum value

- **Action**: Call `graph_apply_rules({ ruleType: 'INVALID_TYPE' })`
- **Expected outcome**: `ZodError` thrown before DB access
- **Evidence**: Error instance; no mock DB calls made

---

# Edge Cases

## Edge Case 1: Feature with 0 capabilities

- **Setup**: Mock db returns a feature but no capabilities linked (empty capabilities array)
- **Action**: Call `graph_get_franken_features({})`
- **Expected outcome**: Feature appears with `missingCapabilities: ['create', 'read', 'update', 'delete']`
- **Evidence**: Item in result with all 4 CRUD types listed as missing

## Edge Case 2: graph_get_capability_coverage — feature has 0 capabilities

- **Setup**: Feature row in mock; no capability rows with that `featureId`
- **Action**: Call `graph_get_capability_coverage({ featureId: '<uuid>' })`
- **Expected outcome**: Returns `{ featureId: '<uuid>', capabilities: { create: 0, read: 0, update: 0, delete: 0 }, maturityLevels: {}, totalCount: 0 }`
- **Evidence**: All counts are 0; `maturityLevels` is empty object

## Edge Case 3: Capabilities with NULL featureId excluded from Franken-feature calculation

- **Setup**: Mock db returns capabilities with `featureId = null`
- **Action**: Call `graph_get_franken_features({})`
- **Expected outcome**: Null-featureId capabilities do not contribute to any feature's CRUD coverage
- **Evidence**: Features not linked by featureId do not appear in result (or appear with all 4 missing)

## Edge Case 4: No active rules

- **Setup**: Mock db returns 0 active rules for `graph_check_cohesion`
- **Action**: Call `graph_check_cohesion({ featureId: 'my-feature' })`
- **Expected outcome**: Returns `{ status: 'complete' }` (no rules to violate = complete)
- **Evidence**: `status === 'complete'`

## Edge Case 5: No active rules for graph_apply_rules

- **Setup**: Mock db returns 0 active rules
- **Action**: Call `graph_apply_rules({})`
- **Expected outcome**: Returns `[]`
- **Evidence**: Return value is empty array

## Edge Case 6: Malformed JSONB in cohesion rule conditions

- **Setup**: Mock db returns a rule with `conditions` set to malformed JSON / null value
- **Action**: Call `graph_check_cohesion` or `graph_apply_rules`
- **Expected outcome**: Malformed rule is skipped; `logger.warn` called; function returns gracefully
- **Evidence**: No exception thrown; `mockWarn` called; return value still valid

## Edge Case 7: SQL injection attempt — handled by Drizzle parameterization

- **Setup**: Pass `"'; DROP TABLE features; --"` as `featureId` to `graph_check_cohesion`
- **Action**: Call `graph_check_cohesion({ featureId: "'; DROP TABLE features; --" })`
- **Expected outcome**: Zod validates `featureId` as a string; if it passes Zod, Drizzle passes it as a parameterized query value (not raw SQL); mock `mockWhere` is called with the string as an argument, not concatenated into SQL
- **Evidence**: `mockWhere` called; mock `db` chain called normally; no SQL injection occurs (Drizzle ensures parameterization)

## Edge Case 8: No Franken-features in database

- **Setup**: Mock db returns only features with all 4 CRUD capabilities
- **Action**: Call `graph_get_franken_features({})`
- **Expected outcome**: Returns `[]`
- **Evidence**: Return value is empty array, no error thrown

---

# Required Tooling Evidence

## Build

- `pnpm check-types:all` — zero TypeScript errors
- `pnpm lint:all` — zero ESLint errors on all new/changed files

## Tests

- `pnpm --filter @repo/mcp-tools test src/graph-query/__tests__` — all tests pass
- `pnpm --filter @repo/mcp-tools test --coverage` — line coverage >= 80% for `src/graph-query/`

## Migration

- SQL files present:
  - `packages/backend/database-schema/src/migrations/app/0027_wint_0131_capability_feature_linkage.sql`
  - `packages/backend/database-schema/src/migrations/app/0027_wint_0131_capability_feature_linkage_rollback.sql`
- Database verification: `SELECT column_name FROM information_schema.columns WHERE table_schema = 'wint' AND table_name = 'capabilities' AND column_name = 'feature_id'` returns 1 row

---

# Risks to Call Out

1. **Migration pre-condition**: Tool implementations must not be written until migration 0027 is confirmed applied. The `feature_id` column must exist before DB query code using `capabilities.featureId` can be written and tested.

2. **Drizzle relation registration**: When `featureId` is added to `wint.ts`, both `capabilitiesRelations` (adding `feature: many(features)`) and `featuresRelations` (adding `capabilities: many(capabilities)`) must be updated. Missing registration causes TypeScript errors in downstream query builders.

3. **capabilityType enum values**: The CRUD types for Franken-feature detection (`['create', 'read', 'update', 'delete']`) must match the exact string values stored in the `capabilityType` column by WINT-0080 seed data. Verify before writing filter logic.

4. **Test isolation**: Tests that seed capabilities with `featureId` via mocks must reset mocks with `beforeEach(() => vi.clearAllMocks())` to prevent state leakage between test cases.

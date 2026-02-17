# DEV-FEASIBILITY: WINT-0131
# Add Feature-Capability Linkage to WINT Schema

Generated: 2026-02-16
Story: WINT-0131
Worker: pm-dev-feasibility-review

---

## Verdict: PROCEED WITH CONFIDENCE

**Confidence:** 90%
**Estimated Effort:** 8-10 hours (1-1.5 days)
**Blockers:** None identified

---

## Complexity Assessment: LOW-MEDIUM

### Schema Change (LOW)

- Simple ALTER TABLE ADD COLUMN — adds a single nullable FK column
- `featureId` is nullable so zero existing rows are affected
- FK `ON DELETE SET NULL` prevents cascade issues on feature deletion
- Migration pattern identical to 0020 (ALTER TABLE with `-->` statement-breakpoint)
- Migration generation: `pnpm --filter @repo/database-schema db:generate` after editing `wint.ts`, then rename to `0027_wint_0131_capability_feature_linkage.sql`
- Relation registration: Both `capabilitiesRelations` and `featuresRelations` in `wint.ts` must be updated to reflect one-feature-to-many-capabilities

### Tool Rewrites (LOW-MEDIUM)

- `graph-get-franken-features.ts`: Currently a stub returning `[]`. Rewrite to query capabilities via `innerJoin(features, eq(capabilities.featureId, features.id))` + `isNotNull(capabilities.featureId)`. Group by featureId in TypeScript, compute missing CRUD types.
- `graph-get-capability-coverage.ts`: Currently a stub returning `null`. Rewrite to use dual-ID feature lookup (copy pattern from `graph-check-cohesion.ts` lines 50-55) then query capabilities by `featureId`. Aggregate counts by capabilityType and maturityLevel in TypeScript.
- Both stubs return safe empty values today — behavioral change is improvement only, no regression risk.

### Test Suite (MEDIUM — highest effort item)

- 4 test files from scratch, each with 6-8 test cases = ~28 tests minimum
- Must follow `vi.hoisted()` mock pattern from `session-create.test.ts` exactly
- Drizzle mock chain for SELECT queries: `mockSelect → mockFrom → mockWhere → mockLimit`
- JOIN queries require slightly deeper mock chain: mock must return inner join result arrays
- SQL injection test: verify `mockWhere` called with literal string (Drizzle parameterizes it)

---

## Implementation Sequence

1. **Pre-condition verification** (10 min)
   - Confirm migration 0026 is last applied: `SELECT MAX(id) FROM drizzle.__drizzle_migrations`
   - Note current capabilities columns for reference

2. **Schema update** (30 min)
   - Edit `packages/backend/database-schema/src/schema/wint.ts`
   - Add `featureId: uuid('feature_id').references(() => features.id, { onDelete: 'set null' })`
   - Update `capabilitiesRelations`: add `feature: many(features)`
   - Update `featuresRelations`: add `capabilities: many(capabilities)`

3. **Migration generation** (20 min)
   - Run `pnpm --filter @repo/database-schema db:generate`
   - Review generated SQL; rename to `0027_wint_0131_capability_feature_linkage.sql`
   - Verify it contains: `ADD COLUMN "feature_id" uuid` + FK constraint + `CREATE INDEX`
   - Create corresponding `_rollback.sql`

4. **Apply migration** (10 min)
   - Apply to local database
   - Verify column exists: `SELECT column_name FROM information_schema.columns WHERE table_schema = 'wint' AND table_name = 'capabilities' AND column_name = 'feature_id'`

5. **Rewrite graph-get-franken-features.ts** (60 min)
   - Import `isNotNull`, `innerJoin` from `drizzle-orm`
   - Query: `db.select(...).from(capabilities).innerJoin(features, eq(capabilities.featureId, features.id)).where(isNotNull(capabilities.featureId))`
   - TypeScript groupBy featureId; check missing CRUD types from `['create', 'read', 'update', 'delete']`
   - Wrap in try/catch; return `[]` + `logger.warn` on error

6. **Rewrite graph-get-capability-coverage.ts** (60 min)
   - Copy dual-ID feature lookup from `graph-check-cohesion.ts` lines 50-55
   - If no feature found, return `null`
   - Query `capabilities.where(eq(capabilities.featureId, feature.id))`
   - Aggregate in TypeScript: `reduce` over rows for CRUD counts and maturity level distribution
   - Wrap in try/catch; return `null` + `logger.warn` on error

7. **Write unit tests** (240 min — 4 files)
   - `graph-check-cohesion.test.ts`: 7 test cases (happy path, not-found, no-rules, DB error, Zod error, malformed JSONB, SQL injection)
   - `graph-get-franken-features.test.ts`: 6 test cases (Franken-feature, complete feature excluded, packageName filter, DB error, Zod rejection, 0 capabilities)
   - `graph-get-capability-coverage.test.ts`: 6 test cases (full coverage, dual ID, not-found, DB error, 0 capabilities, Zod rejection)
   - `graph-apply-rules.test.ts`: 6 test cases (happy path, no rules, ruleType filter, DB error, Zod rejection, malformed JSONB)

8. **Coverage verification** (20 min)
   - `pnpm --filter @repo/mcp-tools test --coverage`
   - Confirm line coverage >= 80% for `src/graph-query/`

9. **Type check + lint** (10 min)
   - `pnpm check-types:all`
   - `pnpm lint:all`

**Total: ~8.5 hours**

---

## Potential Challenges

| Challenge | Likelihood | Impact | Mitigation |
|-----------|-----------|--------|------------|
| capabilityType enum mismatch (values stored differ from `['create','read','update','delete']`) | LOW | MEDIUM | Query seed data first: `SELECT DISTINCT capability_type FROM wint.capabilities LIMIT 20` |
| Drizzle relation registration causes TS errors | MEDIUM | MEDIUM | Follow existing `featuresRelations` pattern in `wint.ts`; run `pnpm check-types:all` early |
| JOIN mock chain complexity | MEDIUM | LOW | Test simple SELECT chain first; add innerJoin stub returning flat array |
| Migration numbering collision | LOW | HIGH | Verify `0026_wint_1130_worktree_tracking` is last file before naming 0027 |

---

## Packages and Dependencies

All required packages are already in the project. No new dependencies needed:

| Package | Already Installed | Usage |
|---------|------------------|-------|
| `@repo/db` | Yes | `db` query instance |
| `@repo/database-schema` | Yes | `features`, `capabilities` table defs |
| `@repo/logger` | Yes | `logger.warn()` |
| `drizzle-orm` | Yes | `eq`, `or`, `and`, `isNotNull`, `innerJoin` |
| `vitest` | Yes | Unit test framework |

---

## Risk Assessment: LOW-MEDIUM Overall

The primary complexity is in the test suite (28+ test cases across 4 files), not the implementation. The schema change is low-risk (nullable FK add), the tool rewrites have clear reference implementations, and the test patterns are already established in session-management. The story is well-scoped and unlikely to require splitting.

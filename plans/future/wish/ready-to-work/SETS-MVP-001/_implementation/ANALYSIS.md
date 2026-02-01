# Elaboration Analysis - SETS-MVP-001

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | FAIL | Critical | Story missing from stories.index.md; scope includes migration but not backend adapter/service layers required by API layer architecture |
| 2 | Internal Consistency | PASS | — | Goals, non-goals, and ACs are internally consistent |
| 3 | Reuse-First | PASS | — | Extends existing wishlist_items table; reuses Drizzle/Zod patterns from WISH-2000 |
| 4 | Ports & Adapters | FAIL | Critical | Story plans schema changes but does NOT specify service layer in `apps/api/lego-api/domains/` as required by docs/architecture/api-layer.md |
| 5 | Local Testability | CONDITIONAL | Medium | Schema validation tests specified (AC17-20), but no .http tests for endpoint changes |
| 6 | Decision Completeness | CONDITIONAL | Low | Table rename decision (wishlist_items → user_sets) is marked as "optional" but has downstream naming impact |
| 7 | Risk Disclosure | PASS | — | Migration compatibility and existing integration risks disclosed |
| 8 | Story Sizing | PASS | — | 20 ACs is acceptable for schema-only story; all focused on single table extension |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | **Missing stories.index.md entry** | Critical | Add SETS-MVP-001 to stories.index.md under feature directory plans/future/wish/. Story prefix is "SETS-MVP" (cross-feature story extending wishlist). |
| 2 | **Ports & Adapters violation** | Critical | Story must specify backend service layer changes. Per docs/architecture/api-layer.md, any schema changes affecting API endpoints MUST include service layer updates in `apps/api/lego-api/domains/wishlist/application/services.ts`. Story currently only mentions "existing API endpoints continue to work unchanged" but does NOT specify how to implement `?status=owned` filter or updated Zod schemas in service layer. |
| 3 | **Missing service-level testing** | Medium | AC20 tests "existing wishlist queries still work" but does NOT specify WHERE these tests exist. Need integration tests in `apps/api/lego-api/domains/wishlist/__tests__/services.test.ts` to verify service layer handles new status enum correctly. |
| 4 | **Table rename decision incomplete** | Low | AC title mentions "optionally renamed to user_sets" but Technical Details section shows SQL using `wishlist_items`. Decide: keep `wishlist_items` or rename to `user_sets`. If rename, add AC for updating all import statements, schema exports, and API references. If keep, remove "optionally renamed" from AC3 title. |
| 5 | **Backward Compatibility gap** | Medium | Story states "existing API endpoints continue to work unchanged" but does NOT specify tests for this claim. Add AC: "Integration test verifies GET /api/wishlist returns only items where status='wishlist' (default filter)". |
| 6 | **Missing Zod schema export location** | Low | AC9-13 create new Zod schemas but do NOT specify where they should be defined. Per API layer architecture, schemas should be in `apps/api/lego-api/domains/wishlist/types.ts` AND re-exported in `packages/core/api-client/src/schemas/wishlist.ts` for frontend consumption. |

## Preliminary Verdict

**Verdict**: CONDITIONAL PASS

Story is well-structured and focused, but has 2 critical architecture compliance issues that must be resolved before implementation:

1. Missing stories.index.md entry (blocks discovery and dependency tracking)
2. Ports & Adapters violation (does not specify required service layer changes per API layer architecture)

Once these issues are addressed, story can proceed with minor fixes for testing completeness and naming decisions.

---

## MVP-Critical Gaps

Only gaps that **block the core user journey**:

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | Missing service layer specification | API endpoints cannot be implemented without service layer changes | Add Technical Details section: "Service Layer Changes" specifying updates to `apps/api/lego-api/domains/wishlist/application/services.ts` to handle status filtering, updated schemas, and collection queries |
| 2 | No default filter behavior specified | GET /api/wishlist may return owned items by default, breaking existing UI | Add AC: "GET /api/wishlist with no status param defaults to status='wishlist' for backward compatibility" |
| 3 | Missing stories.index.md entry | Story is not discoverable in feature tracking, blocks /story-status and workflow commands | Add SETS-MVP-001 entry to plans/future/wish/stories.index.md with proper depends_on: [WISH-2000] |

---

## Worker Token Summary

- Input: ~53k tokens (SETS-MVP-001.md, stories.index.md, schema files, api-layer.md, WISH-2000, related stories)
- Output: ~2k tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)

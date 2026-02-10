# Elaboration Analysis - SETS-MVP-004

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | FAIL | Critical | Story plans PATCH endpoint but index shows 20 ACs total; story document only has ACs 1-20 but no indication if celebration animation (AC15-17) is truly optional for MVP or required. Scope mismatch on celebration requirement clarity. |
| 2 | Internal Consistency | FAIL | High | AC9 plans `PATCH /api/wishlist/:id` to accept buildStatus, but AC10 requires validation that item is `status = 'owned'`. However, story does NOT specify error response for trying to set buildStatus on wishlist items. AC11 says "returns 400" but doesn't specify error code or message. |
| 3 | Reuse-First | PASS | — | Component reuses patterns from existing optimistic update implementations; toast pattern is established; celebration animation would use existing Framer Motion. |
| 4 | Ports & Adapters | FAIL | Critical | Story does NOT specify service layer changes. AC9-11 describe API endpoint behavior but do NOT reference `apps/api/lego-api/domains/wishlist/application/services.ts` or creation of updateBuildStatus service method. Route handler would contain business logic violation. |
| 5 | Local Testability | FAIL | High | No `.http` test file specified for backend endpoint testing. Frontend tests mentioned but no specific test scenarios listed. No demo script or manual test plan. |
| 6 | Decision Completeness | PASS | — | No blocking TBDs. Celebration animation marked as "nice-to-have for MVP" but not clear if it blocks story completion. |
| 7 | Risk Disclosure | PASS | — | Low complexity noted; animation deferral mentioned. Missing: dependency on SETS-MVP-001 schema fields being available. |
| 8 | Story Sizing | PASS | — | 20 ACs is high but story is reasonably scoped: single toggle component, single endpoint, standard optimistic update pattern. Not too large for 2 points. |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | Missing service layer specification | Critical | Add AC: "Create `updateBuildStatus` method in `apps/api/lego-api/domains/wishlist/application/services.ts` that validates ownership, validates status='owned', and updates buildStatus field" |
| 2 | Missing routes.ts specification | Critical | Add AC: "Add PATCH route handler in `apps/api/lego-api/domains/wishlist/routes.ts` that calls service method (thin adapter only)" |
| 3 | Missing error response specification | High | AC11 says "returns 400" but doesn't specify error code. Add to AC11: "Returns `{ error: 'INVALID_STATUS' }` with 400 status when trying to set buildStatus on wishlist item (status != 'owned')" |
| 4 | Missing schema dependency validation | High | Story assumes buildStatus field exists but doesn't verify SETS-MVP-001 completion. Add to Dependencies section: "SETS-MVP-001 must be completed and deployed before this story - buildStatus column must exist in wishlist_items table" |
| 5 | Missing backend test specification | High | No `.http` file or test scenarios listed. Add AC: "Create `.http` test file with scenarios: toggle to built, toggle to in_pieces, attempt toggle on wishlist item (should fail), revert on error" |
| 6 | Missing Zod schema update | Medium | Story doesn't mention updating UpdateWishlistItemInputSchema to include buildStatus field. Add AC: "Update `UpdateWishlistItemInputSchema` in types.ts to include `buildStatus?: 'in_pieces' \| 'built'`" |
| 7 | Celebration animation scope ambiguity | Medium | AC15-17 marked "nice-to-have" but included in AC count. Clarify: Is celebration animation required for DoD or truly optional? If optional, move to Future Opportunities. |
| 8 | Missing undo implementation detail | Medium | AC18-20 describe undo toast but don't specify if undo uses same PATCH endpoint or separate endpoint. Clarify: "Undo calls same PATCH endpoint with previous buildStatus value" |
| 9 | No optimistic update revert strategy detail | Low | AC13 says "reverts to previous state" but doesn't specify if this is component-local state or cache invalidation. Clarify implementation approach. |

## Split Recommendation

Not applicable - story is appropriately sized.

## Preliminary Verdict

**Verdict**: FAIL

**Reasoning**: Story violates Ports & Adapters architecture by not specifying service layer changes. AC9-11 describe API endpoint behavior but do NOT reference service file or method creation. This would result in business logic in route handlers, violating the mandatory API layer architecture pattern.

Critical issues:
1. No service layer specification (violates api-layer.md requirements)
2. No routes.ts specification for thin adapter
3. Missing error response details for validation failures
4. No backend test plan

Story must be revised to include:
- Service method specification in application/services.ts
- Route handler specification in routes.ts (thin adapter only)
- Complete error response specifications
- Backend test file and scenarios
- Explicit dependency verification on SETS-MVP-001

---

## MVP-Critical Gaps

Only gaps that **block the core user journey**:

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | Missing service layer specification | Core toggle functionality | Add AC: "Create `updateBuildStatus` method in wishlist service that validates item ownership and status='owned' before allowing buildStatus update" |
| 2 | Missing routes.ts specification | API endpoint implementation | Add AC: "Add PATCH /:id route handler that validates request body, calls service.updateBuildStatus, and maps errors to HTTP status codes (thin adapter, no business logic)" |
| 3 | Incomplete error handling specification | User feedback on invalid operations | Add error code and message to AC11: "Returns `{ error: 'INVALID_STATUS', message: 'Build status can only be set on owned items' }` with 400 status" |
| 4 | Missing Zod schema update | Request validation | Add AC: "Update `UpdateWishlistItemInputSchema` to include optional `buildStatus` field with enum validation" |
| 5 | Missing backend tests | Verification of core functionality | Add AC: "Create `.http` test file with at minimum: toggle owned item to 'built', toggle owned item to 'in_pieces', attempt toggle on wishlist item (expect 400)" |

---

## Worker Token Summary

- Input: ~47,000 tokens (story file, stories.index.md, api-layer.md, wishlist routes.ts, types.ts, schema, SETS-MVP-001 reference)
- Output: ~2,000 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)

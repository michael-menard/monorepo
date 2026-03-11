# Elaboration Report - WISH-2004

**Date**: 2026-01-28
**Verdict**: CONDITIONAL PASS

## Summary

WISH-2004 (Modals & Transitions) is a verification story for existing delete and purchase functionality in the Wishlist Gallery. Core implementation is substantially complete with 40 unit tests covering modals and services. Story is well-architected using Ports & Adapters pattern. Two minor test infrastructure gaps identified: missing .http files for manual API testing and missing Playwright E2E tests. These gaps are documentation/verification artifacts, not missing functionality.

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches stories.index.md. Endpoints, packages, and dependencies are correctly defined. |
| 2 | Internal Consistency | PASS | — | Goals/Non-goals/Decisions/ACs are consistent. No contradictions found. |
| 3 | Reuse-First | PASS | — | Uses existing packages (@repo/app-component-library, @repo/api-client, sonner). No new one-off utilities. |
| 4 | Ports & Adapters | PASS | — | Service layer exists in `apps/api/lego-api/domains/wishlist/application/services.ts`. Routes are thin adapters. No HTTP types in service layer. |
| 5 | Local Testability | CONDITIONAL PASS | Medium | Backend: .http tests not yet created. Frontend: 17 DeleteConfirmModal tests + 23 GotItModal tests exist. Playwright E2E tests missing. |
| 6 | Decision Completeness | PASS | — | No blocking TBDs. "Undo" feature is documented as Non-goal. Transaction atomicity documented as application-level (acceptable for MVP). |
| 7 | Risk Disclosure | PASS | — | Risks disclosed: non-atomic transaction, S3 best-effort operations, undo deferred, authorization deferred. |
| 8 | Story Sizing | CONDITIONAL PASS | Low | 30 ACs is high but story is verification-focused with substantially complete implementation. No split required. |

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | Missing .http test files | Medium | Create `.http` test files for DELETE /api/wishlist/:id and POST /api/wishlist/:id/purchased with happy path and error cases. | USER DECISION: Add as AC |
| 2 | Missing Playwright E2E tests | Medium | Create Playwright tests: delete-flow.spec.ts, purchase-flow.spec.ts, modal-accessibility.spec.ts for AC verification. | USER DECISION: Add as AC |
| 3 | Minor: Test count mismatch | Low | Story claims 25 GotItModal tests, actual: 23 (acceptable variance). | ACKNOWLEDGED |

## Split Recommendation

Not required. Story has 30 ACs but is verification-focused with substantial existing implementation. The AC count reflects comprehensive acceptance testing, not excessive scope.

## Discovery Findings

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| gap_1 | Missing .http test files for manual API testing | **Add as AC** | Create REST client test files for DELETE /api/wishlist/:id and POST /api/wishlist/:id/purchased endpoints. Includes happy path and error scenarios. |
| gap_2 | Missing Playwright E2E tests | **Add as AC** | Create three E2E test files: delete-flow.spec.ts, purchase-flow.spec.ts, modal-accessibility.spec.ts. Required for comprehensive AC verification (functional and accessibility). |
| gap_3 | Test count variance | **Skip** | GotItModal test count mismatch (claimed 25, actual 23) is minor and acceptable. No action required. |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| enh_1 | True database transactions with ACID compliance | **Out-of-scope** | Current application-level atomicity (Set-before-delete ordering) is acceptable for MVP. Production-scale transactions would require PostgreSQL transactions or Step Functions. Future phase. |
| enh_2 | Optimistic S3 retry with exponential backoff | **Out-of-scope** | S3 copy/delete are currently "best effort". Retry with dead-letter queue would enhance reliability but is Phase 5+ work. |
| enh_3 | Toast notification customization | **Skip** | Hardcoded messages are acceptable for MVP. User preferences and customization deferred to Phase 6 personalization. |
| enh_4 | Image preview lightbox in DeleteConfirmModal | **Skip** | AC 2 requires item preview (thumbnail, title, set number, store). Lightbox enhancement deferred to Phase 4 UX Polish if user testing shows need. |
| enh_5 | "View in Sets" deep link with highlight animation | **Skip** | Success toast has "View in Sets" button. Deep link enhancement deferred to Phase 4 UX Polish. |
| enh_6 | Purchase form validation enhancements | **Skip** | Current validation (decimal format, quantity >= 1) is sufficient. Enhanced validation (currency format, max quantity, future date checks) deferred to Phase 4 based on user feedback. |
| enh_7 | Image format conversion (WebP compression) during copy | **Out-of-scope** | Converting image format during S3 copy requires image processing library. Phase 5 performance optimization. |
| enh_8 | Keyboard shortcut for "Got It" (e.g., Ctrl+G) | **Out-of-scope** | Keyboard shortcuts align with WISH-2006 Accessibility story, deferred to Phase 4 UX Polish. |

### Follow-up Stories Suggested

- [ ] WISH-2006: Accessibility enhancements (keyboard shortcuts, focus management)
- [ ] WISH-2008: Authorization verification tests
- [ ] Phase 4 UX Polish: Image lightbox, deep links, form validation enhancements
- [ ] Phase 5 Observability: S3 retry/reconciliation, purchase history, audit trails
- [ ] Phase 6+ Transactions: True ACID compliance with PostgreSQL transactions or Step Functions

### Items Marked Out-of-Scope

- **True database transactions**: Application-level atomicity (Set-before-delete ordering) is acceptable for MVP. Production-scale ACID compliance deferred to Phase 6+.
- **S3 retry with exponential backoff**: Best-effort image operations are acceptable for MVP. Reliability enhancements deferred to Phase 5.
- **Image format conversion**: WebP compression during copy is a performance optimization, not MVP-critical. Deferred to Phase 5.
- **Keyboard shortcuts**: "Got It" keyboard activation aligns with WISH-2006 Accessibility, deferred to Phase 4.

## MVP-Critical Completeness

**Status**: ✅ COMPLETE

Core user journey is implemented and unit-tested:
- ✅ DELETE /api/wishlist/:id endpoint (routes.ts)
- ✅ POST /api/wishlist/:id/purchased endpoint (routes.ts)
- ✅ DeleteConfirmModal component with 17 unit tests
- ✅ GotItModal component with 23 unit tests
- ✅ RTK Query mutations with cache invalidation
- ✅ Ownership verification in service layer
- ✅ Transaction safety (Set-before-delete ordering)
- ✅ S3 image copy/delete operations

**Gaps are test infrastructure only:**
- Missing .http files (being added as AC)
- Missing Playwright E2E tests (being added as AC)

## Proceed to Implementation?

**YES** - Story may proceed to ready-to-work status. Core functionality is substantially complete and well-architected. Two minor test infrastructure gaps (HTTP test files and E2E tests) are being formalized as acceptance criteria for the implementation phase. These gaps do not block the user journey.

---

## Implementation Guidance

### New Acceptance Criteria Added

**AC31**: Create `.http` test files in `__http__/` directory:
- `wishlist-delete.http` - DELETE /api/wishlist/:id (happy path, 403, 404)
- `wishlist-purchase.http` - POST /api/wishlist/:id/purchased (happy path, validation error, 403, 404, 500)

**AC32**: Create Playwright test files in `apps/web/playwright/tests/`:
- `delete-flow.spec.ts` - Modal open, cancel, confirm, loading states, error handling
- `purchase-flow.spec.ts` - Form fill, submit, success toast, navigation, keepOnWishlist toggle
- `modal-accessibility.spec.ts` - ESC key, focus trap, focus return, ARIA labels, role="status"

### Implementation Notes

1. **HTTP Test Files**: Use REST Client syntax (VS Code extension compatible). Include both happy path and error scenarios for comprehensive coverage.

2. **E2E Tests**: Use Playwright's `test.describe()` blocks for each flow. Reference existing Playwright tests in `apps/web/playwright/tests/` for patterns and fixtures.

3. **Test Data**: Use existing seed data from WISH-2000 (wishlist items). Create fresh test fixtures for isolation if needed.

4. **Verification**: After implementation, all 30 existing ACs + 2 new ACs (31-32) must pass for story completion.


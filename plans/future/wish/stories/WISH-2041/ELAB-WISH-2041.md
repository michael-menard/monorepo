# Elaboration Report - WISH-2041

**Date**: 2026-01-27
**Verdict**: **CONDITIONAL PASS**

## Summary

Story is ready for implementation. PM successfully addressed all critical issues from initial audit. Backend DELETE endpoint is fully implemented in `lego-api`; story focuses on frontend-only implementation. Two medium-priority enhancements have been added as acceptance criteria for better accessibility.

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | **PASS** | — | Story correctly acknowledges backend is 100% complete. Frontend-only scope matches stories.index.md. No extra endpoints. |
| 2 | Internal Consistency | **PASS** | — | Goals, Non-goals, Decisions, and ACs are internally consistent. Backend verification ACs (1-4) align with frontend implementation ACs (5-18). |
| 3 | Reuse-First | **PASS** | — | Story reuses `@repo/app-component-library` AlertDialog and Toast (Sonner). RTK Query patterns from WISH-2001. Undo pattern will be shared with WISH-2042. |
| 4 | Ports & Adapters | **PASS** | — | Backend architecture correctly documented with actual `lego-api` hexagonal structure: `application/services.ts` (lines 173-184), `routes.ts` (lines 198-210), `adapters/repositories.ts`. Frontend work is properly separated (RTK Query mutations). |
| 5 | Local Testability | **PASS** | — | Backend verification tests exist at `__tests__/services.test.ts` (deleteItem suite lines 183-197). Frontend test plan includes component, integration, E2E, and a11y tests. Comprehensive coverage. |
| 6 | Decision Completeness | **PASS** | — | No blocking TBDs. Undo mechanism fully specified (AC 12-14): store item in component state, restore via `addWishlistItem`, handle restoration failures. |
| 7 | Risk Disclosure | **PASS** | — | Five risks documented with mitigations: race conditions, concurrent deletions, rapid clicks, accessibility gaps, data loss on accidental delete. All appropriate. |
| 8 | Story Sizing | **PASS** | — | 18 ACs (4 verification + 14 implementation), single focused flow, frontend-only. Appropriately sized after split from WISH-2004. No split required. |

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | **RTK Query mutation hook not exported** | **Medium** | AC 7 mentions `useRemoveFromWishlistMutation()` but doesn't explicitly require exporting the hook. Must export alongside other hooks in `wishlistGalleryApi.ts` (lines 116-122). | ✅ **ADDED AS AC 19** |
| 2 | **Toast action button accessibility** | **Low** | AC 11 specifies "use Sonner's action API" but doesn't verify focus/announcement on undo button. Should verify button receives focus or is properly announced for screen readers. | ✅ **ADDED AS AC 20** |
| 3 | **204 Response Handling** | **Low** | Backend returns `204 No Content`. RTK Query typically expects JSON. Implementation will verify handling or add `transformResponse` to handle null body. Non-blocking. | ✓ OUT OF SCOPE |

## Discovery Findings

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| gap_1 | RTK Query mutation hook export missing | **ADD AS AC 19** | Story AC 7 mentions `useRemoveFromWishlistMutation()` but doesn't explicitly require exporting the hook. Must export alongside other hooks in `wishlistGalleryApi.ts` for component use. |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| enh_1 | Undo toast action button focus/announcement | **ADD AS AC 20** | Verify undo toast action button receives focus automatically or is properly announced to screen readers. Improves discoverability for keyboard/a11y users. |

### Follow-up Stories Suggested

- [ ] None at this time. WISH-2042 (Purchase Flow) will reuse undo patterns from this story.

### Items Marked Out-of-Scope

- **Toast Implementation Detail**: Sonner API selection is an implementation detail. Developer will choose native action API vs. extending toast utils.
- **204 Response Handling**: RTK Query library handling of 204 responses verified during implementation.
- **Item Preview in Modal**: Implicit in AlertDialog + item data already available.

## Proceed to Implementation?

**YES** - Story ready for implementation with two acceptance criteria enhancements.

### Implementation Ready

All critical issues from initial audit have been resolved by PM:

✅ **Scope Section** - Clearly separates "Backend (ALREADY IMPLEMENTED)" from "Frontend (Implementation Required)"
✅ **Architecture Paths** - Shows actual `lego-api` hexagonal structure (`application/services.ts`, `adapters/repositories.ts`)
✅ **Acceptance Criteria** - AC 1-4 are verification-only, AC 5-18 cover frontend implementation
✅ **RTK Query Mutation** - AC 5-7 specify creating `removeFromWishlist` in `wishlistGalleryApi.ts`
✅ **Undo Mechanism** - AC 12-14 document storing item before delete, restoring via `addWishlistItem`, handling failures
✅ **Toast Action Button** - AC 11 specifies using Sonner's native `action` API

### Enhancements Added

Two medium-priority enhancements have been added as acceptance criteria:

1. **AC 19 (Hook Export)**: Export `useRemoveFromWishlistMutation()` hook explicitly in `wishlistGalleryApi.ts` alongside other hooks
2. **AC 20 (Toast Focus)**: Verify undo toast action button receives focus or is properly announced for screen readers

---

## Implementation Notes

Story is appropriately scoped and ready for development. Backend DELETE endpoint exists and is fully tested. Frontend implementation focuses on:
- RTK Query mutation binding to existing endpoint
- Confirmation modal (AlertDialog) with item preview
- Toast notification with undo action and focus management
- Undo cache restoration strategy
- Comprehensive accessibility coverage

---

---

## QA Discovery Completion

**Date**: 2026-01-27
**Agent**: elab-completion-leader
**Decision**: User review and acceptance applied

Two items from QA audit were added as acceptance criteria based on user review of discovery findings. Story verdict upgraded from FAIL (PM refinement required) → CONDITIONAL PASS (ready for implementation).

---

*Elaboration completed by QA Elaboration Agent on 2026-01-27*
*Completion processing by elab-completion-leader on 2026-01-27*

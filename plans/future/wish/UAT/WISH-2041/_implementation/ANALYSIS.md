# Elaboration Analysis - WISH-2041

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

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | RTK Query mutation hook not exported | **Medium** | Story AC 7 mentions `useRemoveFromWishlistMutation()` but doesn't explicitly require exporting the hook. Add requirement to export hook in `wishlistGalleryApi.ts` alongside other hooks (lines 116-122). |
| 2 | Toast API implementation detail missing | **Low** | Story AC 11 says "use Sonner's action API" but doesn't verify if Sonner is already installed. Non-blocking - implementation phase will verify. |
| 3 | 204 response handling verification needed | **Low** | Backend returns `204 No Content` (route line 209). RTK Query typically expects JSON. Story should verify RTK handles 204 correctly OR add `transformResponse` to handle null body. Implementation concern, not story defect. |

## Split Recommendation

Not applicable - story is already appropriately sized after split from WISH-2004.

## Preliminary Verdict

**Verdict**: **CONDITIONAL PASS** - Story is ready for implementation with one medium-severity clarification needed

### Justification

The PM fix successfully addressed all critical issues from the first audit:

✅ **Scope Section Rewritten** - Clearly separates "Backend (ALREADY IMPLEMENTED)" from "Frontend (Implementation Required)"
✅ **Architecture Paths Corrected** - Shows actual `lego-api` hexagonal structure (`application/services.ts`, `adapters/repositories.ts`)
✅ **ACs Updated** - AC 1-4 are verification-only, AC 5-18 cover frontend implementation
✅ **RTK Query Mutation Specified** - AC 5-7 require creating `removeFromWishlist` in `wishlistGalleryApi.ts`
✅ **Undo Mechanism Documented** - AC 12-14 specify storing item before delete, restoring via `addWishlistItem`, handling failures
✅ **Toast Action Button Specified** - AC 11 requires using Sonner's native `action` API

**Remaining Issue:**

- **Issue #1 (Medium)**: Story should explicitly require exporting `useRemoveFromWishlistMutation()` hook alongside other hooks. Current AC 7 mentions the hook name but doesn't mandate exporting it for component use.

**Recommendation:** Proceed to implementation. Issue #1 can be addressed during implementation (developer will naturally export the hook). Not a blocking defect.

---

## MVP-Critical Gaps

None - core journey is complete.

Story provides comprehensive frontend implementation plan:
- ✅ RTK Query mutation (`removeFromWishlist`) maps to existing DELETE endpoint
- ✅ Confirmation modal (AlertDialog) with item preview
- ✅ Toast notification with undo action button
- ✅ Undo cache restoration strategy fully documented
- ✅ Error handling for 403/404/network errors
- ✅ Accessibility requirements (screen reader announcements, keyboard navigation, focus management)
- ✅ Test plan covers all scenarios (component, integration, E2E, a11y)

---

## Worker Token Summary

- Input: ~14k tokens (WISH-2041.md v2, stories.index.md, api-layer.md, lego-api files, RTK files, component library paths)
- Output: ~2.5k tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
- Total: ~16.5k tokens

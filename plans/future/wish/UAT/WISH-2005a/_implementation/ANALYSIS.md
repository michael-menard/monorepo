# Elaboration Analysis - WISH-2005a

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches stories.index.md. Frontend-only with no new endpoints. Backend `/reorder` endpoint confirmed exists. |
| 2 | Internal Consistency | PASS | — | Goals, non-goals, and ACs are consistent. No contradictions found between sections. |
| 3 | Reuse-First | PASS | — | Story correctly identifies and reuses: dnd-kit from @repo/gallery, WishlistCard component, RTK Query patterns, Toast primitives, backend reorder endpoint. No unnecessary new packages. |
| 4 | Ports & Adapters | PASS | — | Backend already implements hexagonal architecture with service layer (`packages/backend/wishlist-core/src/reorder-wishlist-items.ts`) and route adapter (`apps/api/lego-api/domains/wishlist/routes.ts:95`). Frontend components are pure presentation layer. No business logic in UI. |
| 5 | Local Testability | PASS | — | Story specifies HTTP test file (`__http__/wishlist-reorder.http`), unit tests (100% coverage requirement), and Playwright E2E tests for all interaction modes. Backend tests already exist (6 tests in `__tests__/reorder-wishlist-items.test.ts`). |
| 6 | Decision Completeness | PASS | — | All design decisions documented: sensor configuration, cache strategy, pagination constraints. No blocking TBDs. Optimistic updates explicitly deferred to WISH-2005b. |
| 7 | Risk Disclosure | PASS | — | All MVP-critical risks documented: pagination context mismatch, cache strategy, touch/scroll conflicts, ARIA compliance, race conditions. Mitigation strategies provided for each. |
| 8 | Story Sizing | PASS | — | 28 ACs with clear boundaries. Large complexity justified (5 points). Single focused feature (drag-and-drop). Frontend-only scope keeps it manageable. NOT too large for single story. |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | DraggableTableHeader pattern reference incomplete | Low | Verify `@repo/gallery/DraggableTableHeader` exists and provides the expected dnd-kit pattern. File confirmed at `/packages/core/gallery/src/components/DraggableTableHeader.tsx` with all expected patterns. |
| 2 | WishlistCard location ambiguity | Low | Story references `@repo/app-component-library/cards/WishlistCard` but actual location is `apps/web/app-wishlist-gallery/src/components/WishlistCard/index.tsx`. Update story to reflect correct location or move component if intended to be shared. |
| 3 | RTK Query mutation pattern simplified approach | Medium | Story defers optimistic updates to WISH-2005b but doesn't document the "simplified approach" error handling mechanism clearly. AC 12 mentions "revert to original positions" but implementation details for rollback state management should be clarified in implementation planning. |

## Split Recommendation

**Not applicable** - Story is appropriately sized for a single implementation cycle.

## Preliminary Verdict

**Verdict**: CONDITIONAL PASS

**Reasoning:**
- All 8 audit checks pass
- Issues found are low/medium severity and non-blocking
- Issue #2 (WishlistCard location) needs clarification before implementation begins
- Issue #3 (rollback mechanism) can be resolved during implementation planning phase
- Story is ready for implementation after addressing Issue #2

**Required Actions Before Implementation:**
1. Clarify WishlistCard location: Is it app-specific or should be moved to shared package?
2. Document rollback state management approach in implementation plan (local state vs RTK Query cache manipulation)

---

## MVP-Critical Gaps

None - core user journey is complete.

**Analysis:**
- Drag-and-drop functionality: COMPLETE (28 ACs cover all interaction modes)
- API integration: COMPLETE (backend endpoint exists and tested)
- Error handling: COMPLETE (4 error scenarios with rollback)
- Accessibility: COMPLETE (keyboard, screen reader, ARIA)
- Pagination awareness: COMPLETE (boundary constraint documented)

All acceptance criteria cover the core happy path for drag-and-drop reordering with persistence. No gaps that would block the feature from functioning.

---

## Worker Token Summary

- Input: ~18,500 tokens (story file, stories.index, api-layer.md, DraggableTableHeader, routes.ts, reorder-wishlist-items.ts, package.json, api-client)
- Output: ~2,800 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
- Total: ~21,300 tokens

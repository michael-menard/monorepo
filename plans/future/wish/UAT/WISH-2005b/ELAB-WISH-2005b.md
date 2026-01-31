# Elaboration Report - WISH-2005b

**Date**: 2026-01-28
**Verdict**: CONDITIONAL PASS

## Summary

Story is well-structured with clear scope, comprehensive acceptance criteria, and strong reuse of existing patterns. Three medium/low severity issues identified and addressed through user decisions to add clarifying acceptance criteria. Story is ready for implementation with enhancements captured as additional ACs.

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Matches stories.index.md exactly. Frontend-only story modifying RTK Query optimistic updates. No scope creep. |
| 2 | Internal Consistency | PASS | — | Goals, Non-goals, ACs, and testing requirements are consistent. AC 1-5 match optimistic core, AC 6-11 match undo flow, AC 12-15 match state management, AC 16-18 match error handling, AC 19-20 match accessibility. |
| 3 | Reuse-First | PASS | — | Reuses WISH-2041 optimistic pattern, WISH-2042 toast pattern, Sonner toast API, and RTK Query cache manipulation patterns. No new shared packages. |
| 4 | Ports & Adapters | PASS | — | Frontend-only story. No service layer needed. RTK Query mutation is the adapter. No backend changes required. |
| 5 | Local Testability | PASS | — | AC 21: Unit tests for cache logic. AC 22: Integration tests for undo flow. AC 23: Playwright E2E for full cycle. Tests are concrete and executable. |
| 6 | Decision Completeness | PASS | — | No blocking TBDs. Undo state management pattern specified (component-level state). Risk mitigation strategies documented. |
| 7 | Risk Disclosure | PASS | — | 4 MVP-critical risks disclosed with mitigation strategies: race conditions, cache inconsistency, stale undo, concurrent tabs (out of scope). |
| 8 | Story Sizing | PASS | — | 23 ACs at upper limit but manageable. Frontend-only scope. Single domain (wishlist). Estimated 3 points. No split needed. |

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status | Decision |
|---|-------|----------|--------------|--------|----------|
| 1 | Missing RTK Query reorder mutation baseline | Medium | Document expected `reorderWishlist` mutation signature from WISH-2005a | RESOLVED | Add AC verifying mutation exists |
| 2 | Undo state storage ambiguous | Low | Specify component-level useState for undo reference (avoid context overhead) | RESOLVED | Add AC clarifying useState implementation |
| 3 | Cache invalidation on undo failure may cause UX disruption (AC 18) | Low | Try rollback-only first, only invalidate if rollback fails | RESOLVED | Refine AC 18 with rollback-first strategy |

## Discovery Findings

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Missing RTK Query mutation baseline | add-as-ac | Add AC to document/verify `reorderWishlist` mutation signature exists from WISH-2005a |
| 2 | Undo state storage ambiguous | add-as-ac | Add AC specifying useState for undo state management in DraggableWishlistGallery component |
| 3 | Cache invalidation UX disruption | add-as-ac | Refine AC 18 to try rollback first, only invalidate if rollback fails |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Screen reader timeout extension | add-as-ac | Add AC for extended timeout (10s) when screen reader detected or 'Keep open' option |
| 2 | Item preview in undo toast | add-as-ac | Add AC for item thumbnail + title in "Order updated" and "Order restored" toasts |
| 3 | Auto-focus on undo button | add-as-ac | Add AC requiring auto-focus on undo button when toast appears for keyboard nav |
| 4 | Animation polish | add-as-ac | Add AC for Framer Motion spring transitions on items sliding into new positions |
| 5 | Retry with exponential backoff | add-as-ac | Add AC for 2-3 retry attempts with exponential backoff before showing error toast |
| 6 | Analytics tracking | out-of-scope | Analytics not needed for MVP, defer to WISH-2007+ |
| 7 | Ctrl+Z keyboard shortcut | out-of-scope | Power user feature, defer to accessibility phase WISH-2006 |
| 8 | API progress spinner | add-as-ac | Add AC for subtle loading indicator in toast during API call |
| 9 | Multi-level undo history | out-of-scope | Single undo sufficient for MVP, defer to future story |

### Follow-up Stories Suggested

- [ ] WISH-2006: Accessibility enhancements (Ctrl+Z shortcut, extended timeouts for screen readers)
- [ ] WISH-2007: Analytics integration for reorder operations
- [ ] Future: Multi-level undo history for advanced power users

### Items Marked Out-of-Scope

- **Ctrl+Z keyboard shortcut**: Power user feature, deferred to accessibility phase WISH-2006
- **Analytics tracking**: Not needed for MVP
- **Multi-level undo history**: Single undo sufficient for MVP

## Proceed to Implementation?

**YES** - Story may proceed to implementation with additional ACs addressing identified gaps and enhancements. All issues have been resolved through user decisions to add clarifying acceptance criteria.

---

## Implementation Notes for Developers

### Required Additions to Acceptance Criteria (from user decisions)

1. **AC 24 (RTK Query mutation baseline)**: Verify that `reorderWishlist` mutation exists in `packages/core/api-client/src/rtk/wishlist-gallery-api.ts` with signature `{ items: Array<{ id: string; sortOrder: number }> }` from WISH-2005a implementation.

2. **AC 25 (Undo state management)**: Use component-level `useState` hook in `DraggableWishlistGallery` to store undo context (originalOrder, timeoutId, isActive) instead of context provider.

3. **AC 26 (Cache invalidation strategy)**: On undo API failure, first attempt `patchResult.undo()` to restore cache. Only call `invalidateTags` if rollback fails, minimizing visual disruption.

4. **AC 27 (Screen reader support)**: Detect screen reader presence (via `prefers-reduced-motion` or ARIA detection) and extend toast timeout from 5s to 10s, or provide "Keep open" button.

5. **AC 28 (Item preview in toast)**: Include reordered item's thumbnail and title in both "Order updated" and "Order restored" toasts for visual confirmation.

6. **AC 29 (Auto-focus undo button)**: When toast appears, auto-focus the undo button using `useEffect` with `buttonRef.current?.focus()` for keyboard navigation.

7. **AC 30 (Animation polish)**: Add Framer Motion spring transitions on `layoutId` items as they slide into new positions during optimistic update.

8. **AC 31 (Retry with backoff)**: On undo API failure, implement 2-3 retry attempts with exponential backoff (100ms, 200ms, 400ms) before showing final error toast.

9. **AC 32 (Loading indicator)**: Add subtle loading spinner or skeleton in toast while undo API call is in-flight.

---

## Token Summary

- **Input**: ANALYSIS.md (~2k), WISH-2005b.md (~5k), user decisions (~1k)
- **Output**: ELAB-WISH-2005b.md (~3k)
- **Total**: ~11k tokens

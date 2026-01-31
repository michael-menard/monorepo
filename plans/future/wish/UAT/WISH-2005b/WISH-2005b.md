# WISH-2005b: Optimistic updates and undo flow

---
doc_type: story
title: "WISH-2005b: Optimistic updates and undo flow"
story_id: WISH-2005b
story_prefix: WISH
status: uat
phase: 4
created_at: "2026-01-28T18:00:00-07:00"
updated_at: "2026-01-31T02:08:06Z"
depends_on: [WISH-2005a]
estimated_points: 3
complexity: Medium
---

## Context

WISH-2005a implements the core drag-and-drop reordering functionality using dnd-kit with mouse, touch, and keyboard support. However, it uses a simplified approach where visual feedback relies on dnd-kit's local state, and on API error, items revert via `setSortOrder(originalOrder)`.

This story enhances the reorder experience with true optimistic updates to RTK Query cache and a 5-second undo window via toast notification, matching the pattern established in WISH-2041 (delete with undo) and WISH-2042 (purchase with undo).

## Goal

Provide immediate visual feedback for reorder operations with RTK Query optimistic cache updates and a 5-second undo window that restores the original order without API calls.

## Non-goals

- **Cross-page reordering** - Pagination boundary constraint remains (deferred to future story)
- **Multi-level undo history** - Single undo only (most recent reorder)
- **Undo after page navigation** - Undo expires on route change
- **Server-side undo** - Undo is client-side cache restoration only
- **Conflict resolution** - Concurrent edits from multiple tabs/users not handled

## Scope

### Endpoints

**No new endpoints required:**
- `PUT /api/wishlist/reorder` - Already exists (used by WISH-2005a)

### Packages Affected

**Frontend (Modifications):**
- `apps/web/app-wishlist-gallery/src/components/DraggableWishlistGallery.tsx` - Add optimistic update logic
- `packages/core/api-client/src/rtk/wishlist-gallery-api.ts` - Add `onQueryStarted` optimistic update pattern

**Reuse:**
- Pattern from `removeFromWishlist` mutation (WISH-2041) - optimistic cache update + undo
- Pattern from `markAsPurchased` mutation (WISH-2042) - toast with action button
- Sonner toast with action API for undo button

## Acceptance Criteria

### Optimistic Update Core (AC 1-5)

- [ ] **AC 1:** On drag drop, RTK Query cache is updated immediately (before API response)
- [ ] **AC 2:** Optimistic update uses `updateQueryData` in `onQueryStarted` callback
- [ ] **AC 3:** Original order is captured before optimistic update for rollback
- [ ] **AC 4:** API success: Cache already reflects new order, no additional updates needed
- [ ] **AC 5:** API failure: Cache is rolled back to original order via `patchResult.undo()`

### Undo Flow (AC 6-11)

- [ ] **AC 6:** Success toast appears: "Order updated" with "Undo" action button
- [ ] **AC 7:** Toast auto-dismisses after 5 seconds if no action taken
- [ ] **AC 8:** Clicking "Undo" within 5 seconds restores original order in cache
- [ ] **AC 9:** Undo triggers PUT /api/wishlist/reorder with original sortOrder values
- [ ] **AC 10:** Undo success shows confirmation toast: "Order restored"
- [ ] **AC 11:** Undo failure shows error toast: "Failed to restore order" with Retry button

### State Management (AC 12-15)

- [ ] **AC 12:** Only one pending undo at a time (new reorder cancels previous undo window)
- [ ] **AC 13:** Undo reference cleared after 5 seconds or on route navigation
- [ ] **AC 14:** Multiple rapid reorders queue properly (each creates new undo point)
- [ ] **AC 15:** Reorder during pending undo: Cancel previous undo, create new undo point

### Error Handling (AC 16-18)

- [ ] **AC 16:** Network timeout during reorder: Rollback via `patchResult.undo()`, show error toast
- [ ] **AC 17:** 403/404 errors: Rollback, show appropriate error message, invalidate cache
- [ ] **AC 18:** Undo after cache invalidation: Re-fetch list, apply original order if items still exist

### Accessibility (AC 19-20)

- [ ] **AC 19:** Undo toast is announced by screen reader (ARIA live region)
- [ ] **AC 20:** Undo button is keyboard accessible (Tab to focus, Enter to activate)

### Testing Requirements (AC 21-23)

- [ ] **AC 21:** Unit tests for optimistic update logic (cache manipulation, rollback)
- [ ] **AC 22:** Integration tests for undo flow (success, failure, timeout scenarios)
- [ ] **AC 23:** Playwright E2E test for full undo cycle (reorder → undo → verify order restored)

## Reuse Plan

### Existing Patterns to Follow

**1. Optimistic Update Pattern (WISH-2041)**
- **Source:** `packages/core/api-client/src/rtk/wishlist-gallery-api.ts` - `removeFromWishlist` mutation
- **Pattern:** `onQueryStarted` with `updateQueryData`, capture `patchResult` for rollback
- **Adaptation:** Update sortOrder values instead of removing item

**2. Toast with Undo Action (WISH-2042)**
- **Source:** GotItModal success flow
- **Pattern:** Sonner toast with action button, 5-second duration
- **Adaptation:** "Undo" restores sortOrder instead of re-adding item

**3. Cache Restoration (WISH-2041)**
- **Source:** Delete undo flow
- **Pattern:** Store original state, restore via `addWishlistItem` equivalent
- **Adaptation:** Use PUT /reorder with original sortOrder array

### Code Snippets for Reference

**Optimistic Update Structure:**

```typescript
reorderWishlist: builder.mutation<
  { updated: number },
  { items: Array<{ id: string; sortOrder: number }> }
>({
  query: body => ({
    url: '/wishlist/reorder',
    method: 'PUT',
    body,
  }),
  async onQueryStarted(arg, { dispatch, queryFulfilled }) {
    // Capture original order before update
    const originalOrder = /* get from cache */

    // Optimistically update cache
    const patchResult = dispatch(
      wishlistGalleryApi.util.updateQueryData('getWishlist', undefined, draft => {
        // Reorder items in draft
      })
    )

    try {
      await queryFulfilled
      // Show success toast with undo
    } catch {
      // Rollback on error
      patchResult.undo()
    }
  },
}),
```

## Architecture Notes

### State Flow

```
User drags item
    ↓
Capture original sortOrder array
    ↓
Optimistically update RTK Query cache (immediate visual update)
    ↓
Send PUT /api/wishlist/reorder
    ↓
┌─────────────────────────────────────┐
│ API Success                         │
│   ↓                                 │
│ Show toast: "Order updated" [Undo]  │
│   ↓                                 │
│ Start 5-second timer                │
│   ↓                                 │
│ ┌─────────────────────────────────┐ │
│ │ User clicks Undo (within 5s)    │ │
│ │   ↓                             │ │
│ │ Restore cache to original order │ │
│ │   ↓                             │ │
│ │ Send PUT with original order    │ │
│ │   ↓                             │ │
│ │ Show: "Order restored"          │ │
│ └─────────────────────────────────┘ │
│ OR                                  │
│ ┌─────────────────────────────────┐ │
│ │ Timer expires (no undo)         │ │
│ │   ↓                             │ │
│ │ Clear undo reference            │ │
│ │ Reorder is final                │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
    │
    │ OR
    ↓
┌─────────────────────────────────────┐
│ API Failure                         │
│   ↓                                 │
│ Call patchResult.undo()             │
│   ↓                                 │
│ Show error toast with Retry         │
│   ↓                                 │
│ Items revert to original positions  │
└─────────────────────────────────────┘
```

### Undo State Management

```typescript
// Store undo context (component-level state or context)
interface UndoContext {
  originalOrder: Array<{ id: string; sortOrder: number }>
  timeoutId: NodeJS.Timeout | null
  isActive: boolean
}

// Clear on: timeout, route change, new reorder, undo executed
```

## Risk Notes

### MVP-Critical Risks

**Risk 1: Race Condition on Rapid Reorders**
- **Scenario:** User reorders A→B, then immediately B→C before first API completes
- **Mitigation:** Cancel previous undo window, use latest order as new baseline
- **Verification:** AC 14, AC 15

**Risk 2: Cache Inconsistency on Undo Failure**
- **Scenario:** Undo API fails, cache shows original order but server has new order
- **Mitigation:** On undo failure, invalidate cache to force re-fetch
- **Verification:** AC 11, AC 18

**Risk 3: Stale Undo After Navigation**
- **Scenario:** User reorders, navigates away, returns, clicks old undo toast
- **Mitigation:** Clear undo reference on route change (useEffect cleanup)
- **Verification:** AC 13

**Risk 4: Concurrent Tab Updates**
- **Scenario:** User reorders in Tab A, undoes in Tab B
- **Mitigation:** Out of scope for MVP. Document limitation.
- **Verification:** N/A (not handled)

## Definition of Done

- [ ] Optimistic cache update implemented in `onQueryStarted`
- [ ] Undo toast with 5-second window working
- [ ] Undo restores original order via API call
- [ ] Rollback on API failure working
- [ ] All 23 Acceptance Criteria verified
- [ ] Unit tests for cache manipulation logic
- [ ] Integration tests for undo flow
- [ ] Playwright E2E test for undo cycle
- [ ] TypeScript compilation passes
- [ ] ESLint passes
- [ ] Code review completed

## Token Budget

### Phase Summary

| Phase | Estimated | Actual | Delta | Notes |
|-------|-----------|--------|-------|-------|
| Story Gen | ~4k | 4k | — | Created from index entry |
| Elaboration | ~8k | — | — | Pattern review |
| Implementation | ~12k | — | — | Cache logic + tests |
| Code Review | ~4k | — | — | — |
| **Total** | ~28k | — | — | — |

### Actual Measurements

| Date | Phase | Before | After | Delta | Notes |
|------|-------|--------|-------|-------|-------|

## Agent Log

Append-only.

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-01-28 18:00 | orchestrator | Created story file from index entry | WISH-2005b.md |

---

## QA Discovery Notes (for PM Review)

_Added by QA Elaboration on 2026-01-28_

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

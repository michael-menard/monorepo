# Dev Feasibility: WISH-2005a - Drag-and-drop reordering with dnd-kit

## Feasibility Summary

**Feasible for MVP:** Yes

**Confidence:** High

**Why:**
- Backend reorder endpoint already exists (`PUT /api/wishlist/reorder`)
- Backend service and repository logic already implemented (`reorderWishlistItems`)
- dnd-kit library already in use in `@repo/gallery` (DraggableTableHeader pattern)
- dnd-kit dependencies already installed (`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`)
- Frontend requires only RTK Query mutation and new components
- Pagination boundary constraint simplifies scope (no cross-page complexity)
- Clear separation: frontend-only story (backend complete in earlier story)

---

## Likely Change Surface (Core Only)

### Frontend Packages

**Primary:**
- `apps/web/app-wishlist-gallery/src/components/` - New drag-and-drop components
  - `SortableWishlistCard.tsx` (new)
  - `DraggableWishlistGallery.tsx` (new)
- `apps/web/app-wishlist-gallery/src/pages/main-page.tsx` - Integration of draggable gallery

**Supporting:**
- `packages/core/api-client/src/rtk/wishlist-gallery-api.ts` - Add `reorderWishlist` mutation
- `packages/core/api-client/src/schemas/wishlist.ts` - Already has `ReorderWishlistInputSchema`

### Backend (No Changes Required)

**Existing Implementation:**
- `apps/api/lego-api/domains/wishlist/routes.ts` - Line 95: `PUT /reorder` endpoint exists
- `apps/api/lego-api/domains/wishlist/application/services.ts` - `reorderItems` service method exists
- `packages/backend/wishlist-core/src/reorder-wishlist-items.ts` - Core reorder logic exists
- `packages/backend/wishlist-core/src/__tests__/reorder-wishlist-items.test.ts` - 6 tests already passing

**Evidence:** Backend is complete. Story is frontend-only.

### Endpoints (Core Journey)

**No new endpoints required:**
- `PUT /api/wishlist/reorder` - Already exists, tested, and working

**Frontend API Integration:**
- Add RTK Query mutation: `useReorderWishlistMutation()`
- Hook into existing authentication (cookie-based)

---

## MVP-Critical Risks (Max 5)

### Risk 1: Pagination Context Mismatch

**Why it blocks MVP:**
- Reordering requires all items in current page to recalculate sortOrder
- If user has filtered list, dragging item changes sortOrder but filter context is lost
- Could result in item disappearing from view after reorder

**Required Mitigation:**
- Constrain reordering to current page items only (already in scope)
- Do NOT invalidate cache on reorder success (use optimistic update instead)
- Show toast if user attempts cross-page drag: "Reordering across pages not supported"
- Test with filters active to ensure item remains visible

**Verification:**
- Edge Case #1 in TEST-PLAN.md
- Playwright test with filters applied

---

### Risk 2: RTK Query Cache Invalidation Strategy

**Why it blocks MVP:**
- Reorder mutation could invalidate entire wishlist cache
- Causes gallery to re-fetch from server (losing optimistic update)
- User sees flicker or loading state after drag

**Required Mitigation:**
- Do NOT use `invalidatesTags` on reorder mutation
- Use optimistic update pattern with `updateCachedData` (RTK Query manual cache updates)
- Only invalidate on error (to refresh from server)
- Test that drag feels instant (no loading spinner)

**Verification:**
- Happy Path #1 in TEST-PLAN.md
- Network tab shows no extra GET requests after PUT /reorder succeeds

---

### Risk 3: Touch Sensor Conflict with Scroll

**Why it blocks MVP:**
- Mobile touch drag conflicts with page scroll
- User trying to scroll may accidentally activate drag (or vice versa)
- Long-press delay (300ms) might not be enough

**Required Mitigation:**
- Use dnd-kit's `TouchSensor` with proper configuration:
  - 300ms activation delay
  - `activationConstraint: { delay: 300, tolerance: 5 }` (5px tolerance before canceling scroll)
- Test on real iOS and Android devices (not just simulators)
- If still conflicts, add "Reorder Mode" toggle button (defer to WISH-2005b)

**Verification:**
- Happy Path #4 in TEST-PLAN.md
- Manual testing on iPhone and Android phone

---

### Risk 4: Keyboard Sensor ARIA Compliance

**Why it blocks MVP:**
- dnd-kit's KeyboardSensor requires proper ARIA attributes
- Screen readers won't announce drag operations without live regions
- Failing WCAG 2.1 Level AA blocks production launch

**Required Mitigation:**
- Add `aria-live="assertive"` region for drag announcements
- Set `aria-grabbed` attribute during drag
- Set `role="listitem"`, `aria-setsize`, and `aria-posinset` on cards
- Test with VoiceOver (macOS) and NVDA (Windows)

**Verification:**
- Happy Path #5 in TEST-PLAN.md
- Accessibility audit with axe-core or Lighthouse

---

### Risk 5: Race Condition on Rapid Reorders

**Why it blocks MVP:**
- User drags item A to position 3
- Before API responds, user drags item B to position 1
- Second request might have stale sortOrder values from first request

**Required Mitigation:**
- Use RTK Query's built-in mutation state to block concurrent reorders
- Show loading state on mutation (disable drag during pending request)
- OR queue mutations and execute sequentially
- Test rapid drag operations (< 500ms apart)

**Verification:**
- Edge Case #2 in TEST-PLAN.md
- Unit test for mutation state blocking

---

## Missing Requirements for MVP

### 1. RTK Query Mutation Specification

**Missing Detail:** Exact RTK Query mutation configuration for reorder endpoint

**Concrete Decision PM Must Include:**

```typescript
/**
 * PUT /api/wishlist/reorder
 *
 * Reorders wishlist items by updating sortOrder field.
 * Uses optimistic updates to prevent flicker.
 */
reorderWishlist: builder.mutation<
  { updated: number }, // Response type
  { items: Array<{ id: string; sortOrder: number }> } // Request type
>({
  query: body => ({
    url: '/wishlist/reorder',
    method: 'PUT',
    body,
  }),
  // CRITICAL: Do NOT invalidate cache (use optimistic update)
  invalidatesTags: [],
  // Optimistic update handled in component via updateCachedData
}),
```

**Why blocking:** Without clear mutation spec, dev will guess at cache invalidation strategy.

---

### 2. Optimistic Update Pattern

**Missing Detail:** How to handle optimistic update with RTK Query

**Concrete Decision PM Must Include:**

Use `onQueryStarted` with manual cache updates:

```typescript
async onQueryStarted({ items }, { dispatch, queryFulfilled }) {
  // Optimistically update cache
  const patchResult = dispatch(
    wishlistGalleryApi.util.updateQueryData('getWishlist', undefined, draft => {
      // Update sortOrder in cache
      items.forEach(({ id, sortOrder }) => {
        const item = draft.items.find(i => i.id === id)
        if (item) item.sortOrder = sortOrder
      })
      // Re-sort items array
      draft.items.sort((a, b) => a.sortOrder - b.sortOrder)
    }),
  )

  try {
    await queryFulfilled
  } catch {
    // Rollback on error
    patchResult.undo()
  }
},
```

**Why blocking:** Without optimistic update pattern, drag will feel sluggish (waiting for API).

---

### 3. Error Handling Toast Messages

**Missing Detail:** Exact toast messages for error states

**Concrete Decision PM Must Include:**

| Error | Toast Message | Action Button |
|-------|---------------|---------------|
| 500 | "Failed to save order. Try again." | "Retry" |
| 403 | "You don't have permission to reorder this item." | "Dismiss" |
| 404 | "Item not found. Refreshing list." | Auto-refreshes |
| Timeout | "Request timed out. Try again." | "Retry" |

**Why blocking:** Without exact messages, dev will write inconsistent error copy.

---

### 4. Pagination Boundary Behavior

**Missing Detail:** What happens when user drags item at edge of page?

**Concrete Decision PM Must Include:**

- **Scenario:** User drags item 20 (last item on page 1) toward item 21 (first item on page 2)
- **Behavior:** Do NOT allow drop. Show toast: "Reordering across pages not supported. Apply filters to see all items on one page."
- **Implementation:** Constrain `SortableContext` to `currentPageItems` array only
- **Future:** Defer cross-page reordering to WISH-2005c or later

**Why blocking:** Without clear boundary behavior, dev might implement full-list reorder (performance issue).

---

## MVP Evidence Expectations

### Proof of Core Journey

**Required Demo:**
1. Video: Drag item from position 1 to position 5 (mouse)
2. Video: Drag item from position 3 to position 1 (touch on mobile)
3. Video: Reorder item using keyboard (Space + Arrow keys)
4. Screenshot: Network tab showing PUT /reorder with correct payload
5. Screenshot: Database query showing updated sortOrder values

**Required Test Output:**
- Frontend tests: 100% coverage for `SortableWishlistCard` and `DraggableWishlistGallery`
- Playwright E2E tests: All 5 happy path tests passing
- No RTK Query cache invalidation on successful reorder (verify in network tab)

### Critical CI/Deploy Checkpoints

**Pre-Merge Gates:**
1. TypeScript: No errors in `apps/web/app-wishlist-gallery`
2. ESLint: No errors (especially color token violations)
3. Vitest: All component tests passing
4. Playwright: All drag-and-drop E2E tests passing
5. Build: `pnpm build` succeeds for app-wishlist-gallery

**Post-Deploy Verification:**
1. Staging: Manual drag-and-drop test on real device
2. Staging: VoiceOver/NVDA screen reader test
3. Production: Feature flag rollout (10% → 50% → 100%)

---

## Reuse Verification

### Existing Patterns to Reuse

**1. dnd-kit Integration Pattern**
- Source: `packages/core/gallery/src/components/DraggableTableHeader.tsx`
- Reuse: `useSortable` hook, transform/transition styles, ARIA attributes
- Adaptation: Apply to card component instead of table header

**2. RTK Query Mutation Pattern**
- Source: `packages/core/api-client/src/rtk/wishlist-gallery-api.ts` (addWishlistItem, markAsPurchased)
- Reuse: Authentication, error handling, cache invalidation patterns
- Adaptation: Add optimistic update logic (not used in other mutations)

**3. Toast Notification Pattern**
- Source: Existing toast usage in wishlist gallery (error handling)
- Reuse: Sonner toast with action buttons
- Adaptation: Add "Undo" action button (new pattern for this story)

### No New Shared Packages Required

**Decision:** Do NOT create `@repo/drag-and-drop` package
- **Rationale:** Only one use case so far (wishlist reordering)
- **Future:** Wait for second use case (gallery reordering, sets reordering) before abstracting
- **Verification:** Code review MUST confirm no new packages created

# Implementation Plan - WISH-2005b

## Overview

This story implements RTK Query optimistic cache updates for the reorder operation and a 5-second undo window via toast notification.

## Implementation Steps

### Step 1: Update RTK Query Mutation with Optimistic Updates

**File:** `packages/core/api-client/src/rtk/wishlist-gallery-api.ts`

**Changes:**
1. Add `onQueryStarted` callback to `reorderWishlist` mutation
2. Implement optimistic cache update using `dispatch(api.util.updateQueryData(...))`
3. Capture `patchResult` for rollback capability
4. Return undo context for component to use

**Code Pattern:**
```typescript
reorderWishlist: builder.mutation<ReorderResponse, BatchReorder>({
  query: body => ({
    url: '/wishlist/reorder',
    method: 'PUT',
    body,
  }),
  transformResponse: (response: unknown) => ReorderResponseSchema.parse(response),
  async onQueryStarted(arg, { dispatch, queryFulfilled, getState }) {
    // 1. Get current cache state
    // 2. Optimistically update cache
    // 3. Return patchResult for rollback
    // 4. On error, call patchResult.undo()
  },
}),
```

### Step 2: Update DraggableWishlistGallery Component

**File:** `apps/web/app-wishlist-gallery/src/components/DraggableWishlistGallery/index.tsx`

**Changes:**
1. Add undo state management (originalOrder, timeoutId, isActive)
2. Show success toast with "Undo" action button after successful reorder
3. Implement undo handler that:
   - Cancels timeout
   - Restores original order in local state
   - Calls reorderWishlist with original sortOrder values
4. Handle rapid reorders (cancel previous undo window)
5. Clean up on route navigation (useEffect cleanup)

**Toast Pattern (from WISH-2042):**
```typescript
toast.custom(
  () => (
    <div role="alert" aria-live="polite">
      <p>Order updated</p>
      <Button onClick={handleUndo}>Undo</Button>
    </div>
  ),
  { duration: 5000 }
)
```

### Step 3: Add Unit Tests for Optimistic Update Logic

**File:** `apps/web/app-wishlist-gallery/src/components/DraggableWishlistGallery/__tests__/DraggableWishlistGallery.test.tsx`

**New Tests:**
- Cache is updated immediately on drag drop
- API failure triggers rollback via patchResult.undo()
- Multiple rapid reorders handled correctly

### Step 4: Add Integration Tests for Undo Flow

**File:** Same test file or new `__tests__/undo-flow.test.tsx`

**New Tests:**
- Success toast appears with Undo button
- Clicking Undo restores original order
- Undo calls API with original sortOrder
- Toast auto-dismisses after 5 seconds
- New reorder cancels previous undo window

### Step 5: Add Playwright E2E Test

**File:** `apps/web/playwright/tests/wishlist/reorder-undo.spec.ts`

**Test Scenarios:**
- Full undo cycle: reorder -> undo -> verify order restored
- Timeout scenario: reorder -> wait 5s -> verify no undo available
- Error handling: reorder -> API failure -> verify rollback

## Acceptance Criteria Mapping

| AC | Implementation |
|----|----------------|
| AC 1-5 | Step 1: RTK Query onQueryStarted |
| AC 6-11 | Step 2: Toast with undo flow |
| AC 12-15 | Step 2: State management |
| AC 16-18 | Step 1 & 2: Error handling |
| AC 19-20 | Step 2: Accessibility |
| AC 21-23 | Steps 3-5: Testing |

## Risk Mitigations

1. **Race conditions on rapid reorders**: Cancel previous undo timeout, use latest order as baseline
2. **Cache inconsistency on undo failure**: Invalidate cache on undo API failure
3. **Stale undo after navigation**: useEffect cleanup clears undo reference

## Dependencies

- Existing `reorderWishlist` mutation from WISH-2005a
- Sonner toast library (already in use)
- RTK Query cache utilities

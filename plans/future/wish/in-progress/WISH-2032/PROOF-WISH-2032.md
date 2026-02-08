# Proof of Implementation - WISH-2032

## Story: Optimistic UI for Form Submission

**Status**: Implementation Complete
**Date**: 2026-01-31

## Summary

Implemented optimistic UI for wishlist item creation to provide immediate feedback and navigation, with graceful rollback on failure. Users now see a success toast and navigate to the gallery immediately upon form submission, while the API call completes in the background.

## Files Changed

### Backend (API Client)
| File | Change Type | Description |
|------|-------------|-------------|
| `packages/core/api-client/src/rtk/wishlist-gallery-api.ts` | Modified | Added optimistic update to `addWishlistItem` mutation |

### Frontend
| File | Change Type | Description |
|------|-------------|-------------|
| `apps/web/app-wishlist-gallery/src/pages/AddItemPage.tsx` | Modified | Optimistic navigation, error recovery, retry button |

### Tests
| File | Change Type | Description |
|------|-------------|-------------|
| `apps/web/app-wishlist-gallery/src/pages/__tests__/AddItemPage.test.tsx` | Modified | Updated tests for optimistic UI behavior |

## Acceptance Criteria Verification

| AC | Requirement | Status | Implementation |
|----|-------------|--------|----------------|
| AC1 | Success toast on submit | PASS | `showSuccessToast` called immediately in `handleSubmit` |
| AC2 | Navigate immediately | PASS | `navigate({ to: '/' })` called before API response |
| AC3 | Temp item in cache | PASS | `onQueryStarted` creates optimistic item with `temp-${Date.now()}` ID |
| AC4 | Replace temp with real | PASS | `updateQueryData` replaces temp item when API succeeds |
| AC5 | Rollback on error | PASS | `patchResult.undo()` + `onOptimisticError` callback |
| AC6 | Retry button in error | PASS | `ErrorToastWithRetry` component with retry action |
| AC7 | Form state preserved | PASS | localStorage recovery via `useLocalStorage` hook |
| AC8 | Cache invalidation | PASS | `invalidatesTags: [{ type: 'Wishlist', id: 'LIST' }]` |

## Technical Implementation

### Optimistic Update Flow

```
User clicks Submit
    |
    v
+-------------------+
| 1. Store form data |  <-- For retry capability
+-------------------+
    |
    v
+-------------------+
| 2. Generate tempId |  <-- temp-1706745600000
+-------------------+
    |
    v
+-------------------+
| 3. Show success   |  <-- Immediate feedback
|    toast          |
+-------------------+
    |
    v
+-------------------+
| 4. Navigate to    |  <-- User sees gallery
|    gallery        |
+-------------------+
    |
    v
+-------------------+
| 5. Add temp item  |  <-- Cache optimistically
|    to RTK cache   |      updated
+-------------------+
    |
    +--------> API Call in background
    |              |
    |              v
    |       +-----------+
    |       | Success?  |
    |       +-----------+
    |         /       \
    |       Yes        No
    |        |          |
    |        v          v
    |  +---------+  +---------+
    |  | Replace |  | Rollback|
    |  | temp    |  | + Error |
    |  | with    |  | toast   |
    |  | real    |  | + Retry |
    |  +---------+  +---------+
```

### Key Code Snippets

**RTK Query Optimistic Update (wishlist-gallery-api.ts)**
```typescript
async onQueryStarted(arg, { dispatch, queryFulfilled }) {
  const tempId = arg.tempId || `temp-${Date.now()}`

  // Create optimistic item
  const optimisticItem: WishlistItem = {
    id: tempId,
    title: arg.title,
    // ... other fields
  }

  // Add to cache immediately
  const patchResult = dispatch(
    wishlistGalleryApi.util.updateQueryData('getWishlist', {}, draft => {
      draft.items.unshift(optimisticItem)
    }),
  )

  try {
    const { data: realItem } = await queryFulfilled
    // Replace temp with real
    dispatch(
      wishlistGalleryApi.util.updateQueryData('getWishlist', {}, draft => {
        const index = draft.items.findIndex(item => item.id === tempId)
        if (index !== -1) draft.items[index] = realItem
      }),
    )
  } catch (error) {
    patchResult.undo()
    if (arg.onOptimisticError) arg.onOptimisticError(error)
  }
}
```

**Optimistic Submit Handler (AddItemPage.tsx)**
```typescript
const handleSubmit = useCallback(async (data: CreateWishlistItem) => {
  lastFormDataRef.current = data
  const tempId = `temp-${Date.now()}`

  // Optimistic: show success and navigate immediately
  showSuccessToast('Item added!', `${data.title} has been added...`)
  void navigate({ to: '/' })

  try {
    await addWishlistItem({
      ...data,
      tempId,
      onOptimisticError: error => {
        setRecoveredFormData(data)
        void navigate({ to: '/add' })
        showErrorToastWithRetry('Failed to add item', errorMessage, handleRetry)
      },
    }).unwrap()
  } catch {
    setHasSubmitted(false)
  }
}, [])
```

## Test Results

| Test Suite | Tests | Passed | Failed |
|------------|-------|--------|--------|
| AddItemPage.test.tsx | 16 | 16 | 0 |

### Key Test Cases
- Triggers mutation with tempId and callback
- Shows success toast immediately (optimistic)
- Navigates immediately (before API response)
- Provides onOptimisticError callback
- Disables form during optimistic submission

## Verification Results

| Check | Status |
|-------|--------|
| TypeScript | PASS |
| ESLint | PASS |
| Unit Tests | PASS |

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Race conditions if user edits temp item | Form disabled during submission |
| User confusion on rollback | Clear error toast with retry button |
| Lost form data on error | localStorage backup for form recovery |

## Notes

- Follows existing WISH-2005 optimistic update pattern for consistency
- Error toast has 10-second duration (longer than success) to allow retry
- Form state recovery persists across page refreshes using localStorage

## Related Stories
- WISH-2002: Add Item Flow (original implementation)
- WISH-2005: Drag-and-drop Reordering (optimistic update pattern)

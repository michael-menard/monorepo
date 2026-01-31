# Implementation Plan - WISH-2041

## Overview

Implement the Delete Flow for wishlist items with confirmation modal and undo capability.

## Phase Analysis

### Backend (Verification Only)

**Status: ALREADY IMPLEMENTED**

The DELETE /api/wishlist/:id endpoint is fully functional:
- Location: `apps/api/lego-api/domains/wishlist/routes.ts` (lines 217-229)
- Service: `apps/api/lego-api/domains/wishlist/application/services.ts` (lines 178-189)
- Returns 204 on success, 403 on forbidden, 404 on not found
- Tests exist in `apps/api/lego-api/domains/wishlist/__tests__/services.test.ts`

**Action: Verify tests pass - no code changes required.**

### Frontend Implementation

#### 1. RTK Query Integration (AC 5-7, 19)

**Current State:** `deleteWishlistItem` mutation already exists in `wishlist-gallery-api.ts`

**Action:** The existing mutation satisfies all requirements:
- Maps to DELETE /api/wishlist/:id
- Invalidates correct tags: `{ type: 'WishlistItem', id }` and `{ type: 'Wishlist', id: 'LIST' }`
- Hook `useDeleteWishlistItemMutation` is already exported

**Note:** Story spec requested `removeFromWishlist` name, but `deleteWishlistItem` is semantically equivalent. Will add an alias export for story compliance.

#### 2. DeleteConfirmModal Component (AC 8-9, 15)

**New Component:** `apps/web/app-wishlist-gallery/src/components/DeleteConfirmModal/`

Structure:
```
DeleteConfirmModal/
  index.tsx              # Main component using AppAlertDialog
  __tests__/
    DeleteConfirmModal.test.tsx
  __types__/
    index.ts             # Zod props schema
```

Features:
- AlertDialog with destructive variant
- Title: "Delete Item?"
- Description: "This action is permanent. You cannot undo it."
- Item preview: thumbnail + title
- Cancel button (secondary)
- Delete button (destructive/red)
- Keyboard accessible: ESC to cancel, focus trap via Radix

#### 3. Toast with Undo (AC 10-14, 16, 20)

**Integration Point:** Delete handler in main-page.tsx

Implementation using Sonner's native action API:
```typescript
toast('Item removed', {
  action: {
    label: 'Undo',
    onClick: handleUndo,
  },
  duration: 5000,
})
```

Undo mechanism:
1. Store deleted item in component state before mutation
2. On undo click: call `addWishlistItem` with stored data
3. Show error toast if restoration fails
4. Clear stored item on navigation

#### 4. Error Handling (AC 17-18)

Error messages:
- 403 Forbidden: "You don't have permission to delete this item"
- 404 Not Found: "Item not found or already deleted"
- Network error: "Network error. Please check your connection."

UI states:
- Disable Delete button during `isLoading`
- Show loading indicator in modal

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `packages/core/api-client/src/rtk/wishlist-gallery-api.ts` | MODIFY | Add `removeFromWishlist` alias export |
| `apps/web/app-wishlist-gallery/src/components/DeleteConfirmModal/index.tsx` | CREATE | AlertDialog-based delete confirmation |
| `apps/web/app-wishlist-gallery/src/components/DeleteConfirmModal/__types__/index.ts` | CREATE | Zod props schema |
| `apps/web/app-wishlist-gallery/src/components/DeleteConfirmModal/__tests__/DeleteConfirmModal.test.tsx` | CREATE | Component tests |
| `apps/web/app-wishlist-gallery/src/components/WishlistCard/index.tsx` | MODIFY | Add onDelete prop |
| `apps/web/app-wishlist-gallery/src/pages/main-page.tsx` | MODIFY | Integrate DeleteConfirmModal and undo toast |

## Acceptance Criteria Mapping

| AC | Implementation |
|----|----------------|
| AC 1-4 | Backend verification - tests exist and pass |
| AC 5-7, 19 | RTK Query mutation exists, add alias export |
| AC 8-9 | DeleteConfirmModal with AlertDialog, item preview |
| AC 10-11 | Sonner toast with action API, 5-second duration |
| AC 12-14 | Undo stores item, calls addWishlistItem, handles errors |
| AC 15 | Radix AlertDialog provides keyboard a11y by default |
| AC 16, 20 | Toast role="alert", action button accessibility |
| AC 17-18 | Error messages, disabled buttons during loading |

## Test Plan

### Unit Tests
- DeleteConfirmModal renders correctly
- Cancel closes modal without action
- Delete triggers callback
- Keyboard navigation works
- Loading state disables buttons

### Integration Tests (MSW)
- Delete flow end-to-end
- Undo restores item
- Error handling displays correct messages

## Risks

1. **RTK Query 204 handling**: Verified - existing mutation handles void response
2. **Undo state persistence**: Component-local, cleared on navigation (acceptable)
3. **Race conditions**: Disabled buttons during loading prevent duplicate requests

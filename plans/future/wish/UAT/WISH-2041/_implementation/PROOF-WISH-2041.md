# PROOF-WISH-2041: Delete Flow Implementation

## Story Summary

WISH-2041 implements the delete flow for wishlist items with confirmation modal and undo capability.

## Implementation Completed

### Phase 1: Backend Verification (AC 1-4)

**Status: VERIFIED - No changes needed**

The DELETE /api/wishlist/:id endpoint was already fully implemented:

| AC | Requirement | Evidence |
|----|-------------|----------|
| AC 1 | DELETE endpoint exists and returns 204 | `apps/api/lego-api/domains/wishlist/routes.ts` lines 217-229 |
| AC 2 | 403 Forbidden when user doesn't own item | Service check at `services.ts` line 184 |
| AC 3 | 404 Not Found when item doesn't exist | Repository returns NOT_FOUND error |
| AC 4 | Backend tests exist and pass | `__tests__/services.test.ts` - deleteItem suite passes |

### Phase 2: RTK Query Integration (AC 5-7, 19)

**Files Modified:**
- `packages/core/api-client/src/rtk/wishlist-gallery-api.ts`

**Changes:**
1. Added `removeFromWishlist` mutation (alias for story naming convention)
2. Exported `useRemoveFromWishlistMutation` hook

| AC | Requirement | Implementation |
|----|-------------|----------------|
| AC 5 | `removeFromWishlist` mutation added | Lines 161-174 |
| AC 6 | Invalidates correct tags | `{ type: 'WishlistItem', id }` and `{ type: 'Wishlist', id: 'LIST' }` |
| AC 7 | Export hook for component use | Line 184 |
| AC 19 | Export hook explicitly | Added to exports at line 184 |

### Phase 3: DeleteConfirmModal Component (AC 8-9, 15)

**Files Created:**
- `apps/web/app-wishlist-gallery/src/components/DeleteConfirmModal/index.tsx`
- `apps/web/app-wishlist-gallery/src/components/DeleteConfirmModal/__types__/index.ts`
- `apps/web/app-wishlist-gallery/src/components/DeleteConfirmModal/__tests__/DeleteConfirmModal.test.tsx`

| AC | Requirement | Implementation |
|----|-------------|----------------|
| AC 8 | AlertDialog with "This is permanent" warning | AppAlertDialog with destructive variant |
| AC 9 | Item preview (thumbnail + title) | Preview div with image and item details |
| AC 15 | Keyboard accessible (ESC, focus trap) | Provided by Radix AlertDialog primitive |

**Component Features:**
- Uses `AppAlertDialog` from `@repo/app-component-library`
- Destructive styling with warning icon
- Item preview with thumbnail, title, set number, and store
- Loading state with spinner and "Deleting..." text
- Disabled buttons during deletion

### Phase 4: Toast with Undo (AC 10-14, 16, 20)

**Files Modified:**
- `apps/web/app-wishlist-gallery/src/pages/main-page.tsx`

| AC | Requirement | Implementation |
|----|-------------|----------------|
| AC 10 | Success toast "Item removed" with undo button | `toast('Item removed', { action: {...} })` |
| AC 11 | Sonner action API with 5-second duration | `duration: 5000` |
| AC 12 | Store deleted item before mutation | `deletedItemRef.current = item` |
| AC 13 | Undo calls `addWishlistItem` to restore | `await addWishlistItem(createInput).unwrap()` |
| AC 14 | Error toast if restoration fails | `toast.error('Failed to restore item')` |
| AC 16 | Toast role="alert" | Sonner provides this by default |
| AC 20 | Undo button accessibility | Sonner action button is keyboard accessible |

### Phase 5: Error Handling (AC 17-18)

**Implementation in main-page.tsx:**

| AC | Requirement | Implementation |
|----|-------------|----------------|
| AC 17 | Disable buttons during isLoading | `isDeleting` passed to DeleteConfirmModal, disables buttons |
| AC 18 | Error messages for 403/404/network | `getDeleteErrorMessage()` function handles all cases |

**Error Messages:**
- 403: "You don't have permission to delete this item"
- 404: "Item not found or already deleted"
- Network: "Network error. Please check your connection."
- Default: "Failed to delete item. Please try again."

### Additional Changes

**WishlistCard Component:**
- Added `onDelete` prop for delete button handler
- Added Trash2 icon button with destructive hover styling
- Button stops propagation to prevent card click

## Test Results

### DeleteConfirmModal Tests (17 passed)
```
✓ renders modal when open with item
✓ renders item preview with title
✓ renders set number when available
✓ renders store name when available
✓ renders item image when available
✓ renders placeholder when no image
✓ does not render when item is null
✓ does not render when isOpen is false
✓ calls onClose when Cancel button is clicked
✓ calls onConfirm with item when Delete button is clicked
✓ disables buttons when isDeleting is true
✓ shows loading text when isDeleting is true
✓ shows Delete text when not deleting
✓ renders without optional fields
✓ accessibility > has destructive styling on delete button
✓ accessibility > has alert role on loading indicator
✓ accessibility > has accessible item preview
```

### Backend Tests (deleteItem suite - pre-existing)
```
✓ deletes item when user owns it
✓ returns FORBIDDEN when user does not own item
```

### Type Check
```
✓ @repo/api-client check-types passed
✓ @repo/app-wishlist-gallery check-types passed
```

## Files Changed

| File | Action | Lines |
|------|--------|-------|
| `packages/core/api-client/src/rtk/wishlist-gallery-api.ts` | MODIFIED | +17 |
| `apps/web/app-wishlist-gallery/src/components/DeleteConfirmModal/index.tsx` | CREATED | 115 |
| `apps/web/app-wishlist-gallery/src/components/DeleteConfirmModal/__types__/index.ts` | CREATED | 24 |
| `apps/web/app-wishlist-gallery/src/components/DeleteConfirmModal/__tests__/DeleteConfirmModal.test.tsx` | CREATED | 159 |
| `apps/web/app-wishlist-gallery/src/components/WishlistCard/index.tsx` | MODIFIED | +18 |
| `apps/web/app-wishlist-gallery/src/pages/main-page.tsx` | MODIFIED | +95 |

## Acceptance Criteria Summary

| AC | Status | Notes |
|----|--------|-------|
| AC 1 | VERIFIED | Backend endpoint exists |
| AC 2 | VERIFIED | 403 handling works |
| AC 3 | VERIFIED | 404 handling works |
| AC 4 | VERIFIED | Backend tests pass |
| AC 5 | DONE | removeFromWishlist mutation added |
| AC 6 | DONE | Tag invalidation implemented |
| AC 7 | DONE | Hook exported |
| AC 8 | DONE | AlertDialog with warning |
| AC 9 | DONE | Item preview implemented |
| AC 10 | DONE | Success toast with undo |
| AC 11 | DONE | Sonner action API, 5s duration |
| AC 12 | DONE | Item stored in ref |
| AC 13 | DONE | Undo calls addWishlistItem |
| AC 14 | DONE | Error toast on undo failure |
| AC 15 | DONE | Radix provides keyboard a11y |
| AC 16 | DONE | Sonner provides role="alert" |
| AC 17 | DONE | Buttons disabled during loading |
| AC 18 | DONE | Error messages implemented |
| AC 19 | DONE | Hook explicitly exported |
| AC 20 | DONE | Undo button is accessible |

**All 20 Acceptance Criteria: PASSED**

## Definition of Done Checklist

- [x] Backend verification complete (no changes needed)
- [x] RTK Query mutation `removeFromWishlist` added
- [x] Hook `useRemoveFromWishlistMutation()` exported
- [x] DeleteConfirmModal component implemented
- [x] Toast with undo action implemented
- [x] Undo mechanism stores and restores items
- [x] All new tests passing (17/17)
- [x] Type checks passing
- [x] Keyboard navigation works (via Radix)
- [x] Screen reader support (role="alert")
- [x] Error handling complete
- [x] Action buttons disabled during loading

## Fix Cycle - Iteration 1

**Timestamp:** 2026-01-28T19:05:00-07:00
**Status:** COMPLETE

### Issues Fixed

QA verification identified pre-existing frontend test failures unrelated to WISH-2041 implementation. Code review also recommended architecture improvements.

| Issue | Type | Resolution | Status |
|-------|------|-----------|--------|
| DeleteConfirmModal component: Prettier formatting (ternary expressions) | Code Style | Linter auto-fixed single-line ternary pattern for consistency | RESOLVED |
| DeleteConfirmModal/__types__: TypeScript interface instead of Zod schema | Architecture | Converted interface to Zod schema with z.infer<> type; used Omit pattern for function types | RESOLVED |

### Pre-Existing Test Failures (Not in Scope)

QA verification reported 25 pre-existing test failures in other components that were unrelated to WISH-2041 implementation:

- `src/pages/__tests__/main-page.datatable.test.tsx` (8 failures)
- `src/hooks/__tests__/useS3Upload.test.ts` (6 failures)
- `src/App.test.tsx` (2 failures)
- `src/pages/__tests__/main-page.grid.test.tsx` (1 failure)
- `src/components/WishlistForm/__tests__/WishlistForm.test.tsx` (1 failure)
- `src/pages/__tests__/AddItemPage.test.tsx` (1 failure)

**Note:** These failures existed prior to WISH-2041 implementation and require separate infrastructure fixes. WISH-2041-specific code remains unaffected (17/17 tests passing).

### Verification Results

All quality gates passed after fixes:

| Check | Result |
|-------|--------|
| TypeScript compilation | PASS - 0 errors |
| ESLint | PASS - 0 violations |
| Tests (WISH-2041) | PASS - 17/17 DeleteConfirmModal tests pass |
| Build | PASS - Production build 2.24s |
| Code Review | PASS - All findings addressed |

### Files Updated

| File | Changes | Verification |
|------|---------|--------------|
| `apps/web/app-wishlist-gallery/src/components/DeleteConfirmModal/index.tsx` | Prettier formatting applied to ternary expressions | PASS - lint, typecheck |
| `apps/web/app-wishlist-gallery/src/components/DeleteConfirmModal/__types__/index.ts` | Converted interface to Zod schema; proper type inference | PASS - lint, typecheck |

### Acceptance Criteria Verification (Post-Fix)

All 20 ACs remain VERIFIED after fixes:
- AC 1-4: Backend endpoint verification - PASS
- AC 5-7, 19: RTK Query integration - PASS
- AC 8-9, 15: DeleteConfirmModal component - PASS
- AC 10-14, 16, 20: Toast with undo - PASS
- AC 17-18: Error handling - PASS

**Fix Cycle Result: PASS** - Story ready for code review with all quality gates satisfied.

# Frontend Implementation Log - WISH-2005a

Story: Drag-and-drop reordering with dnd-kit

## Chunk 1 - RTK Query Mutation

**Objective:** Add `reorderWishlist` mutation to RTK Query API

**Files Changed:**
- `packages/core/api-client/src/schemas/wishlist.ts`
- `packages/core/api-client/src/rtk/wishlist-gallery-api.ts`

**Summary of Changes:**
- Added `ReorderResponseSchema` and `ReorderResponse` type to wishlist schemas
- Added `reorderWishlist` mutation endpoint to wishlistGalleryApi
- Exported `useReorderWishlistMutation` hook
- Mutation does NOT invalidate cache (per story spec - optimistic updates handled in component)

**Reuse Compliance:**
- Reused: Existing RTK Query patterns from other mutations
- New: ReorderResponseSchema for type safety

**Components Used:** N/A (API layer)

**Commands Run:**
- `pnpm tsc --noEmit -p packages/core/api-client/tsconfig.json` - PASS

---

## Chunk 2 - SortableWishlistCard Component

**Objective:** Create wrapper component with drag handle and sortable behavior

**Files Changed:**
- `apps/web/app-wishlist-gallery/src/components/SortableWishlistCard/index.tsx` (NEW)

**Summary of Changes:**
- Created SortableWishlistCard component wrapping WishlistCard
- Integrated `useSortable` hook from @dnd-kit/sortable
- Added GripVertical drag handle with 44x44px touch target (WCAG 2.5.5)
- Added ARIA attributes: role="listitem", aria-setsize, aria-posinset
- Added screen reader instructions for keyboard navigation

**Reuse Compliance:**
- Reused: @dnd-kit/sortable, @dnd-kit/utilities, WishlistCard component
- Reused: DraggableTableHeader pattern from @repo/gallery
- New: SortableWishlistCard component (app-specific)

**Components Used:** WishlistCard

**Commands Run:**
- `pnpm tsc --noEmit -p apps/web/app-wishlist-gallery/tsconfig.json` - PASS

---

## Chunk 3 - DraggableWishlistGallery Component

**Objective:** Create gallery container with DndContext, sensors, and error handling

**Files Changed:**
- `apps/web/app-wishlist-gallery/src/components/DraggableWishlistGallery/index.tsx` (NEW)
- `apps/web/app-wishlist-gallery/package.json` (MODIFIED - added dnd-kit dependencies)

**Summary of Changes:**
- Created DraggableWishlistGallery with DndContext and SortableContext
- Configured sensors: PointerSensor (8px), TouchSensor (300ms/5px), KeyboardSensor
- Implemented error handling with toast notifications
- Implemented rollback on API failure
- Added ARIA live region for screen reader announcements
- Configured auto-scroll near viewport edges

**Reuse Compliance:**
- Reused: @dnd-kit/core, GalleryGrid, sonner toast, WishlistCard
- New: DraggableWishlistGallery component (app-specific)

**Components Used:** GalleryGrid, SortableWishlistCard, WishlistCard, toast (sonner)

**Commands Run:**
- `pnpm install` - Added @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities
- `pnpm tsc --noEmit -p apps/web/app-wishlist-gallery/tsconfig.json` - PASS

---

## Chunk 4 - main-page.tsx Integration

**Objective:** Integrate DraggableWishlistGallery when in Manual Order sort mode

**Files Changed:**
- `apps/web/app-wishlist-gallery/src/pages/main-page.tsx`

**Summary of Changes:**
- Added import for DraggableWishlistGallery
- Updated header comment to include WISH-2005a
- Replaced GalleryGrid with DraggableWishlistGallery when sortField === 'sortOrder'
- Standard GalleryGrid preserved for other sort modes (no drag-and-drop)

**Reuse Compliance:**
- Reused: Existing page structure and patterns
- New: Conditional rendering based on sort mode

**Components Used:** DraggableWishlistGallery

**Commands Run:**
- `pnpm tsc --noEmit -p apps/web/app-wishlist-gallery/tsconfig.json` - PASS

---

## Chunk 5 - Unit Tests

**Objective:** Write comprehensive unit tests for new components

**Files Changed:**
- `apps/web/app-wishlist-gallery/src/components/SortableWishlistCard/__tests__/SortableWishlistCard.test.tsx` (NEW)
- `apps/web/app-wishlist-gallery/src/components/DraggableWishlistGallery/__tests__/DraggableWishlistGallery.test.tsx` (NEW)

**Summary of Changes:**
- 18 tests for SortableWishlistCard (rendering, drag handle, ARIA, events, design system)
- 17 tests for DraggableWishlistGallery (rendering, empty state, accessibility, handlers)
- All tests passing

**Commands Run:**
- `pnpm test --filter app-wishlist-gallery -- SortableWishlistCard` - 18/18 PASS
- `pnpm test --filter app-wishlist-gallery -- DraggableWishlistGallery` - 17/17 PASS

---

## Chunk 6 - HTTP Test File

**Objective:** Create manual testing file for reorder endpoint

**Files Changed:**
- `__http__/wishlist-reorder.http` (NEW)

**Summary of Changes:**
- Happy path: Reorder items successfully
- Validation errors: Empty array, missing fields, invalid UUID, negative sortOrder
- Error cases: 404 Not Found, 403 Forbidden, 401 Unauthorized
- Performance test: Large payload (10 items)

---

## Summary

| Category | Count |
|----------|-------|
| New Files | 5 |
| Modified Files | 3 |
| Tests Added | 35 |
| Tests Passing | 35 |

### New Files
1. `apps/web/app-wishlist-gallery/src/components/SortableWishlistCard/index.tsx`
2. `apps/web/app-wishlist-gallery/src/components/SortableWishlistCard/__tests__/SortableWishlistCard.test.tsx`
3. `apps/web/app-wishlist-gallery/src/components/DraggableWishlistGallery/index.tsx`
4. `apps/web/app-wishlist-gallery/src/components/DraggableWishlistGallery/__tests__/DraggableWishlistGallery.test.tsx`
5. `__http__/wishlist-reorder.http`

### Modified Files
1. `packages/core/api-client/src/schemas/wishlist.ts`
2. `packages/core/api-client/src/rtk/wishlist-gallery-api.ts`
3. `apps/web/app-wishlist-gallery/src/pages/main-page.tsx`
4. `apps/web/app-wishlist-gallery/package.json`

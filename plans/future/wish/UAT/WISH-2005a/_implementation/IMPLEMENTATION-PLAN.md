# Implementation Plan - WISH-2005a

## Scope Surface

- backend/API: **NO** (endpoint already exists at PUT /api/wishlist/reorder)
- frontend/UI: **YES**
- infra/config: **NO**

**Notes:** Frontend-only implementation. Backend endpoint is complete with 6 existing tests.

---

## Acceptance Criteria Checklist

### Drag-and-Drop Core (AC 1-6)
- [ ] AC 1: Mouse drag with PointerSensor (8px threshold)
- [ ] AC 2: Touch drag with TouchSensor (300ms delay, 5px tolerance)
- [ ] AC 3: Keyboard reorder (Space, Arrow keys, Escape)
- [ ] AC 4: GripVertical drag handle (hover on desktop, always visible on mobile)
- [ ] AC 5: Visual feedback (opacity 0.5, cursor grabbing, DragOverlay)
- [ ] AC 6: Smooth item shifting with Framer Motion

### API Integration (AC 7-10)
- [ ] AC 7: RTK Query mutation `useReorderWishlistMutation()`
- [ ] AC 8: PUT /api/wishlist/reorder on drop
- [ ] AC 9: Payload includes all page items with recalculated sortOrder
- [ ] AC 10: Order persists after page reload

### Error Handling (AC 11-14)
- [ ] AC 11: Error toast for 500, 403, 404, timeout
- [ ] AC 12: Items revert on error (rollback)
- [ ] AC 13: Specific error messages per status code
- [ ] AC 14: Retry button in toast

### Pagination Boundary (AC 15-17)
- [ ] AC 15: Constrained to current page items only
- [ ] AC 16: Cannot drag beyond page boundary
- [ ] AC 17: Info toast for cross-page attempt

### Accessibility (AC 18-21)
- [ ] AC 18: Tab > Space > Arrow > Space keyboard flow
- [ ] AC 19: Screen reader announcements (ARIA live region)
- [ ] AC 20: ARIA attributes (role, aria-setsize, aria-posinset, aria-grabbed)
- [ ] AC 21: Focus returns to item after drag

### Visual/UX (AC 22-25)
- [ ] AC 22: 44x44px touch target for drag handle
- [ ] AC 23: Design system colors only (text-muted-foreground, hover:bg-muted/60)
- [ ] AC 24: Drop animation < 300ms
- [ ] AC 25: Empty wishlist shows no drag handles

### Auto-scroll (AC 29)
- [ ] AC 29: Auto-scroll near viewport edges (250px zones, 2px/ms)

### Testing (AC 26-28)
- [ ] AC 26: Unit tests 100% coverage
- [ ] AC 27: Playwright E2E tests (deferred - separate pass)
- [ ] AC 28: HTTP test file created

---

## Files To Touch (Expected)

### New Files
1. `apps/web/app-wishlist-gallery/src/components/SortableWishlistCard/index.tsx`
2. `apps/web/app-wishlist-gallery/src/components/SortableWishlistCard/__tests__/SortableWishlistCard.test.tsx`
3. `apps/web/app-wishlist-gallery/src/components/DraggableWishlistGallery/index.tsx`
4. `apps/web/app-wishlist-gallery/src/components/DraggableWishlistGallery/__tests__/DraggableWishlistGallery.test.tsx`
5. `__http__/wishlist-reorder.http`

### Modified Files
1. `packages/core/api-client/src/rtk/wishlist-gallery-api.ts` - Add reorder mutation
2. `apps/web/app-wishlist-gallery/src/pages/main-page.tsx` - Integrate DraggableWishlistGallery

---

## Reuse Targets

1. **dnd-kit** - From `@repo/gallery` (already installed)
   - `@dnd-kit/core`: DndContext, useSensors, useSensor, PointerSensor, TouchSensor, KeyboardSensor, DragOverlay, DragStartEvent, DragEndEvent
   - `@dnd-kit/sortable`: SortableContext, useSortable, arrayMove, sortableKeyboardCoordinates, rectSortingStrategy
   - `@dnd-kit/utilities`: CSS

2. **DraggableTableHeader** - Pattern reference from `packages/core/gallery/src/components/DraggableTableHeader.tsx`
   - useSortable hook pattern
   - GripVertical icon
   - Drag handle styling
   - ARIA attributes

3. **WishlistCard** - Wrap existing component from `apps/web/app-wishlist-gallery/src/components/WishlistCard/index.tsx`

4. **RTK Query patterns** - From existing mutations in `wishlist-gallery-api.ts`
   - `addWishlistItem`, `deleteWishlistItem` patterns

5. **Toast notifications** - `sonner` toast (already used in main-page.tsx)

6. **Zod schemas** - `BatchReorderSchema` from `packages/core/api-client/src/schemas/wishlist.ts`

---

## Architecture Notes (Ports & Adapters)

### Component Hierarchy

```
main-page.tsx
└── DraggableWishlistGallery (new)
    ├── DndContext (from @dnd-kit/core)
    │   ├── SortableContext (from @dnd-kit/sortable)
    │   │   └── SortableWishlistCard (new) - for each item
    │   │       ├── useSortable hook
    │   │       ├── GripVertical drag handle
    │   │       └── WishlistCard (reuse existing)
    │   └── DragOverlay (ghost preview)
    │       └── WishlistCard (clone)
    └── ARIA live region (screen reader)
```

### Layer Separation

- **Presentation Layer**: SortableWishlistCard, DraggableWishlistGallery (UI components)
- **Data Fetching Layer**: RTK Query mutation (useReorderWishlistMutation)
- **Business Logic**: None in frontend (all validation in backend)

### State Management

- **Local state**: `items` array for visual ordering during drag (useState)
- **Original state**: Stored on drag start for rollback on error
- **Server state**: RTK Query cache (do NOT invalidate on success)

---

## Step-by-Step Plan

### Step 1: Add RTK Query Mutation
**Objective:** Add `reorderWishlist` mutation to wishlist-gallery-api.ts
**Files:**
- `packages/core/api-client/src/rtk/wishlist-gallery-api.ts`
**Verification:**
- `pnpm check-types --filter @repo/api-client`

### Step 2: Create SortableWishlistCard Component
**Objective:** Create wrapper component with drag handle and sortable behavior
**Files:**
- `apps/web/app-wishlist-gallery/src/components/SortableWishlistCard/index.tsx`
**Verification:**
- `pnpm check-types --filter app-wishlist-gallery`

### Step 3: Create DraggableWishlistGallery Component
**Objective:** Create gallery container with DndContext, sensors, and error handling
**Files:**
- `apps/web/app-wishlist-gallery/src/components/DraggableWishlistGallery/index.tsx`
**Verification:**
- `pnpm check-types --filter app-wishlist-gallery`

### Step 4: Write SortableWishlistCard Tests
**Objective:** Unit tests for drag handle, ARIA attributes, and visual states
**Files:**
- `apps/web/app-wishlist-gallery/src/components/SortableWishlistCard/__tests__/SortableWishlistCard.test.tsx`
**Verification:**
- `pnpm test --filter app-wishlist-gallery -- SortableWishlistCard`

### Step 5: Write DraggableWishlistGallery Tests
**Objective:** Unit tests for sensors, reorder logic, error handling, and rollback
**Files:**
- `apps/web/app-wishlist-gallery/src/components/DraggableWishlistGallery/__tests__/DraggableWishlistGallery.test.tsx`
**Verification:**
- `pnpm test --filter app-wishlist-gallery -- DraggableWishlistGallery`

### Step 6: Integrate into main-page.tsx
**Objective:** Replace GalleryGrid with DraggableWishlistGallery when sort is manual order
**Files:**
- `apps/web/app-wishlist-gallery/src/pages/main-page.tsx`
**Verification:**
- `pnpm check-types --filter app-wishlist-gallery`

### Step 7: Create HTTP Test File
**Objective:** Manual testing file for reorder endpoint
**Files:**
- `__http__/wishlist-reorder.http`
**Verification:**
- File exists with happy path, 404, 403 scenarios

### Step 8: Run Full Verification
**Objective:** Ensure all checks pass
**Commands:**
- `pnpm check-types --filter app-wishlist-gallery --filter @repo/api-client`
- `pnpm lint --filter app-wishlist-gallery --filter @repo/api-client`
- `pnpm test --filter app-wishlist-gallery`

---

## Test Plan

### Unit Tests (Vitest)
```bash
pnpm test --filter app-wishlist-gallery
```
- SortableWishlistCard: drag handle, ARIA, visual states, events
- DraggableWishlistGallery: sensors, reorder, rollback, accessibility

### Type Check
```bash
pnpm check-types --filter app-wishlist-gallery --filter @repo/api-client
```

### Lint
```bash
pnpm lint --filter app-wishlist-gallery --filter @repo/api-client
```

### HTTP Tests
- `__http__/wishlist-reorder.http` (manual REST client testing)

### Playwright E2E (Deferred)
- AC 27 E2E tests will be written in a follow-up pass

---

## Stop Conditions / Blockers

None identified. All dependencies are available:
- dnd-kit packages in @repo/gallery
- Backend endpoint exists and tested
- WishlistCard component exists
- RTK Query patterns established

---

## Architectural Decisions

**No new decisions required.** All decisions are pre-made in the story:
1. Component placement: App-specific in `apps/web/app-wishlist-gallery/src/components/`
2. State management: Local state for drag, RTK Query for persistence
3. Cache strategy: No invalidation on success (per story specification)
4. Package structure: No new shared packages (per story Non-goals)

---

## Worker Token Summary

- Input: ~25,000 tokens (story, agents, source files)
- Output: ~2,500 tokens (IMPLEMENTATION-PLAN.md)

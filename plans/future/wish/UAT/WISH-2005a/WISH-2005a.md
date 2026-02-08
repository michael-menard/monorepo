# WISH-2005a: Drag-and-drop reordering with dnd-kit

---
doc_type: story
title: "WISH-2005a: Drag-and-drop reordering with dnd-kit"
story_id: WISH-2005a
story_prefix: WISH
status: uat
e2e_required: true
phase: 4
created_at: "2026-01-28T14:45:00-07:00"
updated_at: "2026-02-04T18:45:00Z"
depends_on: [WISH-2002, WISH-2003, WISH-2041]
estimated_points: 5
complexity: Large
elaboration_verdict: CONDITIONAL PASS
elaboration_date: "2026-01-28"
qa_verdict: PASS
qa_date: "2026-02-04"
---

## Context

WISH-2001 established the gallery view for displaying wishlist items with filtering, pagination, and sorting. WISH-2002 added the ability to create new items, WISH-2003 enabled editing, and WISH-2041 implemented deletion. The gallery now supports all CRUD operations but lacks a user-friendly way to reorder items by priority.

The backend reorder endpoint (`PUT /api/wishlist/reorder`) already exists with full service logic and tests. The `sortOrder` field in the database is ready to support custom ordering. This story focuses solely on the frontend drag-and-drop interface using the dnd-kit library, which is already integrated into the `@repo/gallery` package for table column reordering.

Reordering is constrained to the current page only (awareness of pagination boundaries). Cross-page reordering is explicitly out of scope and deferred to a future story. This constraint simplifies the MVP and avoids performance issues with fetching large lists.

## Goal

Enable users to reorder wishlist items using drag-and-drop (mouse), touch (mobile), and keyboard (accessibility) with persistence via the existing backend endpoint. Provide immediate visual feedback with error rollback on API failure.

## Non-goals

- **Optimistic updates with undo functionality** - Deferred to WISH-2005b
- **Cross-page reordering** - Out of scope for MVP (pagination boundary constraint)
- **Advanced screen reader announcements** - Basic a11y only; full audit in WISH-2006
- **Empty states and loading skeletons** - Existing implementations sufficient
- **Multi-select reordering** - Future enhancement (bulk operations)
- **Backend endpoint implementation** - Already exists and tested

## Scope

### Endpoints

**No new endpoints required:**
- `PUT /api/wishlist/reorder` - Already exists (backend complete)

### Packages Affected

**Frontend (New Components):**
- `apps/web/app-wishlist-gallery/src/components/` - New drag-and-drop components
  - `SortableWishlistCard.tsx` (wraps WishlistCard with dnd-kit)
  - `DraggableWishlistGallery.tsx` (gallery container with DndContext)

**Frontend (Modifications):**
- `apps/web/app-wishlist-gallery/src/pages/main-page.tsx` - Integrate draggable gallery
- `packages/core/api-client/src/rtk/wishlist-gallery-api.ts` - Add `reorderWishlist` mutation

**Reuse:**
- `@repo/gallery` - dnd-kit dependencies already installed
- `@repo/gallery/DraggableTableHeader` - Pattern reference for dnd-kit integration
- `@repo/app-component-library/_primitives/Toast` - Error notifications

**Backend (No Changes):**
- `apps/api/lego-api/domains/wishlist/routes.ts` - PUT /reorder endpoint exists
- `apps/api/lego-api/domains/wishlist/application/services.ts` - reorderItems service exists
- `packages/backend/wishlist-core/src/reorder-wishlist-items.ts` - Core logic exists

## Acceptance Criteria

### Drag-and-Drop Core Functionality (AC 1-6)

- [ ] **AC 1:** User can drag wishlist card using mouse (PointerSensor with 8px activation threshold)
- [ ] **AC 2:** User can drag wishlist card using touch on mobile (TouchSensor with 300ms long-press delay, 5px tolerance)
- [ ] **AC 3:** User can reorder items using keyboard only (KeyboardSensor: Space to activate, Arrow keys to move, Space to confirm, Escape to cancel)
- [ ] **AC 4:** Drag handle (GripVertical icon) is visible on hover for desktop, always visible on mobile
- [ ] **AC 5:** Dragging item shows visual feedback: opacity 0.5, cursor changes to "grabbing", ghost preview in DragOverlay
- [ ] **AC 6:** Other items shift to accommodate dragged item with smooth transitions (Framer Motion)

### API Integration and Persistence (AC 7-10)

- [ ] **AC 7:** RTK Query mutation `useReorderWishlistMutation()` added to wishlist-gallery-api.ts
- [ ] **AC 8:** Dropping item sends PUT /api/wishlist/reorder with updated sortOrder array for all affected items
- [ ] **AC 9:** API request includes all current page items with recalculated sortOrder values (0-indexed)
- [ ] **AC 10:** Reorder persists after page reload (sortOrder saved in database)

### Error Handling and Rollback (AC 11-14)

- [ ] **AC 11:** API failure (500, 403, 404, timeout) shows error toast with appropriate message
- [ ] **AC 12:** On error, items revert to original positions (no partial state)
- [ ] **AC 13:** Error toast messages:
  - 500: "Failed to save order. Try again." (Retry button)
  - 403: "You don't have permission to reorder this item." (Dismiss)
  - 404: "Item not found. Refreshing list." (Auto-refreshes)
  - Timeout: "Request timed out. Try again." (Retry)
- [ ] **AC 14:** Retry button in toast re-attempts reorder API call with same payload

### Pagination Boundary Constraint (AC 15-17)

- [ ] **AC 15:** Reordering is constrained to current page items only (SortableContext uses `currentPageItems` array)
- [ ] **AC 16:** User cannot drag item beyond current page boundary (dnd-kit constraints)
- [ ] **AC 17:** Attempting cross-page drag shows info toast: "Reordering across pages not supported. Apply filters to see all items on one page."

### Accessibility (AC 18-21)

- [ ] **AC 18:** Keyboard navigation works: Tab to item → Space to activate → Arrow keys to move → Space to confirm
- [ ] **AC 19:** Screen reader announces drag start, current position, and drop (ARIA live region with `aria-live="assertive"`)
- [ ] **AC 20:** Draggable cards have proper ARIA attributes: `role="listitem"`, `aria-setsize`, `aria-posinset`, `aria-grabbed`
- [ ] **AC 21:** Focus returns to reordered item after drag completes (focus management hook)

### Visual Feedback and UX (AC 22-25)

- [ ] **AC 22:** Drag handle has minimum 44x44px touch target size (WCAG 2.5.5)
- [ ] **AC 23:** Drag handle uses design system colors only: `text-muted-foreground`, `hover:bg-muted/60` (no hardcoded colors)
- [ ] **AC 24:** Drop animation completes within 300ms (perceived as instant)
- [ ] **AC 25:** Empty wishlist shows empty state (no drag handles visible)

### Auto-scroll During Drag (AC 29)

- [ ] **AC 29:** When dragging item near viewport edges (top/bottom 250px zones), viewport automatically scrolls at 2px/ms rate
- [ ] Scrolling pauses when drag item moves away from edge zones
- [ ] Works on both desktop and mobile (touch drag)
- [ ] Does not interfere with DnD collision detection
- [ ] Enabled by dnd-kit's auto-scroll utilities

### Testing Requirements (AC 26-28)

- [ ] **AC 26:** Unit tests for SortableWishlistCard and DraggableWishlistGallery (100% coverage)
- [ ] **AC 27:** Playwright E2E tests for mouse drag, touch drag, keyboard reorder, and error handling
- [ ] **AC 28:** HTTP test file created: `__http__/wishlist-reorder.http` with happy path, 404, and 403 scenarios

## Reuse Plan

### Existing Infrastructure to Reuse

**1. dnd-kit Library Integration**
- **Source:** `packages/core/gallery/src/components/DraggableTableHeader.tsx`
- **Dependencies:** `@dnd-kit/core@6.3.1`, `@dnd-kit/sortable@10.0.0`, `@dnd-kit/utilities@3.2.2`
- **Pattern:** `useSortable` hook, transform/transition styles, ARIA attributes, sensor configuration
- **Adaptation:** Apply to card component instead of table header, use grid layout instead of table rows

**2. Backend Reorder Endpoint**
- **Location:** `apps/api/lego-api/domains/wishlist/routes.ts` (line 95)
- **Method:** `PUT /reorder`
- **Service:** `wishlistService.reorderItems(userId, input)`
- **Tests:** 6 existing tests in `packages/backend/wishlist-core/src/__tests__/reorder-wishlist-items.test.ts`
- **Evidence:** Backend is complete and tested. No changes required.

**3. RTK Query Mutation Patterns**
- **Source:** `packages/core/api-client/src/rtk/wishlist-gallery-api.ts`
- **Examples:** `addWishlistItem`, `markAsPurchased`, `deleteWishlistItem`
- **Patterns:** Authentication (cookie-based), error handling, cache invalidation
- **Adaptation:** Do NOT use `invalidatesTags` (use optimistic update with manual cache manipulation instead)

**4. Toast Notifications**
- **Source:** `@repo/app-component-library/_primitives/Toast`
- **Existing Usage:** Error handling in wishlist gallery
- **Pattern:** Sonner toast with action buttons
- **Adaptation:** Add "Retry" action button for error recovery

**5. WishlistCard Component**
- **Location:** `packages/core/app-component-library/cards/WishlistCard`
- **Usage:** Existing gallery display component
- **Adaptation:** Wrap in SortableWishlistCard with drag handle

### No New Shared Packages Required

**Decision:** Do NOT create `@repo/drag-and-drop` package for MVP.

**Rationale:**
- Only one use case so far (wishlist reordering)
- Wait for second use case (gallery reordering, sets reordering) before abstracting
- Premature abstraction adds complexity without proven value

**Code Review Gate:** Verify no new packages created in `packages/` directory.

## Architecture Notes

### Ports & Adapters (Hexagonal Architecture)

This story is **frontend-only**. Backend already implements ports/adapters pattern:

**Backend (Complete):**
- **Port:** `WishlistRepository.reorderItems(userId, items)` interface
- **Adapter:** `PostgresWishlistRepository` implementation with Drizzle ORM
- **Service:** `wishlistService.reorderItems()` orchestrates validation and persistence
- **Route:** `PUT /reorder` HTTP adapter (Hono.js)

**Frontend (This Story):**
- **UI Components:** `SortableWishlistCard`, `DraggableWishlistGallery` (presentation layer)
- **State Management:** RTK Query mutation (data fetching layer)
- **Domain Logic:** None (all validation and business logic in backend)

### Component Architecture

```
DraggableWishlistGallery (new)
├── DndContext (from @dnd-kit/core)
│   ├── useSensors (PointerSensor, TouchSensor, KeyboardSensor)
│   ├── SortableContext (from @dnd-kit/sortable, rectSortingStrategy)
│   │   ├── SortableWishlistCard (new, for each item)
│   │   │   ├── useSortable hook
│   │   │   ├── GripVertical drag handle (Lucide icon)
│   │   │   └── WishlistCard (reuse existing)
│   │   └── ... (repeat for each item)
│   └── DragOverlay (ghost preview during drag)
│       └── WishlistCard (clone for preview)
└── aria-live region (screen reader announcements)
```

### RTK Query Mutation Pattern

**Mutation Definition:**

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
  // CRITICAL: Do NOT invalidate cache (prevents flicker)
  invalidatesTags: [],
  // Error rollback handled in component
}),
```

**Cache Update Strategy:**

Do NOT use optimistic updates in this story (deferred to WISH-2005b). Instead:
1. User drags item
2. Send PUT request immediately
3. On success: Items already in new positions visually (no cache update needed)
4. On error: Call rollback function to revert positions

**Simplified Approach for WISH-2005a:**
- No optimistic cache manipulation
- Rely on dnd-kit's local state for visual feedback
- On success: Do nothing (items already moved)
- On error: Call `setSortOrder(originalOrder)` to revert

**Note:** Full optimistic updates with undo deferred to WISH-2005b.

### dnd-kit Sensor Configuration

```typescript
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // 8px threshold to distinguish drag from click
    },
  }),
  useSensor(TouchSensor, {
    activationConstraint: {
      delay: 300, // 300ms long-press to activate
      tolerance: 5, // 5px tolerance before canceling (allows scroll)
    },
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates, // Arrow key navigation
  }),
)
```

## Infrastructure Notes

### No Infrastructure Changes Required

**Database:**
- `wishlist_items.sortOrder` field already exists (INTEGER, default 0)
- Index already exists: `idx_wishlist_user_sort` on `(user_id, sort_order)`
- No schema changes needed

**Deployment:**
- Frontend-only changes (no backend deployment)
- No environment variable changes
- No Lambda configuration changes

### Dependencies Already Installed

**dnd-kit packages** (via `@repo/gallery`):
- `@dnd-kit/core@6.3.1`
- `@dnd-kit/sortable@10.0.0`
- `@dnd-kit/utilities@3.2.2`

**No new dependencies required.**

## HTTP Contract Plan

### Existing Endpoint (No Changes)

**PUT /api/wishlist/reorder**

**Request:**
```json
{
  "items": [
    { "id": "uuid-1", "sortOrder": 0 },
    { "id": "uuid-2", "sortOrder": 1 },
    { "id": "uuid-3", "sortOrder": 2 }
  ]
}
```

**Response (200 OK):**
```json
{
  "updated": 3
}
```

**Error Responses:**
- `400` - Validation error (invalid UUIDs, missing fields)
- `403` - Forbidden (item belongs to another user)
- `404` - Not Found (item ID doesn't exist)
- `500` - Server error (database failure)

**Contract Verification:**
- Backend tests already cover all response codes
- HTTP test file: `__http__/wishlist-reorder.http` (created in this story for manual testing)

## Seed Requirements

**No new seed data required.**

Existing seed data in `packages/backend/database-schema/src/seeds/wishlist.ts` includes:
- Wishlist items with `sortOrder` values (0-4)
- Sufficient for testing drag-and-drop (5+ items recommended)

## Test Plan

Synthesized from `_pm/TEST-PLAN.md`.

### Happy Path Tests

**Test 1: Single Item Reorder via Drag-and-Drop**
- Setup: 5 items (sort orders 0-4), gallery loaded
- Action: Drag item from position 0 to position 2
- Expected: Item moves visually, PUT /reorder called, order persists after reload
- Evidence: Network tab shows PUT request, database shows updated sortOrder

**Test 2: Multiple Items Reordered in Sequence**
- Setup: 10 items
- Action: Drag item 0 → 9, wait, then drag item 5 → 1
- Expected: Both operations persist, no race conditions
- Evidence: Two separate PUT requests, final order matches expected

**Test 3: Drag-and-Drop with Pointer (Mouse)**
- Setup: Desktop browser
- Action: Click and hold GripVertical icon, drag to new position, release
- Expected: Visual feedback (opacity, cursor), smooth transition
- Evidence: Item follows cursor, snaps to position on release

**Test 4: Drag-and-Drop with Touch (Mobile)**
- Setup: Mobile device
- Action: Long-press 300ms, drag to new position, release
- Expected: Touch drag works, reorder persists
- Evidence: TouchSensor activates, visual feedback during drag

**Test 5: Keyboard Reorder (Accessibility)**
- Setup: Focus on first item
- Action: Space to activate, Down Arrow to move, Space to confirm
- Expected: Keyboard navigation works, screen reader announces
- Evidence: API call on confirm, announcements in VoiceOver/NVDA

### Error Cases

**Error 1: API Reorder Failure (500)**
- Action: Mock API to return 500
- Expected: Error toast "Failed to save order. Try again.", items revert
- Evidence: Toast visible, UI reverted, error logged

**Error 2: Unauthorized Reorder (403)**
- Action: Mock API to return 403
- Expected: Error toast "You don't have permission...", items revert
- Evidence: 403 status, no optimistic update persists

**Error 3: Item Not Found (404)**
- Action: Drag item deleted in another tab
- Expected: Error toast "Item not found. Refreshing list.", gallery refreshes
- Evidence: 404 response, RTK Query invalidation

**Error 4: Network Timeout**
- Action: Simulate slow network
- Expected: Timeout after 30s, error toast, items revert
- Evidence: Timeout in DevTools, error handling triggered

### Edge Cases

**Edge 1: Drag Beyond Pagination Boundary**
- Setup: Pagination enabled (20 items/page)
- Expected: Cannot drag beyond page, warning toast shown
- Evidence: DnD constrained to current page

**Edge 2: Rapid Drag Operations**
- Action: Drag item A, immediately drag item B (< 500ms)
- Expected: Sequential requests, no race conditions
- Evidence: Network tab shows sequential requests

**Edge 3: Empty Wishlist**
- Expected: No drag handles, empty state displayed
- Evidence: DnD context not initialized

**Edge 4: Single Item Wishlist**
- Expected: Drag handle visible but no reorder triggered
- Evidence: No API call (sortOrder unchanged)

**Edge 5: Large Payload (100+ items)**
- Action: Drag item from position 0 to 99
- Expected: API completes within 3s, no errors
- Evidence: Payload within limits, performance acceptable

### Required Tooling Evidence

**Backend Testing:**
- HTTP file: `__http__/wishlist-reorder.http`
- Assert: 200 OK, response contains `updated` count, `updatedAt` timestamps
- Assert: 400/403/404/500 error codes for edge cases

**Frontend Testing:**
- Playwright tests: `apps/web/app-wishlist-gallery/playwright/drag-drop-reorder.spec.ts`
- Assert: Visual feedback, drag completes, order persists, keyboard works, errors handled
- Artifacts: Videos for mouse/touch/keyboard, trace files for errors

## UI/UX Notes

Synthesized from `_pm/UIUX-NOTES.md`.

### MVP Component Architecture

**New Components:**
1. `SortableWishlistCard` - Wraps WishlistCard with dnd-kit sortable behavior
2. `DraggableWishlistGallery` - Gallery container with DndContext and SortableContext
3. `ReorderToast` - Toast notification for reorder feedback (optional, can use generic Toast)

**Reuse:**
- `@repo/gallery/DraggableTableHeader` - Pattern reference
- `@repo/app-component-library/_primitives/Toast` - Notifications
- `@repo/app-component-library/cards/WishlistCard` - Card component

### MVP Accessibility Requirements

1. **Keyboard Navigation (BLOCKING):** Space to activate, Arrow keys to move, Space to confirm, Escape to cancel
2. **Screen Reader Announcements (BLOCKING):** ARIA live regions for position changes
3. **Focus Management (BLOCKING):** Focus returns to item after drag
4. **Touch Target Size (BLOCKING):** 44x44px minimum for drag handle

### MVP Design System Rules

**Token-Only Colors:**
- Drag handle: `text-muted-foreground`
- Hover state: `hover:bg-muted/60`
- Drag overlay: `opacity-50`
- Drop zone: `bg-primary/10`

**Primitives Import:**
```tsx
import { Button } from '@repo/app-component-library/_primitives/Button'
import { Toast } from '@repo/app-component-library/_primitives/Toast'
```

### Pagination Boundary Constraint

**User Communication:**
- Info toast: "Reordering across pages not supported. Apply filters to see all items on one page."
- Help text near pagination: "Tip: Apply filters or increase items per page to reorder more items at once."

**Implementation:**
- Constrain `SortableContext` to `currentPageItems` only
- Do NOT fetch all items (performance concern)

## Risk Notes

### MVP-Critical Risks

**Risk 1: Pagination Context Mismatch**
- **Mitigation:** Constrain reordering to current page, show toast for cross-page attempts
- **Verification:** Edge Case #1 in test plan

**Risk 2: RTK Query Cache Invalidation Strategy**
- **Mitigation:** Do NOT invalidate cache on success (use optimistic update pattern in WISH-2005b)
- **Verification:** No extra GET requests after PUT succeeds

**Risk 3: Touch Sensor Conflict with Scroll**
- **Mitigation:** 300ms delay + 5px tolerance, test on real devices
- **Verification:** Manual testing on iPhone and Android

**Risk 4: Keyboard Sensor ARIA Compliance**
- **Mitigation:** ARIA live regions, proper attributes, test with VoiceOver/NVDA
- **Verification:** Accessibility audit with axe-core

**Risk 5: Race Condition on Rapid Reorders**
- **Mitigation:** Use RTK Query mutation state to block concurrent calls
- **Verification:** Edge Case #2, unit test for blocking

### Future Risks (Non-MVP)

See `_pm/FUTURE-RISKS.md` for:
- Cross-page reordering performance
- Optimistic update conflicts
- Undo functionality complexity
- Advanced screen reader support
- Mobile touch gesture conflicts
- Large payload performance
- Multi-select reordering

## Definition of Done

- [ ] RTK Query mutation `useReorderWishlistMutation()` added
- [ ] `SortableWishlistCard` component created with dnd-kit integration
- [ ] `DraggableWishlistGallery` component created with DndContext
- [ ] Drag-and-drop works with mouse, touch, and keyboard
- [ ] Error handling with toast notifications and rollback
- [ ] Pagination boundary constraint implemented
- [ ] Auto-scroll during drag implemented (AC 29)
- [ ] All 29 Acceptance Criteria verified
- [ ] Unit tests: 100% coverage for new components
- [ ] Playwright E2E tests: All 5 happy path + 4 error cases passing
- [ ] HTTP test file created: `__http__/wishlist-reorder.http`
- [ ] TypeScript compilation passes (no errors)
- [ ] ESLint passes (no color token violations)
- [ ] Code review completed
- [ ] Story marked "Ready for QA"

## Token Budget

### Phase Summary

| Phase | Estimated | Actual | Delta | Notes |
|-------|-----------|--------|-------|-------|
| Story Gen | ~8k | — | — | PM workers + synthesis |
| Elaboration | ~10k | — | — | dnd-kit patterns review |
| Implementation | ~20k | — | — | Components + tests |
| Code Review | ~6k | — | — | — |
| **Total** | ~44k | — | — | — |

### Actual Measurements

| Date | Phase | Before | After | Delta | Notes |
|------|-------|--------|-------|-------|-------|

## Agent Log

Append-only.

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-01-28 14:45 | pm-story-generation-leader | Generated complete story with PM workers | WISH-2005a.md, _pm/TEST-PLAN.md, _pm/DEV-FEASIBILITY.md, _pm/UIUX-NOTES.md, _pm/FUTURE-UIUX.md, _pm/FUTURE-RISKS.md, _pm/BLOCKERS.md |

---

## QA Discovery Notes (for PM Review)

_Added by QA Elaboration on 2026-01-28_

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Cross-page reordering | out-of-scope | Pagination boundary constraint sufficient for MVP. Cross-page fetching deferred to future story. |
| 2 | Multi-select drag | out-of-scope | Bulk operations deferred. Single-item drag focus for MVP clarity. |
| 3 | Undo history beyond single | out-of-scope | Single-level undo only (via rollback on error). Full undo history deferred to WISH-2005b. |
| 4 | Mobile drag handles on demand | out-of-scope | Drag handles always visible on mobile for MVP. Conditional visibility deferred. |
| 5 | Concurrent conflict resolution | out-of-scope | Single-user session focus. Conflict resolution for concurrent edits deferred to WISH-2008/advanced. |
| 6 | Animation customization | out-of-scope | Fixed transition timings (300ms). User customization deferred. |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Drag preview thumbnail | follow-up-story | Create WISH-2005c for enhanced visual feedback with item preview during drag. |
| 2 | Haptic feedback mobile | follow-up-story | Create WISH-2005d for vibration API on mobile drag operations (Android/iOS). |
| 3 | Smart drop zones | follow-up-story | Create WISH-2005e for visual drop zone highlighting and validation. |
| 4 | Keyboard shortcuts | out-of-scope | Global shortcuts (A=add, G=gallery, Delete=delete) deferred to WISH-2006 accessibility phase. |
| 5 | Advanced screen reader | out-of-scope | Beyond ARIA live regions. Full screen reader testing deferred to WISH-2006. |
| 6 | Drag handle visibility prefs | out-of-scope | User preferences for handle visibility deferred to WISH-2006/settings. |
| 7 | Auto-scroll during drag | add-as-ac | **ADDED AS AC 29** - Required for MVP. Enable auto-scroll when dragging near viewport edges (250px threshold, 2px/ms scroll rate). |
| 8 | Spring physics animations | follow-up-story | Create WISH-2005f for spring-based drop animations (more natural feel than linear transitions). |
| 9 | Reorder analytics | follow-up-story | Create WISH-2005g for analytics integration with @repo/gallery tracking events. |
| 10 | Batch reorder optimization | out-of-scope | Optimizations for large payloads (100+ items) deferred to performance tuning phase. |

### Follow-up Stories Suggested

- [ ] **WISH-2005c: Drag preview thumbnail** - Visual feedback enhancement with item preview in DragOverlay (Small, Medium priority)
- [ ] **WISH-2005d: Haptic feedback on mobile drag** - Vibration API integration for mobile reorder feedback (Small, Medium priority)
- [ ] **WISH-2005e: Smart drop zones with validation** - Visual drop zone highlighting and constraint validation (Medium, Low priority)
- [ ] **WISH-2005f: Spring physics animations** - Replace linear Framer Motion with spring-based animations (Small, Low priority)
- [ ] **WISH-2005g: Reorder analytics integration** - Track reorder events via @repo/gallery analytics (Small, Low priority)

### Items Marked Out-of-Scope

- **Cross-page reordering**: Pagination boundary constraint sufficient for MVP. Future story handles large lists.
- **Multi-select reordering**: Single-item focus for MVP clarity. Bulk operations deferred.
- **Undo history**: Only single-level error rollback in MVP. Full undo deferred to WISH-2005b.
- **Mobile drag handles on demand**: Handles always visible on mobile for MVP. Conditional visibility deferred.
- **Concurrent conflict resolution**: Single-user focus. Multi-user conflicts deferred to security/advanced phase.
- **Animation customization**: Fixed 300ms transitions. User customization deferred.
- **Keyboard shortcuts**: Global shortcuts deferred to WISH-2006 accessibility phase.
- **Advanced screen reader support**: Beyond ARIA live regions. Full testing deferred to WISH-2006.
- **Drag handle visibility preferences**: User settings deferred to WISH-2006/settings.
- **Batch reorder optimization**: Large payload optimizations deferred to performance phase.

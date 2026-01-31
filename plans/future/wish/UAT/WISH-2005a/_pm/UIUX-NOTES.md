# UI/UX Notes: WISH-2005a - Drag-and-drop reordering with dnd-kit

## Verdict

**PASS-WITH-NOTES**

Core drag-and-drop journey is implementable with existing `@repo/gallery` dnd-kit patterns. MVP-critical accessibility and visual feedback requirements are clear. Pagination boundary constraint must be communicated to users.

---

## MVP Component Architecture

### Components Required (Core Journey)

**New Components:**
1. `SortableWishlistCard` - Wraps WishlistCard with dnd-kit sortable behavior
2. `DraggableWishlistGallery` - Gallery container with DndContext and SortableContext
3. `ReorderToast` - Toast notification for reorder feedback

**Reuse Targets:**
- `@repo/gallery/DraggableTableHeader` - Pattern reference for dnd-kit integration
- `@repo/app-component-library/_primitives/Toast` - Toast notifications
- `@repo/app-component-library/cards/WishlistCard` - Existing card component
- `@repo/gallery` dependencies: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`

**shadcn Primitives:**
- `Button` - Drag handle icon button
- `Toast` - Error/success notifications
- `DropdownMenu` - Not needed for MVP

### Component Hierarchy (Core Flow)

```
DraggableWishlistGallery
├── DndContext (from @dnd-kit/core)
│   ├── SortableContext (from @dnd-kit/sortable)
│   │   ├── SortableWishlistCard (new)
│   │   │   └── WishlistCard (reuse)
│   │   ├── SortableWishlistCard
│   │   └── ... (repeat for each item)
│   └── DragOverlay (visual feedback during drag)
│       └── WishlistCard (ghost preview)
└── ReorderToast (feedback component)
```

---

## MVP Accessibility (Blocking Only)

### Requirements That Prevent Core Journey Usage

**1. Keyboard Navigation (BLOCKING)**
- **Requirement:** Users MUST be able to reorder items using keyboard only
- **Implementation:** dnd-kit's `KeyboardSensor` with arrow key support
- **Test:** Tab to item → Space to activate → Arrow keys to move → Space to confirm
- **Why blocking:** Core journey fails for keyboard-only users without this

**2. Screen Reader Announcements (BLOCKING)**
- **Requirement:** Screen readers MUST announce drag start, current position, and drop
- **Implementation:**
  - ARIA live regions for position announcements
  - `aria-grabbed` attribute during drag
  - `role="listitem"` with `aria-setsize` and `aria-posinset`
- **Test:** VoiceOver/NVDA announces "Item 1 of 5, grabbed. Item moved to position 3 of 5"
- **Why blocking:** Core journey is unusable for screen reader users without announcements

**3. Focus Management (BLOCKING)**
- **Requirement:** Focus MUST return to reordered item after drag completes
- **Implementation:** `useFocusReturnRef` hook to restore focus post-drag
- **Test:** After drag, focus is on the item at its new position
- **Why blocking:** Keyboard users lose context without focus management

**4. Touch Target Size (BLOCKING)**
- **Requirement:** Drag handle MUST be at least 44x44px for mobile
- **Implementation:** Padding on GripVertical button to meet WCAG 2.5.5 (Level AAA, but critical for mobile)
- **Test:** Measure touch target in DevTools
- **Why blocking:** Mobile users cannot activate drag on small targets

---

## MVP Design System Rules

### Token-Only Colors (Hard Gate)

**Required:**
- Drag handle: `text-muted-foreground` (not hardcoded #666)
- Drag overlay opacity: `opacity-50` (not `opacity: 0.5` in style prop)
- Drop zone highlight: `bg-primary/10` (not `rgba(59, 130, 246, 0.1)`)
- Hover state: `hover:bg-muted/60` (not `hover:bg-gray-100`)

**Example from `@repo/gallery/DraggableTableHeader`:**
```tsx
<button
  className={cn(
    'touch-none p-1 rounded hover:bg-muted/60 transition-all',
    'text-muted-foreground',
    isDragging && 'opacity-100',
  )}
>
  <GripVertical className="h-4 w-4 text-muted-foreground" />
</button>
```

**Enforcement:**
- ESLint rule `@repo/design-system/no-hardcoded-colors` MUST pass
- All Tailwind classes MUST use design tokens

### `_primitives` Import Requirement

**Required Imports:**
```tsx
import { Button } from '@repo/app-component-library/_primitives/Button'
import { Toast, ToastAction } from '@repo/app-component-library/_primitives/Toast'
```

**Forbidden:**
```tsx
import { Button } from '@repo/app-component-library/buttons/CustomButton' // ❌ Not a primitive
import Button from '@radix-ui/react-button' // ❌ Bypass shadcn wrapper
```

---

## MVP Playwright Evidence

### Core Journey Demonstration Steps

**Scenario 1: Mouse Drag Reorder**
1. Navigate to wishlist gallery
2. Verify 5 items loaded in original order
3. Click and hold drag handle on item 1
4. Verify visual feedback (opacity change, cursor)
5. Drag to position 3
6. Release mouse
7. Verify item moved to position 3
8. Verify network request sent (PUT /reorder)
9. Reload page
10. Verify order persists

**Scenario 2: Touch Drag Reorder**
1. Use mobile viewport (375x667)
2. Load wishlist gallery
3. Long-press item 1 for 300ms
4. Verify drag activates
5. Drag to position 3
6. Release
7. Verify reorder persists

**Scenario 3: Keyboard Reorder**
1. Tab to first item
2. Press Space to activate drag
3. Verify screen reader announces "Item grabbed"
4. Press Down Arrow twice
5. Verify screen reader announces "Item moved to position 3"
6. Press Space to confirm
7. Verify reorder persists

**Scenario 4: Error Handling**
1. Mock API to return 500 error
2. Drag item to new position
3. Verify error toast appears
4. Verify items revert to original positions
5. Close toast

**Evidence Files:**
- `playwright/videos/drag-reorder-mouse.webm`
- `playwright/videos/drag-reorder-touch.webm`
- `playwright/videos/drag-reorder-keyboard.webm`
- `playwright/traces/drag-reorder-error.zip`

---

## MVP-Critical Notes

### Pagination Boundary Constraint

**Issue:** Reordering across pagination boundaries is out of scope for MVP.

**User Communication:**
- Show info toast when user attempts to drag beyond visible page:
  - "Reordering across pages isn't supported. Use filters to see all items on one page."
- Add help text near pagination controls:
  - "Tip: Apply filters or increase items per page to reorder more items at once."

**Implementation:**
- Constrain `SortableContext` to current page items only
- Do NOT attempt to fetch all items for drag (performance concern)
- Show toast on drag-out-of-bounds event

**Test:**
- Edge Case #1 in TEST-PLAN.md covers this scenario

### Visual Feedback Timing

**Critical Timing:**
- Drag start → Visual feedback: < 16ms (1 frame)
- Drop → API call: < 100ms (perceivable as instant)
- API response → Toast: < 500ms (acceptable delay)

**Implementation:**
- Use `transform` for drag animation (GPU-accelerated)
- Avoid `position: absolute` during drag (causes reflow)
- Use Framer Motion for smooth transitions

---

## Future-Proofing Notes

### Cross-Page Reordering (WISH-2005b or later)

**Approach:**
- Fetch all items when entering "reorder mode" (toggle button)
- Virtualize list with `react-window` or `react-virtual`
- Show warning: "Reorder mode loads all items. This may take a moment."

**Deferred to:** Future story after MVP

### Bulk Reorder Operations

**Approach:**
- Multi-select items (checkbox mode)
- Drag group of items together
- Batch reorder API call

**Deferred to:** Future enhancement

### Undo/Redo Stack

**Approach:**
- Track reorder history in Redux state
- Undo button in toast (5-second window)
- Redo button in app header

**Deferred to:** WISH-2005b (Optimistic updates and undo flow)

---

## Design System Extensions (Out of MVP Scope)

**Potential Extensions:**
- `DraggableCard` primitive in `@repo/app-component-library`
- `ReorderableList` higher-order component
- `DragHandle` icon variant in design tokens

**Decision:** Do NOT create these for MVP. Wait for second use case to justify shared components.

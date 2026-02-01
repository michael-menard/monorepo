# Implementation Plan - WISH-2006: Accessibility

## Overview

This plan implements comprehensive keyboard navigation and screen reader support for the wishlist gallery. The implementation is frontend-only and creates reusable accessibility hooks within the app-wishlist-gallery package.

## Implementation Chunks

### Chunk 1: Create useAnnouncer Hook

**File**: `apps/web/app-wishlist-gallery/src/hooks/useAnnouncer.ts`

Create a hook that manages a screen reader live region for dynamic announcements.

**Implementation Details**:
```typescript
// Returns { announce, Announcer }
// announce(message, priority) - triggers screen reader announcement
// Announcer - React component with aria-live region to render once in app
```

**Features**:
- `aria-live="polite"` by default, `aria-live="assertive"` for urgent messages
- `aria-atomic="true"` for complete message reading
- `role="status"` for status updates
- Automatically clears after announcement (100ms delay)
- Visually hidden with `sr-only` class

**Test File**: `apps/web/app-wishlist-gallery/src/hooks/__tests__/useAnnouncer.test.ts`

---

### Chunk 2: Create useKeyboardShortcuts Hook

**File**: `apps/web/app-wishlist-gallery/src/hooks/useKeyboardShortcuts.ts`

Create a hook for gallery-scoped keyboard shortcuts.

**Implementation Details**:
```typescript
interface KeyboardShortcut {
  key: string // e.g., 'a', 'g', 'Delete', 'Enter', 'Escape'
  handler: () => void
  disabled?: boolean
}

function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: { enabled?: boolean; containerRef?: RefObject<HTMLElement> }
)
```

**Features**:
- Ignore shortcuts when focus is in input/textarea/contenteditable
- Gallery-scoped: only active when containerRef element or children have focus
- Support for `enabled` toggle to disable all shortcuts
- Normalize key names (handle Delete vs Backspace, etc.)
- Prevent default for handled keys

**Test File**: `apps/web/app-wishlist-gallery/src/hooks/__tests__/useKeyboardShortcuts.test.ts`

---

### Chunk 3: Create useRovingTabIndex Hook

**File**: `apps/web/app-wishlist-gallery/src/hooks/useRovingTabIndex.ts`

Create a hook for 2D grid keyboard navigation following WAI-ARIA roving tabindex pattern.

**Implementation Details**:
```typescript
interface UseRovingTabIndexOptions {
  itemCount: number
  columns?: number // If not provided, calculate from container
  wrap?: boolean // Wrap at edges (default: true for left/right, false for up/down)
  onNavigate?: (index: number) => void
  containerRef?: RefObject<HTMLElement>
}

interface UseRovingTabIndexReturn {
  activeIndex: number
  setActiveIndex: (index: number) => void
  getTabIndex: (index: number) => 0 | -1
  handleKeyDown: (e: KeyboardEvent) => void
  containerProps: { role: string; 'aria-label': string; onKeyDown: handler }
}
```

**Features**:
- Arrow keys: Up/Down move by column count, Left/Right move by 1
- Home/End: Jump to first/last item
- Use ResizeObserver to dynamically calculate columns if not provided
- Only one item has tabindex="0" at any time
- Focus management: call element.focus() when activeIndex changes
- Edge case handling: single item, empty grid, partial last row

**Test File**: `apps/web/app-wishlist-gallery/src/hooks/__tests__/useRovingTabIndex.test.ts`

---

### Chunk 4: Create Accessibility Utilities

**File**: `apps/web/app-wishlist-gallery/src/utils/a11y.ts`

Create utility functions for ARIA labels and accessibility helpers.

**Functions**:
```typescript
// Generate accessible label for wishlist item
function generateItemAriaLabel(item: WishlistItem, index: number, total: number): string
// Returns: "[Title], [price], [pieces] pieces, priority [n] of [total]"

// Generate announcement for state changes
function generatePriorityChangeAnnouncement(item: WishlistItem, newPriority: number, total: number): string
// Returns: "Priority updated. [Item] is now priority [n] of [total]"

function generateDeleteAnnouncement(deletedTitle: string, nextTitle?: string): string
// Returns: "Item deleted. [Next Item] selected." or "Item deleted. Wishlist is empty."

function generateAddAnnouncement(): string
// Returns: "Item added to wishlist."

function generateFilterAnnouncement(count: number, sortMethod: string): string
// Returns: "Showing [count] items sorted by [method]"
```

**Test File**: `apps/web/app-wishlist-gallery/src/utils/__tests__/a11y.test.ts`

---

### Chunk 5: Enhance WishlistCard with Accessibility

**File**: `apps/web/app-wishlist-gallery/src/components/WishlistCard/index.tsx`

Enhance existing component with accessibility attributes.

**Changes**:
1. Add `tabIndex` prop to control focus order
2. Add `onKeyDown` prop for keyboard event handling
3. Add `aria-label` using `generateItemAriaLabel()`
4. Add `aria-selected` for grid selection state
5. Add focus ring styles: `focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2`
6. Add `role="listitem"`
7. Forward ref for focus management

**Props to Add**:
```typescript
interface WishlistCardProps {
  // Existing props...
  tabIndex?: number
  onKeyDown?: (e: React.KeyboardEvent) => void
  isSelected?: boolean
  index?: number
  totalItems?: number
}
```

---

### Chunk 6: Enhance DraggableWishlistGallery with Keyboard Navigation

**File**: `apps/web/app-wishlist-gallery/src/components/DraggableWishlistGallery/index.tsx`

Integrate roving tabindex and keyboard shortcuts into the gallery.

**Changes**:
1. Import and use `useRovingTabIndex` hook
2. Import and use `useKeyboardShortcuts` hook
3. Import and use `useAnnouncer` hook
4. Add container ref for keyboard shortcut scoping
5. Pass tabIndex and onKeyDown to SortableWishlistCard
6. Add Announcer component to render tree
7. Trigger announcements on item add/delete/reorder

**Keyboard Shortcuts to Implement**:
- `a` - Trigger `onAddItem` callback (to be added)
- `g` - Trigger `onGotIt` for focused item
- `Delete` - Trigger `onDelete` for focused item
- `Enter` - Trigger `onCardClick` for focused item

---

### Chunk 7: Enhance Main Page with Keyboard Shortcuts

**File**: `apps/web/app-wishlist-gallery/src/pages/main-page.tsx`

Add keyboard shortcut integration at page level for the Add Item shortcut.

**Changes**:
1. Pass `onAddItem` callback to DraggableWishlistGallery
2. Open Add Item modal when `A` key pressed
3. Add filter/sort announcements using `useAnnouncer`
4. Announce "Showing X items sorted by Y" on filter changes

---

### Chunk 8: Verify Modal Accessibility

**Files**:
- `apps/web/app-wishlist-gallery/src/components/GotItModal/index.tsx`
- `apps/web/app-wishlist-gallery/src/components/DeleteConfirmModal/index.tsx`

Verify and enhance modal accessibility:

**Verification Checklist**:
- [x] Uses Radix Dialog/AlertDialog (built-in focus trap)
- [x] Has `aria-labelledby` via AppDialogTitle
- [ ] Add `aria-describedby` if not present
- [ ] Verify focus moves to first focusable element on open
- [ ] Verify Escape closes modal
- [ ] Verify focus returns to trigger on close

**Enhancements**:
1. Add `aria-describedby` pointing to description
2. Add screen reader announcement on modal open
3. Verify focus return when trigger element is deleted (DeleteConfirmModal edge case)

---

### Chunk 9: Create Unit Tests for Hooks

**Test Files**:
- `apps/web/app-wishlist-gallery/src/hooks/__tests__/useAnnouncer.test.ts`
- `apps/web/app-wishlist-gallery/src/hooks/__tests__/useKeyboardShortcuts.test.ts`
- `apps/web/app-wishlist-gallery/src/hooks/__tests__/useRovingTabIndex.test.ts`
- `apps/web/app-wishlist-gallery/src/utils/__tests__/a11y.test.ts`

**Test Coverage**:
1. **useAnnouncer**: Renders live region, announces messages, clears after timeout
2. **useKeyboardShortcuts**: Handles shortcuts, ignores in inputs, respects enabled flag
3. **useRovingTabIndex**: Arrow navigation, Home/End, single tabindex, edge cases
4. **a11y utils**: Label generation, announcement formatting

---

### Chunk 10: Playwright E2E Tests for Keyboard Navigation

**File**: `apps/web/playwright/features/accessibility/wishlist-keyboard.feature` (or spec file)

**Test Scenarios**:
1. Arrow key navigation moves focus in 2D grid
2. Home/End keys jump to first/last item
3. `A` key opens Add Item modal
4. `G` key opens Got It modal for focused item
5. `Delete` key opens delete confirmation for focused item
6. `Enter` key navigates to detail view
7. `Escape` closes modal and returns focus
8. Tab cycles within modal (focus trap)
9. Screen reader announcements work (check aria-live region content)
10. axe-core scan passes with zero violations

---

## Execution Order

1. **Chunk 1**: useAnnouncer (foundational - no dependencies)
2. **Chunk 4**: a11y utilities (foundational - no dependencies)
3. **Chunk 2**: useKeyboardShortcuts (foundational - no dependencies)
4. **Chunk 3**: useRovingTabIndex (foundational - no dependencies)
5. **Chunk 5**: WishlistCard enhancements (depends on utilities)
6. **Chunk 8**: Modal verification (parallel with cards)
7. **Chunk 6**: DraggableWishlistGallery integration (depends on all hooks)
8. **Chunk 7**: Main page integration (depends on gallery)
9. **Chunk 9**: Unit tests (after implementation)
10. **Chunk 10**: E2E tests (after all implementation)

## Fast-Fail Checkpoints

After each chunk, run:
```bash
pnpm check-types
```

After Chunks 5-8 (component changes), additionally run:
```bash
pnpm lint
pnpm test --filter=app-wishlist-gallery
```

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| ResizeObserver for column detection may be complex | Start with fixed columns, add dynamic detection as enhancement |
| Focus management race conditions | Use refs and useEffect carefully, test thoroughly |
| Keyboard shortcuts conflicting with browser | Gallery-scoped activation prevents global conflicts |
| Screen reader testing limitations | Rely on axe-core automated testing + DOM assertions for aria-live |

## Architectural Decisions Confirmed

Per ELAB-WISH-2006.md:

1. **Grid Column Detection**: CSS Grid auto-fill + ResizeObserver
2. **Keyboard Shortcut Scope**: Gallery-scoped (not global)
3. **Package Location**: App-local hooks in `src/hooks/`, not @repo/accessibility (future migration planned)

# WISH-2006 Implementation Plan Summary

**Story**: WISH-2006: Accessibility
**Status**: Planning Complete
**Date**: 2026-02-03

---

## Executive Summary

WISH-2006 accessibility implementation is **80% complete** at the code level but **0% integrated** into the live UI. The accessibility hooks exist, are fully tested (82 unit tests passing), and have passed code review. However:

1. **Integration Gap**: Hooks are NOT imported or used in `main-page.tsx` or `DraggableWishlistGallery`
2. **E2E Test Gap**: NO E2E tests exist for keyboard navigation, shortcuts, or screen reader announcements
3. **Accessibility Scan Gap**: NO axe-core integration for WCAG AA compliance verification

The previous work created the **foundation** (hooks + utilities), but the **integration** and **end-to-end testing** are completely missing.

---

## What Already Exists

### Completed Implementation (Code Review PASS)

| Component | Status | Coverage | Location |
|-----------|--------|----------|----------|
| `useAnnouncer.tsx` | Complete | 97% | Screen reader announcements |
| `useKeyboardShortcuts.ts` | Complete | 81% | Keyboard shortcut manager |
| `useRovingTabIndex.ts` | Complete | 92% | 2D grid navigation |
| `a11y.ts` | Complete | 85% | ARIA utilities |
| `WishlistCard` enhancements | Complete | N/A | Accessibility props added |
| Unit tests | Complete | 82 tests | All passing |

**Code Review Verdict**: PASS (lint, style, syntax, security, typecheck, build)

### Existing E2E Tests

- `modal-accessibility.spec.ts`: Covers modal keyboard behavior (ESC, focus trap, focus return)
- **Gap**: NO tests for gallery keyboard navigation, shortcuts, or announcements

---

## What Needs to Be Done

### Phase 1: Integration (2-3 hours)

**File**: `apps/web/app-wishlist-gallery/src/pages/main-page.tsx`

```typescript
import { useAnnouncer } from '../hooks/useAnnouncer'

// In component:
const { announce, Announcer } = useAnnouncer()

// On filter/sort change:
announce(`Showing ${count} items sorted by ${sortMethod}`)

// In JSX:
<Announcer />
```

**File**: `apps/web/app-wishlist-gallery/src/components/DraggableWishlistGallery/index.tsx`

```typescript
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useRovingTabIndex } from '../../hooks/useRovingTabIndex'

// In component:
const containerRef = useRef<HTMLDivElement>(null)
const { activeIndex, handleKeyDown, getTabIndex, containerProps } = useRovingTabIndex({
  itemCount: items.length,
  columns: 3, // or detect with ResizeObserver
})

useKeyboardShortcuts([
  { key: 'a', handler: openAddModal },
  { key: 'g', handler: openGotItModal },
  { key: 'Delete', handler: openDeleteModal },
  { key: 'Enter', handler: activateItem },
], { containerRef })

// Pass to cards:
<WishlistCard
  tabIndex={getTabIndex(index)}
  onKeyDown={handleKeyDown}
  {...otherProps}
/>
```

### Phase 2: E2E Keyboard Navigation Tests (1.5-2 hours)

**File**: `apps/web/playwright/tests/wishlist/keyboard-navigation.spec.ts`

Test scenarios:
- ✓ Arrow Down moves focus to item below
- ✓ Arrow Up moves focus to item above
- ✓ Arrow Right moves to next item
- ✓ Arrow Left moves to previous item
- ✓ Home jumps to first item
- ✓ End jumps to last item
- ✓ Only one item has `tabindex="0"` at any time
- ✓ Focus ring is visible on focused item
- ✓ Navigation works with responsive column layouts
- ✓ Edge case: single item (no crash)
- ✓ Edge case: empty gallery (no crash)

### Phase 3: E2E Keyboard Shortcuts Tests (1-1.5 hours)

**File**: `apps/web/playwright/tests/wishlist/keyboard-shortcuts.spec.ts`

Test scenarios:
- ✓ A key opens Add Item modal
- ✓ G key opens Got It modal for focused item
- ✓ Delete key opens delete confirmation
- ✓ Enter key activates focused item
- ✓ Shortcuts do NOT fire when focus is in input
- ✓ Shortcuts do NOT fire when gallery lacks focus

### Phase 4: E2E Screen Reader Announcements (1-1.5 hours)

**File**: `apps/web/playwright/tests/wishlist/screen-reader-announcements.spec.ts`

Test scenarios:
- ✓ aria-live region exists with correct attributes
- ✓ Item focus triggers ARIA label announcement
- ✓ Priority change triggers announcement
- ✓ Item deleted triggers announcement
- ✓ Item added triggers announcement
- ✓ Filter/sort change triggers announcement
- ✓ Announcements clear after 100ms

### Phase 5: E2E Accessibility Scan (0.5-1 hour)

**File**: `apps/web/playwright/tests/wishlist/accessibility-scan.spec.ts`

Test scenarios:
- ✓ axe-core scan on wishlist gallery page
- ✓ Zero WCAG AA violations
- ✓ Focus ring contrast meets 4.5:1 ratio
- ✓ All interactive elements have accessible names

---

## Acceptance Criteria Coverage

| AC | Description | Unit Test | Integration | E2E Test |
|----|-------------|-----------|-------------|----------|
| AC1 | Arrow keys navigate 2D grid | ✓ | ✗ | ✗ |
| AC2 | Tab/Home/End keys work | ✓ | ✗ | ✗ |
| AC3 | Only one tabindex=0 | ✓ | ✗ | ✗ |
| AC4 | Visible focus indicator | ✓ | Partial | ✗ |
| AC5 | A key opens modal | ✓ | ✗ | ✗ |
| AC6 | G/Delete/Enter keys work | ✓ | ✗ | ✗ |
| AC7 | Escape closes modals | N/A | ✓ | ✓ |
| AC8 | Shortcuts ignored in inputs | ✓ | ✗ | ✗ |
| AC9 | Item focus announces | ✓ | ✗ | ✗ |
| AC10 | State change announcements | ✓ | ✗ | ✗ |
| AC11 | aria-live region attributes | ✓ | ✗ | ✗ |
| AC12 | Color contrast 4.5:1 | N/A | ✓ | ✗ |
| AC13 | Focus ring contrast | N/A | ✓ | ✗ |
| AC14 | axe-core zero violations | N/A | N/A | ✗ |

**Legend**: ✓ = Complete, ✗ = Missing, Partial = Incomplete

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Integration breaks drag-and-drop | High | Test drag-and-drop after integration |
| aria-live announcements flaky | Medium | Use waitFor with retry logic |
| Grid column detection fails | Medium | Test with explicit viewport sizes |
| axe-core false positives | Low | Document acceptable exceptions |
| Keyboard shortcuts conflict | Low | Ensure gallery focus before tests |

---

## Success Criteria

✓ All 38 acceptance criteria verified in E2E tests
✓ Keyboard navigation works in 2D grid with arrow keys
✓ All keyboard shortcuts functional (A, G, Delete, Enter, Escape)
✓ Screen reader announcements trigger for all state changes
✓ axe-core scan passes with zero WCAG AA violations
✓ Focus ring visible and meets contrast requirements
✓ Existing unit tests continue to pass (82 tests)

---

## Timeline Estimate

| Phase | Effort | Description |
|-------|--------|-------------|
| Integration | 2-3 hours | Wire hooks into main-page.tsx and DraggableWishlistGallery |
| E2E Navigation Tests | 1.5-2 hours | Arrow keys, Home/End, roving tabindex |
| E2E Shortcuts Tests | 1-1.5 hours | A, G, Delete, Enter keyboard shortcuts |
| E2E Announcements Tests | 1-1.5 hours | aria-live screen reader tests |
| E2E Accessibility Scan | 0.5-1 hour | axe-core integration |
| **Total** | **6.5-9 hours** | |

---

## Architecture Notes

### Hook Location
- **Current**: App-local in `apps/web/app-wishlist-gallery/src/hooks/`
- **Future**: Migrate to `@repo/accessibility` once proven in production

### Keyboard Shortcut Scope
- **Decision**: Gallery-scoped (not global)
- **Rationale**: Prevents conflicts with browser shortcuts and input fields

### Grid Column Detection
- **Strategy**: CSS Grid `auto-fill` + ResizeObserver
- **Implementation**: `repeat(auto-fill, minmax(300px, 1fr))` with dynamic column detection

---

## Files to Modify/Create

### Integration Files
- ✓ `apps/web/app-wishlist-gallery/src/pages/main-page.tsx`
- ✓ `apps/web/app-wishlist-gallery/src/components/DraggableWishlistGallery/index.tsx`

### E2E Test Files (NEW)
- ✓ `apps/web/playwright/tests/wishlist/keyboard-navigation.spec.ts`
- ✓ `apps/web/playwright/tests/wishlist/keyboard-shortcuts.spec.ts`
- ✓ `apps/web/playwright/tests/wishlist/screen-reader-announcements.spec.ts`
- ✓ `apps/web/playwright/tests/wishlist/accessibility-scan.spec.ts`

---

## Signal: PLANNING COMPLETE

All planning artifacts created:
- ✓ PLAN.yaml (detailed phase breakdown)
- ✓ EVIDENCE.yaml (gap analysis)
- ✓ KNOWLEDGE-CONTEXT.yaml (architectural context)
- ✓ PLAN-SUMMARY.md (this document)
- ✓ CHECKPOINT.yaml (updated to planning phase)

**Ready for implementation phase.**

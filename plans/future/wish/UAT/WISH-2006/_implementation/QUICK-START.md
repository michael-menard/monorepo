# WISH-2006 Quick Start Guide

**For developers continuing implementation of accessibility features**

---

## TL;DR

The accessibility hooks **already exist** and are **fully tested**. You need to:

1. **Wire them up** to `main-page.tsx` and `DraggableWishlistGallery`
2. **Write E2E tests** for keyboard navigation, shortcuts, and announcements
3. **Add axe-core** scan to verify WCAG AA compliance

**DO NOT rewrite the hooks** - they passed code review and have 82 passing unit tests.

---

## Current Status

### ✅ What's Done
- ✅ `useAnnouncer.tsx` - Screen reader announcements (97% coverage)
- ✅ `useKeyboardShortcuts.ts` - Keyboard shortcut manager (81% coverage)
- ✅ `useRovingTabIndex.ts` - 2D grid navigation (92% coverage)
- ✅ `a11y.ts` - ARIA utilities (85% coverage)
- ✅ 82 unit tests - All passing
- ✅ Code review - PASS

### ❌ What's Missing
- ❌ Hooks NOT integrated into UI
- ❌ NO E2E tests for keyboard navigation
- ❌ NO E2E tests for keyboard shortcuts
- ❌ NO E2E tests for screen reader announcements
- ❌ NO axe-core accessibility scan

---

## Step 1: Integration (2-3 hours)

### File: `main-page.tsx`

Add at the top of the component:

```typescript
import { useAnnouncer } from '../hooks/useAnnouncer'

// Inside MainPageContent:
const { announce, Announcer } = useAnnouncer()
```

Add to JSX (anywhere in render tree):

```typescript
<Announcer />
```

Add announcements:

```typescript
// When filter changes:
announce(`Showing ${filteredItems.length} items filtered by ${filterValue}`)

// When sort changes:
announce(`Showing ${items.length} items sorted by ${sortLabel}`)
```

### File: `DraggableWishlistGallery/index.tsx`

Add imports:

```typescript
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useRovingTabIndex } from '../../hooks/useRovingTabIndex'
import { useAnnouncer } from '../../hooks/useAnnouncer'
```

Add refs and hooks:

```typescript
const containerRef = useRef<HTMLDivElement>(null)
const { announce } = useAnnouncer()

const { activeIndex, handleKeyDown, getTabIndex, containerProps } = useRovingTabIndex({
  itemCount: wishlistItems.length,
  columns: 3, // TODO: detect dynamically with ResizeObserver
  onNavigate: (index) => {
    const item = wishlistItems[index]
    announce(generateItemAriaLabel(item, index + 1, wishlistItems.length))
  },
})

useKeyboardShortcuts([
  { key: 'a', handler: () => onAddItem?.() },
  { key: 'g', handler: () => {
    const item = wishlistItems[activeIndex]
    if (item) onGotIt?.(item)
  }},
  { key: 'Delete', handler: () => {
    const item = wishlistItems[activeIndex]
    if (item) onDelete?.(item.id)
  }},
  { key: 'Enter', handler: () => {
    const item = wishlistItems[activeIndex]
    if (item) onCardClick?.(item)
  }},
], { containerRef })
```

Add to container div:

```typescript
<div ref={containerRef} {...containerProps}>
  {/* gallery content */}
</div>
```

Pass props to cards:

```typescript
<WishlistCard
  {...item}
  tabIndex={getTabIndex(index)}
  onKeyDown={handleKeyDown}
  isSelected={activeIndex === index}
  index={index + 1}
  totalItems={wishlistItems.length}
/>
```

---

## Step 2: E2E Tests (4-6 hours)

### Test 1: `keyboard-navigation.spec.ts`

```typescript
test('Arrow Down moves focus to item below', async ({ page }) => {
  await page.goto('/wishlist')

  // Focus first item
  const firstCard = page.locator('[data-testid^="wishlist-card-"]').first()
  await firstCard.focus()

  // Press Arrow Down
  await page.keyboard.press('ArrowDown')

  // Verify focus moved (assuming 3-column grid)
  const fourthCard = page.locator('[data-testid^="wishlist-card-"]').nth(3)
  await expect(fourthCard).toBeFocused()
})
```

**Full test scenarios**: See PLAN-SUMMARY.md Phase 2

### Test 2: `keyboard-shortcuts.spec.ts`

```typescript
test('A key opens Add Item modal', async ({ page }) => {
  await page.goto('/wishlist')

  // Focus gallery container
  const gallery = page.locator('[role="grid"]')
  await gallery.focus()

  // Press A key
  await page.keyboard.press('a')

  // Verify modal opens
  await expect(page.locator('[data-testid="add-item-modal"]')).toBeVisible()
})
```

**Full test scenarios**: See PLAN-SUMMARY.md Phase 3

### Test 3: `screen-reader-announcements.spec.ts`

```typescript
test('Item focus announces ARIA label', async ({ page }) => {
  await page.goto('/wishlist')

  // Focus first item
  const firstCard = page.locator('[data-testid^="wishlist-card-"]').first()
  await firstCard.focus()

  // Check aria-live region content
  const liveRegion = page.locator('[role="status"][aria-live="polite"]')
  await expect(liveRegion).toContainText(/priority 1 of \d+/)
})
```

**Full test scenarios**: See PLAN-SUMMARY.md Phase 4

### Test 4: `accessibility-scan.spec.ts`

```typescript
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('Wishlist gallery has no WCAG AA violations', async ({ page }) => {
  await page.goto('/wishlist')

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()

  expect(results.violations).toEqual([])
})
```

**Full test scenarios**: See PLAN-SUMMARY.md Phase 5

---

## Step 3: Verify

Run all tests:

```bash
# Unit tests (should still pass)
cd apps/web/app-wishlist-gallery
pnpm vitest run

# E2E tests
cd ../../playwright
pnpm playwright test tests/wishlist/keyboard-navigation.spec.ts
pnpm playwright test tests/wishlist/keyboard-shortcuts.spec.ts
pnpm playwright test tests/wishlist/screen-reader-announcements.spec.ts
pnpm playwright test tests/wishlist/accessibility-scan.spec.ts
```

---

## Key Files Reference

### Hooks (DO NOT MODIFY - already code reviewed)
- `apps/web/app-wishlist-gallery/src/hooks/useAnnouncer.tsx`
- `apps/web/app-wishlist-gallery/src/hooks/useKeyboardShortcuts.ts`
- `apps/web/app-wishlist-gallery/src/hooks/useRovingTabIndex.ts`

### Utilities (DO NOT MODIFY - already code reviewed)
- `apps/web/app-wishlist-gallery/src/utils/a11y.ts`

### Components to Modify
- `apps/web/app-wishlist-gallery/src/pages/main-page.tsx`
- `apps/web/app-wishlist-gallery/src/components/DraggableWishlistGallery/index.tsx`

### E2E Tests to Create
- `apps/web/playwright/tests/wishlist/keyboard-navigation.spec.ts`
- `apps/web/playwright/tests/wishlist/keyboard-shortcuts.spec.ts`
- `apps/web/playwright/tests/wishlist/screen-reader-announcements.spec.ts`
- `apps/web/playwright/tests/wishlist/accessibility-scan.spec.ts`

---

## Common Pitfalls

1. **Don't rewrite the hooks** - They're already done and tested
2. **Don't forget containerRef** - Keyboard shortcuts need it for scoping
3. **Don't test in unit tests** - E2E tests are required for keyboard behavior
4. **Don't skip axe-core** - WCAG AA compliance is a hard requirement
5. **Don't forget focus ring** - Verify it's visible in E2E tests

---

## Getting Help

- **Architecture questions**: See KNOWLEDGE-CONTEXT.yaml
- **Detailed plan**: See PLAN.yaml
- **Gap analysis**: See EVIDENCE.yaml
- **Full summary**: See PLAN-SUMMARY.md
- **Story details**: See WISH-2006.md in parent directory

---

## Success Criteria Checklist

- [ ] Hooks integrated into main-page.tsx
- [ ] Hooks integrated into DraggableWishlistGallery
- [ ] Announcer component rendered
- [ ] Keyboard navigation E2E tests pass
- [ ] Keyboard shortcuts E2E tests pass
- [ ] Screen reader announcement E2E tests pass
- [ ] axe-core scan passes (zero violations)
- [ ] Unit tests still pass (82 tests)
- [ ] No regressions in existing functionality

---

**Estimated Time**: 6-9 hours total

**Ready to start?** Begin with Step 1 (Integration), then Step 2 (E2E Tests), then Step 3 (Verify).

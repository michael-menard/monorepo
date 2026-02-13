# Test Plan: REPA-007

**Story**: Add SortableGallery Component to @repo/gallery

---

## Scope Summary

**Endpoints touched**: None (frontend-only component)

**UI touched**: Yes
- New SortableGallery component in @repo/gallery
- Drag overlay rendering
- Toast notifications for undo/redo
- Grid and list layout modes

**Data/storage touched**: No (component delegates persistence to caller via onReorder callback)

---

## Happy Path Tests

### Test 1: Basic drag-and-drop reorder
**Setup**:
- Mount SortableGallery with 5 test items
- Provide mock onReorder callback
- Render simple cards via renderItem prop

**Action**:
- Drag item at index 2 to index 0 using Playwright drag API
- Wait for onReorder callback invocation

**Expected outcome**:
- Item visually moves to new position immediately (optimistic update)
- onReorder called with reordered array
- Success toast appears with "Undo" button
- ARIA live region announces "Item moved from position 3 to position 1"

**Evidence**:
- Playwright screenshot showing reordered items
- Mock function assertion: `expect(onReorder).toHaveBeenCalledWith([item2, item0, item1, item3, item4])`
- Toast visible in viewport
- aria-live region contains movement announcement

### Test 2: Undo flow
**Setup**:
- Complete Test 1 setup and drag action
- Success toast with Undo button visible

**Action**:
- Click "Undo" button in toast
- Wait for onReorder callback

**Expected outcome**:
- Items return to original order visually
- onReorder called again with original order
- Toast updates to "Order restored"
- ARIA live region announces "Undo successful"

**Evidence**:
- Playwright assertion: items in original DOM order
- Mock function call count: `expect(onReorder).toHaveBeenCalledTimes(2)`
- Second call matches original order

### Test 3: Grid layout mode
**Setup**:
- Mount SortableGallery with layout="grid"
- Provide 12 items to fill multiple rows

**Action**:
- Verify responsive grid CSS classes applied
- Drag item from row 1 to row 3
- Verify grid reflow animation

**Expected outcome**:
- Grid container uses GalleryGrid component
- Items maintain grid layout during drag
- rectSortingStrategy applied (dnd-kit)
- Framer Motion layout animations smooth

**Evidence**:
- DOM inspection: grid CSS classes present
- No layout shift warnings in console
- Drag completes without visual glitches

### Test 4: List layout mode
**Setup**:
- Mount SortableGallery with layout="list"
- Provide 5 items

**Action**:
- Drag item 4 to position 1
- Verify vertical stacking maintained

**Expected outcome**:
- Items render in single column
- Full-width cards
- Vertical drag behavior only
- Smooth reordering animation

**Evidence**:
- DOM inspection: flex-col or similar vertical layout
- Items span full container width
- Horizontal drag ignored or minimal

### Test 5: Keyboard navigation (arrow keys)
**Setup**:
- Mount SortableGallery with 9 items (3x3 grid)
- Focus first item

**Action**:
- Press ArrowRight 2 times
- Press ArrowDown 1 time
- Press Home key

**Expected outcome**:
- Focus moves to item at position 2 after first arrow
- Focus moves to item at position 3 after second arrow
- Focus moves to item at position 6 (row 2) after ArrowDown
- Focus returns to item 1 after Home
- ARIA announcements for each focus change

**Evidence**:
- `document.activeElement` matches expected item after each key
- aria-live region contains "Focused on item X of Y"
- Tab index rotates correctly (roving tabindex pattern)

---

## Error Cases

### Error 1: onReorder callback throws error
**Setup**:
- Mount SortableGallery
- Configure onReorder to throw Error('API failed')

**Action**:
- Drag and drop an item
- Wait for error handling

**Expected**:
- Items roll back to original order
- Error toast displays with "Retry" button
- onError callback invoked (if provided)
- ARIA live region announces "Reorder failed"

**Evidence**:
- Items in original DOM order after error
- Error toast visible with correct text
- Console log shows error caught (not thrown to global)

### Error 2: onReorder callback rejects Promise
**Setup**:
- Mount SortableGallery
- Configure onReorder to return Promise.reject('Network error')

**Action**:
- Drag item
- Wait for Promise rejection

**Expected**:
- Same rollback behavior as Error 1
- Error toast with "Retry" button
- Retry button re-calls onReorder with same payload

**Evidence**:
- Promise rejection caught in component
- Retry button functional and re-invokes onReorder
- No unhandled promise rejection warnings

### Error 3: Invalid item array (missing id property)
**Setup**:
- Attempt to mount SortableGallery with items missing `id` property

**Action**:
- Component render

**Expected**:
- Zod validation error thrown or console warning
- Component does not crash
- Developer-friendly error message

**Evidence**:
- PropTypes or Zod validation error in console
- Error boundary catches issue (if implemented)
- Clear error message explaining `id` requirement

### Error 4: onReorder not provided
**Setup**:
- Mount SortableGallery without onReorder prop

**Action**:
- Drag item

**Expected**:
- Drag completes locally
- No error thrown
- Warning in console: "onReorder not provided, changes not persisted"
- Items revert on page reload (no persistence)

**Evidence**:
- Console warning present
- Local state updates but no API call
- No runtime errors

---

## Edge Cases (Reasonable)

### Edge 1: Single item gallery
**Setup**:
- Mount SortableGallery with 1 item

**Action**:
- Attempt drag

**Expected**:
- Drag cursor shows
- No reorder occurs (only one item)
- No onReorder call
- No toast

**Evidence**:
- onReorder mock not called
- Item remains in position
- No errors in console

### Edge 2: Empty gallery (0 items)
**Setup**:
- Mount SortableGallery with empty array

**Action**:
- Render component

**Expected**:
- Empty state (no crash)
- Drag sensors do not activate
- Keyboard navigation has no effect

**Evidence**:
- Component renders without error
- No drag overlay appears
- Focus management handles empty state gracefully

### Edge 3: Large gallery (100 items)
**Setup**:
- Mount SortableGallery with 100 items
- layout="grid"

**Action**:
- Drag item from top to bottom
- Monitor performance

**Expected**:
- Auto-scroll activates smoothly
- Framer Motion animations remain smooth (or disabled via prop)
- No significant frame drops
- onReorder completes in <500ms

**Evidence**:
- Chrome DevTools Performance recording shows <16ms frame times
- Memory usage stable
- Drag completes without lag

### Edge 4: Rapid consecutive drags
**Setup**:
- Mount SortableGallery
- Mock onReorder with 100ms delay

**Action**:
- Drag item 1 → position 3
- Immediately drag item 2 → position 5 (before first onReorder completes)

**Expected**:
- First drag's undo window cancels
- Second drag processes normally
- Only one toast visible at a time
- onReorder called twice (both allowed to complete)

**Evidence**:
- Toast count never exceeds 1
- Both onReorder calls execute (check mock call count)
- No race condition errors

### Edge 5: Touch device drag
**Setup**:
- Mount SortableGallery
- Simulate touch events (Playwright mobile viewport)

**Action**:
- Long-press item (300ms per seed config)
- Drag with touch

**Expected**:
- TouchSensor activates after 300ms delay
- 5px tolerance before drag starts
- Drag completes like pointer drag
- Touch-specific cursor/feedback

**Evidence**:
- Touch event listeners registered
- Drag does not start before 300ms
- Successful reorder on touch devices

### Edge 6: Disabled dragging mode
**Setup**:
- Mount SortableGallery with isDraggingEnabled={false}

**Action**:
- Attempt to drag item

**Expected**:
- Drag does not activate
- Items remain focusable for keyboard nav
- No drag cursor
- Keyboard shortcuts still work (if applicable)

**Evidence**:
- PointerSensor and TouchSensor disabled
- Items do not respond to drag gestures
- Tab navigation functional

### Edge 7: Undo timeout expiration
**Setup**:
- Mount SortableGallery with undoTimeout={2000} (2 seconds)
- Drag item successfully

**Action**:
- Wait 2.1 seconds
- Verify undo button no longer available

**Expected**:
- Toast auto-dismisses after 2 seconds
- Undo no longer possible
- Order change is "committed" (subsequent drags do not cascade undo)

**Evidence**:
- setTimeout callback fires
- Toast removed from DOM
- No undo button accessible after timeout

---

## Required Tooling Evidence

### Backend
**N/A** - This is a frontend-only component. Persistence handled by caller via onReorder callback.

### Frontend

#### Vitest Unit Tests (packages/core/gallery/src/components/SortableGallery/__tests__)
**Required tests**:
1. `SortableGallery.test.tsx` - Component rendering, prop validation
2. `SortableGallery.drag.test.tsx` - Drag-and-drop logic, sensors
3. `SortableGallery.undo.test.tsx` - Undo/redo flow, toast management
4. `SortableGallery.keyboard.test.tsx` - Keyboard navigation, focus management
5. `SortableGallery.accessibility.test.tsx` - ARIA attributes, announcer hook

**Assertions**:
- Zod schema validation for props
- onReorder callback invocation with correct payload
- Toast library integration (mock sonner)
- ARIA live region updates
- Keyboard event handlers
- Error boundary behavior

**Mocks**:
- RTK Query mutations (not used in component, but in integration tests)
- `toast` from sonner
- `window.ResizeObserver` (for useRovingTabIndex)
- Framer Motion animations (mock `motion.div`)

**Coverage target**: 80%+ per seed recommendations

#### Playwright E2E Tests (apps/web/playwright/tests/)
**Required**:
Per ADR-005 and ADR-006, at least one happy-path E2E test during dev phase.

**Test file**: `sortable-gallery.spec.ts`

**Happy path scenario**:
```typescript
test('user can drag and drop to reorder gallery items', async ({ page }) => {
  // Setup: Navigate to Storybook story or test page with SortableGallery
  await page.goto('/storybook/sortable-gallery')

  // Action: Drag item 3 to position 1
  const item3 = page.locator('[data-testid="gallery-item-2"]')
  const item1 = page.locator('[data-testid="gallery-item-0"]')
  await item3.dragTo(item1)

  // Assert: Item moved
  const firstItem = page.locator('[data-testid="gallery-item-0"]')
  await expect(firstItem).toContainText('Item 3')

  // Assert: Undo toast appears
  const toast = page.locator('[role="status"]')
  await expect(toast).toContainText('Undo')

  // Action: Click undo
  await page.locator('button:has-text("Undo")').click()

  // Assert: Original order restored
  await expect(firstItem).toContainText('Item 1')
})
```

**Additional E2E tests** (can defer to UAT phase per ADR-006):
- Keyboard navigation with arrow keys
- Touch device drag (mobile viewport)
- Error handling and retry
- Large gallery performance
- Multi-browser compatibility (Chrome, Firefox, Safari)

**Artifacts**:
- Playwright trace files for failed tests
- Screenshots of drag states
- Video recording of full test run (optional)

#### Accessibility Testing
**Tool**: axe-core via Playwright

**Test**:
```typescript
test('SortableGallery is accessible', async ({ page }) => {
  await page.goto('/storybook/sortable-gallery')
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
})
```

**Manual checks** (via screen reader):
- ARIA live region announces drag start/end
- Focused item has clear position info ("Item 3 of 10")
- Undo/Retry buttons are keyboard accessible
- role="list" and role="listitem" present

---

## Risks to Call Out

### Risk 1: Multi-browser drag behavior
**Concern**: Drag-and-drop behavior can vary between Chrome, Firefox, and Safari (per seed recommendations).

**Mitigation**:
- Run Playwright tests on all three browsers
- Document browser-specific quirks in Storybook
- Consider using dnd-kit's PointerSensor universally (works across browsers)

**Blocker**: No - can ship with Chrome support, add others iteratively.

---

### Risk 2: Touch device testing requires real devices or emulation
**Concern**: TouchSensor behavior cannot be fully verified without mobile/tablet simulation.

**Mitigation**:
- Use Playwright mobile viewport emulation
- Test on real iOS/Android devices before production
- Document touch delay (300ms) clearly in Storybook

**Blocker**: No - desktop drag works independently.

---

### Risk 3: Performance with large galleries (>100 items)
**Concern**: Framer Motion animations may cause performance issues with large item counts (per seed warnings).

**Mitigation**:
- Provide `disableAnimations` prop
- Document performance considerations in Storybook
- Test with 100-item gallery and monitor frame rate
- Consider virtualization in future iteration (out of scope for REPA-007)

**Blocker**: No - can defer optimization to future work.

---

### Risk 4: Test fragility due to animation timing
**Concern**: Framer Motion animations may cause race conditions in tests (elements not stable when assertions run).

**Mitigation**:
- Use `waitFor` utilities in React Testing Library
- Mock Framer Motion in unit tests (no animations)
- Use Playwright's auto-wait for E2E tests
- Add explicit `await page.waitForLoadState('networkidle')` if needed

**Blocker**: No - standard testing patterns apply.

---

### Risk 5: Undo/redo test timing flakiness
**Concern**: 5-second undo timeout may cause flaky tests if not properly awaited.

**Mitigation**:
- Use short timeout in tests (e.g., 100ms via prop)
- Use fake timers in Vitest (`vi.useFakeTimers()`)
- Clear timeouts in test cleanup

**Blocker**: No - standard testing patterns apply.

---

### Risk 6: Missing test patterns from existing implementations
**Concern**: DraggableWishlistGallery and DraggableInspirationGallery may have test patterns not yet discovered.

**Mitigation**:
- Review existing test files before writing SortableGallery tests
- Extract common test utilities (mock setup, assertion helpers)
- Reuse test data fixtures

**Blocker**: No - can reference existing tests during implementation.

---

## Summary

**Test coverage**: 80%+ target for core reordering, undo flow, keyboard navigation, and accessibility.

**Minimum E2E**: 1 happy-path test (drag, undo) per ADR-006.

**Deferred to UAT**: Multi-browser compatibility, touch device testing on real devices, large gallery performance tuning.

**Estimated test LOC**: ~400 LOC (unit + E2E) per seed analysis.

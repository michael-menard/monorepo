# Test Plan: WISH-2006 - Accessibility

## Scope Summary

**Endpoints touched:** None (frontend-only)

**UI touched:** Yes
- WishlistForm component
- WishlistCard component
- WishlistGallery grid
- All modals (Add, Edit, Delete, Got It)

**Data/storage touched:** No new data models (uses existing wishlist_items)

---

## Happy Path Tests

### Test 1: Keyboard Navigation - Arrow Keys in Gallery Grid

**Setup:**
- Load wishlist gallery with at least 9 items (3x3 grid)
- Focus on first item in gallery

**Action:**
- Press Arrow Down → should move focus to item directly below (row 2, col 1)
- Press Arrow Right → should move focus to next item in row (row 2, col 2)
- Press Arrow Up → should move focus to item directly above (row 1, col 2)
- Press Arrow Left → should move focus to previous item in row (row 1, col 1)

**Expected outcome:**
- Focus moves correctly in 2D grid
- Only one item has `tabindex="0"` at a time (roving tabindex pattern)
- Focused item has visible focus indicator (ring)
- Screen reader announces: "[Title], [price], [pieces] pieces, priority [n] of [total]"

**Evidence:**
- Playwright test captures focus state after each arrow key
- Screenshot showing focus ring on correct item
- Assertion: `await expect(page.locator('[data-testid="wishlist-card"]:nth-child(2)')).toBeFocused()`
- Test that only one card has `tabindex="0"` at any time

---

### Test 2: Keyboard Shortcuts - Add Item (A key)

**Setup:**
- Load wishlist gallery
- Focus anywhere in gallery

**Action:**
- Press 'A' key

**Expected outcome:**
- Add Item modal opens
- Focus moves to first input field (Title)
- Modal has focus trap (Tab cycles through modal elements only)
- Screen reader announces: "Add Item. Enter set details."

**Evidence:**
- Playwright test: `await page.keyboard.press('a')`
- Assertion: `await expect(page.locator('[data-testid="add-item-modal"]')).toBeVisible()`
- Assertion: `await expect(page.locator('input[name="title"]')).toBeFocused()`
- Test Tab key cycles within modal only

---

### Test 3: Keyboard Shortcuts - Got It (G key)

**Setup:**
- Load wishlist gallery with items
- Focus on a specific item using arrow keys

**Action:**
- Press 'G' key

**Expected outcome:**
- "Got It" modal opens for the focused item
- Modal shows correct item details
- Focus moves to first input in modal (purchase date)
- Screen reader announces: "Mark [Item Title] as purchased"

**Evidence:**
- Playwright test verifies correct item is referenced in modal
- Assertion: modal title contains focused item's title
- Focus trap test (Tab doesn't leave modal)

---

### Test 4: Keyboard Shortcuts - Delete (Delete key)

**Setup:**
- Focus on a specific wishlist item

**Action:**
- Press 'Delete' key

**Expected outcome:**
- Delete confirmation modal opens
- Modal shows: "Delete [Item Title]?"
- Focus on Cancel button (safe default)
- Screen reader announces: "Delete [Item Title]? This cannot be undone."

**Evidence:**
- Playwright test verifies modal opens with correct item
- Assertion: focus is on Cancel button
- Test that Escape key closes modal without deleting

---

### Test 5: Keyboard Shortcuts - Open Detail (Enter key)

**Setup:**
- Focus on a wishlist item

**Action:**
- Press 'Enter' key

**Expected outcome:**
- Item detail view/modal opens
- Shows full item details
- Focus moves into detail view
- Screen reader announces item title and details

**Evidence:**
- Playwright test: `await page.keyboard.press('Enter')`
- Assertion: detail view is visible with correct item data

---

### Test 6: Home/End Keys Jump to First/Last Item

**Setup:**
- Gallery with 10+ items
- Focus on middle item (e.g., item 5)

**Action:**
- Press 'Home' key → focus should jump to first item
- Press 'End' key → focus should jump to last item

**Expected outcome:**
- Home key: focus on first item in gallery
- End key: focus on last item in gallery
- Screen reader announces new focused item

**Evidence:**
- Playwright assertions on focused element
- Test `tabindex="0"` moves to correct item

---

### Test 7: Modal Focus Trap and Return

**Setup:**
- Open any modal (Add Item)

**Action:**
- Press Tab repeatedly to cycle through focusable elements
- Press Shift+Tab to reverse cycle
- Press Escape to close modal

**Expected outcome:**
- Tab cycles through modal elements only (doesn't escape to page)
- Shift+Tab reverse cycles
- Escape closes modal and returns focus to trigger element (e.g., the item or button that opened it)
- Screen reader announces modal close

**Evidence:**
- Playwright test tracking `document.activeElement` during Tab
- Assertion: after Escape, focus returns to original trigger
- Test with multiple modals (Add, Edit, Delete, Got It)

---

### Test 8: Screen Reader Announcements - Priority Change

**Setup:**
- User drags an item to change priority (or uses API to change)

**Action:**
- Priority changes from 3 to 1

**Expected outcome:**
- Live region announces: "Priority updated. [Item] is now priority 1 of [total]"

**Evidence:**
- Test `aria-live` region content updates
- Playwright can check `textContent` of live region element

---

### Test 9: WCAG AA Color Contrast

**Setup:**
- Load wishlist gallery

**Action:**
- Run axe accessibility scan

**Expected outcome:**
- No color contrast violations (WCAG AA: 4.5:1 for normal text, 3:1 for large text)
- All text elements meet contrast requirements

**Evidence:**
- axe-core integration in Playwright: `await new AxeBuilder({ page }).analyze()`
- Assertion: violations.length === 0 for contrast rules
- Manual verification of key UI elements (buttons, text, links)

---

## Error Cases

### Error 1: Keyboard Navigation with Empty Gallery

**Setup:**
- Empty wishlist (no items)

**Action:**
- Press arrow keys

**Expected outcome:**
- No JavaScript errors
- Screen reader announces: "Wishlist is empty. Press A to add an item."
- Arrow keys do nothing gracefully

**Evidence:**
- Console error check in Playwright
- Assertion on aria-live announcement

---

### Error 2: Keyboard Shortcut While Modal Open

**Setup:**
- Add Item modal is open

**Action:**
- Press 'G' key (Got It shortcut)

**Expected outcome:**
- Shortcut is ignored (modal has focus trap)
- No second modal opens
- Focus stays in Add Item modal

**Evidence:**
- Playwright test: verify only one modal visible
- No errors in console

---

### Error 3: Focus Lost After Item Deletion

**Setup:**
- Focus on item 5 of 10
- Delete that item

**Action:**
- Confirm deletion

**Expected outcome:**
- Item is removed
- Focus moves to next item (previously item 6, now item 5)
- If last item deleted, focus moves to new last item
- Screen reader announces: "Item deleted. [Next Item Title] selected."

**Evidence:**
- Playwright checks `document.activeElement` after deletion
- Assertion: focus is on a valid item, not lost to body

---

## Edge Cases (Reasonable)

### Edge 1: Roving Tabindex with Single Item

**Setup:**
- Gallery with exactly 1 item

**Action:**
- Press all arrow keys (Up, Down, Left, Right)

**Expected outcome:**
- Focus stays on the single item (no crashes)
- No console errors

**Evidence:**
- Playwright test with 1-item gallery
- Console error check

---

### Edge 2: Keyboard Navigation During Loading

**Setup:**
- Gallery is loading (showing skeleton)

**Action:**
- Press arrow keys or shortcuts

**Expected outcome:**
- Shortcuts gracefully ignored or queued until load complete
- No errors
- Screen reader may announce "Loading wishlist"

**Evidence:**
- Test with simulated slow API response
- Verify no crashes

---

### Edge 3: Tab Key into Gallery (Initial Focus)

**Setup:**
- User tabs from page header into gallery

**Action:**
- Press Tab until gallery receives focus

**Expected outcome:**
- First item (or last focused item) receives focus with `tabindex="0"`
- Visual focus indicator appears
- Screen reader announces first/last-focused item

**Evidence:**
- Playwright test simulating tab navigation from top of page
- Assertion on first item focus

---

### Edge 4: Multiple Rapid Keypress (Debouncing)

**Setup:**
- Gallery is focused

**Action:**
- Rapidly press Arrow Down 10 times

**Expected outcome:**
- Focus moves correctly through items
- No skipped items or race conditions
- Focus settles on correct item (10 items down, or last item if fewer)

**Evidence:**
- Playwright test with rapid keypresses
- Verify final focused item matches expected position

---

### Edge 5: Screen Reader with Filtered Gallery

**Setup:**
- Apply filter (e.g., "show only high priority")
- 3 items visible (filtered from 10 total)

**Action:**
- Navigate with arrow keys
- Screen reader announces each item

**Expected outcome:**
- Announcements reflect filtered list: "Item 1 of 3" (not "of 10")
- Navigation only includes visible items

**Evidence:**
- Test aria-live announcements contain "of 3"
- Arrow keys only navigate filtered items

---

## Required Tooling Evidence

### Frontend (React - Playwright Required)

**Playwright Runs:**
- `apps/web/app-wishlist-gallery/e2e/accessibility.spec.ts`

**Assertions:**
- Arrow key navigation moves focus correctly (2D grid)
- Home/End keys work
- Shortcuts (A, G, Delete, Enter, Escape) trigger correct actions
- Modal focus trap: Tab doesn't escape modal
- Focus return: Escape returns focus to trigger element
- axe-core scan passes (no violations)
- aria-live regions announce state changes
- All interactive elements have accessible labels

**Artifacts:**
- Screenshots of focus states (visual regression)
- Accessibility tree snapshots (Playwright)
- axe report (JSON)
- Video recording of keyboard navigation flow

**Manual Testing (Optional but Recommended):**
- VoiceOver on macOS: Full navigation flow
- NVDA on Windows: Full navigation flow

---

## Risks to Call Out

### Risk 1: Roving Tabindex Grid Complexity

**Concern:** Calculating grid positions (row/column) for 2D arrow navigation is error-prone, especially with responsive layouts (3 columns on desktop, 2 on tablet, 1 on mobile).

**Mitigation:**
- Use ResizeObserver to detect column count changes
- Comprehensive unit tests for grid calculation logic
- Consider using established library (e.g., `react-aria` GridCollection)

---

### Risk 2: Screen Reader Testing Fragility

**Concern:** Manual VoiceOver/NVDA testing requires specific hardware/software and is hard to automate. Results may vary by screen reader version.

**Mitigation:**
- Document which screen reader versions were tested
- Use axe-core for automated checks
- Test aria-live regions programmatically (check textContent of live region)
- Consider cloud-based screen reader testing (e.g., Assistiv Labs)

---

### Risk 3: Focus Return After Modal Close

**Concern:** Returning focus to the correct trigger element after modal close is complex with dynamic lists (item may have moved or been deleted).

**Mitigation:**
- Store reference to trigger element on modal open
- Check if element still exists before returning focus
- Fallback to first/last item if trigger is gone

---

### Risk 4: Keyboard Shortcut Conflicts

**Concern:** Global shortcuts (A, G, Delete) may conflict with browser shortcuts or form inputs.

**Mitigation:**
- Only activate shortcuts when gallery container has focus (not in input fields)
- Use event.target checks to prevent shortcuts in forms
- Document known conflicts
- Consider Ctrl+K command palette as alternative

---

### Risk 5: WCAG Contrast in Dynamic Themes

**Concern:** If theme or color scheme changes, contrast ratios may break.

**Mitigation:**
- Run axe checks in CI for each theme variant
- Use design tokens that guarantee WCAG AA compliance
- Document contrast ratios in Storybook

---

### Risk 6: No Blocking Prerequisites

All dependencies (WISH-2005) provide the gallery UI this story enhances. No external blockers identified.

---

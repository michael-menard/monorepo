# UI/UX Notes: WISH-2006 - Accessibility (MVP-Critical)

## Verdict

**PASS-WITH-NOTES**

This story enhances existing UI with accessibility features. All components already exist (from WISH-2005), so this story adds keyboard navigation, screen reader support, and WCAG compliance as enhancements.

**Notes:**
- UI components already built (WishlistGallery, WishlistCard, modals)
- This story is purely additive (accessibility layer on top)
- No new visual components needed
- Focus on behavioral requirements and ARIA implementation

---

## MVP Component Architecture

### Components Required for Core Journey

**Existing Components (to enhance):**
- `WishlistGallery` - Add roving tabindex and keyboard event handlers
- `WishlistCard` - Add ARIA labels and focus styles
- `AddItemModal` - Add focus trap and ARIA announcements
- `EditItemModal` - Add focus trap and ARIA announcements
- `DeleteConfirmModal` - Add focus trap and ARIA announcements
- `GotItModal` - Add focus trap and ARIA announcements

**New Utilities (to create):**
- `useRovingTabIndex` hook - Manages 2D grid navigation with arrow keys
- `useKeyboardShortcuts` hook - Global keyboard shortcut manager
- `useModalFocusTrap` hook - Focus trap and return for modals
- `useAnnouncer` hook - Screen reader live region manager
- `a11y.ts` utility - ARIA label generators and accessibility helpers

### Reuse Targets in packages/

**From `@repo/accessibility` (if it exists):**
- Focus management utilities
- ARIA helper functions
- WCAG contrast validation utilities

**From `@repo/ui/_primitives`:**
- Already uses shadcn Dialog primitive (has built-in focus trap via Radix)
- Use Radix's `VisuallyHidden` for sr-only content
- Consider Radix's `roving-focus` utilities if available

**Note:** If `@repo/accessibility` doesn't exist, create utilities in app-local `utils/a11y/` and migrate to shared package in future story.

### shadcn Primitives for Core UI

**Primitives already in use:**
- `Dialog` (from shadcn/Radix) - has built-in focus trap and Escape key handling
- `Button` - already has focus styles
- `Card` - used for WishlistCard, needs `tabindex` and focus styles added

**New/Enhanced Usage:**
- Use Radix Dialog's `onOpenAutoFocus` and `onCloseAutoFocus` props for focus management
- Use `VisuallyHidden` component for sr-only announcements
- Ensure all interactive elements use proper ARIA roles

---

## MVP Accessibility (Blocking Only)

### Requirements That Prevent Core Journey Usage

#### 1. Keyboard Navigation for Gallery Browsing (BLOCKING)

**Why it's blocking:** Users who cannot use a mouse cannot browse the wishlist at all.

**Requirements:**
- Arrow keys must navigate gallery grid (Up, Down, Left, Right)
- Tab key must enter gallery and focus first/last-focused item
- Home/End keys must jump to first/last item
- Roving tabindex pattern ensures only one item in tab order

**Implementation Notes:**
- Must work with responsive grid (3 cols → 2 cols → 1 col)
- Use ResizeObserver to detect column count changes
- Store active index in state, update on keydown

#### 2. Keyboard Shortcuts for Core Actions (BLOCKING)

**Why it's blocking:** Users cannot add, edit, or delete items without mouse.

**Requirements:**
- `A` key: Open Add Item modal
- `Enter` key: Open detail view for focused item
- `G` key: Open Got It modal for focused item
- `Delete` key: Open delete confirmation for focused item
- `Escape` key: Close any open modal

**Implementation Notes:**
- Only activate when gallery container has focus (not in input fields)
- Check `event.target` to prevent shortcuts firing in form inputs
- Shortcuts must be documented in UI (tooltips or help text)

#### 3. Modal Focus Trap (BLOCKING)

**Why it's blocking:** Users can tab out of modals, breaking keyboard-only navigation flow.

**Requirements:**
- Tab cycles through modal elements only (doesn't escape to page)
- Shift+Tab reverse cycles through modal elements
- First focusable element receives focus on modal open
- Focus returns to trigger element on modal close (Escape or button click)

**Implementation Notes:**
- Radix Dialog provides this by default via `@radix-ui/react-dialog`
- Test that it works correctly with our shadcn Dialog wrapper
- Verify focus return works when trigger element is deleted (fallback needed)

#### 4. Screen Reader Announcements for State Changes (BLOCKING)

**Why it's blocking:** Screen reader users have no feedback on actions (add, delete, priority change).

**Requirements:**
- Item focus: "[Title], [price], [pieces] pieces, priority [n] of [total]"
- Priority change: "Priority updated. [Item] is now priority 1 of [total]"
- Item deleted: "Item deleted. [Next Item] selected."
- Item added: "Item added to wishlist."
- Filter/sort change: "Showing [count] items sorted by [method]"

**Implementation Notes:**
- Use `aria-live="polite"` region with `role="status"`
- Use `aria-atomic="true"` for full announcement replacement
- Place live region in component root (visually hidden with `sr-only` class)
- Update live region text on state changes (debounce rapid changes)

#### 5. ARIA Labels on Interactive Elements (BLOCKING)

**Why it's blocking:** Screen readers cannot identify controls or their purpose.

**Requirements:**
- All buttons have `aria-label` or visible text
- Gallery grid has `role="grid"` or `role="list"` with `aria-label="Wishlist items"`
- Each card has accessible name (via `aria-label` or `aria-labelledby`)
- Form inputs have associated labels (`<label>` or `aria-label`)
- Modal dialogs have `aria-labelledby` pointing to title

**Implementation Notes:**
- Use semantic HTML first (button, label, etc.)
- Add ARIA only where semantic HTML is insufficient
- Test with screen reader to verify labels make sense

---

## MVP Design System Rules

### Token-Only Colors (Hard Gate)

**Requirement:** All colors must use Tailwind design tokens from theme config.

**Enforcement:**
- Focus ring: `ring-sky-500` (from design system palette)
- Contrast: All text/bg combinations must meet WCAG AA (4.5:1 for normal text, 3:1 for large)
- No hardcoded hex colors

**Accessibility-Specific Tokens:**
- Focus indicator: `ring-2 ring-sky-500 ring-offset-2`
- Skip link: `bg-sky-600 text-white` (for future skip navigation)
- High contrast mode: Consider `forced-colors: active` media query support

### _primitives Import Requirement

**Requirement:** All shadcn components must be imported from `@repo/ui/_primitives`.

**For this story:**
- `Dialog` from `@repo/ui/_primitives/dialog`
- `Button` from `@repo/ui/_primitives/button`
- `VisuallyHidden` from `@repo/ui/_primitives/visually-hidden` (if available)

**Custom wrapper pattern:**
```typescript
// Good - uses primitive
import { Dialog } from '@repo/ui/_primitives/dialog'

// Wrap with accessibility enhancements
export function AccessibleDialog({ children, ...props }) {
  return (
    <Dialog
      onOpenAutoFocus={handleOpenFocus}
      onCloseAutoFocus={handleCloseFocus}
      {...props}
    >
      {children}
    </Dialog>
  )
}
```

---

## MVP Playwright Evidence

### Core Journey Demonstration Steps

**Test: Keyboard-Only Wishlist Management**

1. **Navigate to wishlist**
   - Load `/wishlist`
   - Verify gallery renders with items

2. **Browse with keyboard**
   - Press Tab until gallery receives focus
   - Press Arrow Down 3 times
   - Assert: focus moves to 4th item (visible focus ring)
   - Press Arrow Right
   - Assert: focus moves to next item in row

3. **Add item with keyboard**
   - Press `A` key
   - Assert: Add Item modal opens
   - Assert: Title input is focused
   - Fill form using Tab and typing
   - Press Enter to submit
   - Assert: Modal closes, new item appears
   - Assert: Screen reader announcement: "Item added to wishlist"

4. **Mark item as Got It with keyboard**
   - Navigate to an item with arrow keys
   - Press `G` key
   - Assert: Got It modal opens for correct item
   - Tab to purchase date field, enter date
   - Tab to Confirm button, press Enter
   - Assert: Item moves to Sets collection
   - Assert: Screen reader announcement: "[Item] marked as purchased"

5. **Delete item with keyboard**
   - Navigate to an item with arrow keys
   - Press `Delete` key
   - Assert: Delete confirmation modal opens
   - Assert: Focus is on Cancel button (safe default)
   - Tab to Delete button, press Enter
   - Assert: Item is removed from gallery
   - Assert: Focus moves to next item
   - Assert: Screen reader announcement: "Item deleted"

6. **Close modal with Escape**
   - Press `A` to open Add Item modal
   - Press `Escape`
   - Assert: Modal closes
   - Assert: Focus returns to gallery

7. **WCAG AA compliance**
   - Run axe accessibility scan
   - Assert: No violations
   - Verify contrast ratios meet AA (4.5:1 for normal text)

**Artifacts to capture:**
- Video recording of full keyboard flow (screencast)
- Screenshots of each focus state
- axe-core report (JSON)
- Accessibility tree snapshot (Chrome DevTools)

---

## Notes on Future UX Polish

**Out of scope for MVP (see FUTURE-UIUX.md):**
- Custom focus styles with animations (pulse, glow)
- Keyboard shortcut customization
- Voice control support
- Reduced motion preferences
- High contrast mode enhancements
- WCAG AAA compliance (stricter than AA)
- Advanced screen reader features (landmarks, regions, headings hierarchy)

---

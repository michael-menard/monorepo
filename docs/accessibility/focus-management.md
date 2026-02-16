# Focus Management

Comprehensive guide to keyboard focus management patterns and WCAG 2.4.7 compliance in the LEGO Instructions monorepo.

## WCAG 2.4.7 Focus Visible

**Requirement:** Any keyboard operable user interface has a mode of operation where the keyboard focus indicator is visible.

**Level:** AA

**Criteria:** All interactive elements must have a visible focus indicator that meets:
- Minimum 2px outline thickness
- 3:1 contrast ratio against background
- Visible on all interactive elements when focused via keyboard

## Focus Ring Utility

### Using `focusRingClasses` from @repo/accessibility

The `focusRingClasses` utility provides consistent, WCAG-compliant focus indicators across all apps.

```tsx
import { focusRingClasses } from '@repo/accessibility'
import { cn } from '@repo/app-component-library'

// Apply to buttons
<button className={cn('px-4 py-2', focusRingClasses)}>
  Click me
</button>

// Apply to custom interactive elements
<div
  role="button"
  tabIndex={0}
  className={cn('cursor-pointer', focusRingClasses)}
>
  Custom button
</div>
```

### Default Focus Ring Styles

```css
/* Default focus ring from @repo/accessibility */
focus:outline-none
focus-visible:ring-2
focus-visible:ring-primary
focus-visible:ring-offset-2
```

This provides:
- 2px ring (meets minimum thickness)
- Primary color (meets 3:1 contrast in theme)
- 2px offset (separation from element)
- Only visible on keyboard focus (`:focus-visible`)

## Focus Management Patterns

### 1. Modal Focus Trap

When a modal opens, focus must:
1. **Move to modal** - First focusable element or heading
2. **Stay trapped** - Tab/Shift+Tab cycle within modal
3. **Restore on close** - Return to trigger element

```tsx
import { Dialog, DialogContent } from '@repo/app-component-library'

// shadcn Dialog handles focus trap automatically
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <h2>Modal Title</h2>
    {/* Focus will be trapped here */}
    <button onClick={() => setIsOpen(false)}>Close</button>
  </DialogContent>
</Dialog>
```

**Testing:**
- Tab through modal - focus should wrap
- Close modal - focus returns to trigger
- Use `testModalFocus` from `@repo/accessibility-testing`

### 2. Focus Restoration After Delete

When an item is deleted, focus must move to a logical element:

```tsx
const handleDelete = async (itemId: string) => {
  const index = items.findIndex(item => item.id === itemId)
  
  await deleteItem(itemId)
  
  // Focus next item, or previous if last
  const nextIndex = index < items.length - 1 ? index : index - 1
  if (nextIndex >= 0) {
    const nextItem = document.querySelector(`[data-item-id="${items[nextIndex].id}"]`)
    ;(nextItem as HTMLElement)?.focus()
  } else {
    // If no items left, focus add button
    document.getElementById('add-item-button')?.focus()
  }
}
```

### 3. Roving Tabindex Pattern

For grid/list navigation with arrow keys:

```tsx
import { useRovingTabIndex } from '@repo/gallery'

function MyGallery({ items }: { items: Item[] }) {
  const { getTabIndex, handleKeyDown } = useRovingTabIndex({
    itemCount: items.length,
    columns: 4,
    onSelect: handleSelect,
  })

  return (
    <div role="grid">
      {items.map((item, index) => (
        <div
          key={item.id}
          role="gridcell"
          tabIndex={getTabIndex(index)} // Only one has tabIndex={0}
          onKeyDown={e => handleKeyDown(e, index)}
        >
          {item.content}
        </div>
      ))}
    </div>
  )
}
```

**Benefits:**
- Single tab stop for entire grid
- Arrow keys navigate between cells
- Home/End jump to start/end
- WCAG 2.4.3 compliant focus order

### 4. Focus on First Input

When opening a form, focus the first input:

```tsx
import { useEffect, useRef } from 'react'

function MyForm() {
  const firstInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Focus first input when form mounts
    firstInputRef.current?.focus()
  }, [])

  return (
    <form>
      <input ref={firstInputRef} type="text" name="title" />
      <input type="text" name="description" />
      <button type="submit">Save</button>
    </form>
  )
}
```

## Interactive Element Checklist

All interactive elements must have visible focus indicators:

- [ ] **Buttons** - Primary, secondary, ghost, icon buttons
- [ ] **Links** - Text links, card links, navigation links
- [ ] **Form inputs** - Text, select, checkbox, radio, textarea
- [ ] **Drag handles** - GripVertical icons on sortable items
- [ ] **Cards** - Clickable cards with `role="button"`
- [ ] **Menu items** - Dropdown menu options
- [ ] **Tabs** - Tab navigation elements
- [ ] **Custom controls** - Any element with `role="button"`, `tabIndex`, or click handlers

## Custom Focus Styles

If you need custom focus styles (avoid unless necessary):

```tsx
// Use CSS custom properties for theming
<button
  className={cn(
    'px-4 py-2',
    'focus-visible:outline-none',
    'focus-visible:ring-2',
    'focus-visible:ring-destructive', // Different color
    'focus-visible:ring-offset-2'
  )}
>
  Delete
</button>
```

**Always verify:**
1. 2px minimum outline/ring
2. 3:1 contrast ratio with background
3. Visible in all themes (light/dark)
4. Only shows on keyboard focus (`:focus-visible`)

## Testing Focus Management

### Manual Testing

1. **Tab through entire page**
   - Verify all interactive elements are reachable
   - Verify focus order is logical (top-to-bottom, left-to-right)
   - Verify focus indicators are visible on all elements

2. **Test modals**
   - Open modal via keyboard (Enter/Space on trigger)
   - Verify focus moves to modal
   - Tab through modal - verify focus stays trapped
   - Close modal - verify focus returns to trigger

3. **Test delete operations**
   - Delete item via keyboard
   - Verify focus moves to logical next element

4. **Test custom interactions**
   - Drag handles - verify focus but note drag is pointer-only
   - Arrow key navigation - verify in grids/lists

### Automated Testing

```tsx
import { testKeyboardAccessibility, testModalFocus } from '@repo/accessibility-testing'
import { render } from '@testing-library/react'

it('should have visible focus indicators', async () => {
  const { container } = render(<MyComponent />)
  
  const result = await testKeyboardAccessibility(container)
  
  expect(result.allAccessible).toBe(true)
  expect(result.inaccessibleElements).toHaveLength(0)
})

it('should manage modal focus correctly', async () => {
  const user = createKeyboardUser()
  const { container } = render(<MyModal />)
  
  const modal = container.querySelector('[role="dialog"]')
  const trigger = screen.getByRole('button', { name: 'Open' })
  
  const result = await testModalFocus(
    user,
    modal,
    trigger,
    () => fireEvent.click(screen.getByRole('button', { name: 'Close' }))
  )
  
  expect(result.initialFocus).toBe(true)
  expect(result.focusTrap).toBe(true)
  expect(result.focusRestoration).toBe(true)
})
```

## Common Issues

### Issue: Focus outline not visible on custom elements

**Solution:** Add `tabIndex={0}` and `focusRingClasses`

```tsx
// Before (not keyboard accessible)
<div onClick={handleClick}>Click me</div>

// After (keyboard accessible)
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={e => e.key === 'Enter' && handleClick()}
  className={focusRingClasses}
>
  Click me
</div>
```

### Issue: Focus lost after delete

**Solution:** Implement focus restoration

```tsx
const handleDelete = async (id: string) => {
  const nextFocusElement = document.querySelector('[data-next-focus]')
  await deleteItem(id)
  ;(nextFocusElement as HTMLElement)?.focus()
}
```

### Issue: Tab order is illogical

**Solution:** Restructure DOM or use `tabIndex` carefully

```tsx
// Avoid positive tabIndex values - use DOM order
// If absolutely necessary:
<input tabIndex={1} /> // First
<input tabIndex={2} /> // Second
<input tabIndex={0} /> // Natural order (last)
```

## Resources

- [WCAG 2.4.7 Focus Visible](https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [@repo/accessibility](../../packages/core/accessibility/) - Focus utilities
- [@repo/accessibility-testing](../../packages/core/accessibility-testing/) - Testing utilities

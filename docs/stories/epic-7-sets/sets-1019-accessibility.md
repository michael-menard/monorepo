# Story sets-1019: Keyboard Navigation & Accessibility

## Status

Draft

## Story

**As a** user with accessibility needs,
**I want** full keyboard navigation and screen reader support,
**So that** I can use the Sets Gallery without a mouse.

## Acceptance Criteria

1. [ ] Arrow keys navigate gallery grid
2. [ ] Enter opens selected item detail
3. [ ] Escape closes modals/dialogs
4. [ ] B toggles build status (when item selected)
5. [ ] +/- adjust quantity (in detail view)
6. [ ] M opens MOC link dialog (in detail view)
7. [ ] A opens Add Set form (in gallery)
8. [ ] Delete/Backspace triggers delete confirmation
9. [ ] Screen reader announces state changes
10. [ ] Focus management for modals
11. [ ] WCAG AA contrast compliance

## Tasks

- [ ] **Task 1: Gallery keyboard navigation**
  - [ ] Arrow key grid navigation
  - [ ] Focus ring on selected card
  - [ ] Enter to open detail
  - [ ] A to add new set

- [ ] **Task 2: Detail page keyboard shortcuts**
  - [ ] B to toggle build status
  - [ ] +/- or =/- for quantity
  - [ ] M to open MOC link dialog
  - [ ] Delete for delete confirmation

- [ ] **Task 3: Screen reader announcements**
  - [ ] Live region for state changes
  - [ ] Announce build status toggle
  - [ ] Announce quantity change
  - [ ] Proper labels for all interactive elements

- [ ] **Task 4: Focus management**
  - [ ] Modal opens: focus first interactive element
  - [ ] Modal closes: focus returns to trigger
  - [ ] New item: focus on new item in gallery

- [ ] **Task 5: Color and contrast**
  - [ ] Verify WCAG AA compliance
  - [ ] Build status uses color AND icon
  - [ ] Quantity stepper has visible borders

## Dev Notes

### Keyboard Navigation Hook

```typescript
// hooks/useGalleryKeyboardNav.ts
export function useGalleryKeyboardNav({
  items,
  columns = 4,
  onSelect,
  onOpen,
  onAdd,
}: {
  items: Array<{ id: string }>
  columns: number
  onSelect: (id: string) => void
  onOpen: (id: string) => void
  onAdd: () => void
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault()
          setSelectedIndex(prev =>
            prev === null ? 0 : Math.min(prev + 1, items.length - 1)
          )
          break
        case 'ArrowLeft':
          e.preventDefault()
          setSelectedIndex(prev =>
            prev === null ? 0 : Math.max(prev - 1, 0)
          )
          break
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev =>
            prev === null ? 0 : Math.min(prev + columns, items.length - 1)
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev =>
            prev === null ? 0 : Math.max(prev - columns, 0)
          )
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (selectedIndex !== null && items[selectedIndex]) {
            onOpen(items[selectedIndex].id)
          }
          break
        case 'a':
        case 'A':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault()
            onAdd()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [items, columns, selectedIndex, onOpen, onAdd])

  // Focus selected item
  useEffect(() => {
    if (selectedIndex !== null && items[selectedIndex]) {
      const element = document.getElementById(`set-${items[selectedIndex].id}`)
      element?.focus()
    }
  }, [selectedIndex, items])

  return { selectedIndex, setSelectedIndex }
}
```

### Detail Page Shortcuts

```typescript
// In SetDetailPage
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return
    }

    switch (e.key) {
      case 'b':
      case 'B':
        e.preventDefault()
        toggleBuildStatus()
        break
      case '+':
      case '=':
        e.preventDefault()
        incrementQuantity()
        break
      case '-':
        e.preventDefault()
        decrementQuantity()
        break
      case 'm':
      case 'M':
        e.preventDefault()
        setLinkMocDialogOpen(true)
        break
      case 'Delete':
      case 'Backspace':
        e.preventDefault()
        setDeleteDialogOpen(true)
        break
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [])
```

### Screen Reader Announcements

```typescript
// components/Announcer.tsx
const announcements = useRef<HTMLDivElement>(null)

function announce(message: string) {
  if (announcements.current) {
    announcements.current.textContent = message
    // Clear after announcement
    setTimeout(() => {
      if (announcements.current) {
        announcements.current.textContent = ''
      }
    }, 1000)
  }
}

// In render
<div
  ref={announcements}
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
/>

// Usage
announce('Set marked as built')
announce('Quantity changed to 3')
```

### Focus Management for Modals

```typescript
// Using Radix UI primitives (which handle this automatically)
// But if custom:
function useModalFocus(isOpen: boolean, triggerRef: RefObject<HTMLElement>) {
  const firstFocusableRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (isOpen) {
      // Focus first focusable element
      firstFocusableRef.current?.focus()
    } else {
      // Return focus to trigger
      triggerRef.current?.focus()
    }
  }, [isOpen])

  return firstFocusableRef
}
```

### ARIA Labels

```typescript
// SetCard
<div
  id={`set-${set.id}`}
  role="button"
  tabIndex={0}
  aria-label={`${set.title}, set ${set.setNumber}, ${set.pieceCount} pieces, ${set.isBuilt ? 'built' : 'in pieces'}, quantity ${set.quantity}`}
  onClick={onClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick()
    }
  }}
>

// Build Status Toggle
<button
  aria-label={`Build status: ${isBuilt ? 'Built' : 'In Pieces'}. Press to change to ${isBuilt ? 'In Pieces' : 'Built'}.`}
  aria-pressed={isBuilt}
>

// Quantity Stepper
<button aria-label="Decrease quantity" disabled={quantity <= 1}>
<span aria-live="polite" aria-atomic="true">{quantity}</span>
<button aria-label="Increase quantity">
```

### Keyboard Shortcuts Reference

| Context | Key | Action |
|---------|-----|--------|
| Gallery | Arrow keys | Navigate grid |
| Gallery | Space/Enter | Open detail |
| Gallery | A | Add new set |
| Detail | B | Toggle build status |
| Detail | +/= | Increase quantity |
| Detail | - | Decrease quantity |
| Detail | M | Open MOC link dialog |
| Detail | Delete/Backspace | Delete confirmation |
| Any | Escape | Close modal/dialog |

## Testing

- [ ] Arrow keys navigate gallery
- [ ] Focus ring visible on selected card
- [ ] Enter opens detail page
- [ ] A opens add form
- [ ] B toggles build status
- [ ] +/- adjust quantity
- [ ] M opens MOC dialog
- [ ] Delete opens confirmation
- [ ] Escape closes modals
- [ ] Screen reader announces build status change
- [ ] Screen reader announces quantity change
- [ ] Focus moves to modal on open
- [ ] Focus returns to trigger on modal close
- [ ] All interactive elements have labels
- [ ] Color contrast meets WCAG AA

## Dependencies

- sets-1007: Gallery Page
- sets-1008: Set Card
- sets-1009: Detail Page
- sets-1013: Build Status Toggle
- sets-1014: Quantity Stepper

## References

- PRD: docs/prd/epic-7-sets-gallery.md (Accessibility Requirements)
- PRD: Keyboard Navigation table
- PRD: Screen Reader Support table

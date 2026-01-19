# Story sets-2009: Keyboard Navigation & Accessibility

## Status

Draft

## Consolidates

- sets-1019: Keyboard Navigation & Accessibility

## Story

**As a** user with accessibility needs,
**I want** full keyboard navigation and screen reader support,
**So that** I can use the Sets Gallery without a mouse.

## PRD Reference

See [Epic 7: Sets Gallery PRD](/docs/prd/epic-7-sets-gallery.md) - Accessibility Requirements

## Dependencies

- **sets-2001**: Sets Gallery MVP
- **sets-2005**: Build Status & Quantity Controls

## Acceptance Criteria

### Keyboard Navigation

1. [ ] Arrow keys navigate gallery grid
2. [ ] Enter opens selected item detail
3. [ ] Escape closes modals/dialogs
4. [ ] B toggles build status (when in detail view)
5. [ ] +/- adjust quantity (in detail view)
6. [ ] M opens MOC link dialog (in detail view)
7. [ ] A opens Add Set form (in gallery)
8. [ ] Delete/Backspace triggers delete confirmation
9. [ ] Focus ring visible on all interactive elements

### Screen Reader Support

10. [ ] Screen reader announces state changes
11. [ ] All interactive elements have proper labels
12. [ ] ARIA live regions for dynamic updates
13. [ ] Role attributes on custom components

### Focus Management

14. [ ] Modal opens: focus first interactive element
15. [ ] Modal closes: focus returns to trigger
16. [ ] New item: focus on new item in gallery

### Visual Accessibility

17. [ ] WCAG AA contrast compliance
18. [ ] Build status uses both color AND icon
19. [ ] Touch targets minimum 44px

## Tasks / Subtasks

### Task 1: Gallery Keyboard Navigation (AC: 1, 2, 7, 9)

- [ ] Create useGalleryKeyboardNav hook
- [ ] Arrow key grid navigation
- [ ] Focus ring on selected card
- [ ] Enter to open detail
- [ ] A to add new set

### Task 2: Detail Page Keyboard Shortcuts (AC: 4-6, 8)

- [ ] B to toggle build status
- [ ] +/- for quantity
- [ ] M to open MOC link dialog
- [ ] Delete for delete confirmation

### Task 3: Screen Reader Announcements (AC: 10-13)

- [ ] Create Announcer component with live region
- [ ] Announce build status toggle
- [ ] Announce quantity change
- [ ] Proper labels for all interactive elements
- [ ] ARIA roles on custom components

### Task 4: Focus Management (AC: 3, 14-16)

- [ ] Create useFocusManagement hook
- [ ] Modal focus trap and restore
- [ ] New item focus in gallery

### Task 5: Visual Accessibility Audit (AC: 17-19)

- [ ] Verify WCAG AA compliance
- [ ] Verify color + icon on build status
- [ ] Verify touch target sizes

## Dev Notes

### Keyboard Navigation Hook

```typescript
// hooks/useGalleryKeyboardNav.ts
interface UseGalleryKeyboardNavOptions {
  items: Array<{ id: string }>
  columns?: number
  onSelect?: (id: string) => void
  onOpen: (id: string) => void
  onAdd: () => void
  enabled?: boolean
}

export function useGalleryKeyboardNav({
  items,
  columns = 4,
  onSelect,
  onOpen,
  onAdd,
  enabled = true,
}: UseGalleryKeyboardNavOptions) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if in input/textarea
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
  }, [items, columns, selectedIndex, onOpen, onAdd, enabled])

  // Focus selected item
  useEffect(() => {
    if (selectedIndex !== null && items[selectedIndex]) {
      const element = document.getElementById(`set-${items[selectedIndex].id}`)
      element?.focus()
      onSelect?.(items[selectedIndex].id)
    }
  }, [selectedIndex, items, onSelect])

  return {
    selectedIndex,
    setSelectedIndex,
    selectedId: selectedIndex !== null ? items[selectedIndex]?.id : null,
  }
}
```

### Detail Page Shortcuts

```typescript
// hooks/useDetailPageShortcuts.ts
interface UseDetailPageShortcutsOptions {
  onToggleBuildStatus: () => void
  onIncrementQuantity: () => void
  onDecrementQuantity: () => void
  onOpenMocDialog: () => void
  onDelete: () => void
  enabled?: boolean
}

export function useDetailPageShortcuts({
  onToggleBuildStatus,
  onIncrementQuantity,
  onDecrementQuantity,
  onOpenMocDialog,
  onDelete,
  enabled = true,
}: UseDetailPageShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key) {
        case 'b':
        case 'B':
          e.preventDefault()
          onToggleBuildStatus()
          break
        case '+':
        case '=':
          e.preventDefault()
          onIncrementQuantity()
          break
        case '-':
          e.preventDefault()
          onDecrementQuantity()
          break
        case 'm':
        case 'M':
          e.preventDefault()
          onOpenMocDialog()
          break
        case 'Delete':
        case 'Backspace':
          e.preventDefault()
          onDelete()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onToggleBuildStatus, onIncrementQuantity, onDecrementQuantity, onOpenMocDialog, onDelete, enabled])
}
```

### Screen Reader Announcements

```typescript
// components/Announcer/index.tsx
import { createContext, useContext, useRef, useCallback, ReactNode } from 'react'

const AnnouncerContext = createContext<(message: string) => void>(() => {})

export function useAnnounce() {
  return useContext(AnnouncerContext)
}

export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const announcements = useRef<HTMLDivElement>(null)

  const announce = useCallback((message: string) => {
    if (announcements.current) {
      announcements.current.textContent = message
      // Clear after announcement
      setTimeout(() => {
        if (announcements.current) {
          announcements.current.textContent = ''
        }
      }, 1000)
    }
  }, [])

  return (
    <AnnouncerContext.Provider value={announce}>
      {children}
      <div
        ref={announcements}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
    </AnnouncerContext.Provider>
  )
}

// Usage
function BuildStatusToggle({ setId, isBuilt }: Props) {
  const announce = useAnnounce()

  const handleToggle = async () => {
    const newValue = !isBuilt
    // ... optimistic update
    announce(newValue ? 'Set marked as built' : 'Set marked as in pieces')
    // ... API call
  }
}
```

### ARIA Labels on SetCard

```typescript
<div
  id={`set-${set.id}`}
  role="button"
  tabIndex={0}
  aria-label={`${set.title}, set ${set.setNumber || 'no number'}, ${set.pieceCount || 'unknown'} pieces, ${set.isBuilt ? 'built' : 'in pieces'}${set.quantity > 1 ? `, quantity ${set.quantity}` : ''}`}
  onClick={onClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick()
    }
  }}
  className={cn(
    'group relative cursor-pointer rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow',
    'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
  )}
>
```

### Build Status with Icon + Color

```typescript
function BuildStatusBadge({ isBuilt }: { isBuilt: boolean }) {
  return (
    <Badge
      variant={isBuilt ? 'default' : 'secondary'}
      className={cn(
        'text-xs',
        isBuilt && 'bg-green-600 hover:bg-green-700'
      )}
    >
      {isBuilt ? (
        <>
          <CheckCircle className="h-3 w-3 mr-1" aria-hidden="true" />
          Built
        </>
      ) : (
        <>
          <Blocks className="h-3 w-3 mr-1" aria-hidden="true" />
          In Pieces
        </>
      )}
    </Badge>
  )
}
```

### Focus Management Hook

```typescript
// hooks/useFocusManagement.ts
export function useFocusRestore(isOpen: boolean) {
  const triggerRef = useRef<HTMLElement | null>(null)

  // Capture trigger element when opening
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement
    }
  }, [isOpen])

  // Restore focus when closing
  const restore = useCallback(() => {
    triggerRef.current?.focus()
  }, [])

  return restore
}

// Usage with dialog
function DeleteDialog({ open, onOpenChange, onConfirm }) {
  const restoreFocus = useFocusRestore(open)

  const handleClose = () => {
    onOpenChange(false)
    restoreFocus()
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => {
      if (!o) restoreFocus()
      onOpenChange(o)
    }}>
      {/* ... */}
    </AlertDialog>
  )
}
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

### Keyboard Tests

- [ ] Arrow keys navigate gallery
- [ ] Focus ring visible on selected card
- [ ] Enter opens detail page
- [ ] A opens add form
- [ ] B toggles build status
- [ ] +/- adjust quantity
- [ ] M opens MOC dialog
- [ ] Delete opens confirmation
- [ ] Escape closes modals

### Screen Reader Tests

- [ ] Screen reader announces build status change
- [ ] Screen reader announces quantity change
- [ ] All buttons have accessible names
- [ ] Images have alt text
- [ ] Form fields have labels

### Focus Tests

- [ ] Focus moves to modal on open
- [ ] Focus returns to trigger on modal close
- [ ] Focus visible on all interactive elements
- [ ] Tab order is logical

### Visual Tests

- [ ] Color contrast meets WCAG AA (4.5:1 for text)
- [ ] Build status uses color AND icon
- [ ] Touch targets are 44px minimum
- [ ] Focus rings are visible in all themes

## Definition of Done

- [ ] All keyboard shortcuts implemented
- [ ] Screen reader announcements work
- [ ] Focus management is correct
- [ ] WCAG AA compliance verified
- [ ] All tests pass
- [ ] Code reviewed

## Change Log

| Date       | Version | Description                              | Author |
| ---------- | ------- | ---------------------------------------- | ------ |
| 2025-12-27 | 0.1     | Initial draft                            | Claude |
| 2025-12-27 | 0.2     | Consolidated from sets-1019              | Claude |

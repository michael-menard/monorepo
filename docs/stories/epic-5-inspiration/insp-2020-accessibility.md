# Story insp-2020: Keyboard & Screen Reader Support

## Status

Draft

## Consolidates

- insp-1046.keyboard-navigation
- insp-1047.screen-reader-support

## Story

**As a** user with accessibility needs,
**I want** full keyboard navigation and screen reader support,
**so that** I can use the Inspiration Gallery effectively.

## PRD Reference

See [Epic 5: Inspiration Gallery PRD](/docs/prd/epic-5-inspiration-gallery.md) - Accessibility Requirements

## Dependencies

- **insp-2002**: Inspiration Gallery MVP
- **insp-2007**: Album Gallery & View
- **insp-2014**: Drag-and-Drop Reorder

## Acceptance Criteria

### Keyboard Navigation

1. Arrow keys navigate gallery grid
2. Space selects/deselects item
3. Shift + Arrow for multi-select
4. Enter opens detail view
5. Escape closes modal/detail
6. Tab navigates through interactive elements
7. Reorder: select → arrow keys → Enter to confirm
8. Group into album: select multiple → G
9. Delete: select → Delete/Backspace
10. Upload: U when in gallery

### Screen Reader Support

11. Gallery items announce: "[Title or 'Untitled inspiration'], image, [position] of [total]"
12. Album items announce: "[Album name], album containing [count] items, [position] of [total]"
13. Drag operations announce state changes
14. Drop completed announces result
15. Delete/upload announces completion

### Focus Management

16. Modal opens → focus to first interactive element
17. Modal closes → focus returns to trigger
18. Item deleted → focus moves to next (or previous if last)
19. Album created → focus moves to new album
20. Upload complete → focus to first uploaded item

### Alt Text

21. `title` field populates `alt` attribute
22. If no title: "User uploaded inspiration image"
23. Albums: "[Album name] album cover"

### Color & Contrast

24. All interactive states meet WCAG AA (4.5:1)
25. Selection uses color AND visual indicator
26. Error states use icon + text, not color alone

## Tasks / Subtasks

### Task 1: Implement Keyboard Grid Navigation (AC: 1-5, 10)

- [ ] Create `useGridKeyboardNavigation` hook
- [ ] Track focused cell index
- [ ] Handle arrow key movement
- [ ] Handle Space, Enter, Escape
- [ ] Add focus ring styles

### Task 2: Add Keyboard Shortcuts (AC: 6-9)

- [ ] Implement all documented shortcuts
- [ ] Create shortcuts help modal
- [ ] Avoid conflicts with browser shortcuts

### Task 3: Add Screen Reader Announcements (AC: 11-15)

- [ ] Create `useAnnouncer` hook with live region
- [ ] Announce gallery item on focus
- [ ] Announce drag state changes
- [ ] Announce operation completions

### Task 4: Implement Focus Management (AC: 16-20)

- [ ] Create `useFocusManagement` hook
- [ ] Track focus before modal opens
- [ ] Return focus on modal close
- [ ] Move focus after delete

### Task 5: Add Alt Text (AC: 21-23)

- [ ] Update InspirationCard with proper alt
- [ ] Update AlbumCard with proper alt
- [ ] Add fallback for missing titles

### Task 6: Verify Contrast (AC: 24-26)

- [ ] Audit all interactive states
- [ ] Ensure non-color indicators
- [ ] Fix any contrast issues

## Dev Notes

### Grid Keyboard Navigation Hook

```typescript
// apps/web/main-app/src/hooks/useGridKeyboardNavigation.ts
import { useState, useCallback, useRef, useEffect } from 'react'

interface UseGridKeyboardNavigationOptions {
  itemCount: number
  columns: number
  onSelect?: (index: number) => void
  onOpen?: (index: number) => void
  onDelete?: (indices: number[]) => void
}

export function useGridKeyboardNavigation({
  itemCount,
  columns,
  onSelect,
  onOpen,
  onDelete,
}: UseGridKeyboardNavigationOptions) {
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!containerRef.current?.contains(document.activeElement)) return

    let newIndex = focusedIndex
    let handled = true

    switch (e.key) {
      case 'ArrowRight':
        newIndex = Math.min(focusedIndex + 1, itemCount - 1)
        break
      case 'ArrowLeft':
        newIndex = Math.max(focusedIndex - 1, 0)
        break
      case 'ArrowDown':
        newIndex = Math.min(focusedIndex + columns, itemCount - 1)
        break
      case 'ArrowUp':
        newIndex = Math.max(focusedIndex - columns, 0)
        break
      case ' ':
        e.preventDefault()
        if (e.shiftKey) {
          // Range select
          const range = new Set(selectedIndices)
          const start = Math.min(...selectedIndices, focusedIndex)
          const end = Math.max(...selectedIndices, focusedIndex)
          for (let i = start; i <= end; i++) {
            range.add(i)
          }
          setSelectedIndices(range)
        } else {
          // Toggle select
          const newSelected = new Set(selectedIndices)
          if (newSelected.has(focusedIndex)) {
            newSelected.delete(focusedIndex)
          } else {
            newSelected.add(focusedIndex)
          }
          setSelectedIndices(newSelected)
        }
        onSelect?.(focusedIndex)
        return
      case 'Enter':
        e.preventDefault()
        onOpen?.(focusedIndex)
        return
      case 'Delete':
      case 'Backspace':
        if (selectedIndices.size > 0) {
          e.preventDefault()
          onDelete?.([...selectedIndices])
        }
        return
      case 'Escape':
        setSelectedIndices(new Set())
        return
      default:
        handled = false
    }

    if (handled) {
      e.preventDefault()
      setFocusedIndex(newIndex)
      // Focus the new element
      const items = containerRef.current?.querySelectorAll('[role="gridcell"]')
      ;(items?.[newIndex] as HTMLElement)?.focus()
    }
  }, [focusedIndex, itemCount, columns, selectedIndices, onSelect, onOpen, onDelete])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return {
    containerRef,
    focusedIndex,
    selectedIndices,
    setFocusedIndex,
    clearSelection: () => setSelectedIndices(new Set()),
  }
}
```

### Screen Reader Announcer

```typescript
// apps/web/main-app/src/hooks/useAnnouncer.ts
import { useCallback, useRef, useEffect } from 'react'

export function useAnnouncer() {
  const liveRegionRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // Create live region if it doesn't exist
    if (!liveRegionRef.current) {
      const region = document.createElement('div')
      region.setAttribute('role', 'status')
      region.setAttribute('aria-live', 'polite')
      region.setAttribute('aria-atomic', 'true')
      region.className = 'sr-only'
      document.body.appendChild(region)
      liveRegionRef.current = region
    }

    return () => {
      liveRegionRef.current?.remove()
    }
  }, [])

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (liveRegionRef.current) {
      liveRegionRef.current.setAttribute('aria-live', priority)
      liveRegionRef.current.textContent = ''
      // Small delay to ensure screen reader picks up change
      setTimeout(() => {
        if (liveRegionRef.current) {
          liveRegionRef.current.textContent = message
        }
      }, 100)
    }
  }, [])

  return { announce }
}

// Usage in gallery
const { announce } = useAnnouncer()

// On item focus
announce(`${item.title || 'Untitled inspiration'}, image, ${index + 1} of ${total}`)

// On drag start
announce(`Grabbed ${item.title}. Use arrow keys to move, Enter to drop, Escape to cancel.`)

// On drag end
announce(`${item.title} moved to position ${newIndex + 1}`)

// On delete
announce(`${item.title} deleted`)
```

### Focus Management Hook

```typescript
// apps/web/main-app/src/hooks/useFocusManagement.ts
import { useRef, useEffect, useCallback } from 'react'

export function useFocusReturn() {
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const saveFocus = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement
  }, [])

  const restoreFocus = useCallback(() => {
    previousFocusRef.current?.focus()
    previousFocusRef.current = null
  }, [])

  return { saveFocus, restoreFocus }
}

// In modal component
function Modal({ open, onClose, children }) {
  const { saveFocus, restoreFocus } = useFocusReturn()
  const firstFocusableRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (open) {
      saveFocus()
      // Focus first focusable element
      setTimeout(() => firstFocusableRef.current?.focus(), 0)
    } else {
      restoreFocus()
    }
  }, [open, saveFocus, restoreFocus])

  // ...
}
```

### Accessible Gallery Item

```typescript
// Updated InspirationCard for accessibility
function InspirationCard({ inspiration, index, total, isSelected, isFocused }: Props) {
  return (
    <div
      role="gridcell"
      tabIndex={isFocused ? 0 : -1}
      aria-selected={isSelected}
      aria-label={`${inspiration.title || 'Untitled inspiration'}, image, ${index + 1} of ${total}`}
      className={`
        ${isFocused ? 'ring-2 ring-primary ring-offset-2' : ''}
        ${isSelected ? 'ring-2 ring-primary bg-primary/10' : ''}
      `}
    >
      <img
        src={inspiration.imageUrl}
        alt={inspiration.title || 'User uploaded inspiration image'}
        loading="lazy"
      />
      {/* ... */}
    </div>
  )
}
```

### Keyboard Shortcuts Help

```typescript
// apps/web/main-app/src/routes/inspiration/-components/KeyboardShortcutsHelp/index.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@repo/ui'

const shortcuts = [
  { key: '↑↓←→', description: 'Navigate gallery' },
  { key: 'Space', description: 'Select/deselect item' },
  { key: 'Shift + Space', description: 'Range select' },
  { key: 'Enter', description: 'Open item' },
  { key: 'Escape', description: 'Close modal / Clear selection' },
  { key: 'Delete', description: 'Delete selected' },
  { key: 'G', description: 'Group into album' },
  { key: 'A', description: 'Add to album' },
  { key: 'U', description: 'Upload new' },
  { key: '?', description: 'Show shortcuts' },
]

export function KeyboardShortcutsHelp({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2">
          {shortcuts.map(({ key, description }) => (
            <div key={key} className="flex justify-between">
              <kbd className="px-2 py-1 bg-muted rounded text-sm font-mono">{key}</kbd>
              <span className="text-muted-foreground">{description}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

## Testing

### Keyboard Tests

- [ ] Arrow keys navigate grid
- [ ] Space toggles selection
- [ ] Enter opens item
- [ ] Escape closes modals
- [ ] All shortcuts work as documented

### Screen Reader Tests

- [ ] Items announce correctly on focus
- [ ] Drag operations announce state
- [ ] Completions announced
- [ ] Live region works

### Focus Management Tests

- [ ] Modal focus to first element
- [ ] Modal close returns focus
- [ ] Delete moves focus correctly

### Contrast Tests

- [ ] All text meets 4.5:1
- [ ] Focus indicators visible
- [ ] Selection uses non-color indicator

## Definition of Done

- [ ] Full keyboard navigation
- [ ] Screen reader announcements
- [ ] Focus management correct
- [ ] Alt text implemented
- [ ] Contrast verified
- [ ] All tests pass
- [ ] WCAG AA audit passed
- [ ] Code reviewed

## Change Log

| Date       | Version | Description                                    | Author   |
| ---------- | ------- | ---------------------------------------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft                                  | SM Agent |
| 2025-12-27 | 0.2     | Consolidated from insp-1046, insp-1047         | Claude   |

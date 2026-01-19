# Story wish-2006: Accessibility Complete

## Status

Draft

## Consolidates

- wish-1012: Keyboard Navigation & Accessibility

## Story

**As a** user with accessibility needs,
**I want** full keyboard navigation and screen reader support,
**so that** I can use the wishlist without a mouse.

## PRD Reference

See [Epic 6: Wishlist PRD](/docs/prd/epic-6-wishlist.md):
- Accessibility Requirements
- Keyboard Navigation
- Screen Reader Support
- Focus Management

## Dependencies

- **wish-2001**: Wishlist Gallery MVP (gallery keyboard navigation)
- **wish-2002**: Add Item Flow (form accessibility)
- **wish-2003**: Detail & Edit Pages (page accessibility)
- **wish-2004**: Modals & Transitions (modal focus management)
- **wish-2005**: UX Polish (drag-drop keyboard support)

## Acceptance Criteria

### Keyboard Navigation

1. Gallery navigable with arrow keys
2. Space to select/focus item
3. Enter to open detail view
4. Escape closes modals
5. "G" key triggers "Got it" on focused item
6. "A" key opens Add modal (when in gallery)
7. Delete/Backspace triggers delete on focused item
8. Tab navigates between interactive elements
9. Roving tabindex in gallery grid

### Screen Reader Support

10. Screen reader announces item details on focus
11. Announces: "[Title], [price], [pieces] pieces, priority [n] of [total]"
12. State changes announced via live regions
13. "Got it" button purpose explained
14. Scraping/loading states announced

### Focus Management

15. Modal focus trap implemented
16. Focus returns to trigger on modal close
17. Focus moves to next item after delete
18. Focus on first editable field when forms open

### Form Accessibility

19. All inputs have visible labels (not just placeholders)
20. Required fields marked with aria-required
21. Error messages linked via aria-describedby
22. Price inputs announce currency

### Color Contrast

23. All text meets WCAG AA contrast (4.5:1 for normal, 3:1 for large)
24. Focus indicators visible
25. Error states distinguishable

## Tasks / Subtasks

### Task 1: Gallery Keyboard Navigation

- [ ] Implement roving tabindex for gallery grid
- [ ] Arrow key navigation between cards
- [ ] Space/Enter to activate card
- [ ] Home/End for first/last card

### Task 2: Keyboard Shortcuts

- [ ] Create `hooks/useWishlistKeyboardShortcuts.ts`
- [ ] "A" for add new item (gallery context)
- [ ] "G" for Got it (item context)
- [ ] Delete/Backspace for delete (item context)
- [ ] Disable shortcuts when modal open
- [ ] Disable shortcuts when typing in input

### Task 3: Screen Reader Announcements

- [ ] Create Announcer component with live region
- [ ] Announce on card focus
- [ ] Announce state changes (reorder, delete, purchase)
- [ ] Announce loading states
- [ ] Announce errors

### Task 4: Modal Focus Management

- [ ] Verify focus trap in AlertDialog
- [ ] Verify focus trap in Dialog
- [ ] Focus first interactive element on open
- [ ] Return focus to trigger on close
- [ ] Handle delete focus (next item)

### Task 5: Card Accessibility

- [ ] Add aria-label to cards
- [ ] Include all relevant info in label
- [ ] Priority position in announcement
- [ ] Hover actions accessible via keyboard

### Task 6: Form Accessibility

- [ ] Audit all form fields for labels
- [ ] Add aria-required to required fields
- [ ] Link errors with aria-describedby
- [ ] Test with screen reader

### Task 7: Color Contrast Audit

- [ ] Run automated contrast checker
- [ ] Fix any failing elements
- [ ] Verify focus indicators
- [ ] Test error states

### Task 8: Testing with Assistive Technology

- [ ] Test with VoiceOver (macOS)
- [ ] Test with NVDA (Windows) if possible
- [ ] Document any issues and fixes

## Dev Notes

### Keyboard Shortcut Hook

```typescript
// hooks/useWishlistKeyboardShortcuts.ts
import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'

interface UseWishlistKeyboardShortcutsProps {
  focusedItemId?: string
  onGotIt?: (id: string) => void
  onDelete?: (id: string) => void
  isModalOpen?: boolean
}

export function useWishlistKeyboardShortcuts({
  focusedItemId,
  onGotIt,
  onDelete,
  isModalOpen,
}: UseWishlistKeyboardShortcutsProps) {
  const navigate = useNavigate()

  useEffect(() => {
    if (isModalOpen) return // Don't capture shortcuts when modal open

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if typing in an input
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      switch (event.key.toLowerCase()) {
        case 'a':
          event.preventDefault()
          navigate({ to: '/wishlist/add' })
          break

        case 'g':
          if (focusedItemId && onGotIt) {
            event.preventDefault()
            onGotIt(focusedItemId)
          }
          break

        case 'delete':
        case 'backspace':
          if (focusedItemId && onDelete) {
            event.preventDefault()
            onDelete(focusedItemId)
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [focusedItemId, onGotIt, onDelete, isModalOpen, navigate])
}
```

### Roving Tabindex Hook

```typescript
// hooks/useRovingTabindex.ts
import { useState, useCallback, KeyboardEvent, useRef, useEffect } from 'react'

interface UseRovingTabindexOptions {
  items: { id: string }[]
  columns?: number
  onSelect?: (id: string) => void
  onActivate?: (id: string) => void
}

export function useRovingTabindex({
  items,
  columns = 4,
  onSelect,
  onActivate,
}: UseRovingTabindexOptions) {
  const [focusedIndex, setFocusedIndex] = useState(0)
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map())

  // Focus the current item when index changes
  useEffect(() => {
    const item = items[focusedIndex]
    if (item) {
      const element = itemRefs.current.get(item.id)
      element?.focus()
    }
  }, [focusedIndex, items])

  const setItemRef = useCallback((id: string, element: HTMLElement | null) => {
    if (element) {
      itemRefs.current.set(id, element)
    } else {
      itemRefs.current.delete(id)
    }
  }, [])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      let newIndex = focusedIndex

      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault()
          newIndex = Math.min(focusedIndex + 1, items.length - 1)
          break

        case 'ArrowLeft':
          event.preventDefault()
          newIndex = Math.max(focusedIndex - 1, 0)
          break

        case 'ArrowDown':
          event.preventDefault()
          newIndex = Math.min(focusedIndex + columns, items.length - 1)
          break

        case 'ArrowUp':
          event.preventDefault()
          newIndex = Math.max(focusedIndex - columns, 0)
          break

        case 'Home':
          event.preventDefault()
          newIndex = 0
          break

        case 'End':
          event.preventDefault()
          newIndex = items.length - 1
          break

        case ' ':
          event.preventDefault()
          if (items[focusedIndex] && onSelect) {
            onSelect(items[focusedIndex].id)
          }
          return

        case 'Enter':
          event.preventDefault()
          if (items[focusedIndex] && onActivate) {
            onActivate(items[focusedIndex].id)
          }
          return
      }

      if (newIndex !== focusedIndex) {
        setFocusedIndex(newIndex)
      }
    },
    [focusedIndex, items, columns, onSelect, onActivate]
  )

  return {
    focusedIndex,
    focusedId: items[focusedIndex]?.id,
    setFocusedIndex,
    setItemRef,
    handleKeyDown,
    getTabIndex: (index: number) => (index === focusedIndex ? 0 : -1),
  }
}
```

### Accessible Card Component

```typescript
// Enhanced WishlistCard with accessibility
interface AccessibleWishlistCardProps extends WishlistCardProps {
  isFocused: boolean
  tabIndex: number
  setRef: (el: HTMLElement | null) => void
  totalItems: number
  position: number
}

function AccessibleWishlistCard({
  item,
  isFocused,
  tabIndex,
  setRef,
  totalItems,
  position,
  ...handlers
}: AccessibleWishlistCardProps) {
  // Build comprehensive aria-label
  const ariaLabel = [
    item.title,
    item.price && formatCurrency(item.price, item.currency),
    item.pieceCount && `${item.pieceCount.toLocaleString()} pieces`,
    `priority ${position} of ${totalItems}`,
    item.store,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <div
      ref={setRef}
      role="gridcell"
      tabIndex={tabIndex}
      aria-label={ariaLabel}
      className={cn(
        'group relative outline-none',
        'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        isFocused && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      {/* Card content */}
    </div>
  )
}
```

### Announcer Component

```typescript
// components/common/Announcer.tsx
import { useEffect, useState } from 'react'

// Singleton for announcements
let announceQueue: string[] = []
let listeners: Set<(message: string) => void> = new Set()

export function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
  announceQueue.push(message)
  listeners.forEach((listener) => listener(message))
}

export function Announcer() {
  const [politeMessage, setPoliteMessage] = useState('')
  const [assertiveMessage, setAssertiveMessage] = useState('')

  useEffect(() => {
    const listener = (message: string) => {
      setPoliteMessage(message)
      // Clear after announcement
      setTimeout(() => setPoliteMessage(''), 1000)
    }

    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  return (
    <>
      {/* Polite announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>

      {/* Assertive announcements */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </>
  )
}

// Usage examples:
// announce('LEGO Castle moved to priority 1')
// announce('Item removed from wishlist')
// announce('Added to your collection!')
```

### Form Field Accessibility Pattern

```typescript
// Pattern for all form fields
<FormField
  control={form.control}
  name="price"
  render={({ field, fieldState }) => (
    <FormItem>
      <FormLabel htmlFor="price">
        Price
        {isRequired && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
      </FormLabel>
      <FormControl>
        <Input
          id="price"
          type="number"
          aria-required={isRequired}
          aria-invalid={!!fieldState.error}
          aria-describedby={
            fieldState.error ? 'price-error' : fieldState.description ? 'price-desc' : undefined
          }
          {...field}
        />
      </FormControl>
      {fieldState.description && (
        <FormDescription id="price-desc">{fieldState.description}</FormDescription>
      )}
      {fieldState.error && (
        <FormMessage id="price-error" role="alert">
          {fieldState.error.message}
        </FormMessage>
      )}
    </FormItem>
  )}
/>
```

### Focus Management for Delete

```typescript
// When deleting an item, focus the next item
const handleDeleteSuccess = (deletedId: string) => {
  const currentIndex = items.findIndex(i => i.id === deletedId)
  const nextItem = items[currentIndex + 1] || items[currentIndex - 1]

  if (nextItem) {
    // Focus next item after DOM updates
    requestAnimationFrame(() => {
      const element = itemRefs.current.get(nextItem.id)
      element?.focus()
    })
  } else {
    // No items left, focus add button
    addButtonRef.current?.focus()
  }

  announce('Item removed from wishlist')
}
```

### Gallery with Full Accessibility

```typescript
// In wishlist gallery page
function WishlistGalleryPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useGetWishlistQuery({})
  const addButtonRef = useRef<HTMLButtonElement>(null)

  // Modal states
  const [gotItModalOpen, setGotItModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<WishlistItem | null>(null)

  // Roving tabindex
  const {
    focusedIndex,
    focusedId,
    setItemRef,
    handleKeyDown,
    getTabIndex,
  } = useRovingTabindex({
    items: data?.items || [],
    columns: 4,
    onActivate: (id) => navigate({ to: `/wishlist/${id}` }),
  })

  // Keyboard shortcuts
  useWishlistKeyboardShortcuts({
    focusedItemId: focusedId,
    onGotIt: (id) => {
      const item = data?.items.find(i => i.id === id)
      if (item) {
        setSelectedItem(item)
        setGotItModalOpen(true)
      }
    },
    onDelete: (id) => {
      const item = data?.items.find(i => i.id === id)
      if (item) {
        setSelectedItem(item)
        setDeleteModalOpen(true)
      }
    },
    isModalOpen: gotItModalOpen || deleteModalOpen,
  })

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header with accessible button */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Wishlist</h1>
        <Button
          ref={addButtonRef}
          onClick={() => navigate({ to: '/wishlist/add' })}
          aria-keyshortcuts="a"
        >
          <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
          Add Item
        </Button>
      </div>

      {/* Keyboard shortcut hint (visually hidden but available) */}
      <div className="sr-only">
        Keyboard shortcuts: A to add item, G to mark focused item as got it,
        Delete to remove focused item, Arrow keys to navigate.
      </div>

      {/* Gallery Grid */}
      {!isLoading && data?.items.length > 0 && (
        <div
          role="grid"
          aria-label="Wishlist items"
          onKeyDown={handleKeyDown}
        >
          <div role="row" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.items.map((item, index) => (
              <AccessibleWishlistCard
                key={item.id}
                item={item}
                isFocused={index === focusedIndex}
                tabIndex={getTabIndex(index)}
                setRef={(el) => setItemRef(item.id, el)}
                totalItems={data.items.length}
                position={index + 1}
                onView={(id) => navigate({ to: `/wishlist/${id}` })}
                onEdit={(id) => navigate({ to: `/wishlist/${id}/edit` })}
                onRemove={(id) => {
                  setSelectedItem(data.items.find(i => i.id === id)!)
                  setDeleteModalOpen(true)
                }}
                onGotIt={(id) => {
                  setSelectedItem(data.items.find(i => i.id === id)!)
                  setGotItModalOpen(true)
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Announcer for screen readers */}
      <Announcer />

      {/* Modals */}
      {selectedItem && (
        <>
          <GotItModal
            open={gotItModalOpen}
            onOpenChange={setGotItModalOpen}
            item={selectedItem}
          />
          <DeleteConfirmationModal
            open={deleteModalOpen}
            onOpenChange={setDeleteModalOpen}
            itemTitle={selectedItem.title}
            onConfirm={() => handleDelete(selectedItem.id)}
          />
        </>
      )}
    </div>
  )
}
```

### Color Contrast Guidelines

```css
/* Ensure these pass WCAG AA */
/* Normal text (< 18pt): 4.5:1 contrast ratio */
/* Large text (>= 18pt or 14pt bold): 3:1 contrast ratio */

/* Focus indicators must be visible */
.focus-visible\:ring-2:focus-visible {
  --tw-ring-offset-width: 2px;
  --tw-ring-color: hsl(var(--primary));
  box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow);
}

/* Error states need sufficient contrast */
.text-destructive {
  /* Ensure at least 4.5:1 against background */
  color: hsl(var(--destructive));
}
```

## Testing

### Keyboard Navigation Tests

- [ ] Arrow keys navigate gallery
- [ ] Enter opens detail view
- [ ] Escape closes modals
- [ ] "A" opens add page
- [ ] "G" triggers Got it on focused item
- [ ] Delete triggers confirmation on focused item
- [ ] Tab moves through interactive elements
- [ ] Roving tabindex works (one tab stop per grid)

### Screen Reader Tests

- [ ] Cards announce all relevant info
- [ ] Priority position announced
- [ ] State changes announced
- [ ] Loading states announced
- [ ] Error messages announced
- [ ] Modal purpose announced

### Focus Management Tests

- [ ] Focus traps work in modals
- [ ] Focus returns after modal close
- [ ] Focus moves to next item after delete
- [ ] Focus on first field when form opens

### Form Accessibility Tests

- [ ] All inputs have visible labels
- [ ] Required fields marked correctly
- [ ] Errors announced and linked
- [ ] Can complete form with keyboard only

### Color Contrast Tests

- [ ] Run axe or similar tool
- [ ] All text passes 4.5:1 or 3:1 (large)
- [ ] Focus indicators visible
- [ ] Error states distinguishable

### Assistive Technology Tests

- [ ] Complete user journey with VoiceOver
- [ ] Complete user journey with NVDA (if available)
- [ ] Document any issues found

## Definition of Done

- [ ] Full keyboard navigation implemented
- [ ] Screen reader announcements comprehensive
- [ ] Focus management correct in all scenarios
- [ ] Form accessibility complete
- [ ] Color contrast passes WCAG AA
- [ ] Tested with real assistive technology
- [ ] All tests pass
- [ ] Code reviewed

## Change Log

| Date       | Version | Description                           | Author   |
| ---------- | ------- | ------------------------------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft                         | SM Agent |
| 2025-12-27 | 0.2     | Consolidated from wish-1012, enhanced | Claude   |

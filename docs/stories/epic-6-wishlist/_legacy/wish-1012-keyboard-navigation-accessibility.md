# Story wish-1012: Keyboard Navigation & Accessibility

## Status

Draft

## Story

**As a** user with accessibility needs,
**I want** full keyboard navigation and screen reader support,
**so that** I can use the wishlist without a mouse.

## Dependencies

- **wish-1000**: Gallery Page (keyboard navigation context)
- **wish-1001**: Card Component (add ARIA labels, keyboard handling)
- **wish-1003**: Add Item Page (form accessibility)
- **wish-1008**: Delete Modal (focus management)
- **wish-1009**: Got It Modal (focus management)

## Acceptance Criteria

1. Gallery navigable with arrow keys
2. Space to select/focus item
3. Enter to open detail view
4. Escape closes modals
5. "G" key triggers "Got it" on focused item
6. "A" key opens Add modal (when in gallery)
7. Delete/Backspace triggers delete on focused item
8. Screen reader announces item details
9. Screen reader announces state changes (scraping, priority changed)
10. Focus management for all modals
11. Form fields have visible labels
12. Error messages linked to fields
13. WCAG AA color contrast compliance

## Tasks / Subtasks

- [ ] **Task 1: Gallery Keyboard Navigation** (AC: 1-3)
  - [ ] Add roving tabindex to gallery grid
  - [ ] Arrow key navigation between cards
  - [ ] Space to activate card actions
  - [ ] Enter to view detail

- [ ] **Task 2: Keyboard Shortcuts** (AC: 5-7)
  - [ ] Global shortcut listener for "A" (add)
  - [ ] Card-scoped "G" for Got it
  - [ ] Card-scoped Delete/Backspace for delete
  - [ ] Prevent shortcuts when modals open

- [ ] **Task 3: Screen Reader Announcements** (AC: 8, 9)
  - [ ] Announce card on focus: "[Title], [price], [pieces] pieces, priority [n] of [total]"
  - [ ] Live region for state changes
  - [ ] Announce "Got it" button purpose

- [ ] **Task 4: Focus Management** (AC: 4, 10)
  - [ ] Modal focus trap
  - [ ] Escape closes modals
  - [ ] Focus returns to trigger on close
  - [ ] Focus moves to next item after delete

- [ ] **Task 5: Form Accessibility** (AC: 11, 12)
  - [ ] All inputs have `<label>` with htmlFor
  - [ ] Required fields have aria-required
  - [ ] Errors use aria-describedby
  - [ ] Price inputs announce currency

- [ ] **Task 6: Color Contrast** (AC: 13)
  - [ ] Audit all text/background combinations
  - [ ] Fix any contrast issues
  - [ ] Test with WCAG contrast checker

## Dev Notes

### Keyboard Shortcut Implementation

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
      if (event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement) {
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

### Roving Tabindex for Gallery Grid

```typescript
// hooks/useRovingTabindex.ts
import { useState, useCallback, KeyboardEvent } from 'react'

export function useRovingTabindex(items: { id: string }[]) {
  const [focusedIndex, setFocusedIndex] = useState(0)

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const columns = 4 // Adjust based on grid layout

    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault()
        setFocusedIndex(i => Math.min(i + 1, items.length - 1))
        break

      case 'ArrowLeft':
        event.preventDefault()
        setFocusedIndex(i => Math.max(i - 1, 0))
        break

      case 'ArrowDown':
        event.preventDefault()
        setFocusedIndex(i => Math.min(i + columns, items.length - 1))
        break

      case 'ArrowUp':
        event.preventDefault()
        setFocusedIndex(i => Math.max(i - columns, 0))
        break

      case 'Home':
        event.preventDefault()
        setFocusedIndex(0)
        break

      case 'End':
        event.preventDefault()
        setFocusedIndex(items.length - 1)
        break
    }
  }, [items.length])

  return {
    focusedIndex,
    focusedId: items[focusedIndex]?.id,
    handleKeyDown,
    setFocusedIndex,
  }
}
```

### Card Accessibility Props

```typescript
// In WishlistCard
function WishlistCard({ item, isFocused, onFocus }: WishlistCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isFocused && cardRef.current) {
      cardRef.current.focus()
    }
  }, [isFocused])

  const ariaLabel = [
    item.title,
    item.price && `${formatCurrency(item.price, item.currency)}`,
    item.pieceCount && `${item.pieceCount} pieces`,
    `priority ${item.sortOrder + 1} of ${totalItems}`,
  ].filter(Boolean).join(', ')

  return (
    <div
      ref={cardRef}
      role="gridcell"
      tabIndex={isFocused ? 0 : -1}
      aria-label={ariaLabel}
      onFocus={onFocus}
      className={cn(
        'focus:ring-2 focus:ring-primary focus:ring-offset-2',
        'outline-none'
      )}
    >
      {/* Card content */}
    </div>
  )
}
```

### Live Region for Announcements

```typescript
// components/common/Announcer.tsx
import { useEffect, useState } from 'react'

let announceTimeout: NodeJS.Timeout

export function announce(message: string) {
  // Dispatch custom event for live region
  window.dispatchEvent(new CustomEvent('announce', { detail: message }))
}

export function Announcer() {
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handler = (event: CustomEvent<string>) => {
      setMessage(event.detail)
      clearTimeout(announceTimeout)
      announceTimeout = setTimeout(() => setMessage(''), 1000)
    }

    window.addEventListener('announce', handler as EventListener)
    return () => window.removeEventListener('announce', handler as EventListener)
  }, [])

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  )
}

// Usage:
// announce('LEGO Castle moved to priority 1')
// announce('Item removed from wishlist')
```

### Form Field Accessibility

```typescript
// Ensure all form fields follow this pattern
<FormField
  control={form.control}
  name="price"
  render={({ field, fieldState }) => (
    <FormItem>
      <FormLabel htmlFor="price">
        Price <span className="text-destructive">*</span>
      </FormLabel>
      <FormControl>
        <Input
          id="price"
          aria-required="true"
          aria-invalid={!!fieldState.error}
          aria-describedby={fieldState.error ? 'price-error' : undefined}
          {...field}
        />
      </FormControl>
      {fieldState.error && (
        <FormMessage id="price-error" role="alert">
          {fieldState.error.message}
        </FormMessage>
      )}
    </FormItem>
  )}
/>
```

### Dependencies

- All previous wishlist stories
- @repo/accessibility package (if exists)

## Testing

- [ ] Arrow keys navigate gallery
- [ ] Enter opens detail view
- [ ] Escape closes modals
- [ ] "A" opens add modal
- [ ] "G" triggers Got it on focused item
- [ ] Delete triggers confirmation on focused item
- [ ] Screen reader announces card details on focus
- [ ] Focus traps work in modals
- [ ] Focus returns after modal close
- [ ] All inputs have labels
- [ ] Errors announced by screen reader
- [ ] Color contrast passes WCAG AA
- [ ] Test with VoiceOver/NVDA

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft | SM Agent |

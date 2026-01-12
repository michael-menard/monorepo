import { useState, useCallback, useRef, useEffect } from 'react'

export interface RovingItem {
  id: string
}

interface UseRovingTabindexOptions<TItem extends RovingItem = RovingItem> {
  /** Ordered list of items in the grid */
  items: TItem[]
  /** Number of columns in the grid (for ArrowUp/ArrowDown movement) */
  columns?: number
  /** Called when user presses Space on the focused item */
  onSelect?: (id: string) => void
  /** Called when user presses Enter on the focused item */
  onActivate?: (id: string) => void
}

interface UseRovingTabindexResult {
  /** Index of the currently focused item */
  focusedIndex: number
  /** ID of the currently focused item (if any) */
  focusedId?: string
  /** Imperative setter for the focused index (used after deletes, etc.) */
  setFocusedIndex: (index: number) => void
  /** Callback ref setter to register focusable DOM nodes */
  setItemRef: (id: string, element: HTMLElement | null) => void
  /** Keydown handler to attach to the grid container */
  handleKeyDown: (event: React.KeyboardEvent) => void
  /** Helper to compute tabIndex for an item at a given index */
  getTabIndex: (index: number) => number
}

/**
 * Implements a roving tabindex pattern for a grid of items.
 *
 * Only the "focused" item has tabIndex=0 – all others get tabIndex=-1.
 * Arrow keys move focus spatially, Home/End jump to first/last, Space/Enter
 * call the provided callbacks.
 */
export function useRovingTabindex<TItem extends RovingItem = RovingItem>({
  items,
  columns = 4,
  onSelect,
  onActivate,
}: UseRovingTabindexOptions<TItem>): UseRovingTabindexResult {
  const [focusedIndex, setFocusedIndex] = useState(0)
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map())
  const lastFocusedIdRef = useRef<string | undefined>(undefined)

  // Focus the current item when index changes
  useEffect(() => {
    const item = items[focusedIndex]
    if (!item) return

    const element = itemRefs.current.get(item.id)
    if (element && document.activeElement !== element) {
      element.focus()
      lastFocusedIdRef.current = item.id
    }
  }, [focusedIndex, items])

  // When the items array changes (e.g. delete/reorder), try to keep focus
  // on the same id; if it no longer exists, move to the nearest neighbour.
  useEffect(() => {
    if (!items.length) {
      lastFocusedIdRef.current = undefined
      return
    }

    const currentId = lastFocusedIdRef.current
    if (!currentId) {
      // Default to first item when nothing has been focused yet
      if (focusedIndex !== 0) {
        setFocusedIndex(0)
      }
      return
    }

    const indexForId = items.findIndex(item => item.id === currentId)
    if (indexForId === -1) {
      const clampedIndex = Math.min(focusedIndex, items.length - 1)
      if (clampedIndex !== focusedIndex) {
        setFocusedIndex(clampedIndex)
      }
    } else if (indexForId !== focusedIndex) {
      setFocusedIndex(indexForId)
    }
  }, [items, focusedIndex])

  const setItemRef = useCallback((id: string, element: HTMLElement | null) => {
    if (element) {
      itemRefs.current.set(id, element)
    } else {
      itemRefs.current.delete(id)
    }
  }, [])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!items.length) return

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

        case ' ': // Space selects
          event.preventDefault()
          if (items[focusedIndex] && onSelect) {
            onSelect(items[focusedIndex]!.id)
          }
          return

        case 'Enter':
          event.preventDefault()
          if (items[focusedIndex] && onActivate) {
            onActivate(items[focusedIndex]!.id)
          }
          return

        default:
          break
      }

      if (newIndex !== focusedIndex) {
        setFocusedIndex(newIndex)
      }
    },
    [focusedIndex, items, columns, onSelect, onActivate],
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

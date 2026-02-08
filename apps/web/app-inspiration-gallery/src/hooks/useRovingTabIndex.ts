/**
 * useRovingTabIndex Hook
 *
 * Implements the WAI-ARIA roving tabindex pattern for 2D grid keyboard navigation.
 * Only one item has tabindex="0" at a time, enabling single Tab stop entry
 * with arrow key navigation within the grid.
 *
 * INSP-019: Keyboard Navigation & A11y
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/grid/
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { z } from 'zod'

/**
 * Options for the useRovingTabIndex hook
 */
export const RovingTabIndexOptionsSchema = z.object({
  /** Number of columns in the grid (if not provided, will be calculated) */
  columns: z.number().positive().optional(),
  /** Wrap horizontally at row edges (default: true) */
  wrapHorizontal: z.boolean().optional().default(true),
  /** Wrap vertically at grid edges (default: false) */
  wrapVertical: z.boolean().optional().default(false),
  /** Initial active index */
  initialIndex: z.number().nonnegative().optional().default(0),
})

export type RovingTabIndexOptions = z.infer<typeof RovingTabIndexOptionsSchema>

/**
 * Return type for useRovingTabIndex hook
 */
export interface UseRovingTabIndexReturn {
  /** Currently active index */
  activeIndex: number
  /** Set the active index programmatically */
  setActiveIndex: (index: number) => void
  /** Get the tabIndex value for an item */
  getTabIndex: (index: number) => 0 | -1
  /** Check if an item is the active one */
  isActive: (index: number) => boolean
  /** Key down handler for the container */
  handleKeyDown: (event: React.KeyboardEvent) => void
  /** Props to spread on the container element */
  containerProps: {
    role: 'grid'
    'aria-label': string
    onKeyDown: (event: React.KeyboardEvent) => void
  }
  /** Props to spread on each grid item */
  getItemProps: (index: number) => {
    role: 'gridcell'
    tabIndex: 0 | -1
    'aria-selected': boolean
    'data-index': number
  }
}

/**
 * Calculate the number of columns based on item positions
 */
function detectColumns(containerRef: React.RefObject<HTMLElement | null>): number {
  const container = containerRef.current
  if (!container) return 1

  const items = container.querySelectorAll('[data-index]')
  if (items.length < 2) return 1

  // Get the first item's top position
  const firstRect = items[0].getBoundingClientRect()
  let columnsInFirstRow = 1

  // Count items in the first row (same top position)
  for (let i = 1; i < items.length; i++) {
    const rect = items[i].getBoundingClientRect()
    // Allow 5px tolerance for floating point differences
    if (Math.abs(rect.top - firstRect.top) < 5) {
      columnsInFirstRow++
    } else {
      break
    }
  }

  return columnsInFirstRow
}

/**
 * Hook for implementing roving tabindex pattern in a 2D grid
 *
 * @param itemCount - Total number of items in the grid
 * @param containerRef - Ref to the grid container element
 * @param options - Configuration options
 * @returns Object with state and handlers for roving tabindex
 */
export function useRovingTabIndex(
  itemCount: number,
  containerRef: React.RefObject<HTMLElement | null>,
  options: Partial<RovingTabIndexOptions> = {},
): UseRovingTabIndexReturn {
  const {
    columns: providedColumns,
    wrapHorizontal = true,
    wrapVertical = false,
    initialIndex = 0,
  } = options

  const [activeIndex, setActiveIndexState] = useState(
    Math.min(Math.max(0, initialIndex), Math.max(0, itemCount - 1)),
  )
  const [detectedColumns, setDetectedColumns] = useState(providedColumns ?? 1)

  // Use provided columns or detected columns
  const columns = providedColumns ?? detectedColumns

  // Detect columns on mount and resize
  useEffect(() => {
    if (providedColumns !== undefined) return // Skip if columns explicitly provided

    const updateColumns = () => {
      const detected = detectColumns(containerRef)
      setDetectedColumns(detected)
    }

    // Initial detection (defer to allow render)
    const timeoutId = setTimeout(updateColumns, 0)

    // Watch for resize
    const observer = new window.ResizeObserver(updateColumns)
    const container = containerRef.current
    if (container) {
      observer.observe(container)
    }

    return () => {
      clearTimeout(timeoutId)
      observer.disconnect()
    }
  }, [containerRef, providedColumns, itemCount])

  // Clamp active index when item count changes
  useEffect(() => {
    if (itemCount === 0) {
      setActiveIndexState(0)
    } else if (activeIndex >= itemCount) {
      setActiveIndexState(itemCount - 1)
    }
  }, [itemCount, activeIndex])

  /**
   * Set active index with bounds checking
   */
  const setActiveIndex = useCallback(
    (index: number) => {
      if (itemCount === 0) return
      const clampedIndex = Math.min(Math.max(0, index), itemCount - 1)
      setActiveIndexState(clampedIndex)
    },
    [itemCount],
  )

  /**
   * Navigate within the grid based on key press
   */
  const navigate = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right' | 'home' | 'end') => {
      if (itemCount === 0) return

      let newIndex = activeIndex

      switch (direction) {
        case 'up': {
          const targetIndex = activeIndex - columns
          if (targetIndex >= 0) {
            newIndex = targetIndex
          } else if (wrapVertical) {
            // Wrap to same column in last row
            const currentColumn = activeIndex % columns
            const lastRowStart = Math.floor((itemCount - 1) / columns) * columns
            const targetInLastRow = lastRowStart + currentColumn
            newIndex = Math.min(targetInLastRow, itemCount - 1)
          }
          break
        }

        case 'down': {
          const targetIndex = activeIndex + columns
          if (targetIndex < itemCount) {
            newIndex = targetIndex
          } else if (wrapVertical) {
            // Wrap to same column in first row
            const currentColumn = activeIndex % columns
            newIndex = currentColumn
          }
          break
        }

        case 'left': {
          if (activeIndex > 0) {
            newIndex = activeIndex - 1
          } else if (wrapHorizontal) {
            newIndex = itemCount - 1
          }
          break
        }

        case 'right': {
          if (activeIndex < itemCount - 1) {
            newIndex = activeIndex + 1
          } else if (wrapHorizontal) {
            newIndex = 0
          }
          break
        }

        case 'home':
          newIndex = 0
          break

        case 'end':
          newIndex = itemCount - 1
          break
      }

      if (newIndex !== activeIndex) {
        setActiveIndex(newIndex)
      }
    },
    [activeIndex, itemCount, columns, wrapHorizontal, wrapVertical, setActiveIndex],
  )

  /**
   * Handle keyboard events for grid navigation
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      // Only handle navigation keys
      const navigationKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
      if (!navigationKeys.includes(event.key)) return

      event.preventDefault()

      switch (event.key) {
        case 'ArrowUp':
          navigate('up')
          break
        case 'ArrowDown':
          navigate('down')
          break
        case 'ArrowLeft':
          navigate('left')
          break
        case 'ArrowRight':
          navigate('right')
          break
        case 'Home':
          navigate('home')
          break
        case 'End':
          navigate('end')
          break
      }
    },
    [navigate],
  )

  /**
   * Get tabIndex for an item (0 for active, -1 for others)
   */
  const getTabIndex = useCallback(
    (index: number): 0 | -1 => {
      return index === activeIndex ? 0 : -1
    },
    [activeIndex],
  )

  /**
   * Check if an item is active
   */
  const isActive = useCallback(
    (index: number): boolean => {
      return index === activeIndex
    },
    [activeIndex],
  )

  /**
   * Container props for spreading
   */
  const containerProps = useMemo(
    () => ({
      role: 'grid' as const,
      'aria-label': 'Inspiration items',
      onKeyDown: handleKeyDown,
    }),
    [handleKeyDown],
  )

  /**
   * Get props for a grid item
   */
  const getItemProps = useCallback(
    (index: number) => ({
      role: 'gridcell' as const,
      tabIndex: getTabIndex(index),
      'aria-selected': isActive(index),
      'data-index': index,
    }),
    [getTabIndex, isActive],
  )

  return {
    activeIndex,
    setActiveIndex,
    getTabIndex,
    isActive,
    handleKeyDown,
    containerProps,
    getItemProps,
  }
}

export default useRovingTabIndex

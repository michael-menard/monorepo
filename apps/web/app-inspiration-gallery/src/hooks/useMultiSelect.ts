/**
 * useMultiSelect Hook
 *
 * Manages multi-selection state for gallery items.
 * Supports shift-click range selection and keyboard shortcuts.
 *
 * INSP-021: Multi-Select & Bulk Ops
 */

import { useState, useCallback, useRef } from 'react'

export interface UseMultiSelectOptions {
  /** Maximum number of items that can be selected */
  maxSelection?: number
  /** Callback when selection changes */
  onSelectionChange?: (selectedIds: string[]) => void
}

export interface UseMultiSelectReturn {
  /** Set of currently selected item IDs */
  selectedIds: Set<string>
  /** Whether multi-select mode is active */
  isMultiSelectMode: boolean
  /** Toggle selection of a single item */
  toggleSelect: (id: string, shiftKey?: boolean) => void
  /** Select a single item (clearing others) */
  selectOnly: (id: string) => void
  /** Select multiple items */
  selectMany: (ids: string[]) => void
  /** Clear all selections */
  clearSelection: () => void
  /** Select all items */
  selectAll: (allIds: string[]) => void
  /** Check if an item is selected */
  isSelected: (id: string) => boolean
  /** Enter multi-select mode */
  enterMultiSelectMode: () => void
  /** Exit multi-select mode */
  exitMultiSelectMode: () => void
  /** Get count of selected items */
  selectionCount: number
}

/**
 * useMultiSelect Hook
 *
 * Provides multi-selection functionality with:
 * - Click to toggle individual items
 * - Shift+click for range selection
 * - Select all / clear all
 * - Multi-select mode toggle
 */
export function useMultiSelect(
  itemIds: string[],
  options: UseMultiSelectOptions = {},
): UseMultiSelectReturn {
  const { maxSelection = Infinity, onSelectionChange } = options

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  const lastSelectedRef = useRef<string | null>(null)

  // Update selection and notify
  const updateSelection = useCallback(
    (newSelection: Set<string>) => {
      setSelectedIds(newSelection)
      onSelectionChange?.(Array.from(newSelection))
    },
    [onSelectionChange],
  )

  // Toggle selection of a single item
  const toggleSelect = useCallback(
    (id: string, shiftKey = false) => {
      setSelectedIds(prev => {
        const next = new Set(prev)

        if (shiftKey && lastSelectedRef.current && isMultiSelectMode) {
          // Shift+click: select range
          const lastIndex = itemIds.indexOf(lastSelectedRef.current)
          const currentIndex = itemIds.indexOf(id)

          if (lastIndex !== -1 && currentIndex !== -1) {
            const start = Math.min(lastIndex, currentIndex)
            const end = Math.max(lastIndex, currentIndex)

            for (let i = start; i <= end; i++) {
              if (next.size < maxSelection) {
                next.add(itemIds[i])
              }
            }
          }
        } else {
          // Regular click: toggle single item
          if (next.has(id)) {
            next.delete(id)
          } else if (next.size < maxSelection) {
            next.add(id)
          }
        }

        lastSelectedRef.current = id
        onSelectionChange?.(Array.from(next))
        return next
      })
    },
    [itemIds, maxSelection, isMultiSelectMode, onSelectionChange],
  )

  // Select only one item
  const selectOnly = useCallback(
    (id: string) => {
      const next = new Set([id])
      lastSelectedRef.current = id
      updateSelection(next)
    },
    [updateSelection],
  )

  // Select multiple items
  const selectMany = useCallback(
    (ids: string[]) => {
      const next = new Set(ids.slice(0, maxSelection))
      if (ids.length > 0) {
        lastSelectedRef.current = ids[ids.length - 1]
      }
      updateSelection(next)
    },
    [maxSelection, updateSelection],
  )

  // Clear all selections
  const clearSelection = useCallback(() => {
    lastSelectedRef.current = null
    updateSelection(new Set())
    setIsMultiSelectMode(false)
  }, [updateSelection])

  // Select all items
  const selectAll = useCallback(
    (allIds: string[]) => {
      const next = new Set(allIds.slice(0, maxSelection))
      if (allIds.length > 0) {
        lastSelectedRef.current = allIds[allIds.length - 1]
      }
      updateSelection(next)
    },
    [maxSelection, updateSelection],
  )

  // Check if item is selected
  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds])

  // Enter multi-select mode
  const enterMultiSelectMode = useCallback(() => {
    setIsMultiSelectMode(true)
  }, [])

  // Exit multi-select mode
  const exitMultiSelectMode = useCallback(() => {
    setIsMultiSelectMode(false)
    clearSelection()
  }, [clearSelection])

  return {
    selectedIds,
    isMultiSelectMode,
    toggleSelect,
    selectOnly,
    selectMany,
    clearSelection,
    selectAll,
    isSelected,
    enterMultiSelectMode,
    exitMultiSelectMode,
    selectionCount: selectedIds.size,
  }
}

export default useMultiSelect

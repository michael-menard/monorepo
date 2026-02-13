/**
 * useMultiSelect Hook Tests
 *
 * INSP-021: Multi-Select & Bulk Ops
 */

import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMultiSelect } from '../useMultiSelect'

describe('useMultiSelect', () => {
  const itemIds = ['item-1', 'item-2', 'item-3', 'item-4', 'item-5']

  describe('initial state', () => {
    it('starts with empty selection', () => {
      const { result } = renderHook(() => useMultiSelect(itemIds))

      expect(result.current.selectedIds.size).toBe(0)
      expect(result.current.selectionCount).toBe(0)
    })

    it('starts with multi-select mode disabled', () => {
      const { result } = renderHook(() => useMultiSelect(itemIds))

      expect(result.current.isMultiSelectMode).toBe(false)
    })
  })

  describe('toggleSelect', () => {
    it('adds item to selection when not selected', () => {
      const { result } = renderHook(() => useMultiSelect(itemIds))

      act(() => {
        result.current.toggleSelect('item-1')
      })

      expect(result.current.selectedIds.has('item-1')).toBe(true)
      expect(result.current.selectionCount).toBe(1)
    })

    it('removes item from selection when already selected', () => {
      const { result } = renderHook(() => useMultiSelect(itemIds))

      act(() => {
        result.current.toggleSelect('item-1')
      })

      act(() => {
        result.current.toggleSelect('item-1')
      })

      expect(result.current.selectedIds.has('item-1')).toBe(false)
      expect(result.current.selectionCount).toBe(0)
    })

    it('can select multiple items', () => {
      const { result } = renderHook(() => useMultiSelect(itemIds))

      act(() => {
        result.current.toggleSelect('item-1')
      })

      act(() => {
        result.current.toggleSelect('item-3')
      })

      expect(result.current.selectedIds.has('item-1')).toBe(true)
      expect(result.current.selectedIds.has('item-3')).toBe(true)
      expect(result.current.selectionCount).toBe(2)
    })
  })

  describe('selectOnly', () => {
    it('selects single item and clears others', () => {
      const { result } = renderHook(() => useMultiSelect(itemIds))

      act(() => {
        result.current.toggleSelect('item-1')
        result.current.toggleSelect('item-2')
      })

      act(() => {
        result.current.selectOnly('item-3')
      })

      expect(result.current.selectedIds.has('item-1')).toBe(false)
      expect(result.current.selectedIds.has('item-2')).toBe(false)
      expect(result.current.selectedIds.has('item-3')).toBe(true)
      expect(result.current.selectionCount).toBe(1)
    })
  })

  describe('selectMany', () => {
    it('selects multiple items at once', () => {
      const { result } = renderHook(() => useMultiSelect(itemIds))

      act(() => {
        result.current.selectMany(['item-1', 'item-2', 'item-3'])
      })

      expect(result.current.selectedIds.has('item-1')).toBe(true)
      expect(result.current.selectedIds.has('item-2')).toBe(true)
      expect(result.current.selectedIds.has('item-3')).toBe(true)
      expect(result.current.selectionCount).toBe(3)
    })

    it('respects maxSelection option', () => {
      const { result } = renderHook(() =>
        useMultiSelect(itemIds, { maxSelection: 2 }),
      )

      act(() => {
        result.current.selectMany(['item-1', 'item-2', 'item-3'])
      })

      expect(result.current.selectionCount).toBe(2)
    })
  })

  describe('selectAll', () => {
    it('selects all provided items', () => {
      const { result } = renderHook(() => useMultiSelect(itemIds))

      act(() => {
        result.current.selectAll(itemIds)
      })

      expect(result.current.selectionCount).toBe(5)
      itemIds.forEach(id => {
        expect(result.current.selectedIds.has(id)).toBe(true)
      })
    })

    it('respects maxSelection option', () => {
      const { result } = renderHook(() =>
        useMultiSelect(itemIds, { maxSelection: 3 }),
      )

      act(() => {
        result.current.selectAll(itemIds)
      })

      expect(result.current.selectionCount).toBe(3)
    })
  })

  describe('clearSelection', () => {
    it('clears all selected items', () => {
      const { result } = renderHook(() => useMultiSelect(itemIds))

      act(() => {
        result.current.selectAll(itemIds)
      })

      act(() => {
        result.current.clearSelection()
      })

      expect(result.current.selectionCount).toBe(0)
      expect(result.current.selectedIds.size).toBe(0)
    })

    it('exits multi-select mode when clearing', () => {
      const { result } = renderHook(() => useMultiSelect(itemIds))

      act(() => {
        result.current.enterMultiSelectMode()
        result.current.selectAll(itemIds)
      })

      act(() => {
        result.current.clearSelection()
      })

      expect(result.current.isMultiSelectMode).toBe(false)
    })
  })

  describe('isSelected', () => {
    it('returns true for selected items', () => {
      const { result } = renderHook(() => useMultiSelect(itemIds))

      act(() => {
        result.current.toggleSelect('item-2')
      })

      expect(result.current.isSelected('item-2')).toBe(true)
    })

    it('returns false for unselected items', () => {
      const { result } = renderHook(() => useMultiSelect(itemIds))

      act(() => {
        result.current.toggleSelect('item-2')
      })

      expect(result.current.isSelected('item-1')).toBe(false)
    })
  })

  describe('multi-select mode', () => {
    it('can enter multi-select mode', () => {
      const { result } = renderHook(() => useMultiSelect(itemIds))

      act(() => {
        result.current.enterMultiSelectMode()
      })

      expect(result.current.isMultiSelectMode).toBe(true)
    })

    it('can exit multi-select mode', () => {
      const { result } = renderHook(() => useMultiSelect(itemIds))

      act(() => {
        result.current.enterMultiSelectMode()
      })

      act(() => {
        result.current.exitMultiSelectMode()
      })

      expect(result.current.isMultiSelectMode).toBe(false)
    })

    it('clears selection when exiting multi-select mode', () => {
      const { result } = renderHook(() => useMultiSelect(itemIds))

      act(() => {
        result.current.enterMultiSelectMode()
        result.current.selectAll(itemIds)
      })

      act(() => {
        result.current.exitMultiSelectMode()
      })

      expect(result.current.selectionCount).toBe(0)
    })
  })

  describe('onSelectionChange callback', () => {
    it('calls callback when selection changes', () => {
      const onSelectionChange = vi.fn()
      const { result } = renderHook(() =>
        useMultiSelect(itemIds, { onSelectionChange }),
      )

      act(() => {
        result.current.toggleSelect('item-1')
      })

      expect(onSelectionChange).toHaveBeenCalledWith(['item-1'])
    })

    it('calls callback with empty array when cleared', () => {
      const onSelectionChange = vi.fn()
      const { result } = renderHook(() =>
        useMultiSelect(itemIds, { onSelectionChange }),
      )

      act(() => {
        result.current.toggleSelect('item-1')
      })

      act(() => {
        result.current.clearSelection()
      })

      expect(onSelectionChange).toHaveBeenLastCalledWith([])
    })

    it('calls callback with all IDs when selectAll is called', () => {
      const onSelectionChange = vi.fn()
      const { result } = renderHook(() =>
        useMultiSelect(itemIds, { onSelectionChange }),
      )

      act(() => {
        result.current.selectAll(itemIds)
      })

      expect(onSelectionChange).toHaveBeenCalledWith(itemIds)
    })
  })

  describe('maxSelection option', () => {
    it('prevents selecting more than maxSelection items', () => {
      const { result } = renderHook(() =>
        useMultiSelect(itemIds, { maxSelection: 2 }),
      )

      act(() => {
        result.current.toggleSelect('item-1')
        result.current.toggleSelect('item-2')
        result.current.toggleSelect('item-3')
      })

      expect(result.current.selectionCount).toBe(2)
      expect(result.current.selectedIds.has('item-3')).toBe(false)
    })
  })

  describe('shift-click range selection', () => {
    it('selects range when shift key is pressed in multi-select mode', () => {
      const { result } = renderHook(() => useMultiSelect(itemIds))

      act(() => {
        result.current.enterMultiSelectMode()
        result.current.toggleSelect('item-1') // First click
      })

      act(() => {
        result.current.toggleSelect('item-4', true) // Shift+click
      })

      // Should select items 1-4
      expect(result.current.selectedIds.has('item-1')).toBe(true)
      expect(result.current.selectedIds.has('item-2')).toBe(true)
      expect(result.current.selectedIds.has('item-3')).toBe(true)
      expect(result.current.selectedIds.has('item-4')).toBe(true)
      expect(result.current.selectionCount).toBe(4)
    })

    it('does not range select when not in multi-select mode', () => {
      const { result } = renderHook(() => useMultiSelect(itemIds))

      act(() => {
        result.current.toggleSelect('item-1')
      })

      act(() => {
        result.current.toggleSelect('item-4', true) // Shift+click but not in multi-select mode
      })

      // Should only toggle item-4, not range select
      expect(result.current.selectedIds.has('item-1')).toBe(true)
      expect(result.current.selectedIds.has('item-4')).toBe(true)
      expect(result.current.selectedIds.has('item-2')).toBe(false)
      expect(result.current.selectedIds.has('item-3')).toBe(false)
    })
  })
})

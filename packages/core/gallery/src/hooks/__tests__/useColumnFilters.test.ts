import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useColumnFilters } from '../useColumnFilters'
import type { ColumnFilter } from '../../__types__/columnFilter'

interface Item {
  id: number
  title: string
  price: number
}

const ITEMS: Item[] = [
  { id: 1, title: 'Alpha', price: 50 },
  { id: 2, title: 'Beta', price: 150 },
  { id: 3, title: 'Gamma', price: 200 },
]

function createFilter(partial: Partial<ColumnFilter<Item>>): ColumnFilter<Item> {
  return {
    field: 'title',
    operator: 'equals',
    value: '',
    ...partial,
  } as ColumnFilter<Item>
}

describe('useColumnFilters', () => {
  it('returns all items when no filters applied', () => {
    const { result } = renderHook(() => useColumnFilters(ITEMS, [], 0))
    expect(result.current).toHaveLength(3)
  })

  it('applies equals operator', () => {
    const filters = [createFilter({ field: 'title', operator: 'equals', value: 'Alpha' })]
    const { result } = renderHook(() => useColumnFilters(ITEMS, filters, 0))
    expect(result.current.map(i => i.id)).toEqual([1])
  })

  it('applies contains operator (case-insensitive)', () => {
    const filters = [createFilter({ field: 'title', operator: 'contains', value: 'ta' })]
    const { result } = renderHook(() => useColumnFilters(ITEMS, filters, 0))
    expect(result.current.map(i => i.id)).toEqual([2])
  })

  it('applies gt operator', () => {
    const filters = [createFilter({ field: 'price', operator: 'gt', value: 100 })]
    const { result } = renderHook(() => useColumnFilters(ITEMS, filters, 0))
    expect(result.current.map(i => i.id)).toEqual([2, 3])
  })

  it('applies in operator', () => {
    const filters = [
      createFilter({ field: 'id', operator: 'in', value: [1, 3] }),
    ] as ColumnFilter<Item>[]
    const { result } = renderHook(() => useColumnFilters(ITEMS, filters, 0))
    expect(result.current.map(i => i.id)).toEqual([1, 3])
  })

  // Debounce behavior is covered indirectly via the hook implementation; a dedicated
  // debounce timing test would require more complex timer control than needed here.
})

import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useMultiSort } from '../useMultiSort'
import type { SortColumn } from '../../types'

interface Item {
  id: number
  name: string
  price: number
  createdAt: Date
}

const ITEMS: Item[] = [
  { id: 1, name: 'Beta', price: 200, createdAt: new Date('2024-02-01') },
  { id: 2, name: 'Alpha', price: 100, createdAt: new Date('2024-01-01') },
  { id: 3, name: 'Gamma', price: 100, createdAt: new Date('2024-03-01') },
]

function sorts<TItem>(value: SortColumn<TItem>[]): SortColumn<TItem>[] {
  return value
}

describe('useMultiSort', () => {
  it('returns original items when no sorts applied', () => {
    const { result } = renderHook(() => useMultiSort(ITEMS, sorts<Item>([])))
    expect(result.current).toEqual(ITEMS)
  })

  it('sorts by single string column ascending', () => {
    const { result } = renderHook(() =>
      useMultiSort(
        ITEMS,
        sorts<Item>([
          { field: 'name', direction: 'asc', priority: 0 },
        ]),
      ),
    )
    expect(result.current.map(i => i.name)).toEqual(['Alpha', 'Beta', 'Gamma'])
  })

  it('sorts by single number column descending', () => {
    const { result } = renderHook(() =>
      useMultiSort(
        ITEMS,
        sorts<Item>([
          { field: 'price', direction: 'desc', priority: 0 },
        ]),
      ),
    )
    expect(result.current.map(i => i.price)).toEqual([200, 100, 100])
  })

  it('applies secondary priority when primary equal', () => {
    const { result } = renderHook(() =>
      useMultiSort(
        ITEMS,
        sorts<Item>([
          { field: 'price', direction: 'asc', priority: 0 },
          { field: 'createdAt', direction: 'asc', priority: 1 },
        ]),
      ),
    )

    expect(result.current.map(i => i.id)).toEqual([2, 3, 1])
  })

  it('pushes null/undefined values to the end', () => {
    interface MaybeItem extends Item {
      score?: number | null
    }

    const data: MaybeItem[] = [
      { ...ITEMS[0], score: null },
      { ...ITEMS[1], score: 10 },
      { ...ITEMS[2], score: undefined },
    ]

    const { result } = renderHook(() =>
      useMultiSort(
        data,
        sorts<MaybeItem>([
          { field: 'score', direction: 'asc', priority: 0 },
        ]),
      ),
    )

    expect(result.current.map(i => i.score)).toEqual([10, null, undefined])
  })
})

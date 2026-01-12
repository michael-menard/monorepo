import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useFullTextSearch } from '../useFullTextSearch'

interface Item {
  id: number
  title: string
  description?: string | null
  tags?: string[] | null
  count?: number | null
  active?: boolean | null
}

const ITEMS: Item[] = [
  {
    id: 1,
    title: 'Castle Fortress',
    description: 'Epic medieval castle with towers',
    tags: ['castle', 'medieval'],
    count: 10,
    active: true,
  },
  {
    id: 2,
    title: 'Space Explorer',
    description: 'Futuristic space ship',
    tags: ['space'],
    count: 5,
    active: false,
  },
  {
    id: 3,
    title: 'City Street',
    description: null,
    tags: null,
    count: null,
    active: null,
  },
]

const SEARCH_FIELDS: (keyof Item)[] = ['title', 'description', 'tags', 'count', 'active']

describe('useFullTextSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns all items when search term is empty', () => {
    const { result } = renderHook(() => useFullTextSearch(ITEMS, '', SEARCH_FIELDS))

    // Advance timers so initial debounce resolves
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current).toEqual(ITEMS)
  })

  it('returns all items when search term is whitespace', () => {
    const { result } = renderHook(() => useFullTextSearch(ITEMS, '   ', SEARCH_FIELDS))

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current).toEqual(ITEMS)
  })

  it('filters items matching search term in any field (case-insensitive)', () => {
    const { result, rerender } = renderHook(
      ({ term }) => useFullTextSearch(ITEMS, term, SEARCH_FIELDS),
      {
        initialProps: { term: '' },
      },
    )

    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Search by title
    rerender({ term: 'castle' })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current.map(i => i.id)).toEqual([1])

    // Search by description (different casing)
    rerender({ term: 'SPACE' })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current.map(i => i.id)).toEqual([2])

    // Search by tags
    rerender({ term: 'medieval' })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current.map(i => i.id)).toEqual([1])

    // Search by numeric field (converted to string)
    rerender({ term: '10' })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current.map(i => i.id)).toEqual([1])

    // Search by boolean field (converted to string)
    rerender({ term: 'true' })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current.map(i => i.id)).toEqual([1])
  })

  it('returns empty array when no items match', () => {
    const { result } = renderHook(() => useFullTextSearch(ITEMS, 'nonexistent', SEARCH_FIELDS))

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current).toEqual([])
  })

  it('handles null and undefined field values gracefully', () => {
    const itemsWithNulls: Item[] = [
      { id: 1, title: 'A', description: null, tags: null },
      { id: 2, title: 'B', description: undefined, tags: undefined },
    ]

    const { result } = renderHook(() =>
      useFullTextSearch(itemsWithNulls, 'a', ['title', 'description', 'tags']),
    )

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.map(i => i.id)).toEqual([1])
  })

  it('debounces search term by 300ms', () => {
    const { result, rerender } = renderHook(
      ({ term }) => useFullTextSearch(ITEMS, term, SEARCH_FIELDS),
      {
        initialProps: { term: '' },
      },
    )

    // Initial state
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current).toEqual(ITEMS)

    // Update search term but do not advance full debounce time
    rerender({ term: 'castle' })
    act(() => {
      vi.advanceTimersByTime(150)
    })

    // Still old results because debounce not completed
    expect(result.current).toEqual(ITEMS)

    // Advance past debounce
    act(() => {
      vi.advanceTimersByTime(150)
    })

    expect(result.current.map(i => i.id)).toEqual([1])
  })

  it('only applies latest search term after rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ term }) => useFullTextSearch(ITEMS, term, SEARCH_FIELDS),
      {
        initialProps: { term: '' },
      },
    )

    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Rapid sequence of updates
    rerender({ term: 'c' })
    act(() => {
      vi.advanceTimersByTime(100)
    })

    rerender({ term: 'ca' })
    act(() => {
      vi.advanceTimersByTime(100)
    })

    rerender({ term: 'castle' })

    // Before full debounce, results unchanged
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current).toEqual(ITEMS)

    // After debounce completes, only final term applied
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current.map(i => i.id)).toEqual([1])
  })
})

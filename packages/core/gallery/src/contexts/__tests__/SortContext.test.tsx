import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { SortProvider, useSortContext } from '../SortContext'
import type { SortColumn } from '../../types'

interface Item {
  id: number
  name: string
}

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SortProvider<Item>>{children}</SortProvider>
)

describe('SortContext', () => {
  it('adds sort column with correct priority', () => {
    const { result } = renderHook(() => useSortContext<Item>(), { wrapper })

    act(() => {
      result.current.addSort({ field: 'name', direction: 'asc' })
    })

    const [sort] = result.current.sorts as SortColumn<Item>[]
    expect(sort.priority).toBe(0)
  })

  it('removes sort and recalculates priorities', () => {
    const { result } = renderHook(() => useSortContext<Item>(), { wrapper })

    act(() => {
      result.current.addSort({ field: 'name', direction: 'asc' })
      result.current.addSort({ field: 'id', direction: 'desc' })
    })

    act(() => {
      result.current.removeSort(0)
    })

    expect(result.current.sorts[0].priority).toBe(0)
  })

  it('reorders sorts and recalculates priorities', () => {
    const { result } = renderHook(() => useSortContext<Item>(), { wrapper })

    act(() => {
      result.current.addSort({ field: 'name', direction: 'asc' })
      result.current.addSort({ field: 'id', direction: 'desc' })
    })

    act(() => {
      result.current.reorderSorts(1, 0)
    })

    expect(result.current.sorts[0].priority).toBe(0)
  })

  it('throws when used outside provider', () => {
    expect(() => {
      renderHook(() => useSortContext<Item>())
    }).toThrowError('useSortContext must be used within a SortProvider')
  })
})

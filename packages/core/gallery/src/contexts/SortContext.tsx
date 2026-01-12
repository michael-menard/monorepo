import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import type { SortColumn } from '../types'

interface SortContextValue<TItem extends Record<string, unknown> = Record<string, unknown>> {
  sorts: SortColumn<TItem>[]
  addSort: (column: Omit<SortColumn<TItem>, 'priority'>) => void
  updateSort: (index: number, updates: Partial<SortColumn<TItem>>) => void
  removeSort: (index: number) => void
  reorderSorts: (fromIndex: number, toIndex: number) => void
  clearSorts: () => void
}

const SortContext = createContext<SortContextValue<any> | null>(null)

interface SortProviderProps<TItem extends Record<string, unknown>> {
  children: ReactNode
  initialSorts?: SortColumn<TItem>[]
  maxSorts?: number
}

export function SortProvider<TItem extends Record<string, unknown>>({
  children,
  initialSorts = [],
  maxSorts = 3,
}: SortProviderProps<TItem>) {
  const [sorts, setSorts] = useState<SortColumn<TItem>[]>(initialSorts)

  const addSort = useCallback(
    (column: Omit<SortColumn<TItem>, 'priority'>) => {
      setSorts(prev => {
        if (prev.length >= maxSorts) return prev
        return [...prev, { ...column, priority: prev.length }]
      })
    },
    [maxSorts],
  )

  const updateSort = useCallback((index: number, updates: Partial<SortColumn<TItem>>) => {
    setSorts(prev => prev.map((sort, i) => (i === index ? { ...sort, ...updates } : sort)))
  }, [])

  const removeSort = useCallback((index: number) => {
    setSorts(prev => {
      const updated = prev.filter((_, i) => i !== index)
      return updated.map((sort, i) => ({ ...sort, priority: i }))
    })
  }, [])

  const reorderSorts = useCallback((fromIndex: number, toIndex: number) => {
    setSorts(prev => {
      const updated = [...prev]
      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)
      return updated.map((sort, i) => ({ ...sort, priority: i }))
    })
  }, [])

  const clearSorts = useCallback(() => {
    setSorts([])
  }, [])

  const value: SortContextValue<TItem> = useCallback(
    () => ({
      sorts,
      addSort,
      updateSort,
      removeSort,
      reorderSorts,
      clearSorts,
    }),
    [sorts, addSort, updateSort, removeSort, reorderSorts, clearSorts],
  )()

  return <SortContext.Provider value={value}>{children}</SortContext.Provider>
}

export function useSortContext<TItem extends Record<string, unknown> = Record<string, unknown>>() {
  const ctx = useContext(SortContext) as SortContextValue<TItem> | null
  if (!ctx) {
    throw new Error('useSortContext must be used within a SortProvider')
  }
  return ctx
}

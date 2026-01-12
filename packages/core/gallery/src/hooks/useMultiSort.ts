import { useEffect, useMemo, useState } from 'react'
import type { SortColumn, SortDirection } from '../types'

type Comparator<T> = (a: T, b: T) => number

function createComparator<TItem extends Record<string, unknown>>(
  field: keyof TItem,
  direction: SortDirection,
): Comparator<TItem> {
  return (a, b) => {
    const aVal = a[field]
    const bVal = b[field]

    if (aVal == null && bVal == null) return 0
    if (aVal == null) return 1
    if (bVal == null) return -1

    let comparison = 0

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      comparison = aVal.localeCompare(bVal)
    } else if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal
    } else if (aVal instanceof Date && bVal instanceof Date) {
      comparison = aVal.getTime() - bVal.getTime()
    } else {
      comparison = String(aVal).localeCompare(String(bVal))
    }

    return direction === 'asc' ? comparison : -comparison
  }
}

export function useMultiSort<TItem extends Record<string, unknown>>(
  items: TItem[],
  sorts: SortColumn<TItem>[],
) {
  const [debouncedSorts, setDebouncedSorts] = useState<SortColumn<TItem>[]>(sorts)

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSorts(sorts), 200)
    return () => clearTimeout(timeout)
  }, [sorts])

  const sortedItems = useMemo(() => {
    if (debouncedSorts.length === 0) return items

    const sortedColumns = [...debouncedSorts].sort((a, b) => a.priority - b.priority)

    return [...items].sort((a, b) => {
      for (const sortCol of sortedColumns) {
        const comparator = createComparator<TItem>(sortCol.field, sortCol.direction)
        const result = comparator(a, b)
        if (result !== 0) return result
      }
      return 0
    })
  }, [items, debouncedSorts])

  return sortedItems
}

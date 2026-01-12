import { useEffect, useMemo, useState } from 'react'
import type { ColumnFilter } from '../__types__/columnFilter'

const DEFAULT_DEBOUNCE_MS = 300

function applyFilter<TItem extends Record<string, unknown>>(
  item: TItem,
  filter: ColumnFilter<TItem>,
): boolean {
  const itemValue = item[filter.field]
  const filterValue = filter.value as any

  if (itemValue == null) return false
  if (filterValue == null) return true

  switch (filter.operator) {
    case 'equals':
      return itemValue === filterValue
    case 'contains':
      return String(itemValue).toLowerCase().includes(String(filterValue).toLowerCase())
    case 'gt':
      return Number(itemValue) > Number(filterValue)
    case 'lt':
      return Number(itemValue) < Number(filterValue)
    case 'gte':
      return Number(itemValue) >= Number(filterValue)
    case 'lte':
      return Number(itemValue) <= Number(filterValue)
    case 'in':
      return Array.isArray(filterValue) && filterValue.includes(itemValue)
    default:
      return true
  }
}

export function useColumnFilters<TItem extends Record<string, unknown>>(
  items: TItem[],
  filters: ColumnFilter<TItem>[],
  debounceMs: number = DEFAULT_DEBOUNCE_MS,
) {
  const [debouncedFilters, setDebouncedFilters] = useState<ColumnFilter<TItem>[]>(filters)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedFilters(filters)
    }, debounceMs)

    return () => clearTimeout(timeout)
  }, [filters, debounceMs])

  const filteredItems = useMemo(() => {
    if (debouncedFilters.length === 0) return items

    return items.filter(item => debouncedFilters.every(filter => applyFilter(item, filter)))
  }, [items, debouncedFilters])

  return filteredItems
}

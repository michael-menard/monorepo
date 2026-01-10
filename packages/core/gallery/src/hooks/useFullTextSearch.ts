import { useEffect, useMemo, useState } from 'react'

const DEFAULT_DEBOUNCE_MS = 300

const useDebouncedValue = <T>(value: T, delay: number = DEFAULT_DEBOUNCE_MS): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(timeout)
  }, [value, delay])

  return debouncedValue
}

export function useFullTextSearch<TItem extends Record<string, unknown>>(
  items: TItem[],
  searchTerm: string,
  searchFields: (keyof TItem)[],
): TItem[] {
  const debouncedSearch = useDebouncedValue(searchTerm, DEFAULT_DEBOUNCE_MS)

  return useMemo(() => {
    const trimmed = debouncedSearch.trim()

    if (!trimmed) {
      return items
    }

    const lowerSearch = trimmed.toLowerCase()

    return items.filter(item =>
      searchFields.some(field => {
        const value = item[field]

        if (value == null) {
          return false
        }

        if (Array.isArray(value)) {
          return value
            .filter(v => v != null)
            .some(v => String(v).toLowerCase().includes(lowerSearch))
        }

        return String(value).toLowerCase().includes(lowerSearch)
      }),
    )
  }, [items, debouncedSearch, searchFields])
}

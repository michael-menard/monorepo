import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export interface FilterContextValue<
  TFilters extends Record<string, unknown> = Record<string, unknown>,
> {
  filters: TFilters
  updateFilter: <K extends keyof TFilters>(key: K, value: TFilters[K]) => void
  clearFilters: () => void
  clearFilter: <K extends keyof TFilters>(key: K) => void
  isFiltering: boolean
  activeFilterCount: number
}

const FilterContext = createContext<FilterContextValue<any> | null>(null)

interface FilterProviderProps<TFilters extends Record<string, unknown>> {
  initialFilters: TFilters
  debounceMs?: number
  children: ReactNode
}

/**
 * Generic FilterProvider for gallery filters.
 * - Holds generic `filters` object.
 * - Exposes update/clear helpers.
 * - Tracks `isFiltering` with a simple debounce to drive loading UI.
 * - Computes `activeFilterCount` for badges / “Clear filters (n)” UI.
 */
export function FilterProvider<TFilters extends Record<string, unknown>>({
  initialFilters,
  debounceMs = 300,
  children,
}: FilterProviderProps<TFilters>) {
  const [filters, setFilters] = useState<TFilters>(initialFilters)
  const [isFiltering, setIsFiltering] = useState(false)

  useEffect(() => {
    setIsFiltering(true)
    const timeout = setTimeout(() => setIsFiltering(false), debounceMs)
    return () => clearTimeout(timeout)
  }, [filters, debounceMs])

  const activeFilterCount = useMemo(() => {
    return Object.keys(filters).reduce((count, key) => {
      const value = filters[key as keyof TFilters]
      const initial = initialFilters[key as keyof TFilters]

      const isActive =
        value !== initial &&
        value !== '' &&
        value !== undefined &&
        value !== null &&
        (!Array.isArray(value) || value.length > 0)

      return isActive ? count + 1 : count
    }, 0)
  }, [filters, initialFilters])

  const updateFilter = useCallback(<K extends keyof TFilters>(key: K, value: TFilters[K]) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters(initialFilters)
  }, [initialFilters])

  const clearFilter = useCallback(
    <K extends keyof TFilters>(key: K) => {
      setFilters(prev => ({
        ...prev,
        [key]: initialFilters[key],
      }))
    },
    [initialFilters],
  )

  const value: FilterContextValue<TFilters> = useMemo(
    () => ({
      filters,
      updateFilter,
      clearFilters,
      clearFilter,
      isFiltering,
      activeFilterCount,
    }),
    [filters, updateFilter, clearFilters, clearFilter, isFiltering, activeFilterCount],
  )

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
}

/**
 * Access the current gallery FilterContext.
 * Must be used inside <FilterProvider>.
 */
export function useFilterContext<
  TFilters extends Record<string, unknown> = Record<string, unknown>,
>() {
  const ctx = useContext(FilterContext) as FilterContextValue<TFilters> | null

  if (!ctx) {
    throw new Error(
      'useFilterContext must be used within a FilterProvider. ' +
        'Wrap your component tree with <FilterProvider initialFilters={{ ... }}>.',
    )
  }

  return ctx
}

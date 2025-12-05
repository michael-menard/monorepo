import { useCallback, useMemo, useState } from 'react'
import type {
  GalleryFilterState,
  GallerySortState,
  GallerySortDirection,
  GalleryQueryParams,
} from '../types'

/**
 * Options for configuring useGalleryState
 */
export interface UseGalleryStateOptions {
  /** Default sort configuration */
  defaultSort?: {
    field: string
    direction: GallerySortDirection
  }
  /** Default page size (default: 12) */
  defaultPageSize?: number
  /** Initial search value */
  initialSearch?: string
  /** Initial tags */
  initialTags?: string[]
  /** Initial theme */
  initialTheme?: string | null
}

/**
 * Return value from useGalleryState hook
 */
export interface UseGalleryStateReturn {
  // Filter state
  /** Current search query */
  search: string
  /** Set search query */
  setSearch: (search: string) => void
  /** Currently selected tags */
  tags: string[]
  /** Set all selected tags */
  setTags: (tags: string[]) => void
  /** Add a tag to selection */
  addTag: (tag: string) => void
  /** Remove a tag from selection */
  removeTag: (tag: string) => void
  /** Toggle a tag in selection */
  toggleTag: (tag: string) => void
  /** Currently selected theme */
  theme: string | null
  /** Set theme filter */
  setTheme: (theme: string | null) => void

  // Sort state
  /** Current sort field */
  sortField: string
  /** Current sort direction */
  sortDirection: GallerySortDirection
  /** Set sort field and direction */
  setSort: (field: string, direction?: GallerySortDirection) => void

  // Pagination state
  /** Current page number (1-indexed) */
  page: number
  /** Set current page */
  setPage: (page: number) => void
  /** Current page size */
  pageSize: number
  /** Set page size */
  setPageSize: (size: number) => void

  // Actions
  /** Clear all filters (keeps sort and pagination) */
  clearFilters: () => void
  /** Reset all state to defaults */
  resetAll: () => void

  // Computed
  /** Whether any filters are currently active */
  hasActiveFilters: boolean
  /** Filter state object */
  filterState: GalleryFilterState
  /** Sort state object */
  sortState: GallerySortState
  /** Query parameters for API calls */
  queryParams: GalleryQueryParams
}

/**
 * Hook for managing gallery filter, sort, and pagination state.
 *
 * @example
 * ```tsx
 * const {
 *   search, setSearch,
 *   tags, addTag, removeTag,
 *   theme, setTheme,
 *   sortField, sortDirection, setSort,
 *   page, setPage,
 *   clearFilters,
 *   hasActiveFilters,
 *   queryParams,
 * } = useGalleryState({
 *   defaultSort: { field: 'createdAt', direction: 'desc' },
 *   defaultPageSize: 20,
 * })
 *
 * // Use queryParams with RTK Query
 * const { data } = useGetItemsQuery(queryParams)
 * ```
 */
export const useGalleryState = (options: UseGalleryStateOptions = {}): UseGalleryStateReturn => {
  const {
    defaultSort = { field: 'createdAt', direction: 'desc' as GallerySortDirection },
    defaultPageSize = 12,
    initialSearch = '',
    initialTags = [],
    initialTheme = null,
  } = options

  // Filter state
  const [search, setSearchState] = useState(initialSearch)
  const [tags, setTagsState] = useState<string[]>(initialTags)
  const [theme, setThemeState] = useState<string | null>(initialTheme)

  // Sort state
  const [sortField, setSortField] = useState(defaultSort.field)
  const [sortDirection, setSortDirection] = useState<GallerySortDirection>(defaultSort.direction)

  // Pagination state
  const [page, setPageState] = useState(1)
  const [pageSize, setPageSizeState] = useState(defaultPageSize)

  // Filter setters (reset page on filter change)
  const setSearch = useCallback((value: string) => {
    setSearchState(value)
    setPageState(1)
  }, [])

  const setTags = useCallback((value: string[]) => {
    setTagsState(value)
    setPageState(1)
  }, [])

  const addTag = useCallback((tag: string) => {
    setTagsState(prev => (prev.includes(tag) ? prev : [...prev, tag]))
    setPageState(1)
  }, [])

  const removeTag = useCallback((tag: string) => {
    setTagsState(prev => prev.filter(t => t !== tag))
    setPageState(1)
  }, [])

  const toggleTag = useCallback((tag: string) => {
    setTagsState(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]))
    setPageState(1)
  }, [])

  const setTheme = useCallback((value: string | null) => {
    setThemeState(value)
    setPageState(1)
  }, [])

  // Sort setter
  const setSort = useCallback(
    (field: string, direction?: GallerySortDirection) => {
      setSortField(field)
      setSortDirection(direction ?? defaultSort.direction)
      setPageState(1)
    },
    [defaultSort.direction],
  )

  // Pagination setters
  const setPage = useCallback((value: number) => {
    setPageState(Math.max(1, value))
  }, [])

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(Math.max(1, size))
    setPageState(1)
  }, [])

  // Actions
  const clearFilters = useCallback(() => {
    setSearchState('')
    setTagsState([])
    setThemeState(null)
    setPageState(1)
  }, [])

  const resetAll = useCallback(() => {
    setSearchState(initialSearch)
    setTagsState(initialTags)
    setThemeState(initialTheme)
    setSortField(defaultSort.field)
    setSortDirection(defaultSort.direction)
    setPageState(1)
    setPageSizeState(defaultPageSize)
  }, [
    initialSearch,
    initialTags,
    initialTheme,
    defaultSort.field,
    defaultSort.direction,
    defaultPageSize,
  ])

  // Computed values
  const hasActiveFilters = useMemo(
    () => search.length > 0 || tags.length > 0 || theme !== null,
    [search, tags, theme],
  )

  const filterState: GalleryFilterState = useMemo(
    () => ({
      search,
      tags,
      theme,
    }),
    [search, tags, theme],
  )

  const sortState: GallerySortState = useMemo(
    () => ({
      field: sortField,
      direction: sortDirection,
    }),
    [sortField, sortDirection],
  )

  const queryParams: GalleryQueryParams = useMemo(() => {
    const params: GalleryQueryParams = {
      page,
      limit: pageSize,
      sort: sortField,
      order: sortDirection,
    }

    if (search) params.q = search
    if (tags.length > 0) params.tags = tags
    if (theme) params.theme = theme

    return params
  }, [search, tags, theme, sortField, sortDirection, page, pageSize])

  return {
    // Filter state
    search,
    setSearch,
    tags,
    setTags,
    addTag,
    removeTag,
    toggleTag,
    theme,
    setTheme,

    // Sort state
    sortField,
    sortDirection,
    setSort,

    // Pagination state
    page,
    setPage,
    pageSize,
    setPageSize,

    // Actions
    clearFilters,
    resetAll,

    // Computed
    hasActiveFilters,
    filterState,
    sortState,
    queryParams,
  }
}

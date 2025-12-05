import { useCallback, useMemo } from 'react'
import type {
  GalleryFilterState,
  GallerySortState,
  GallerySortDirection,
  GallerySearchParams,
} from '../types'

/**
 * URL parameter key mapping configuration
 */
export interface GalleryUrlParamKeys {
  /** URL param for search query (default: 'q') */
  search?: string
  /** URL param for tags (default: 'tags') */
  tags?: string
  /** URL param for theme (default: 'theme') */
  theme?: string
  /** URL param for sort field (default: 'sort') */
  sort?: string
  /** URL param for sort order (default: 'order') */
  order?: string
  /** URL param for page number (default: 'page') */
  page?: string
}

/**
 * Options for useGalleryUrl hook
 */
export interface UseGalleryUrlOptions<TSearch extends GallerySearchParams = GallerySearchParams> {
  /** Current search params from router (e.g., from useSearch()) */
  search: TSearch
  /** Navigate function to update URL (e.g., from useNavigate()) */
  navigate: (options: { search: (prev: TSearch) => TSearch }) => void
  /** Custom URL parameter key mapping */
  paramKeys?: GalleryUrlParamKeys
  /** Default sort field (default: 'createdAt') */
  defaultSortField?: string
  /** Default sort direction (default: 'desc') */
  defaultSortDirection?: GallerySortDirection
}

/**
 * Gallery state derived from URL parameters
 */
export interface GalleryUrlState {
  /** Current search query */
  search: string
  /** Current selected tags */
  tags: string[]
  /** Current theme filter */
  theme: string | null
  /** Current sort field */
  sortField: string
  /** Current sort direction */
  sortDirection: GallerySortDirection
  /** Current page number */
  page: number
}

/**
 * Return value from useGalleryUrl hook
 */
export interface UseGalleryUrlReturn {
  /** Current gallery state derived from URL */
  state: GalleryUrlState
  /** Update URL with new gallery state */
  updateUrl: (updates: Partial<GalleryUrlState>) => void
  /** Set search query in URL */
  setSearch: (search: string) => void
  /** Set tags in URL */
  setTags: (tags: string[]) => void
  /** Set theme filter in URL */
  setTheme: (theme: string | null) => void
  /** Set sort in URL */
  setSort: (field: string, direction?: GallerySortDirection) => void
  /** Set page in URL */
  setPage: (page: number) => void
  /** Clear all filters from URL (resets page too) */
  clearFilters: () => void
  /** Whether any filters are active */
  hasActiveFilters: boolean
  /** Filter state object */
  filterState: GalleryFilterState
  /** Sort state object */
  sortState: GallerySortState
}

const DEFAULT_PARAM_KEYS: Required<GalleryUrlParamKeys> = {
  search: 'q',
  tags: 'tags',
  theme: 'theme',
  sort: 'sort',
  order: 'order',
  page: 'page',
}

/**
 * Parse tags from URL param (can be string or array)
 */
const parseTags = (value: string | string[] | undefined): string[] => {
  if (!value) return []
  if (Array.isArray(value)) return value
  return value.split(',').filter(Boolean)
}

/**
 * Hook for syncing gallery state with URL search parameters.
 * Designed to work with TanStack Router's useSearch and useNavigate hooks.
 *
 * @example
 * ```tsx
 * // In a route component with TanStack Router
 * import { useSearch, useNavigate } from '@tanstack/react-router'
 *
 * function GalleryPage() {
 *   const search = useSearch({ from: '/gallery' })
 *   const navigate = useNavigate({ from: '/gallery' })
 *
 *   const {
 *     state,
 *     setSearch,
 *     setTags,
 *     setSort,
 *     clearFilters,
 *   } = useGalleryUrl({
 *     search,
 *     navigate,
 *   })
 *
 *   // Use state.search, state.tags, etc. for API queries
 *   const { data } = useGetItemsQuery({
 *     q: state.search,
 *     tags: state.tags,
 *     sort: state.sortField,
 *     order: state.sortDirection,
 *     page: state.page,
 *   })
 *
 *   return (
 *     <GalleryFilterBar
 *       search={state.search}
 *       onSearchChange={setSearch}
 *       selectedTags={state.tags}
 *       onTagsChange={setTags}
 *       // ...
 *     />
 *   )
 * }
 * ```
 */
export const useGalleryUrl = <TSearch extends GallerySearchParams = GallerySearchParams>({
  search,
  navigate,
  paramKeys = {},
  defaultSortField = 'createdAt',
  defaultSortDirection = 'desc',
}: UseGalleryUrlOptions<TSearch>): UseGalleryUrlReturn => {
  const keys = { ...DEFAULT_PARAM_KEYS, ...paramKeys }

  // Derive state from URL search params
  const state: GalleryUrlState = useMemo(
    () => ({
      search: (search[keys.search as keyof TSearch] as string) ?? '',
      tags: parseTags(search[keys.tags as keyof TSearch] as string | string[] | undefined),
      theme: (search[keys.theme as keyof TSearch] as string) ?? null,
      sortField: (search[keys.sort as keyof TSearch] as string) ?? defaultSortField,
      sortDirection:
        (search[keys.order as keyof TSearch] as GallerySortDirection) ?? defaultSortDirection,
      page: Number(search[keys.page as keyof TSearch]) || 1,
    }),
    [search, keys, defaultSortField, defaultSortDirection],
  )

  // Generic URL updater
  const updateUrl = useCallback(
    (updates: Partial<GalleryUrlState>) => {
      navigate({
        search: (prev: TSearch) => {
          const newSearch = { ...prev } as Record<string, unknown>

          // Apply updates with proper key mapping
          if ('search' in updates) {
            if (updates.search) {
              newSearch[keys.search] = updates.search
            } else {
              delete newSearch[keys.search]
            }
          }

          if ('tags' in updates) {
            if (updates.tags && updates.tags.length > 0) {
              newSearch[keys.tags] = updates.tags
            } else {
              delete newSearch[keys.tags]
            }
          }

          if ('theme' in updates) {
            if (updates.theme) {
              newSearch[keys.theme] = updates.theme
            } else {
              delete newSearch[keys.theme]
            }
          }

          if ('sortField' in updates && updates.sortField) {
            newSearch[keys.sort] = updates.sortField
          }

          if ('sortDirection' in updates && updates.sortDirection) {
            newSearch[keys.order] = updates.sortDirection
          }

          if ('page' in updates) {
            if (updates.page && updates.page > 1) {
              newSearch[keys.page] = updates.page
            } else {
              delete newSearch[keys.page]
            }
          }

          // Reset page when filters change (unless page is being explicitly set)
          const isFilterChange = 'search' in updates || 'tags' in updates || 'theme' in updates
          if (isFilterChange && !('page' in updates)) {
            delete newSearch[keys.page]
          }

          return newSearch as TSearch
        },
      })
    },
    [navigate, keys],
  )

  // Individual setters
  const setSearch = useCallback(
    (searchValue: string) => {
      updateUrl({ search: searchValue })
    },
    [updateUrl],
  )

  const setTags = useCallback(
    (tags: string[]) => {
      updateUrl({ tags })
    },
    [updateUrl],
  )

  const setTheme = useCallback(
    (theme: string | null) => {
      updateUrl({ theme })
    },
    [updateUrl],
  )

  const setSort = useCallback(
    (field: string, direction?: GallerySortDirection) => {
      updateUrl({
        sortField: field,
        sortDirection: direction ?? defaultSortDirection,
      })
    },
    [updateUrl, defaultSortDirection],
  )

  const setPage = useCallback(
    (page: number) => {
      updateUrl({ page })
    },
    [updateUrl],
  )

  const clearFilters = useCallback(() => {
    updateUrl({
      search: '',
      tags: [],
      theme: null,
      page: 1,
    })
  }, [updateUrl])

  // Computed values
  const hasActiveFilters = useMemo(
    () => state.search.length > 0 || state.tags.length > 0 || state.theme !== null,
    [state.search, state.tags, state.theme],
  )

  const filterState: GalleryFilterState = useMemo(
    () => ({
      search: state.search,
      tags: state.tags,
      theme: state.theme,
    }),
    [state.search, state.tags, state.theme],
  )

  const sortState: GallerySortState = useMemo(
    () => ({
      field: state.sortField,
      direction: state.sortDirection,
    }),
    [state.sortField, state.sortDirection],
  )

  return {
    state,
    updateUrl,
    setSearch,
    setTags,
    setTheme,
    setSort,
    setPage,
    clearFilters,
    hasActiveFilters,
    filterState,
    sortState,
  }
}

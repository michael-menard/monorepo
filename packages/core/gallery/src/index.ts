// @repo/gallery - Shared gallery components package

export const GALLERY_VERSION = '0.0.1'

// Components
export { GalleryGrid } from './components/GalleryGrid'
export type { GalleryGridProps, GalleryGridColumns } from './components/GalleryGrid'

export {
  GalleryCard,
  GalleryCardSkeleton,
  GalleryCardPropsSchema,
  GalleryCardSkeletonPropsSchema,
} from './components/GalleryCard'
export type { GalleryCardProps, GalleryCardSkeletonProps } from './components/GalleryCard'

export { GallerySearch } from './components/GallerySearch'
export type { GallerySearchProps } from './components/GallerySearch'

export { GalleryTagFilter } from './components/GalleryTagFilter'
export type { GalleryTagFilterProps } from './components/GalleryTagFilter'

export { GalleryThemeFilter } from './components/GalleryThemeFilter'
export type { GalleryThemeFilterProps } from './components/GalleryThemeFilter'

export { GalleryActiveFilters } from './components/GalleryActiveFilters'
export type { GalleryActiveFiltersProps, ActiveFilter } from './components/GalleryActiveFilters'

export { GalleryFilterBar } from './components/GalleryFilterBar'
export type { GalleryFilterBarProps, SortOption } from './components/GalleryFilterBar'

export { GallerySort, defaultGallerySortOptions } from './components/GallerySort'
export type { GallerySortProps, GallerySortOption, SortDirection } from './components/GallerySort'

export { GalleryLoadMore } from './components/GalleryLoadMore'
export type { GalleryLoadMoreProps } from './components/GalleryLoadMore'

export { GalleryPagination } from './components/GalleryPagination'
export type { GalleryPaginationProps } from './components/GalleryPagination'

export { GalleryEndOfResults } from './components/GalleryEndOfResults'
export type { GalleryEndOfResultsProps } from './components/GalleryEndOfResults'

export { GalleryLightbox } from './components/GalleryLightbox'
export type { GalleryLightboxProps, LightboxImage } from './components/GalleryLightbox'

export { GalleryEmptyState } from './components/GalleryEmptyState'
export type { GalleryEmptyStateProps } from './components/GalleryEmptyState'

export { GalleryNoResults } from './components/GalleryNoResults'
export type { GalleryNoResultsProps } from './components/GalleryNoResults'

export { GallerySkeleton } from './components/GallerySkeleton'
export type { GallerySkeletonProps } from './components/GallerySkeleton'

// Contexts
export { FilterProvider, useFilterContext } from './contexts/FilterContext'
export type { FilterContextValue } from './contexts/FilterContext'
export { SortProvider, useSortContext } from './contexts/SortContext'

// Hooks
export { useInfiniteScroll } from './hooks/useInfiniteScroll'
export type { UseInfiniteScrollOptions, UseInfiniteScrollReturn } from './hooks/useInfiniteScroll'

export { useLightbox } from './hooks/useLightbox'
export type { UseLightboxReturn } from './hooks/useLightbox'

export { useGalleryState } from './hooks/useGalleryState'
export type { UseGalleryStateOptions, UseGalleryStateReturn } from './hooks/useGalleryState'

export { useMultiSort } from './hooks/useMultiSort'
export { useViewMode } from './hooks/useViewMode'

export { useGalleryUrl } from './hooks/useGalleryUrl'
export type {
  UseGalleryUrlOptions,
  UseGalleryUrlReturn,
  GalleryUrlState,
  GalleryUrlParamKeys,
} from './hooks/useGalleryUrl'

// Types
export type {
  GalleryAspectRatio,
  GalleryCardImage,
  GalleryImage,
  GalleryItem,
  GalleryFilterState,
  GallerySortDirection,
  GallerySortState,
  GalleryPaginationState,
  GalleryState,
  // GallerySortOption - already exported from ./components/GallerySort
  GalleryQueryParams,
  GalleryResponse,
  GallerySearchParams,
  ViewMode,
} from './types'

// Column filtering (datatable)
export type {
  FilterOperator,
  ColumnFilter,
  ColumnType,
  FilterableColumn,
} from './__types__/columnFilter'

export { useColumnFilters } from './hooks/useColumnFilters'
export { ColumnFilterInput } from './components/ColumnFilterInput'
export { GalleryDataTable } from './components/GalleryDataTable'

// Utils
export {
  getViewModeStorageKey,
  getViewModeFromStorage,
  saveViewModeToStorage,
} from './utils/view-mode-storage'

// Zod Schemas (for runtime validation)
export {
  GalleryAspectRatioSchema,
  GalleryCardImageSchema,
  GalleryImageSchema,
  GalleryItemSchema,
  GalleryFilterStateSchema,
  GallerySortDirectionSchema,
  GallerySortStateSchema,
  GalleryPaginationStateSchema,
  GalleryStateSchema,
  GallerySortOptionSchema,
  GalleryQueryParamsSchema,
  GalleryResponseSchema,
  DefaultGalleryResponseSchema,
  GallerySearchParamsSchema,
} from './types'

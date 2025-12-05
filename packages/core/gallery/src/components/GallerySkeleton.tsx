import { cn, GalleryGridSkeleton, Skeleton } from '@repo/app-component-library'
import { GalleryCardSkeleton } from './GalleryCard'
import type { GalleryGridColumns } from './GalleryGrid'

/**
 * Props for the GallerySkeleton component
 */
export interface GallerySkeletonProps {
  /** Number of skeleton cards to render (default: 8) */
  count?: number
  /** Custom column configuration per breakpoint (matches GalleryGrid) */
  columns?: GalleryGridColumns
  /** Gap size using Tailwind spacing scale (default: 4) */
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12
  /** Whether to show filter bar skeleton (default: false) */
  showFilters?: boolean
  /** Additional CSS classes */
  className?: string
  /** Test ID for testing purposes */
  'data-testid'?: string
}

/**
 * Filter bar skeleton component for loading states
 */
const FilterBarSkeleton = ({
  'data-testid': testId = 'gallery-filter-skeleton',
}: {
  'data-testid'?: string
}) => (
  <div className="mb-6 space-y-4" data-testid={testId}>
    {/* Filter controls row */}
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
      {/* Search skeleton */}
      <div className="flex-1 min-w-[200px] sm:max-w-xs">
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
      {/* Tag filter skeleton */}
      <div className="flex-1 min-w-[200px] sm:max-w-xs">
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
      {/* Theme filter skeleton */}
      <div className="w-full sm:w-auto">
        <Skeleton className="h-10 w-[140px] rounded-md" />
      </div>
      {/* Sort skeleton */}
      <div className="w-full sm:w-auto sm:min-w-[180px]">
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </div>
  </div>
)

/**
 * A complete gallery loading skeleton that matches GalleryGrid layout.
 * Optionally includes filter bar skeleton.
 *
 * @example
 * ```tsx
 * // Basic usage
 * {isLoading ? (
 *   <GallerySkeleton count={12} />
 * ) : (
 *   <GalleryGrid>{items.map(...)}</GalleryGrid>
 * )}
 * ```
 *
 * @example
 * ```tsx
 * // With filter bar and custom columns
 * <GallerySkeleton
 *   count={8}
 *   showFilters
 *   columns={{ sm: 1, md: 2, lg: 3, xl: 4 }}
 * />
 * ```
 */
export const GallerySkeleton = ({
  count = 8,
  columns = {},
  gap = 4,
  showFilters = false,
  className,
  'data-testid': testId = 'gallery-skeleton',
}: GallerySkeletonProps) => {
  return (
    <div className={cn(className)} data-testid={testId}>
      {showFilters ? <FilterBarSkeleton data-testid={`${testId}-filters`} /> : null}

      <GalleryGridSkeleton
        count={count}
        columns={columns}
        gap={gap}
        renderCard={index => (
          <GalleryCardSkeleton key={index} data-testid={`${testId}-card-${index}`} />
        )}
        data-testid={`${testId}-grid`}
      />
    </div>
  )
}

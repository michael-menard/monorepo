import { cn, Button } from '@repo/app-component-library'

/**
 * Props for the GalleryLoadMore component
 */
export interface GalleryLoadMoreProps {
  /** Whether more items are being loaded */
  isLoading?: boolean
  /** Whether there are more items to load */
  hasMore?: boolean
  /** Called when the load more button is clicked */
  onLoadMore: () => void
  /** Button text when not loading (default: "Load More") */
  loadMoreText?: string
  /** Button text when loading (default: "Loading...") */
  loadingText?: string
  /** Additional CSS classes */
  className?: string
  /** Test ID for testing purposes */
  'data-testid'?: string
}

/**
 * A "Load More" button for manual pagination/loading.
 * Shows a loading spinner when fetching and hides when no more items.
 *
 * @example
 * ```tsx
 * <GalleryLoadMore
 *   isLoading={isFetchingNextPage}
 *   hasMore={hasNextPage}
 *   onLoadMore={fetchNextPage}
 * />
 * ```
 */
export const GalleryLoadMore = ({
  isLoading = false,
  hasMore = true,
  onLoadMore,
  loadMoreText = 'Load More',
  loadingText = 'Loading...',
  className,
  'data-testid': testId = 'gallery-load-more',
}: GalleryLoadMoreProps) => {
  // Don't render if no more items
  if (!hasMore && !isLoading) {
    return null
  }

  return (
    <div className={cn('flex justify-center py-4', className)} data-testid={testId}>
      <Button
        variant="outline"
        size="lg"
        onClick={onLoadMore}
        disabled={isLoading}
        className="min-w-[140px]"
        data-testid={`${testId}-button`}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {loadingText}
          </span>
        ) : (
          loadMoreText
        )}
      </Button>
    </div>
  )
}

import { useCallback, useMemo } from 'react'
import { cn, Button, AppSelect } from '@repo/app-component-library'

/**
 * Props for the GalleryPagination component
 */
export interface GalleryPaginationProps {
  /** Current page number (1-indexed) */
  currentPage: number
  /** Total number of pages */
  totalPages: number
  /** Called when page changes */
  onPageChange: (page: number) => void
  /** Current page size */
  pageSize?: number
  /** Called when page size changes */
  onPageSizeChange?: (size: number) => void
  /** Available page size options (default: [10, 20, 50]) */
  pageSizeOptions?: number[]
  /** Whether to show the page size selector */
  showPageSizeSelector?: boolean
  /** Maximum page buttons to show (default: 5) */
  maxPageButtons?: number
  /** Additional CSS classes */
  className?: string
  /** Test ID for testing purposes */
  'data-testid'?: string
}

/**
 * Generates an array of page numbers with ellipsis for large ranges.
 */
function generatePageNumbers(
  currentPage: number,
  totalPages: number,
  maxButtons: number,
): (number | 'ellipsis-start' | 'ellipsis-end')[] {
  if (totalPages <= maxButtons) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = []
  const halfButtons = Math.floor(maxButtons / 2)

  // Always show first page
  pages.push(1)

  // Calculate range around current page
  let start = Math.max(2, currentPage - halfButtons + 1)
  let end = Math.min(totalPages - 1, currentPage + halfButtons - 1)

  // Adjust if we're near the start
  if (currentPage <= halfButtons + 1) {
    start = 2
    end = maxButtons - 1
  }

  // Adjust if we're near the end
  if (currentPage >= totalPages - halfButtons) {
    start = totalPages - maxButtons + 2
    end = totalPages - 1
  }

  // Add ellipsis before middle pages if needed
  if (start > 2) {
    pages.push('ellipsis-start')
  }

  // Add middle pages
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  // Add ellipsis after middle pages if needed
  if (end < totalPages - 1) {
    pages.push('ellipsis-end')
  }

  // Always show last page
  if (totalPages > 1) {
    pages.push(totalPages)
  }

  return pages
}

/**
 * A pagination component with page numbers, navigation buttons, and optional page size selector.
 *
 * @example
 * ```tsx
 * <GalleryPagination
 *   currentPage={page}
 *   totalPages={totalPages}
 *   onPageChange={setPage}
 *   pageSize={pageSize}
 *   onPageSizeChange={setPageSize}
 *   showPageSizeSelector
 * />
 * ```
 */
export const GalleryPagination = ({
  currentPage,
  totalPages,
  onPageChange,
  pageSize = 20,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  showPageSizeSelector = false,
  maxPageButtons = 5,
  className,
  'data-testid': testId = 'gallery-pagination',
}: GalleryPaginationProps) => {
  const canGoPrevious = currentPage > 1
  const canGoNext = currentPage < totalPages

  const handlePrevious = useCallback(() => {
    if (canGoPrevious) {
      onPageChange(currentPage - 1)
    }
  }, [canGoPrevious, currentPage, onPageChange])

  const handleNext = useCallback(() => {
    if (canGoNext) {
      onPageChange(currentPage + 1)
    }
  }, [canGoNext, currentPage, onPageChange])

  const handlePageSizeChange = useCallback(
    (value: string) => {
      onPageSizeChange?.(parseInt(value, 10))
    },
    [onPageSizeChange],
  )

  const pageNumbers = useMemo(
    () => generatePageNumbers(currentPage, totalPages, maxPageButtons),
    [currentPage, totalPages, maxPageButtons],
  )

  const pageSizeSelectOptions = useMemo(
    () =>
      pageSizeOptions.map(size => ({
        value: String(size),
        label: `${size} per page`,
      })),
    [pageSizeOptions],
  )

  // Don't render if only one page
  if (totalPages <= 1 && !showPageSizeSelector) {
    return null
  }

  return (
    <nav
      className={cn('flex flex-wrap items-center justify-center gap-2', className)}
      role="navigation"
      aria-label="Pagination"
      data-testid={testId}
    >
      {/* Previous button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrevious}
        disabled={!canGoPrevious}
        aria-label="Go to previous page"
        data-testid={`${testId}-prev`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        <span className="sr-only sm:not-sr-only sm:ml-1">Previous</span>
      </Button>

      {/* Page numbers */}
      <div className="flex items-center gap-1" role="group" aria-label="Page numbers">
        {pageNumbers.map(page => {
          if (page === 'ellipsis-start' || page === 'ellipsis-end') {
            return (
              <span
                key={page}
                className="px-2 text-muted-foreground"
                aria-hidden="true"
                data-testid={`${testId}-${page}`}
              >
                ...
              </span>
            )
          }

          const isCurrentPage = page === currentPage
          return (
            <Button
              key={page}
              variant={isCurrentPage ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPageChange(page)}
              aria-label={`Go to page ${page}`}
              aria-current={isCurrentPage ? 'page' : undefined}
              data-testid={`${testId}-page-${page}`}
            >
              {page}
            </Button>
          )
        })}
      </div>

      {/* Next button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleNext}
        disabled={!canGoNext}
        aria-label="Go to next page"
        data-testid={`${testId}-next`}
      >
        <span className="sr-only sm:not-sr-only sm:mr-1">Next</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </Button>

      {/* Page size selector */}
      {showPageSizeSelector && onPageSizeChange ? (
        <div className="ml-4 flex items-center gap-2">
          <AppSelect
            options={pageSizeSelectOptions}
            value={String(pageSize)}
            onValueChange={handlePageSizeChange}
            aria-label="Items per page"
            data-testid={`${testId}-page-size`}
          />
        </div>
      ) : null}
    </nav>
  )
}

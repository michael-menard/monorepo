import { cn } from '@repo/app-component-library'
import { SearchX } from 'lucide-react'

/**
 * Props for the GalleryNoResults component
 */
export interface GalleryNoResultsProps {
  /** Current search term (if any) */
  searchTerm?: string
  /** Whether filters are currently applied */
  hasFilters: boolean
  /** Called when user wants to clear all filters */
  onClearFilters: () => void
  /** Called when user wants to clear search (optional) */
  onClearSearch?: () => void
  /** Additional CSS classes */
  className?: string
  /** Test ID for testing purposes */
  'data-testid'?: string
}

/**
 * No results state component for galleries when filters/search return no matches.
 * Shows contextual messaging and actions to help users find what they're looking for.
 *
 * @example
 * ```tsx
 * <GalleryNoResults
 *   searchTerm={search}
 *   hasFilters={selectedTags.length > 0 || selectedTheme !== null}
 *   onClearFilters={handleClearFilters}
 *   onClearSearch={() => setSearch('')}
 * />
 * ```
 */
export const GalleryNoResults = ({
  searchTerm,
  hasFilters,
  onClearFilters,
  onClearSearch,
  className,
  'data-testid': testId = 'gallery-no-results',
}: GalleryNoResultsProps) => {
  const hasSearchTerm = searchTerm && searchTerm.trim().length > 0

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid={testId}
      className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}
    >
      {/* Icon */}
      <div className="mb-4 rounded-full bg-muted p-4" data-testid={`${testId}-icon`}>
        <SearchX className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-foreground" data-testid={`${testId}-title`}>
        {hasSearchTerm ? (
          <>No results found for &ldquo;{searchTerm}&rdquo;</>
        ) : (
          <>No results found</>
        )}
      </h3>

      {/* Description */}
      <p
        className="mt-2 max-w-md text-sm text-muted-foreground"
        data-testid={`${testId}-description`}
      >
        {hasSearchTerm && hasFilters
          ? 'Try adjusting your search or clearing some filters.'
          : hasSearchTerm
            ? 'Try a different search term.'
            : hasFilters
              ? 'Try clearing some filters to see more results.'
              : 'No items match your criteria.'}
      </p>

      {/* Action Buttons */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {hasSearchTerm && onClearSearch ? (
          <button
            type="button"
            onClick={onClearSearch}
            className={cn(
              'inline-flex items-center justify-center',
              'rounded-md border border-input bg-background px-4 py-2',
              'text-sm font-medium text-foreground',
              'transition-colors hover:bg-accent hover:text-accent-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            )}
            data-testid={`${testId}-clear-search`}
          >
            Clear Search
          </button>
        ) : null}

        {hasFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className={cn(
              'inline-flex items-center justify-center',
              'rounded-md border border-input bg-background px-4 py-2',
              'text-sm font-medium text-foreground',
              'transition-colors hover:bg-accent hover:text-accent-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            )}
            data-testid={`${testId}-clear-filters`}
          >
            Clear Filters
          </button>
        ) : null}
      </div>
    </div>
  )
}

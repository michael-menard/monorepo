import { useCallback } from 'react'
import { cn, Badge, Button } from '@repo/app-component-library'

/**
 * Represents a single active filter
 */
export interface ActiveFilter {
  /** Filter category key (e.g., 'tag', 'theme') */
  key: string
  /** Filter value */
  value: string
  /** Display label for the filter */
  label: string
}

/**
 * Props for the GalleryActiveFilters component
 */
export interface GalleryActiveFiltersProps {
  /** Array of active filters to display */
  filters: ActiveFilter[]
  /** Called when a filter is removed */
  onRemove: (key: string, value: string) => void
  /** Called when "Clear All" is clicked */
  onClearAll: () => void
  /** Additional CSS classes */
  className?: string
  /** Test ID for testing purposes */
  'data-testid'?: string
}

/**
 * Displays active filters as removable badges with a "Clear All" button.
 *
 * @example
 * ```tsx
 * const filters = [
 *   { key: 'tag', value: 'star-wars', label: 'Star Wars' },
 *   { key: 'theme', value: 'space', label: 'Theme: Space' },
 * ]
 *
 * <GalleryActiveFilters
 *   filters={filters}
 *   onRemove={(key, value) => handleRemoveFilter(key, value)}
 *   onClearAll={() => handleClearAllFilters()}
 * />
 * ```
 */
export const GalleryActiveFilters = ({
  filters,
  onRemove,
  onClearAll,
  className,
  'data-testid': testId = 'gallery-active-filters',
}: GalleryActiveFiltersProps) => {
  const handleRemove = useCallback(
    (key: string, value: string) => {
      onRemove(key, value)
    },
    [onRemove],
  )

  // Don't render anything if no filters
  if (filters.length === 0) {
    return null
  }

  return (
    <div
      className={cn('flex flex-wrap items-center gap-2', className)}
      role="region"
      aria-label="Active filters"
      data-testid={testId}
    >
      {/* Active filter badges */}
      {filters.map(filter => (
        <Badge
          key={`${filter.key}-${filter.value}`}
          variant="secondary"
          className="flex items-center gap-1 pr-1"
          data-testid={`${testId}-badge-${filter.key}-${filter.value}`}
        >
          <span>{filter.label}</span>
          <button
            type="button"
            onClick={() => handleRemove(filter.key, filter.value)}
            className={cn(
              'ml-1 rounded-full p-0.5',
              'hover:bg-muted-foreground/20',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'transition-colors',
            )}
            aria-label={`Remove ${filter.label} filter`}
            data-testid={`${testId}-remove-${filter.key}-${filter.value}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </Badge>
      ))}

      {/* Clear All button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="text-muted-foreground hover:text-foreground h-7 px-2"
        data-testid={`${testId}-clear-all`}
      >
        Clear all
      </Button>
    </div>
  )
}

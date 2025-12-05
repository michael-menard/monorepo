import { useCallback } from 'react'
import { cn, AppSelect } from '@repo/app-component-library'

/**
 * Sort direction type
 */
export type SortDirection = 'asc' | 'desc'

/**
 * Configuration for a sort option
 */
export interface GallerySortOption {
  /** Sort value identifier (e.g., 'name', 'dateAdded') */
  value: string
  /** Display label for the option */
  label: string
  /** Default direction when this option is selected (default: 'asc') */
  defaultDirection?: SortDirection
}

/**
 * Props for the GallerySort component
 */
export interface GallerySortProps {
  /** Available sort options */
  options: GallerySortOption[]
  /** Currently selected sort value */
  value: string
  /** Current sort direction */
  direction: SortDirection
  /** Called when sort value or direction changes */
  onChange: (value: string, direction: SortDirection) => void
  /** Optional label to display above the select */
  label?: string
  /** Placeholder text when no option selected */
  placeholder?: string
  /** Additional CSS classes */
  className?: string
  /** Test ID for testing purposes */
  'data-testid'?: string
}

/**
 * Common sort options for gallery items
 */
export const defaultGallerySortOptions: GallerySortOption[] = [
  { value: 'name', label: 'Name', defaultDirection: 'asc' },
  { value: 'dateAdded', label: 'Date Added', defaultDirection: 'desc' },
  { value: 'dateModified', label: 'Date Modified', defaultDirection: 'desc' },
  { value: 'pieceCount', label: 'Piece Count', defaultDirection: 'desc' },
]

/**
 * A sort control with dropdown and direction toggle for gallery items.
 *
 * @example
 * ```tsx
 * const [sortBy, setSortBy] = useState('dateAdded')
 * const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
 *
 * <GallerySort
 *   options={defaultGallerySortOptions}
 *   value={sortBy}
 *   direction={sortDirection}
 *   onChange={(value, dir) => {
 *     setSortBy(value)
 *     setSortDirection(dir)
 *   }}
 * />
 * ```
 */
export const GallerySort = ({
  options,
  value,
  direction,
  onChange,
  label,
  placeholder = 'Sort by',
  className,
  'data-testid': testId = 'gallery-sort',
}: GallerySortProps) => {
  // Handle sort option change
  const handleSortChange = useCallback(
    (newValue: string) => {
      // Find the option to get its default direction
      const option = options.find(opt => opt.value === newValue)
      const newDirection = option?.defaultDirection ?? 'asc'
      onChange(newValue, newDirection)
    },
    [options, onChange],
  )

  // Handle direction toggle
  const handleDirectionToggle = useCallback(() => {
    const newDirection = direction === 'asc' ? 'desc' : 'asc'
    onChange(value, newDirection)
  }, [value, direction, onChange])

  // Convert options to AppSelect format
  const selectOptions = options.map(opt => ({
    value: opt.value,
    label: opt.label,
  }))

  return (
    <div className={cn('flex items-end gap-2', className)} data-testid={testId}>
      {/* Sort dropdown */}
      <div className="flex-1">
        {label ? (
          <label
            className="mb-1.5 block text-sm font-medium text-foreground"
            id={`${testId}-label`}
          >
            {label}
          </label>
        ) : null}
        <AppSelect
          options={selectOptions}
          value={value}
          onValueChange={handleSortChange}
          placeholder={placeholder}
          aria-labelledby={label ? `${testId}-label` : undefined}
          data-testid={`${testId}-select`}
        />
      </div>

      {/* Direction toggle button */}
      <button
        type="button"
        onClick={handleDirectionToggle}
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center',
          'rounded-md border border-input bg-background',
          'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'transition-colors',
        )}
        aria-label={`Sort ${direction === 'asc' ? 'ascending' : 'descending'}. Click to toggle.`}
        data-testid={`${testId}-direction`}
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
          className={cn('transition-transform duration-200', direction === 'desc' && 'rotate-180')}
          aria-hidden="true"
        >
          {/* Up arrow icon */}
          <path d="m5 12 7-7 7 7" />
          <path d="M12 19V5" />
        </svg>
      </button>
    </div>
  )
}

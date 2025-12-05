import { useCallback, useMemo } from 'react'
import { cn, MultiSelect } from '@repo/app-component-library'

/**
 * Props for the GalleryTagFilter component
 */
export interface GalleryTagFilterProps {
  /** Available tags to select from */
  tags: string[]
  /** Currently selected tag values */
  selected: string[]
  /** Called when selection changes */
  onChange: (tags: string[]) => void
  /** Placeholder text when no tags selected */
  placeholder?: string
  /** Whether the filter is disabled */
  disabled?: boolean
  /** Enable search within tags */
  searchable?: boolean
  /** Maximum tags to display before showing "+N more" */
  maxDisplayed?: number
  /** Additional CSS classes */
  className?: string
  /** Label for the filter */
  label?: string
  /** Test ID for testing purposes */
  'data-testid'?: string
}

/**
 * A multi-select tag filter for galleries.
 * Displays selected tags as removable pills/badges.
 *
 * @example
 * ```tsx
 * const [selectedTags, setSelectedTags] = useState<string[]>([])
 *
 * <GalleryTagFilter
 *   tags={['Star Wars', 'City', 'Space', 'Castle']}
 *   selected={selectedTags}
 *   onChange={setSelectedTags}
 *   placeholder="Filter by tags"
 * />
 * ```
 */
export const GalleryTagFilter = ({
  tags,
  selected,
  onChange,
  placeholder = 'Filter by tags',
  disabled = false,
  searchable = true,
  maxDisplayed = 3,
  className,
  label,
  'data-testid': testId = 'gallery-tag-filter',
}: GalleryTagFilterProps) => {
  // Convert string array to MultiSelect options format
  const options = useMemo(
    () =>
      tags.map(tag => ({
        value: tag,
        label: tag,
      })),
    [tags],
  )

  // Handle selection change
  const handleSelectionChange = useCallback(
    (values: string[]) => {
      onChange(values)
    },
    [onChange],
  )

  return (
    <div className={cn('w-full', className)} data-testid={testId}>
      <MultiSelect
        options={options}
        selectedValues={selected}
        onSelectionChange={handleSelectionChange}
        placeholder={placeholder}
        disabled={disabled}
        searchable={searchable}
        maxDisplayed={maxDisplayed}
        label={label}
        showClearButton={selected.length > 0}
      />
    </div>
  )
}

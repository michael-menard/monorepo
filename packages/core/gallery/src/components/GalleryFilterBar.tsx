import { useCallback, useMemo } from 'react'
import { cn, AppSelect } from '@repo/app-component-library'
import { GallerySearch } from './GallerySearch'
import { GalleryTagFilter } from './GalleryTagFilter'
import { GalleryThemeFilter } from './GalleryThemeFilter'
import { GalleryActiveFilters, ActiveFilter } from './GalleryActiveFilters'

/**
 * Sort option configuration
 */
export interface SortOption {
  /** Sort value (e.g., 'name-asc', 'date-desc') */
  value: string
  /** Display label */
  label: string
}

/**
 * Props for the GalleryFilterBar component
 */
export interface GalleryFilterBarProps {
  /** Current search text */
  search?: string
  /** Called when search changes (immediate) */
  onSearchChange?: (value: string) => void
  /** Called after search debounce */
  onSearch?: (value: string) => void
  /** Search placeholder text */
  searchPlaceholder?: string

  /** Available tags for filtering */
  tags?: string[]
  /** Currently selected tags */
  selectedTags?: string[]
  /** Called when tag selection changes */
  onTagsChange?: (tags: string[]) => void
  /** Tag filter placeholder */
  tagsPlaceholder?: string

  /** Available themes for filtering */
  themes?: string[]
  /** Currently selected theme */
  selectedTheme?: string | null
  /** Called when theme selection changes */
  onThemeChange?: (theme: string | null) => void
  /** Theme filter placeholder */
  themePlaceholder?: string

  /** Available sort options */
  sortOptions?: SortOption[]
  /** Currently selected sort */
  selectedSort?: string
  /** Called when sort changes */
  onSortChange?: (sort: string) => void
  /** Sort select placeholder */
  sortPlaceholder?: string

  /** Called when all filters should be cleared */
  onClearAll?: () => void

  /** Whether to show active filters section */
  showActiveFilters?: boolean

  /**
   * Custom filter UI slot - renders gallery-specific filters (e.g., store tabs, priority filters)
   * Displayed above the standard search/sort controls.
   */
  children?: React.ReactNode

  /** Additional CSS classes */
  className?: string
  /** Test ID for testing purposes */
  'data-testid'?: string
}

/**
 * A comprehensive filter bar combining search, tag filter, theme filter, and sort.
 * Responsive layout that stacks on mobile.
 *
 * @example
 * ```tsx
 * <GalleryFilterBar
 *   search={search}
 *   onSearchChange={setSearch}
 *   onSearch={handleDebouncedSearch}
 *   tags={availableTags}
 *   selectedTags={selectedTags}
 *   onTagsChange={setSelectedTags}
 *   themes={availableThemes}
 *   selectedTheme={selectedTheme}
 *   onThemeChange={setSelectedTheme}
 *   sortOptions={sortOptions}
 *   selectedSort={sortBy}
 *   onSortChange={setSortBy}
 * />
 * ```
 */
export const GalleryFilterBar = ({
  search = '',
  onSearchChange,
  onSearch,
  searchPlaceholder = 'Search...',
  tags = [],
  selectedTags = [],
  onTagsChange,
  tagsPlaceholder = 'Filter by tags',
  themes = [],
  selectedTheme = null,
  onThemeChange,
  themePlaceholder = 'All Themes',
  sortOptions = [],
  selectedSort = '',
  onSortChange,
  sortPlaceholder = 'Sort by',
  onClearAll,
  showActiveFilters = true,
  children,
  className,
  'data-testid': testId = 'gallery-filter-bar',
}: GalleryFilterBarProps) => {
  // Build active filters for display
  const activeFilters: ActiveFilter[] = useMemo(() => {
    const filters: ActiveFilter[] = []

    // Add selected tags
    selectedTags.forEach(tag => {
      filters.push({
        key: 'tag',
        value: tag,
        label: tag,
      })
    })

    // Add selected theme
    if (selectedTheme) {
      filters.push({
        key: 'theme',
        value: selectedTheme,
        label: `Theme: ${selectedTheme}`,
      })
    }

    return filters
  }, [selectedTags, selectedTheme])

  // Handle removing a single filter
  const handleRemoveFilter = useCallback(
    (key: string, value: string) => {
      if (key === 'tag' && onTagsChange) {
        onTagsChange(selectedTags.filter(tag => tag !== value))
      } else if (key === 'theme' && onThemeChange) {
        onThemeChange(null)
      }
    },
    [selectedTags, onTagsChange, onThemeChange],
  )

  // Handle clearing all filters
  const handleClearAll = useCallback(() => {
    if (onClearAll) {
      onClearAll()
    } else {
      // Default clear behavior
      onTagsChange?.([])
      onThemeChange?.(null)
      onSearchChange?.('')
    }
  }, [onClearAll, onTagsChange, onThemeChange, onSearchChange])

  // Check if we have any filter controls to show
  const hasSearch = onSearchChange || onSearch
  const hasTags = tags.length > 0 && onTagsChange
  const hasThemes = themes.length > 0 && onThemeChange
  const hasSort = sortOptions.length > 0 && onSortChange

  return (
    <div className={cn('space-y-4', className)} data-testid={testId}>
      {/* Custom Filter UI Slot - gallery-specific filters (e.g., store tabs) */}
      {children ? <div data-testid={`${testId}-custom-filters`}>{children}</div> : null}

      {/* Filter Controls Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        {/* Search */}
        {hasSearch ? (
          <div className="flex-1 min-w-[200px] sm:max-w-xs">
            <GallerySearch
              value={search}
              onChange={onSearchChange}
              onSearch={onSearch}
              placeholder={searchPlaceholder}
              data-testid={`${testId}-search`}
            />
          </div>
        ) : null}

        {/* Tag Filter */}
        {hasTags ? (
          <div className="flex-1 min-w-[200px] sm:max-w-xs">
            <GalleryTagFilter
              tags={tags}
              selected={selectedTags}
              onChange={onTagsChange}
              placeholder={tagsPlaceholder}
              data-testid={`${testId}-tags`}
            />
          </div>
        ) : null}

        {/* Theme Filter */}
        {hasThemes ? (
          <div className="w-full sm:w-auto">
            <GalleryThemeFilter
              themes={themes}
              selected={selectedTheme}
              onChange={onThemeChange}
              placeholder={themePlaceholder}
              data-testid={`${testId}-theme`}
            />
          </div>
        ) : null}

        {/* Sort */}
        {hasSort ? (
          <div className="w-full sm:w-auto sm:min-w-[180px]">
            <AppSelect
              options={sortOptions}
              value={selectedSort}
              onValueChange={onSortChange}
              placeholder={sortPlaceholder}
            />
          </div>
        ) : null}
      </div>

      {/* Active Filters Display */}
      {showActiveFilters && activeFilters.length > 0 ? (
        <GalleryActiveFilters
          filters={activeFilters}
          onRemove={handleRemoveFilter}
          onClearAll={handleClearAll}
          data-testid={`${testId}-active-filters`}
        />
      ) : null}
    </div>
  )
}

/**
 * GalleryFilterBar Component (Sets Gallery)
 *
 * Sets-specific filter bar providing search, theme, build status and sort controls,
 * plus a right-aligned slot for the view toggle.
 */
import type { ReactNode } from 'react'
import { Search } from 'lucide-react'
import { Input, AppSelect, cn } from '@repo/app-component-library'

export type BuiltFilterValue = 'all' | 'built' | 'unbuilt'

export type GalleryFilterBarProps = {
  /** Current search text */
  searchTerm: string
  /** Called when search input changes */
  onSearchChange: (value: string) => void

  /** Available themes for filtering */
  themes?: string[]
  /** Currently selected theme (null = all themes) */
  selectedTheme?: string | null
  /** Called when theme selection changes */
  onThemeChange?: (value: string | null) => void

  /** Build status filter (all | built | unbuilt) */
  builtFilter?: BuiltFilterValue
  /** Called when build status filter changes */
  onBuiltFilterChange?: (value: BuiltFilterValue) => void

  /** Current sort field value */
  sortField?: string
  /** Sort options (value should match SetListQuery.sortField) */
  sortOptions?: { value: string; label: string }[]
  /** Called when sort field changes */
  onSortChange?: (value: string) => void

  /** Right-aligned slot (typically the GalleryViewToggle) */
  children?: ReactNode
  className?: string
}

/**
 * GalleryFilterBar Component
 * Provides search, theme, build status and sort controls for the Sets gallery.
 */
export function GalleryFilterBar({
  searchTerm,
  onSearchChange,
  themes = [],
  selectedTheme = null,
  onThemeChange,
  builtFilter = 'all',
  onBuiltFilterChange,
  sortField,
  sortOptions = [],
  onSortChange,
  children,
  className,
}: GalleryFilterBarProps) {
  const hasThemeFilter = themes.length > 0 && Boolean(onThemeChange)
  const hasBuiltFilter = Boolean(onBuiltFilterChange)
  const hasSort = sortOptions.length > 0 && Boolean(onSortChange)

  const builtOptions: { value: BuiltFilterValue; label: string }[] = [
    { value: 'all', label: 'All statuses' },
    { value: 'built', label: 'Built' },
    { value: 'unbuilt', label: 'In Pieces' },
  ]

  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6',
        className,
      )}
    >
      {/* Search Input */}
      <div className="relative w-full sm:max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder="Search sets..."
          value={searchTerm}
          onChange={e => onSearchChange(e.target.value)}
          className="pl-10"
          aria-label="Search sets"
        />
      </div>

      {/* Filters + View Toggle */}
      <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
        {hasThemeFilter ? (
          <div className="min-w-[180px]">
            <AppSelect
              options={[
                { value: '__all__', label: 'All themes' },
                ...themes.map(theme => ({ value: theme, label: theme })),
              ]}
              value={selectedTheme ?? '__all__'}
              onValueChange={value => onThemeChange?.(value === '__all__' ? null : value)}
              aria-label="Filter by theme"
            />
          </div>
        ) : null}

        {hasBuiltFilter ? (
          <div className="min-w-[160px]">
            <AppSelect
              options={builtOptions}
              value={builtFilter}
              onValueChange={value => onBuiltFilterChange?.((value as BuiltFilterValue) ?? 'all')}
              aria-label="Filter by build status"
            />
          </div>
        ) : null}

        {hasSort ? (
          <div className="min-w-[180px]">
            <AppSelect
              options={sortOptions}
              value={sortField}
              onValueChange={value => onSortChange?.(value)}
              placeholder="Sort by"
              aria-label="Sort sets"
            />
          </div>
        ) : null}

        {children ? <div className="ml-1 flex items-center gap-2">{children}</div> : null}
      </div>
    </div>
  )
}

export default GalleryFilterBar

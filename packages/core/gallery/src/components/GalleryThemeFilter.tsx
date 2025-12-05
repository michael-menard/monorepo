import { useCallback, useMemo } from 'react'
import { cn, AppSelect } from '@repo/app-component-library'

/**
 * Props for the GalleryThemeFilter component
 */
export interface GalleryThemeFilterProps {
  /** Available themes to select from */
  themes: string[]
  /** Currently selected theme (null for "All Themes") */
  selected: string | null
  /** Called when selection changes */
  onChange: (theme: string | null) => void
  /** Placeholder text for "All Themes" option */
  placeholder?: string
  /** Whether the filter is disabled */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
  /** Label for the filter */
  label?: string
  /** Test ID for testing purposes */
  'data-testid'?: string
}

/** Special value representing "All Themes" selection */
const ALL_THEMES_VALUE = '__all__'

/**
 * A single-select theme filter dropdown for galleries.
 * Includes an "All Themes" option to clear the filter.
 *
 * @example
 * ```tsx
 * const [selectedTheme, setSelectedTheme] = useState<string | null>(null)
 *
 * <GalleryThemeFilter
 *   themes={['Star Wars', 'City', 'Space', 'Castle']}
 *   selected={selectedTheme}
 *   onChange={setSelectedTheme}
 *   placeholder="All Themes"
 * />
 * ```
 */
export const GalleryThemeFilter = ({
  themes,
  selected,
  onChange,
  placeholder = 'All Themes',
  disabled = false,
  className,
  label,
  'data-testid': testId = 'gallery-theme-filter',
}: GalleryThemeFilterProps) => {
  // Convert themes to options with "All Themes" first
  const options = useMemo(
    () => [
      { value: ALL_THEMES_VALUE, label: placeholder },
      ...themes.map(theme => ({
        value: theme,
        label: theme,
      })),
    ],
    [themes, placeholder],
  )

  // Handle value change - convert special value back to null
  const handleValueChange = useCallback(
    (value: string) => {
      onChange(value === ALL_THEMES_VALUE ? null : value)
    },
    [onChange],
  )

  // Convert null to special value for the select
  const selectValue = selected ?? ALL_THEMES_VALUE

  return (
    <div className={cn('w-full min-w-[180px]', className)} data-testid={testId}>
      {label ? (
        <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
      ) : null}
      <AppSelect
        options={options}
        value={selectValue}
        onValueChange={handleValueChange}
        disabled={disabled}
      />
    </div>
  )
}

/**
 * BuildStatusFilter Component
 *
 * Sets-specific filter for build status (All statuses / Built / In Pieces).
 * Uses AppSelect from @repo/app-component-library.
 *
 * @param value - Current filter value ('all' | 'built' | 'unbuilt')
 * @param onChange - Called when filter selection changes
 * @param className - Optional CSS class
 * @param aria-label - Accessible label for the select (defaults to "Filter by build status")
 * @param data-testid - Optional test ID (defaults to 'build-status-filter')
 */
import { cn, AppSelect } from '@repo/app-component-library'
import type { BuildStatusFilterProps, BuiltFilterValue } from './__types__'

export function BuildStatusFilter({
  value,
  onChange,
  className,
  'aria-label': ariaLabel = 'Filter by build status',
  'data-testid': testId = 'build-status-filter',
}: BuildStatusFilterProps) {
  const options = [
    { value: 'all', label: 'All statuses' },
    { value: 'built', label: 'Built' },
    { value: 'unbuilt', label: 'In Pieces' },
  ]

  return (
    <div className={cn('min-w-[160px]', className)} data-testid={testId}>
      <AppSelect
        options={options}
        value={value}
        onValueChange={val => onChange((val as BuiltFilterValue) ?? 'all')}
        aria-label={ariaLabel}
      />
    </div>
  )
}

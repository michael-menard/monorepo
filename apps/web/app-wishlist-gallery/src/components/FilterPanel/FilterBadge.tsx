/**
 * FilterBadge Component
 *
 * Displays active filter count badge for FilterPanel.
 * Hidden when no filters active.
 *
 * Story WISH-20172: Frontend Filter Panel UI
 * AC11: Filter panel shows active filter count badge
 */

import { z } from 'zod'
import { Badge } from '@repo/app-component-library'

const FilterBadgePropsSchema = z.object({
  count: z.number().int().min(0),
  className: z.string().optional(),
})

type FilterBadgeProps = z.infer<typeof FilterBadgePropsSchema>

/**
 * Badge showing active filter count
 *
 * @example
 * ```tsx
 * <FilterBadge count={3} />  // Shows "3 filters"
 * <FilterBadge count={0} />  // Hidden
 * ```
 */
export function FilterBadge({ count, className }: FilterBadgeProps) {
  if (count === 0) {
    return null
  }

  const label = count === 1 ? '1 filter' : `${count} filters`

  return (
    <Badge variant="secondary" className={className} data-testid="filter-badge">
      {label}
    </Badge>
  )
}

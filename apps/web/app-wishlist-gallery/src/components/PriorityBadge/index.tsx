/**
 * PriorityBadge Component
 *
 * Displays a priority level with stars and optional label.
 * Priority scale is 0-5 (None to Must Have).
 *
 * Story wish-2003: Detail & Edit Pages
 */

import { z } from 'zod'
import { Star } from 'lucide-react'
import { Badge } from '@repo/app-component-library'

/**
 * PriorityBadge props schema
 */
export const PriorityBadgePropsSchema = z.object({
  /** Priority level (0-5) */
  priority: z.number().int().min(0).max(5),
  /** Show text label */
  showLabel: z.boolean().default(false),
  /** Size variant */
  size: z.enum(['sm', 'md', 'lg']).default('md'),
  /** Additional CSS classes */
  className: z.string().optional(),
})

export type PriorityBadgeProps = z.infer<typeof PriorityBadgePropsSchema>

/**
 * Priority labels
 */
const priorityLabels: Record<number, string> = {
  0: 'None',
  1: 'Low',
  2: 'Medium',
  3: 'High',
  4: 'Very High',
  5: 'Must Have',
}

/**
 * Priority colors based on level
 */
const priorityColors: Record<number, string> = {
  0: 'text-muted-foreground',
  1: 'text-gray-400',
  2: 'text-blue-500',
  3: 'text-green-500',
  4: 'text-yellow-500',
  5: 'text-red-500',
}

/**
 * Star sizes
 */
const starSizes: Record<string, string> = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
}

/**
 * PriorityBadge Component
 *
 * Renders priority as stars with optional text label.
 */
export function PriorityBadge({
  priority,
  showLabel = false,
  size = 'md',
  className = '',
}: PriorityBadgeProps) {
  const label = priorityLabels[priority] || 'None'
  const color = priorityColors[priority] || priorityColors[0]
  const starSize = starSizes[size]

  if (priority === 0 && !showLabel) {
    return null
  }

  return (
    <div
      className={`flex items-center gap-1.5 ${className}`}
      data-testid="priority-badge"
      aria-label={`Priority: ${label}`}
    >
      {/* Stars */}
      {priority > 0 && (
        <span className={`flex items-center ${color}`}>
          {Array.from({ length: priority }).map((_, i) => (
            <Star key={i} className={`${starSize} fill-current`} aria-hidden="true" />
          ))}
        </span>
      )}

      {/* Label */}
      {showLabel ? (
        <Badge
          variant={priority >= 4 ? 'default' : 'secondary'}
          className={priority === 5 ? 'bg-red-500 text-white' : ''}
        >
          {label}
        </Badge>
      ) : null}
    </div>
  )
}

export default PriorityBadge

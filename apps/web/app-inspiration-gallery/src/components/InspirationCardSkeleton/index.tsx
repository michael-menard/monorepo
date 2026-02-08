/**
 * InspirationCardSkeleton Component
 *
 * Loading skeleton for InspirationCard.
 * Matches the visual structure of the actual card.
 *
 * INSP-020: Loading States
 */

import { z } from 'zod'
import { cn } from '@repo/app-component-library'

/**
 * InspirationCardSkeleton props schema
 */
const InspirationCardSkeletonPropsSchema = z.object({
  className: z.string().optional(),
})

export type InspirationCardSkeletonProps = z.infer<typeof InspirationCardSkeletonPropsSchema>

/**
 * InspirationCardSkeleton Component
 *
 * Animated skeleton placeholder for inspiration cards during loading.
 * Features shimmer animation for visual feedback.
 */
export function InspirationCardSkeleton({ className }: InspirationCardSkeletonProps) {
  return (
    <div
      className={cn('rounded-lg overflow-hidden bg-card border animate-pulse', className)}
      aria-hidden="true"
    >
      {/* Image skeleton */}
      <div className="aspect-square bg-muted" />

      {/* Content skeleton */}
      <div className="p-3 space-y-2">
        {/* Title skeleton */}
        <div className="h-4 bg-muted rounded w-3/4" />

        {/* Tags skeleton */}
        <div className="flex gap-1">
          <div className="h-5 bg-muted rounded-full w-12" />
          <div className="h-5 bg-muted rounded-full w-16" />
        </div>
      </div>
    </div>
  )
}

export default InspirationCardSkeleton

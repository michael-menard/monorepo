/**
 * AlbumCardSkeleton Component
 *
 * Loading skeleton for AlbumCard.
 * Matches the visual structure of the actual card.
 *
 * INSP-020: Loading States
 */

import { z } from 'zod'
import { cn } from '@repo/app-component-library'

/**
 * AlbumCardSkeleton props schema
 */
const AlbumCardSkeletonPropsSchema = z.object({
  className: z.string().optional(),
})

export type AlbumCardSkeletonProps = z.infer<typeof AlbumCardSkeletonPropsSchema>

/**
 * AlbumCardSkeleton Component
 *
 * Animated skeleton placeholder for album cards during loading.
 * Features shimmer animation for visual feedback.
 */
export function AlbumCardSkeleton({ className }: AlbumCardSkeletonProps) {
  return (
    <div
      className={cn('rounded-lg overflow-hidden bg-card border animate-pulse', className)}
      aria-hidden="true"
    >
      {/* Cover image skeleton with stacked effect */}
      <div className="aspect-square bg-muted relative">
        {/* Stack effect indicators */}
        <div className="absolute bottom-2 right-2 flex gap-0.5">
          <div className="w-1 h-4 bg-muted-foreground/20 rounded" />
          <div className="w-1 h-3 bg-muted-foreground/10 rounded" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="p-3 space-y-2">
        {/* Title skeleton */}
        <div className="h-4 bg-muted rounded w-2/3" />

        {/* Meta info skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-3 bg-muted rounded w-16" />
          <div className="h-3 bg-muted rounded w-12" />
        </div>
      </div>
    </div>
  )
}

export default AlbumCardSkeleton

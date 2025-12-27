/**
 * DashboardSkeleton Component
 *
 * Loading skeleton that displays while dashboard data is being fetched.
 * Story 2.9: Dashboard Loading State
 */

import { Skeleton } from '@repo/app-component-library'
import { z } from 'zod'

/**
 * DashboardSkeleton props schema
 */
const DashboardSkeletonPropsSchema = z.object({
  /** Optional className for styling */
  className: z.string().optional(),
})

export type DashboardSkeletonProps = z.infer<typeof DashboardSkeletonPropsSchema>

/**
 * DashboardSkeleton Component
 *
 * Shows animated skeleton placeholders for:
 * - Stats cards (3 cards in a row)
 * - Recent MOCs section header
 * - Recent MOCs grid (5 cards)
 */
export function DashboardSkeleton({ className }: DashboardSkeletonProps) {
  return (
    <div className={`space-y-8 ${className || ''}`}>
      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={`stat-${i}`} className="h-24 rounded-lg" />
        ))}
      </div>

      {/* Recent MOCs Section Skeleton */}
      <div>
        {/* Section Header Skeleton */}
        <Skeleton className="h-6 w-32 mb-4" />

        {/* Recent MOCs Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={`moc-${i}`} className="h-40 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default DashboardSkeleton

/**
 * EmptyDashboard Component
 *
 * Displays a welcoming empty state when user has no MOCs yet.
 * Story 2.8: Dashboard Empty State
 */

import { Button } from '@repo/app-component-library'
import { Blocks, Plus } from 'lucide-react'
import { z } from 'zod'

/**
 * EmptyDashboard props schema
 */
const EmptyDashboardPropsSchema = z.object({
  /** Optional className for styling */
  className: z.string().optional(),
})

export type EmptyDashboardProps = z.infer<typeof EmptyDashboardPropsSchema>

/**
 * EmptyDashboard Component
 *
 * Shows a helpful empty state with:
 * - Welcome message and LEGO icon
 * - Brief description of app features
 * - Primary CTA to add first MOC
 * - Secondary link to browse gallery
 */
export function EmptyDashboard({ className }: EmptyDashboardProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 text-center ${className || ''}`}
    >
      {/* Icon */}
      <Blocks className="h-16 w-16 text-primary mb-4" aria-hidden="true" />

      {/* Welcome Heading */}
      <h2 className="text-2xl font-bold mb-2">Welcome to LEGO MOC Instructions!</h2>

      {/* Description */}
      <p className="text-muted-foreground max-w-md mb-6">
        Organize your MOC instructions, track your collection, and manage your wishlist all in one
        place.
      </p>

      {/* Primary CTA */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button size="lg" asChild>
          <a href="/instructions/new">
            <Plus className="mr-2 h-5 w-5" aria-hidden="true" />
            Add Your First MOC
          </a>
        </Button>

        {/* Secondary CTA */}
        <Button variant="outline" size="lg" asChild>
          <a href="/instructions">Browse Gallery</a>
        </Button>
      </div>
    </div>
  )
}

export default EmptyDashboard

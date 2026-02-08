/**
 * Quick Actions Component
 * Story 2.7: Quick action buttons for common tasks
 */

import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'

/**
 * Add MOC button for dashboard
 */
export function QuickActions() {
  return (
    <Link
      to="/instructions/new"
      className="flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
    >
      <Plus className="h-4 w-4" aria-hidden="true" />
      Add MOC
    </Link>
  )
}

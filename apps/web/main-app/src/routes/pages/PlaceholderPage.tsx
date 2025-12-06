/**
 * Placeholder Page Component
 * Used for routes that are planned but not yet implemented
 */

import { useLocation } from '@tanstack/react-router'
import { Construction } from 'lucide-react'

export function PlaceholderPage() {
  const location = useLocation()

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <Construction className="h-16 w-16 text-muted-foreground mb-4" />
      <h1 className="text-2xl font-bold mb-2">Coming Soon</h1>
      <p className="text-muted-foreground max-w-md">
        This page ({location.pathname}) is under construction and will be available in a future
        update.
      </p>
    </div>
  )
}

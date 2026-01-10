/**
 * Quick Actions Component
 * Story 2.7: Quick action buttons for common tasks
 */

import { Link } from '@tanstack/react-router'
import { Button } from '@repo/app-component-library'
import { Plus, Images, Heart } from 'lucide-react'

/**
 * Quick action buttons for common dashboard tasks
 */
export function QuickActions() {
  const actions = [
    {
      to: '/instructions/new',
      icon: Plus,
      label: 'Add MOC',
      variant: 'default' as const,
    },
    {
      to: '/gallery',
      icon: Images,
      label: 'Browse Gallery',
      variant: 'outline' as const,
    },
    {
      to: '/wishlist',
      icon: Heart,
      label: 'View Wishlist',
      variant: 'outline' as const,
    },
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map(action => (
        <Button key={action.to} variant={action.variant} asChild>
          <Link to={action.to}>
            <action.icon className="mr-2 h-4 w-4" />
            {action.label}
          </Link>
        </Button>
      ))}
    </div>
  )
}

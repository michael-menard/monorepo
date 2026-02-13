import * as React from 'react'
import { z } from 'zod'
import type { LucideIcon } from 'lucide-react'
import { Blocks, Images, Heart, BookOpen } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { cn } from '../_lib/utils'
import { Button } from '../_primitives/button'

// EmptyState schemas and types

const EmptyStateFeatureSchema = z.object({
  icon: z.custom<LucideIcon>(),
  title: z.string(),
  description: z.string(),
})

const EmptyStateActionSchema = z.object({
  label: z.string().min(1),
  onClick: z.function().optional(),
  href: z.string().optional(),
})

const EmptyStatePropsSchema = z.object({
  icon: z.custom<LucideIcon>(),
  title: z.string().min(1),
  description: z.string().min(1),
  action: EmptyStateActionSchema.optional(),
  features: z.array(EmptyStateFeatureSchema).optional(),
  className: z.string().optional(),
})

type EmptyStateProps = z.infer<typeof EmptyStatePropsSchema>

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon: Icon, title, description, action, features, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col items-center justify-center py-16 text-center', className)}
      data-testid="empty-state"
      {...props}
    >
      {/* Hero Icon */}
      <div className="p-4 rounded-full bg-primary/10 mb-6">
        <Icon className="h-16 w-16 text-primary" aria-hidden="true" />
      </div>

      {/* Message */}
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p className="text-muted-foreground max-w-md mb-8">{description}</p>

      {/* CTA - href takes precedence over onClick when both provided */}
      {action ? (
        <div className="mb-12">
          {action.href ? (
            <Button asChild size="lg">
              <Link to={action.href}>
                {action.label}
              </Link>
            </Button>
          ) : (
            <Button size="lg" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      ) : null}

      {/* Feature Highlights */}
      {features ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl">
          {features.map(feature => (
            <div key={feature.title} className="text-center p-4">
              <div className="p-3 rounded-lg bg-muted inline-block mb-3">
                <feature.icon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
              </div>
              <h3 className="font-semibold mb-1">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  ),
)
EmptyState.displayName = 'EmptyState'

// EmptyDashboard preset

const DASHBOARD_FEATURES = [
  {
    icon: Blocks,
    title: 'Organize MOCs',
    description: 'Keep all your MOC instructions in one place',
  },
  {
    icon: Images,
    title: 'Gallery View',
    description: 'Browse your collection with beautiful thumbnails',
  },
  {
    icon: Heart,
    title: 'Wishlist',
    description: 'Track sets and MOCs you want to build',
  },
  {
    icon: BookOpen,
    title: 'Instructions',
    description: 'Access your PDF instructions anytime',
  },
]

const EmptyDashboardPropsSchema = z.object({
  onAddClick: z.function().optional(),
  addLink: z.string().optional(),
  className: z.string().optional(),
})

type EmptyDashboardProps = z.infer<typeof EmptyDashboardPropsSchema>

const EmptyDashboard = React.forwardRef<HTMLDivElement, EmptyDashboardProps>(
  ({ onAddClick, addLink, className, ...props }, ref) => {
    const action = addLink
      ? { label: 'Add Your First MOC', href: addLink }
      : onAddClick
        ? { label: 'Add Your First MOC', onClick: onAddClick }
        : { label: 'Add Your First MOC', href: '/instructions/new' }

    return (
      <EmptyState
        ref={ref}
        icon={Blocks}
        title="Welcome to LEGO MOC Instructions!"
        description="Organize your MOC instructions, track your collection, and manage your wishlist all in one place."
        action={action}
        features={DASHBOARD_FEATURES}
        className={className}
        {...props}
      />
    )
  },
)
EmptyDashboard.displayName = 'EmptyDashboard'

export {
  EmptyState,
  EmptyDashboard,
  EmptyStatePropsSchema,
  EmptyDashboardPropsSchema,
  EmptyStateFeatureSchema,
  EmptyStateActionSchema,
}

export type { EmptyStateProps, EmptyDashboardProps }

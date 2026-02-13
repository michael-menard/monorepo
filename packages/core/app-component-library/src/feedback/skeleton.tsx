import * as React from 'react'
import { z } from 'zod'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../_lib/utils'

const skeletonVariants = cva('animate-pulse rounded-md bg-muted', {
  variants: {
    variant: {
      default: 'bg-muted',
      primary: 'bg-primary/10',
      secondary: 'bg-secondary/10',
      muted: 'bg-muted',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant, ...props }, ref) => (
    <div ref={ref} className={cn(skeletonVariants({ variant }), className)} {...props} />
  ),
)
Skeleton.displayName = 'Skeleton'

// Card skeleton
export interface CardSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  showImage?: boolean
  showTitle?: boolean
  showDescription?: boolean
  showFooter?: boolean
  lines?: number
}

const CardSkeleton = React.forwardRef<HTMLDivElement, CardSkeletonProps>(
  (
    {
      className,
      showImage = true,
      showTitle = true,
      showDescription = true,
      showFooter = true,
      lines = 2,
      ...props
    },
    ref,
  ) => (
    <div ref={ref} className={cn('space-y-3', className)} {...props}>
      {showImage ? <Skeleton className="h-48 w-full" /> : null}
      <div className="space-y-2">
        {showTitle ? <Skeleton className="h-4 w-3/4" /> : null}
        {showDescription ? (
          <div className="space-y-2">
            {Array.from({ length: lines }).map((_, i) => (
              <Skeleton key={i} className={cn('h-3', i === lines - 1 ? 'w-1/2' : 'w-full')} />
            ))}
          </div>
        ) : null}
      </div>
      {showFooter ? (
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-3 w-24" />
        </div>
      ) : null}
    </div>
  ),
)
CardSkeleton.displayName = 'CardSkeleton'

// Avatar skeleton
export interface AvatarSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'default' | 'lg' | 'xl'
}

const AvatarSkeleton = React.forwardRef<HTMLDivElement, AvatarSkeletonProps>(
  ({ className, size = 'default', ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-8 w-8',
      default: 'h-10 w-10',
      lg: 'h-12 w-12',
      xl: 'h-16 w-16',
    }

    return (
      <Skeleton ref={ref} className={cn('rounded-full', sizeClasses[size], className)} {...props} />
    )
  },
)
AvatarSkeleton.displayName = 'AvatarSkeleton'

// Text skeleton
export interface TextSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number
  variant?: 'title' | 'body' | 'caption'
}

const TextSkeleton = React.forwardRef<HTMLDivElement, TextSkeletonProps>(
  ({ className, lines = 1, variant = 'body', ...props }, ref) => {
    const heightClasses = {
      title: 'h-6',
      body: 'h-4',
      caption: 'h-3',
    }

    return (
      <div ref={ref} className={cn('space-y-2', className)} {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn(heightClasses[variant], i === lines - 1 ? 'w-3/4' : 'w-full')}
          />
        ))}
      </div>
    )
  },
)
TextSkeleton.displayName = 'TextSkeleton'

// Table skeleton
export interface TableSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  rows?: number
  columns?: number
  showHeader?: boolean
}

const TableSkeleton = React.forwardRef<HTMLDivElement, TableSkeletonProps>(
  ({ className, rows = 5, columns = 4, showHeader = true, ...props }, ref) => (
    <div ref={ref} className={cn('space-y-3', className)} {...props}>
      {showHeader ? (
        <div className="flex space-x-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      ) : null}
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex space-x-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                className={cn('h-4 flex-1', colIndex === 0 ? 'w-20' : 'flex-1')}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  ),
)
TableSkeleton.displayName = 'TableSkeleton'

// List skeleton
export interface ListSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  items?: number
  showAvatar?: boolean
  showTitle?: boolean
  showDescription?: boolean
}

const ListSkeleton = React.forwardRef<HTMLDivElement, ListSkeletonProps>(
  (
    { className, items = 3, showAvatar = true, showTitle = true, showDescription = true, ...props },
    ref,
  ) => (
    <div ref={ref} className={cn('space-y-4', className)} {...props}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center space-x-3">
          {showAvatar ? <AvatarSkeleton size="sm" /> : null}
          <div className="flex-1 space-y-2">
            {showTitle ? <Skeleton className="h-4 w-3/4" /> : null}
            {showDescription ? <Skeleton className="h-3 w-1/2" /> : null}
          </div>
        </div>
      ))}
    </div>
  ),
)
ListSkeleton.displayName = 'ListSkeleton'

// Form skeleton
export interface FormSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  fields?: number
  showLabels?: boolean
  showButtons?: boolean
}

const FormSkeleton = React.forwardRef<HTMLDivElement, FormSkeletonProps>(
  ({ className, fields = 3, showLabels = true, showButtons = true, ...props }, ref) => (
    <div ref={ref} className={cn('space-y-6', className)} {...props}>
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          {showLabels ? <Skeleton className="h-4 w-24" /> : null}
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      {showButtons ? (
        <div className="flex space-x-3 pt-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      ) : null}
    </div>
  ),
)
FormSkeleton.displayName = 'FormSkeleton'

// LEGO MOC-specific skeleton components
export interface MocCardSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  showImage?: boolean
  showMetadata?: boolean
  showActions?: boolean
}

const MocCardSkeleton = React.forwardRef<HTMLDivElement, MocCardSkeletonProps>(
  ({ className, showImage = true, showMetadata = true, showActions = true, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('space-y-3', className)}
      data-testid="moc-card-skeleton"
      {...props}
    >
      {/* Image skeleton */}
      {showImage ? <Skeleton className="h-48 w-full rounded-t-xl" /> : null}

      {/* Content skeleton */}
      <div className="p-6 space-y-3">
        {/* Title skeleton */}
        <Skeleton className="h-6 w-3/4" />

        {/* Description skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        {/* Metadata skeleton */}
        {showMetadata ? (
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : null}

        {/* Actions skeleton */}
        {showActions ? (
          <div className="flex gap-2 pt-3">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-24" />
          </div>
        ) : null}
      </div>
    </div>
  ),
)
MocCardSkeleton.displayName = 'MocCardSkeleton'

// Compact MOC Card Skeleton
export interface MocCardCompactSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

const MocCardCompactSkeleton = React.forwardRef<HTMLDivElement, MocCardCompactSkeletonProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center gap-4 p-4', className)} {...props}>
      {/* Image skeleton */}
      <Skeleton className="h-16 w-16 rounded-lg flex-shrink-0" />

      {/* Content skeleton */}
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>

      {/* Actions skeleton */}
      <div className="flex gap-2 flex-shrink-0">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    </div>
  ),
)
MocCardCompactSkeleton.displayName = 'MocCardCompactSkeleton'

/**
 * Column configuration for responsive breakpoints
 */
export interface GalleryGridSkeletonColumns {
  /** Number of columns on small screens (default: 1) */
  sm?: number
  /** Number of columns on medium screens (default: 2) */
  md?: number
  /** Number of columns on large screens (default: 3) */
  lg?: number
  /** Number of columns on extra-large screens (default: 4) */
  xl?: number
}

/** Maps column count to Tailwind grid-cols class */
const columnClassMap: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
}

/** Maps gap value to Tailwind gap class */
const gapClassMap: Record<number, string> = {
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  5: 'gap-5',
  6: 'gap-6',
  8: 'gap-8',
  10: 'gap-10',
  12: 'gap-12',
}

/**
 * Generates responsive grid column classes based on configuration
 */
const getColumnClasses = (columns: GalleryGridSkeletonColumns): string => {
  const { sm = 1, md = 2, lg = 3, xl = 4 } = columns

  const classes: string[] = []

  // Base (smallest) - use sm value
  classes.push(columnClassMap[sm] ?? 'grid-cols-1')

  // md breakpoint
  if (sm !== md) {
    classes.push(`md:${columnClassMap[md] ?? 'grid-cols-2'}`)
  }

  // lg breakpoint
  if (md !== lg) {
    classes.push(`lg:${columnClassMap[lg] ?? 'grid-cols-3'}`)
  }

  // xl breakpoint
  if (lg !== xl) {
    classes.push(`xl:${columnClassMap[xl] ?? 'grid-cols-4'}`)
  }

  return classes.join(' ')
}

// Gallery Grid Skeleton
export interface GalleryGridSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of skeleton items to render (default: 12) */
  count?: number
  /** Custom column configuration per breakpoint */
  columns?: GalleryGridSkeletonColumns
  /** Gap size using Tailwind spacing scale (default: 6) */
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12
  /** Custom card skeleton render function */
  renderCard?: (index: number) => React.ReactNode
}

const GalleryGridSkeleton = React.forwardRef<HTMLDivElement, GalleryGridSkeletonProps>(
  ({ className, count = 12, columns = {}, gap = 6, renderCard, ...props }, ref) => {
    const columnClasses = getColumnClasses(columns)
    const gapClass = gapClassMap[gap] ?? 'gap-6'

    return (
      <div
        ref={ref}
        className={cn('grid', columnClasses, gapClass, className)}
        data-testid="gallery-grid-skeleton"
        {...props}
      >
        {Array.from({ length: count }).map((_, i) =>
          renderCard ? renderCard(i) : <MocCardSkeleton key={i} />,
        )}
      </div>
    )
  },
)
GalleryGridSkeleton.displayName = 'GalleryGridSkeleton'

// Dashboard Skeleton
const DashboardSkeletonPropsSchema = z.object({
  className: z.string().optional(),
})

type DashboardSkeletonProps = z.infer<typeof DashboardSkeletonPropsSchema>

const DashboardSkeleton = React.forwardRef<HTMLDivElement, DashboardSkeletonProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('space-y-8 animate-in fade-in duration-300', className)}
      aria-busy="true"
      aria-label="Loading dashboard"
      data-testid="dashboard-skeleton"
      {...props}
    >
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-64" />
      </div>

      {/* Quick Actions Skeleton */}
      <div className="flex gap-2">
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="p-6 border rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Recent MOCs Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square rounded-lg" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
)
DashboardSkeleton.displayName = 'DashboardSkeleton'

export {
  Skeleton,
  CardSkeleton,
  AvatarSkeleton,
  TextSkeleton,
  TableSkeleton,
  ListSkeleton,
  FormSkeleton,
  MocCardSkeleton,
  MocCardCompactSkeleton,
  GalleryGridSkeleton,
  DashboardSkeleton,
  DashboardSkeletonPropsSchema,
  skeletonVariants,
}

export type { DashboardSkeletonProps }

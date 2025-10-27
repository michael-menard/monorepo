import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './lib/utils'

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

export {
  Skeleton,
  CardSkeleton,
  AvatarSkeleton,
  TextSkeleton,
  TableSkeleton,
  ListSkeleton,
  FormSkeleton,
  skeletonVariants,
}

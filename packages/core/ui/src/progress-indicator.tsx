import * as React from 'react'
import { motion } from 'framer-motion'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './lib/utils'

const progressVariants = cva('relative overflow-hidden rounded-full bg-secondary', {
  variants: {
    variant: {
      default: 'bg-secondary',
      primary: 'bg-primary/20',
      success: 'bg-green-100',
      warning: 'bg-yellow-100',
      destructive: 'bg-red-100',
    },
    size: {
      sm: 'h-1',
      default: 'h-2',
      lg: 'h-3',
      xl: 'h-4',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
})

const progressBarVariants = cva('h-full transition-all duration-300 ease-in-out', {
  variants: {
    variant: {
      default: 'bg-primary',
      primary: 'bg-primary',
      success: 'bg-green-500',
      warning: 'bg-yellow-500',
      destructive: 'bg-red-500',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

export interface ProgressIndicatorProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressVariants> {
  value?: number
  max?: number
  showLabel?: boolean
  labelPosition?: 'top' | 'bottom' | 'inside'
  indeterminate?: boolean
  animated?: boolean
}

const ProgressIndicator = React.forwardRef<HTMLDivElement, ProgressIndicatorProps>(
  (
    {
      className,
      variant,
      size,
      value = 0,
      max = 100,
      showLabel = false,
      labelPosition = 'top',
      indeterminate = false,
      animated = true,
      ...props
    },
    ref,
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        {showLabel && labelPosition === 'top' ? (
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Progress</span>
            <span>{Math.round(percentage)}%</span>
          </div>
        ) : null}

        <div className={cn(progressVariants({ variant, size }))}>
          {indeterminate ? (
            <motion.div
              className={cn(progressBarVariants({ variant }))}
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{ width: '30%' }}
            />
          ) : (
            <motion.div
              className={cn(progressBarVariants({ variant }))}
              initial={animated ? { width: 0 } : undefined}
              animate={{ width: `${percentage}%` }}
              transition={animated ? { duration: 0.5, ease: 'easeOut' } : undefined}
            />
          )}
        </div>

        {showLabel && labelPosition === 'bottom' ? (
          <div className="flex justify-between text-sm text-muted-foreground mt-2">
            <span>Progress</span>
            <span>{Math.round(percentage)}%</span>
          </div>
        ) : null}

        {showLabel && labelPosition === 'inside' && !indeterminate ? (
          <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-primary-foreground">
            {Math.round(percentage)}%
          </div>
        ) : null}
      </div>
    )
  },
)
ProgressIndicator.displayName = 'ProgressIndicator'

// Circular progress indicator
export interface CircularProgressProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressBarVariants> {
  value?: number
  max?: number
  size?: 'sm' | 'default' | 'lg' | 'xl'
  strokeWidth?: number
  showLabel?: boolean
  indeterminate?: boolean
  animated?: boolean
}

const CircularProgress = React.forwardRef<HTMLDivElement, CircularProgressProps>(
  (
    {
      className,
      variant,
      value = 0,
      max = 100,
      size = 'default',
      strokeWidth = 4,
      showLabel = false,
      indeterminate = false,
      animated = true,
      ...props
    },
    ref,
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

    const sizeClasses = {
      sm: 'w-8 h-8',
      default: 'w-12 h-12',
      lg: 'w-16 h-16',
      xl: 'w-24 h-24',
    }

    const radius = size === 'sm' ? 12 : size === 'default' ? 18 : size === 'lg' ? 24 : 36
    const circumference = 2 * Math.PI * radius
    const strokeDasharray = circumference
    const strokeDashoffset = indeterminate
      ? circumference * 0.25
      : circumference - (percentage / 100) * circumference

    return (
      <div
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center',
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        <svg
          className="transform -rotate-90"
          width={radius * 2 + strokeWidth}
          height={radius * 2 + strokeWidth}
        >
          {/* Background circle */}
          <circle
            cx={radius + strokeWidth / 2}
            cy={radius + strokeWidth / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-muted"
          />

          {/* Progress circle */}
          <motion.circle
            cx={radius + strokeWidth / 2}
            cy={radius + strokeWidth / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className={cn('text-primary', progressBarVariants({ variant }))}
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            initial={animated ? { strokeDashoffset: circumference } : undefined}
            animate={{ strokeDashoffset }}
            transition={animated ? { duration: 0.5, ease: 'easeOut' } : undefined}
          />
        </svg>

        {showLabel && !indeterminate ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium">{Math.round(percentage)}%</span>
          </div>
        ) : null}
      </div>
    )
  },
)
CircularProgress.displayName = 'CircularProgress'

// Loading overlay component
export interface LoadingOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  isLoading?: boolean
  text?: string
  variant?: 'spinner' | 'progress' | 'circular'
  progressValue?: number
  progressMax?: number
  blur?: boolean
}

const LoadingOverlay = React.forwardRef<HTMLDivElement, LoadingOverlayProps>(
  (
    {
      className,
      isLoading = false,
      text = 'Loading...',
      variant = 'spinner',
      progressValue = 0,
      progressMax = 100,
      blur = true,
      children,
      ...props
    },
    ref,
  ) => {
    if (!isLoading) {
      return <>{children}</>
    }

    return (
      <div ref={ref} className={cn('relative', className)} {...props}>
        {children}
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm',
            blur ? 'backdrop-blur-sm' : '',
          )}
        >
          <div className="flex flex-col items-center space-y-4 p-6 rounded-lg bg-card border shadow-lg">
            {variant === 'spinner' && (
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            )}
            {variant === 'progress' && (
              <ProgressIndicator
                value={progressValue}
                max={progressMax}
                size="lg"
                className="w-32"
              />
            )}
            {variant === 'circular' && (
              <CircularProgress value={progressValue} max={progressMax} size="lg" showLabel />
            )}
            {text ? <p className="text-sm text-muted-foreground">{text}</p> : null}
          </div>
        </div>
      </div>
    )
  },
)
LoadingOverlay.displayName = 'LoadingOverlay'

export {
  ProgressIndicator,
  CircularProgress,
  LoadingOverlay,
  progressVariants,
  progressBarVariants,
}

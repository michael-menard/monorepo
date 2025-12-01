/**
 * AppProgress Component
 * Application wrapper for Progress component with consistent styling
 */

import * as React from 'react'
import { Progress, type ProgressProps } from '../_primitives/progress'
import { cn } from '../_lib/utils'

export type ProgressVariant = 'default' | 'success' | 'warning' | 'destructive' | 'info'

export interface AppProgressProps extends ProgressProps {
  /** Visual variant of the progress bar */
  variant?: ProgressVariant
  /** Size of the progress bar */
  size?: 'sm' | 'default' | 'lg'
  /** Whether to animate the progress bar */
  animated?: boolean
}

const sizeStyles = {
  sm: '[&_[data-slot=progress]]:h-1',
  default: '',
  lg: '[&_[data-slot=progress]]:h-3',
}

const variantStyles: Record<ProgressVariant, string> = {
  default: '',
  success: '[&_[data-slot=progress-indicator]]:bg-green-500',
  warning: '[&_[data-slot=progress-indicator]]:bg-yellow-500',
  destructive: '[&_[data-slot=progress-indicator]]:bg-destructive',
  info: '[&_[data-slot=progress-indicator]]:bg-blue-500',
}

export function AppProgress({
  variant = 'default',
  size = 'default',
  animated = false,
  className,
  ...props
}: AppProgressProps) {
  return (
    <div
      className={cn(
        sizeStyles[size],
        variantStyles[variant],
        animated && '[&_[data-slot=progress-indicator]]:animate-pulse',
        className
      )}
    >
      <Progress {...props} />
    </div>
  )
}

// Re-export the primitive for advanced usage
export { Progress } from '../_primitives/progress'
export type { ProgressProps }


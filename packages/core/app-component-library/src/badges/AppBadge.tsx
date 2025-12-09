/**
 * AppBadge Component
 * Application wrapper for Badge component with consistent styling
 */

import * as React from 'react'
import { Badge, type BadgeProps } from '../_primitives/badge'
import { cn } from '../_lib/utils'

export type AppBadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning'
  | 'info'

export interface AppBadgeProps extends Omit<BadgeProps, 'variant'> {
  /** Visual variant of the badge */
  variant?: AppBadgeVariant
  /** Size of the badge */
  size?: 'sm' | 'default' | 'lg'
  /** Whether the badge is removable */
  removable?: boolean
  /** Callback when remove button is clicked */
  onRemove?: () => void
  children?: React.ReactNode
}

const sizeStyles = {
  sm: 'px-1.5 py-0 text-[10px]',
  default: '',
  lg: 'px-3 py-1 text-sm',
}

const customVariantStyles: Record<string, string> = {
  success: 'border-transparent bg-green-500 text-white hover:bg-green-500/80',
  warning: 'border-transparent bg-yellow-500 text-white hover:bg-yellow-500/80',
  info: 'border-transparent bg-blue-500 text-white hover:bg-blue-500/80',
}

export function AppBadge({
  variant = 'default',
  size = 'default',
  removable = false,
  onRemove,
  className,
  children,
  ...props
}: AppBadgeProps) {
  // Map custom variants to base variants
  const baseVariant = ['success', 'warning', 'info'].includes(variant)
    ? 'default'
    : (variant as BadgeProps['variant'])
  const customStyle = customVariantStyles[variant] || ''

  return (
    <Badge
      variant={baseVariant}
      className={cn(sizeStyles[size], customStyle, removable && 'pr-1', className)}
      {...props}
    >
      {children}
      {removable ? (
        <button
          type="button"
          onClick={onRemove}
          className="ml-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5"
          aria-label="Remove"
        >
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      ) : null}
    </Badge>
  )
}

// Re-export for advanced usage
export { Badge, badgeVariants } from '../_primitives/badge'

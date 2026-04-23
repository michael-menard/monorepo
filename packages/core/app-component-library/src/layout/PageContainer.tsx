/**
 * PageContainer — Consistent page-level container with responsive spacing.
 *
 * Use this inside pages for standard max-width + padding behavior.
 * Replaces ad-hoc "container mx-auto px-4 py-6" patterns.
 */

import type { ReactNode } from 'react'
import { cn } from '../_lib/utils'

export interface PageContainerProps {
  children: ReactNode
  className?: string
  /** Max-width constraint. Defaults to 7xl (80rem) matching the shell header. */
  maxWidth?: 'full' | '7xl' | '6xl' | '5xl' | '4xl'
  /** Vertical padding variant */
  spacing?: 'none' | 'compact' | 'standard' | 'spacious'
}

const maxWidthClasses = {
  full: '',
  '7xl': 'max-w-7xl',
  '6xl': 'max-w-6xl',
  '5xl': 'max-w-5xl',
  '4xl': 'max-w-4xl',
}

const spacingClasses = {
  none: '',
  compact: 'py-4',
  standard: 'py-6',
  spacious: 'py-8',
}

export function PageContainer({
  children,
  className,
  maxWidth = '7xl',
  spacing = 'standard',
}: PageContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto px-4 sm:px-6 lg:px-8',
        maxWidthClasses[maxWidth],
        spacingClasses[spacing],
        className,
      )}
    >
      {children}
    </div>
  )
}

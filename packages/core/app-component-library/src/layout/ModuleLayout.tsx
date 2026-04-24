/**
 * ModuleLayout — Shared layout wrapper for micro-app modules.
 *
 * Replaces the 7+ duplicated module-layout.tsx files across micro-apps.
 * Provides consistent structure with optional padding variants.
 */

import type { ReactNode } from 'react'
import { cn } from '../_lib/utils'

export interface ModuleLayoutProps {
  children: ReactNode
  className?: string
  /** Padding variant. "none" for gallery modules, "standard" for dashboard/settings. */
  padding?: 'none' | 'standard'
  /** When true, participates in flex height chain (no padding, fills available space) */
  fillViewport?: boolean
}

export function ModuleLayout({
  children,
  className,
  padding = 'none',
  fillViewport = false,
}: ModuleLayoutProps) {
  if (fillViewport) {
    return <div className={cn('flex-1 min-h-0 flex flex-col', className)}>{children}</div>
  }

  return (
    <div
      className={cn('min-h-full', padding === 'standard' && 'px-4 py-6 md:px-6 lg:px-8', className)}
    >
      {children}
    </div>
  )
}

export default ModuleLayout

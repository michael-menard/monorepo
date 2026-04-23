/**
 * AppShellHeader — Configurable header for standalone apps.
 *
 * Provides a consistent header pattern with customizable branding,
 * navigation links, and right-side actions. Supports light and dark variants.
 */

import type { ReactNode } from 'react'
import { cn } from '../_lib/utils'

export interface AppShellNavItem {
  label: string
  href: string
  className?: string
}

export interface AppShellHeaderProps {
  /** App branding element (logo + title) */
  brand: ReactNode
  /** Navigation links */
  navItems?: AppShellNavItem[]
  /** Right-side actions (notifications, status indicators, etc.) */
  actions?: ReactNode
  /** Visual variant */
  variant?: 'light' | 'dark'
  /** Additional class name */
  className?: string
  /** Link component to use (pass your router's Link component) */
  linkComponent?: React.ComponentType<{ to: string; className?: string; children: ReactNode }>
}

const variantStyles = {
  light: 'border-b border-border bg-background/95 backdrop-blur-sm',
  dark: 'border-b border-slate-700/50 bg-black/40 backdrop-blur-md',
}

const navLinkStyles = {
  light: 'text-sm font-medium text-muted-foreground hover:text-foreground transition-colors',
  dark: 'text-sm font-medium text-slate-400 hover:text-cyan-400 transition-colors',
}

export function AppShellHeader({
  brand,
  navItems = [],
  actions,
  variant = 'light',
  className,
  linkComponent: LinkComponent,
}: AppShellHeaderProps) {
  return (
    <header className={cn(variantStyles[variant], 'sticky top-0 z-40', className)}>
      <nav
        aria-label="Application navigation"
        className="container mx-auto px-4 py-3 flex items-center gap-3"
      >
        {brand}

        {navItems.map(item =>
          LinkComponent ? (
            <LinkComponent
              key={item.href}
              to={item.href}
              className={cn(navLinkStyles[variant], item.className)}
            >
              {item.label}
            </LinkComponent>
          ) : (
            <a
              key={item.href}
              href={item.href}
              className={cn(navLinkStyles[variant], item.className)}
            >
              {item.label}
            </a>
          ),
        )}

        {actions ? <div className="ml-auto flex items-center gap-4">{actions}</div> : null}
      </nav>
    </header>
  )
}

/**
 * LiveIndicator — Reusable "LIVE" status indicator for workflow apps.
 */
export function LiveIndicator({ className }: { className?: string }) {
  return (
    <div role="status" className={cn('flex items-center gap-2', className)}>
      <div className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" aria-hidden="true" />
      <span className="text-xs font-mono text-slate-400">LIVE</span>
    </div>
  )
}

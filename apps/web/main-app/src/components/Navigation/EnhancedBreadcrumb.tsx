import React from 'react'
import { useSelector } from 'react-redux'
import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronRight, Home, ArrowLeft } from 'lucide-react'
import { Button } from '@repo/app-component-library'
import { Badge } from '@repo/app-component-library'
import { cn } from '@repo/app-component-library'
import { useNavigation } from './NavigationProvider'
import {
  selectBreadcrumbs,
  selectActiveNavigationItem,
  BreadcrumbItem,
} from '@/store/slices/navigationSlice'

interface EnhancedBreadcrumbProps {
  className?: string
  showBackButton?: boolean
  showHomeIcon?: boolean
  maxItems?: number
  separator?: React.ReactNode
}

/**
 * Enhanced Breadcrumb Component
 * Provides intelligent breadcrumb navigation with back button and overflow handling
 */
export function EnhancedBreadcrumb({
  className,
  showBackButton = true,
  showHomeIcon = true,
  maxItems = 5,
  separator = <ChevronRight className="h-4 w-4 text-muted-foreground" />,
}: EnhancedBreadcrumbProps) {
  const navigate = useNavigate()
  const breadcrumbs = useSelector(selectBreadcrumbs)
  const activeItem = useSelector(selectActiveNavigationItem)
  const { trackNavigation } = useNavigation()

  // Handle back navigation
  const handleBack = () => {
    navigate({ to: '..' })
    trackNavigation('breadcrumb_back', {
      source: 'breadcrumb',
      timestamp: new Date().toISOString(),
    })
  }

  // Handle breadcrumb click
  const handleBreadcrumbClick = (item: BreadcrumbItem, index: number) => {
    trackNavigation('breadcrumb_click', {
      source: 'breadcrumb',
      itemLabel: item.label,
      itemHref: item.href,
      position: index,
      timestamp: new Date().toISOString(),
    })
  }

  // Truncate breadcrumbs if too many
  const displayBreadcrumbs =
    breadcrumbs.length > maxItems
      ? [
          breadcrumbs[0], // Always show first (Home)
          {
            label: '...',
            isClickable: false,
          } as BreadcrumbItem,
          ...breadcrumbs.slice(-(maxItems - 2)), // Show last few items
        ]
      : breadcrumbs

  if (breadcrumbs.length === 0) {
    return null
  }

  return (
    <nav
      className={cn('flex items-center space-x-2 text-sm', className)}
      aria-label="Breadcrumb navigation"
    >
      {/* Back Button */}
      {showBackButton && breadcrumbs.length > 1 ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="h-8 w-8 p-0 hover:bg-accent"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      ) : null}

      {/* Breadcrumb Items */}
      <ol className="flex items-center space-x-2">
        {displayBreadcrumbs.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center">
            {/* Separator (except for first item) */}
            {index > 0 && (
              <span className="mx-2" aria-hidden="true">
                {separator}
              </span>
            )}

            {/* Breadcrumb Item */}
            {item.isClickable && item.href ? (
              <Link
                to={item.href}
                onClick={() => handleBreadcrumbClick(item, index)}
                className={cn(
                  'flex items-center gap-1 hover:text-foreground transition-colors',
                  index === displayBreadcrumbs.length - 1
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                aria-current={index === displayBreadcrumbs.length - 1 ? 'page' : undefined}
              >
                {/* Icon */}
                {item.icon ? (
                  <>
                    {item.icon === 'Home' && showHomeIcon ? (
                      <Home className="h-4 w-4" />
                    ) : (
                      <div className="w-4 h-4 bg-muted rounded" />
                    )}
                  </>
                ) : null}

                {/* Label */}
                <span className="truncate max-w-[150px]">{item.label}</span>
              </Link>
            ) : (
              <span
                className={cn(
                  'flex items-center gap-1',
                  index === displayBreadcrumbs.length - 1
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground',
                )}
                aria-current={index === displayBreadcrumbs.length - 1 ? 'page' : undefined}
              >
                {/* Icon */}
                {item.icon ? (
                  <>
                    {item.icon === 'Home' && showHomeIcon ? (
                      <Home className="h-4 w-4" />
                    ) : (
                      <div className="w-4 h-4 bg-muted rounded" />
                    )}
                  </>
                ) : null}

                {/* Label */}
                <span className="truncate max-w-[150px]">{item.label}</span>
              </span>
            )}
          </li>
        ))}
      </ol>

      {/* Active Item Badge */}
      {activeItem ? (
        <div className="flex items-center gap-2 ml-4">
          {activeItem.isNew ? (
            <Badge variant="secondary" className="text-xs">
              New
            </Badge>
          ) : null}
          {activeItem.isComingSoon ? (
            <Badge variant="outline" className="text-xs">
              Coming Soon
            </Badge>
          ) : null}
          {activeItem.badge ? (
            <Badge variant="default" className="text-xs">
              {activeItem.badge}
            </Badge>
          ) : null}
        </div>
      ) : null}
    </nav>
  )
}

/**
 * Compact Breadcrumb for mobile or tight spaces
 */
export function CompactBreadcrumb({ className }: { className?: string }) {
  const navigate = useNavigate()
  const breadcrumbs = useSelector(selectBreadcrumbs)
  const { trackNavigation } = useNavigation()

  if (breadcrumbs.length === 0) {
    return null
  }

  const currentItem = breadcrumbs[breadcrumbs.length - 1]
  const parentItem = breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2] : null

  const handleBack = () => {
    if (parentItem?.href) {
      navigate({ to: parentItem.href })
      trackNavigation('compact_breadcrumb_back', {
        source: 'compact_breadcrumb',
        timestamp: new Date().toISOString(),
      })
    } else {
      navigate({ to: '..' })
    }
  }

  return (
    <nav className={cn('flex items-center space-x-2', className)}>
      {parentItem ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="h-8 px-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {parentItem.label}
        </Button>
      ) : null}

      <ChevronRight className="h-4 w-4 text-muted-foreground" />

      <span className="font-medium text-foreground">{currentItem.label}</span>
    </nav>
  )
}
